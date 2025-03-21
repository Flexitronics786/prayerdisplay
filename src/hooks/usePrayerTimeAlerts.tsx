
import { useState, useEffect, useRef } from "react";
import { PrayerTime, DetailedPrayerTime } from "@/types";
import { getCurrentTime24h } from "@/utils/dateUtils";
import { supabase } from "@/integrations/supabase/client";

// Create a type for our supported prayer notifications
type PrayerNotificationType = "Fajr" | "Zuhr" | "Asr" | "Maghrib" | "Isha" | "Jummah";

// Interface to track jamat times for the day
interface DailyJamatTimes {
  [key: string]: string; // Prayer name -> time in HH:MM format
}

// Create a unique ID for this hook instance to avoid conflicts with KeepAwake
const PRAYER_ALERT_AUDIO_ID = "prayer-alert-sound";

export const usePrayerTimeAlerts = (
  prayerTimes: PrayerTime[],
  detailedTimes: DetailedPrayerTime | null
) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const checkedTimesRef = useRef<Set<string>>(new Set());
  const [lastCheckedMinute, setLastCheckedMinute] = useState<string>("");
  const [audioUrl, setAudioUrl] = useState<string>("");
  const dailyJamatTimesRef = useRef<DailyJamatTimes>({});
  const audioInitializedRef = useRef<boolean>(false);
  const audioLoadAttemptsRef = useRef<number>(0);

  // Initialize audio element and set up the audio file
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        // Use the file from GitHub public directory with the exact filename
        const localBeepUrl = "/beep-125033.mp3";
        console.log("Attempting to load audio from:", localBeepUrl);
        
        // Create audio element
        if (typeof window !== "undefined" && !audioInitializedRef.current) {
          // Check if we already have an audio element with this ID
          let existingAudio = document.getElementById(PRAYER_ALERT_AUDIO_ID) as HTMLAudioElement;
          
          if (!existingAudio) {
            // Create a new audio element with ID to avoid conflicts
            existingAudio = document.createElement('audio');
            existingAudio.id = PRAYER_ALERT_AUDIO_ID;
            existingAudio.preload = "auto"; // Preload the audio
            existingAudio.volume = 1.0; // Maximum volume
            document.body.appendChild(existingAudio);
            
            // Set the source to the local file
            const localSource = document.createElement('source');
            localSource.src = localBeepUrl;
            localSource.type = 'audio/mpeg';
            existingAudio.appendChild(localSource);
            
            console.log("Created prayer alert audio element with local source:", localBeepUrl);
          }
          
          audioRef.current = existingAudio;
          setAudioUrl(localBeepUrl);
          audioInitializedRef.current = true;
          
          // Handle any errors loading the audio
          existingAudio.addEventListener('error', async (e) => {
            console.error("Error loading audio file from public directory:", e);
            audioLoadAttemptsRef.current += 1;
            
            if (audioLoadAttemptsRef.current <= 3) {
              // Fallback to Supabase storage if local file fails
              try {
                console.log("Attempting to fetch audio file from Supabase storage");
                const { data, error } = await supabase.storage
                  .from('public')
                  .download('beep-125033.mp3');
                
                if (error) {
                  console.error("Error fetching from Supabase:", error);
                  return;
                }
                
                if (data) {
                  // Create a blob URL from the fetched file
                  const blob = new Blob([data], { type: 'audio/mpeg' });
                  const blobUrl = URL.createObjectURL(blob);
                  
                  // Replace the source
                  while (existingAudio.firstChild) {
                    existingAudio.removeChild(existingAudio.firstChild);
                  }
                  
                  const supabaseSource = document.createElement('source');
                  supabaseSource.src = blobUrl;
                  supabaseSource.type = 'audio/mpeg';
                  existingAudio.appendChild(supabaseSource);
                  
                  console.log("Successfully loaded audio from Supabase");
                  
                  // Test play to ensure it works
                  existingAudio.volume = 0.01;
                  existingAudio.play().then(() => {
                    existingAudio.pause();
                    existingAudio.currentTime = 0;
                    existingAudio.volume = 1.0;
                    console.log("Audio from Supabase tested successfully");
                  }).catch(e => {
                    console.warn("Test play from Supabase failed:", e);
                  });
                }
              } catch (supabaseError) {
                console.error("Failed to fetch from Supabase:", supabaseError);
              }
            }
          });
          
          // Initialize with a user interaction to bypass autoplay restrictions
          const unlockAudio = () => {
            if (audioRef.current) {
              // Create a silent buffer to play
              audioRef.current.volume = 0.01;
              audioRef.current.muted = false;
              const playPromise = audioRef.current.play();
              if (playPromise !== undefined) {
                playPromise.then(() => {
                  if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                    audioRef.current.volume = 1.0;
                    audioRef.current.muted = false;
                    console.log("Audio unlocked for future playback");
                  }
                }).catch(e => {
                  console.warn("Audio unlock failed, will try again on user interaction:", e);
                });
              }
            }
            
            // Remove this event listener after one use
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
          };
          
          // Test the audio file on load
          existingAudio.addEventListener('loadeddata', () => {
            console.log("Audio file loaded and ready to play");
            // Force a test play with low volume to ensure it works
            existingAudio.volume = 0.01;
            existingAudio.muted = false;
            existingAudio.play().then(() => {
              existingAudio.pause();
              existingAudio.currentTime = 0;
              existingAudio.volume = 1.0;
              console.log("Audio test play successful");
            }).catch(e => {
              console.warn("Audio test play failed:", e);
            });
          });
          
          // Add event listeners to unlock audio on user interaction
          document.addEventListener('click', unlockAudio, { once: true });
          document.addEventListener('touchstart', unlockAudio, { once: true });
        }
      } catch (error) {
        console.error("Error setting up audio:", error);
      }
    };

    initializeAudio();
    
    return () => {
      // Don't remove the audio element on cleanup, just release our reference
      if (audioRef.current) {
        audioRef.current = null;
      }
    };
  }, []);

  // Update daily jamat times at midnight or when detailed times change
  useEffect(() => {
    if (!detailedTimes) return;
    
    // Store all jamat times for the current day
    const updateDailyJamatTimes = () => {
      const jamatTimes: DailyJamatTimes = {};
      const prayers: PrayerNotificationType[] = ["Fajr", "Zuhr", "Asr", "Maghrib", "Isha"];
      
      // Add Jummah on Fridays
      const dayOfWeek = new Date().getDay();
      if (dayOfWeek === 5) {
        prayers.push("Jummah");
      }
      
      prayers.forEach(prayer => {
        // For Maghrib use start time, for others use Jamat time
        const useJamat = prayer !== "Maghrib";
        const prayerTime = getPrayerTime(prayer, useJamat);
        
        if (prayerTime) {
          // Store only the HH:MM part for comparison
          jamatTimes[prayer] = prayerTime.substring(0, 5);
        }
      });
      
      console.log("Updated daily jamat times:", jamatTimes);
      dailyJamatTimesRef.current = jamatTimes;
    };
    
    // Update immediately
    updateDailyJamatTimes();
    
    // Set up a timer to update at midnight
    const midnight = new Date();
    midnight.setHours(24, 0, 5, 0); // 12:00:05 AM next day
    const now = new Date();
    const msUntilMidnight = midnight.getTime() - now.getTime();
    
    const midnightTimer = setTimeout(() => {
      updateDailyJamatTimes();
    }, msUntilMidnight);
    
    return () => clearTimeout(midnightTimer);
  }, [detailedTimes]);

  // Helper to get prayer time for specific prayer
  const getPrayerTime = (name: PrayerNotificationType, isJamat: boolean): string | null => {
    if (!detailedTimes) return null;
    
    switch (name) {
      case "Fajr":
        return isJamat ? detailedTimes.fajr_jamat : null;
      case "Zuhr":
        return isJamat ? detailedTimes.zuhr_jamat : null;
      case "Asr":
        return isJamat ? detailedTimes.asr_jamat : null;
      case "Maghrib":
        return detailedTimes.maghrib_iftar; // Use start time for Maghrib
      case "Isha":
        return isJamat ? detailedTimes.isha_first_jamat : null;
      case "Jummah":
        return isJamat ? detailedTimes.zuhr_jamat : null; // Use Zuhr Jamat time for Jummah
      default:
        return null;
    }
  };

  // Function to play the alert sound for exactly 1 second
  const playAlertSound = (prayerName: string) => {
    if (!audioRef.current) {
      console.error("Audio reference not available");
      return;
    }
    
    // Stop any other audio that might be playing
    const allAudioElements = document.querySelectorAll('audio');
    allAudioElements.forEach(audio => {
      if (audio.id !== PRAYER_ALERT_AUDIO_ID && !audio.paused) {
        audio.pause();
      }
    });
    
    // Reset to the beginning 
    audioRef.current.currentTime = 0;
    audioRef.current.volume = 1.0; // Maximum volume
    audioRef.current.muted = false; // Ensure not muted
    
    console.log(`Playing alert for ${prayerName} prayer time`);
    
    // Play the sound multiple times with maximum volume to ensure it's heard
    const attemptToPlay = (attempt = 1, maxAttempts = 5) => {
      if (!audioRef.current) return;
      
      // Always use maximum volume
      audioRef.current.volume = 1.0;
      audioRef.current.muted = false;
      
      console.log(`Play attempt ${attempt}/${maxAttempts} for ${prayerName}`);
      
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log(`Play attempt ${attempt} succeeded`);
            // Set a timeout to stop the sound after 3 seconds
            setTimeout(() => {
              if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
                console.log("Prayer notification beep completed");
                
                // Try again if we haven't reached max attempts
                if (attempt < maxAttempts) {
                  setTimeout(() => {
                    attemptToPlay(attempt + 1, maxAttempts);
                  }, 1000);
                }
              }
            }, 3000); // 3 second duration for better chance of being heard
          })
          .catch(err => {
            console.error(`Error playing prayer alert sound (attempt ${attempt}):`, err);
            
            // Try again with a delay if we haven't reached max attempts
            if (attempt < maxAttempts) {
              setTimeout(() => {
                attemptToPlay(attempt + 1, maxAttempts);
              }, 1000);
            }
          });
      }
    };
    
    // Start playing with attempt 1
    attemptToPlay();
  };

  // Check and play alerts
  useEffect(() => {
    if (!detailedTimes || !audioInitializedRef.current) return;
    
    const checkTimes = () => {
      const currentTime24h = getCurrentTime24h();
      // Only check once per minute
      if (currentTime24h === lastCheckedMinute) return;
      setLastCheckedMinute(currentTime24h);
      
      // Format: HH:MM
      const currentMinutes = currentTime24h.substring(0, 5);
      
      console.log(`Checking prayer times at ${currentMinutes} against:`, dailyJamatTimesRef.current);
      
      // Check each stored jamat time from our daily record
      Object.entries(dailyJamatTimesRef.current).forEach(([prayer, prayerMinutes]) => {
        // Create a unique key for this prayer time
        const timeKey = `${prayer}-${prayerMinutes}-${new Date().toDateString()}`;
        
        // Alert if time matches and we haven't alerted for this time yet today
        if (prayerMinutes === currentMinutes && !checkedTimesRef.current.has(timeKey)) {
          // Mark this time as checked
          checkedTimesRef.current.add(timeKey);
          
          console.log(`MATCH! Playing alert for ${prayer} at ${prayerMinutes}`);
          
          // Play alert sound
          playAlertSound(prayer);
        }
      });
    };
    
    // Check immediately and then every 5 seconds
    checkTimes();
    const interval = setInterval(checkTimes, 5000);
    
    return () => clearInterval(interval);
  }, [detailedTimes, lastCheckedMinute, audioInitializedRef.current]);

  // Reset the checked times at midnight
  useEffect(() => {
    const resetAtMidnight = () => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        console.log("Midnight reset - clearing checked prayer times");
        checkedTimesRef.current.clear();
      }
    };
    
    const midnight = setInterval(resetAtMidnight, 60000);
    return () => clearInterval(midnight);
  }, []);

  return null; // This hook doesn't render anything
};
