import { useState, useEffect, useRef } from "react";
import { PrayerTime, DetailedPrayerTime } from "@/types";
import { getCurrentTime24h } from "@/utils/dateUtils";
import { supabase } from "@/integrations/supabase/client";
import { useTVDisplay } from "@/hooks/useTVDisplay";
import { useToast } from "@/hooks/use-toast";

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
  const isTV = useTVDisplay();
  const { toast } = useToast();
  const audioInitAttemptRef = useRef<number>(0);
  const maxInitAttempts = 5;

  // Initialize audio element and set up the audio file - now with better error handling and retries
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        // First remove any existing audio element with our ID to avoid duplicates
        const existingAudioElement = document.getElementById(PRAYER_ALERT_AUDIO_ID);
        if (existingAudioElement) {
          existingAudioElement.remove();
          console.log("Removed existing prayer alert audio element");
        }
        
        // Use the correct alert-beep.mp3 file that's in the public directory
        const localBeepUrl = "/alert-beep.mp3";
        
        // Create audio element
        if (typeof window !== "undefined" && !audioInitializedRef.current) {
          // Create a new audio element with ID to avoid conflicts
          const newAudio = document.createElement('audio');
          newAudio.id = PRAYER_ALERT_AUDIO_ID;
          newAudio.preload = "auto"; // Preload the audio
          newAudio.volume = isTV ? 1.0 : 0.7; // Higher volume for TV devices
          
          // Set the source to the local file
          const localSource = document.createElement('source');
          localSource.src = localBeepUrl;
          localSource.type = 'audio/mpeg';
          newAudio.appendChild(localSource);
          
          // Append to body last to ensure it's fully configured first
          document.body.appendChild(newAudio);
          
          console.log(`Created prayer alert audio element with local source: ${localBeepUrl} (attempt ${audioInitAttemptRef.current + 1})`);
          
          audioRef.current = newAudio;
          setAudioUrl(localBeepUrl);
          
          // FireStick specific: try to unlock on keydown events
          if (isTV) {
            const tvUnlockAudio = () => {
              unlockAudio();
              // Don't remove event listener, FireStick might need multiple attempts
            };
            document.addEventListener('keydown', tvUnlockAudio);
            
            // Also try to unlock on remote button presses (FireStick)
            document.addEventListener('keyup', tvUnlockAudio);
          }

          // Initialize with a user interaction to bypass autoplay restrictions
          const unlockAudio = () => {
            if (audioRef.current) {
              // Create a silent buffer to play
              const originalVolume = audioRef.current.volume;
              audioRef.current.volume = 0.001;
              const playPromise = audioRef.current.play();
              if (playPromise !== undefined) {
                playPromise.then(() => {
                  if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                    audioRef.current.volume = originalVolume;
                    
                    // Mark as initialized only after successful play
                    audioInitializedRef.current = true;
                    console.log("Prayer audio unlocked for future playback");
                    
                    // Display confirmation toast on TV
                    if (isTV) {
                      toast({
                        title: "Prayer Alerts Ready",
                        description: "Audio notification system initialized",
                        duration: 5000,
                      });
                    }
                  }
                }).catch(e => {
                  console.warn("Prayer audio unlock failed, will try again:", e);
                  
                  // Increment attempt counter
                  audioInitAttemptRef.current++;
                  
                  // Try again if under max attempts
                  if (audioInitAttemptRef.current < maxInitAttempts) {
                    setTimeout(() => initializeAudio(), 2000);
                  } else if (isTV) {
                    // Notify user of issues on TV
                    toast({
                      title: "Prayer Alert Notice",
                      description: "Audio notifications may not work due to browser restrictions. Please interact with the screen.",
                      duration: 10000,
                    });
                  }
                });
              }
            }
          };
          
          // Test the audio file on load
          newAudio.addEventListener('loadeddata', () => {
            console.log("Prayer alert audio file loaded and ready to play");
            unlockAudio(); // Try to unlock immediately after load
          });
          
          // Handle any errors loading the audio
          newAudio.addEventListener('error', (e) => {
            console.error("Error loading prayer alert audio file:", e);
            audioInitAttemptRef.current++;
            
            // Try again with a delay if we haven't reached max attempts
            if (audioInitAttemptRef.current < maxInitAttempts) {
              setTimeout(() => initializeAudio(), 2000);
            }
          });
          
          // Add event listeners to unlock audio on user interaction
          document.addEventListener('click', unlockAudio, { once: true });
          document.addEventListener('touchstart', unlockAudio, { once: true });
        }
      } catch (error) {
        console.error("Error setting up prayer alert audio:", error);
        
        // Try again if under max attempts
        audioInitAttemptRef.current++;
        if (audioInitAttemptRef.current < maxInitAttempts) {
          setTimeout(() => initializeAudio(), 2000);
        }
      }
    };

    initializeAudio();
    
    return () => {
      // Don't remove the audio element on cleanup, just release our reference
      audioRef.current = null;
    };
  }, [isTV, toast]);

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

  // Function to play the alert sound for exactly 1 second - improved for FireStick
  const playAlertSound = (prayerName: string) => {
    if (!audioRef.current) {
      console.error("Prayer alert audio reference not available");
      
      // Show toast notification even if audio fails on TV
      if (isTV) {
        toast({
          title: `${prayerName} Prayer Time`,
          description: "It's time for prayer (audio unavailable)",
          duration: 15000,
        });
      }
      return;
    }
    
    // Stop any other audio that might be playing
    const allAudioElements = document.querySelectorAll('audio');
    allAudioElements.forEach(audio => {
      if (audio.id !== PRAYER_ALERT_AUDIO_ID && !audio.paused) {
        try {
          audio.pause();
        } catch (e) {
          console.warn("Could not pause other audio:", e);
        }
      }
    });
    
    // Reset to the beginning 
    audioRef.current.currentTime = 0;
    
    // Set higher volume for TV displays
    audioRef.current.volume = isTV ? 1.0 : 0.7;
    
    console.log(`Playing alert for ${prayerName} prayer time on ${isTV ? 'TV' : 'regular'} device`);
    
    // Show a toast notification alongside the sound on TV devices
    if (isTV) {
      toast({
        title: `${prayerName} Prayer Time`,
        description: "It's time for prayer",
        duration: 15000, // Even longer duration for TV
      });
    }
    
    // Play the sound multiple times with increasing volume to ensure it's heard
    const attemptToPlay = (attempt = 1, maxAttempts = isTV ? 8 : 3) => {
      if (!audioRef.current) return;
      
      // Increase volume slightly with each attempt, more aggressively for TV
      const volumeIncrement = isTV ? 0.05 : 0.1;
      const baseVolume = isTV ? 1.0 : 0.7;
      audioRef.current.volume = Math.min(baseVolume + (attempt * volumeIncrement), 1.0);
      
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Set a timeout to stop the sound after longer duration on TV
            setTimeout(() => {
              if (audioRef.current) {
                // For TV devices, don't pause but let it play through entire sound
                if (!isTV) {
                  audioRef.current.pause();
                  audioRef.current.currentTime = 0;
                }
                console.log(`Prayer notification beep completed (attempt ${attempt})`);
                
                // For TV devices, try to play again after a short pause for better chance of being heard
                if (isTV && attempt < 3) {
                  setTimeout(() => attemptToPlay(attempt + 1, maxAttempts), 3000);
                }
              }
            }, isTV ? 5000 : 2000); // Much longer duration for TV
          })
          .catch(err => {
            console.error(`Error playing prayer alert sound (attempt ${attempt}):`, err);
            
            // Try again with a delay if we haven't reached max attempts
            if (attempt < maxAttempts) {
              setTimeout(() => {
                attemptToPlay(attempt + 1, maxAttempts);
              }, 1000);
            } else if (isTV) {
              // Last resort for TV: show a toast notification even if sound fails
              toast({
                title: `${prayerName} Prayer Time`,
                description: "It's time for prayer (sound playback failed)",
                duration: 20000, // Very long duration when audio fails
              });
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
      
      // Check each stored jamat time from our daily record
      Object.entries(dailyJamatTimesRef.current).forEach(([prayer, prayerMinutes]) => {
        // Create a unique key for this prayer time
        const timeKey = `${prayer}-${prayerMinutes}-${new Date().toDateString()}`;
        
        // Alert if time matches and we haven't alerted for this time yet today
        if (prayerMinutes === currentMinutes && !checkedTimesRef.current.has(timeKey)) {
          // Mark this time as checked
          checkedTimesRef.current.add(timeKey);
          
          // Play alert sound and show notification
          playAlertSound(prayer);
        }
      });
    };
    
    // Check immediately and then every 10 seconds
    checkTimes();
    const interval = setInterval(checkTimes, 10000);
    
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
