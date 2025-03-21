
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

  // Initialize audio element and set up the audio file
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        // Use the correct alert-beep.mp3 file that's in the public directory
        const localBeepUrl = "/alert-beep.mp3";
        
        // Create audio element
        if (typeof window !== "undefined" && !audioInitializedRef.current) {
          // Check if we already have an audio element with this ID
          let existingAudio = document.getElementById(PRAYER_ALERT_AUDIO_ID) as HTMLAudioElement;
          
          if (!existingAudio) {
            // Create a new audio element with ID to avoid conflicts
            existingAudio = document.createElement('audio');
            existingAudio.id = PRAYER_ALERT_AUDIO_ID;
            existingAudio.preload = "auto"; // Preload the audio
            existingAudio.volume = isTV ? 1.0 : 0.7; // Higher volume for TV devices
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
          
          // TVs especially need user interaction to unlock audio
          if (isTV) {
            console.log("TV detected, setting up special audio unlock handlers");
          }
          
          // Initialize with a user interaction to bypass autoplay restrictions
          const unlockAudio = () => {
            if (audioRef.current) {
              console.log("Attempting to unlock audio for future playback...");
              // Create a silent buffer to play
              audioRef.current.volume = 0.001;
              audioRef.current.muted = false; // Ensure not muted for FireTV
              
              const playPromise = audioRef.current.play();
              if (playPromise !== undefined) {
                playPromise.then(() => {
                  if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                    audioRef.current.volume = isTV ? 1.0 : 0.7;
                    console.log("Audio unlocked successfully for future playback");
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
          });
          
          // Handle any errors loading the audio
          existingAudio.addEventListener('error', (e) => {
            console.error("Error loading audio file:", e);
            toast({
              title: "Audio Error",
              description: "Failed to load prayer alert sound",
              duration: isTV ? 10000 : 5000,
            });
          });
          
          // Add event listeners to unlock audio on user interaction
          document.addEventListener('click', unlockAudio, { once: true });
          document.addEventListener('touchstart', unlockAudio, { once: true });
          
          // FireStick specific: also try to unlock on keydown events
          if (isTV) {
            const tvUnlockAudio = (e: KeyboardEvent) => {
              console.log("TV key press detected, attempting to unlock audio:", e.key);
              unlockAudio();
              document.removeEventListener('keydown', tvUnlockAudio);
            };
            document.addEventListener('keydown', tvUnlockAudio, { once: true });
            
            // For FireTV, we need additional fallbacks
            setTimeout(() => {
              if (audioRef.current && !audioRef.current.paused) {
                console.log("Auto-unlocking audio after timeout");
                unlockAudio();
              }
            }, 3000);
          }
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
        // IMPORTANT: Always use JAMAT times for alerts, not start times
        const jamatTime = getJamatTime(prayer);
        
        if (jamatTime) {
          // Store only the HH:MM part for comparison
          jamatTimes[prayer] = jamatTime.substring(0, 5);
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

  // Helper to get prayer time for specific prayer - JAMAT TIMES ONLY
  const getJamatTime = (name: PrayerNotificationType): string | null => {
    if (!detailedTimes) return null;
    
    switch (name) {
      case "Fajr":
        return detailedTimes.fajr_jamat;
      case "Zuhr":
        return detailedTimes.zuhr_jamat;
      case "Asr":
        return detailedTimes.asr_jamat;
      case "Maghrib":
        return detailedTimes.maghrib_iftar; // Maghrib uses iftar time
      case "Isha":
        return detailedTimes.isha_first_jamat;
      case "Jummah":
        return detailedTimes.zuhr_jamat; // Use Zuhr Jamat time for Jummah
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
    
    console.log(`Attempting to play alert for ${prayerName} prayer time on ${isTV ? 'TV' : 'regular'} device`);
    
    // Stop any other audio that might be playing
    const allAudioElements = document.querySelectorAll('audio');
    allAudioElements.forEach(audio => {
      if (audio.id !== PRAYER_ALERT_AUDIO_ID && !audio.paused) {
        audio.pause();
      }
    });
    
    // Reset to the beginning 
    audioRef.current.currentTime = 0;
    
    // Set higher volume for TV displays
    audioRef.current.volume = isTV ? 1.0 : 0.7;
    audioRef.current.muted = false; // Ensure not muted for FireTV
    
    // Show a toast notification alongside the sound on TV devices
    if (isTV) {
      toast({
        title: `${prayerName} Prayer Time`,
        description: "It's time for prayer",
        duration: 15000, // Longer duration for TV
      });
    }
    
    // Play the sound multiple times with increasing volume to ensure it's heard
    const attemptToPlay = (attempt = 1, maxAttempts = isTV ? 5 : 3) => {
      if (!audioRef.current) return;
      
      // Ensure audio element is properly set up for TV
      if (isTV && attempt === 1) {
        audioRef.current.muted = false;
        audioRef.current.setAttribute('autoplay', 'true');
        audioRef.current.load(); // Force reload on TV devices
      }
      
      // Increase volume slightly with each attempt, more aggressively for TV
      const volumeIncrement = isTV ? 0.2 : 0.1;
      const baseVolume = isTV ? 0.9 : 0.7;
      audioRef.current.volume = Math.min(baseVolume + (attempt * volumeIncrement), 1.0);
      
      console.log(`Playing alert attempt ${attempt}/${maxAttempts} at volume ${audioRef.current.volume}`);
      
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log(`Alert playing successfully (attempt ${attempt})`);
            // Set a timeout to stop the sound after 2-3 seconds (longer for TV)
            setTimeout(() => {
              if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
                console.log("Prayer notification beep completed");
                
                // For TV devices, try to play again after a short pause for better chance of being heard
                if (isTV && attempt === 1) {
                  setTimeout(() => attemptToPlay(attempt + 1, maxAttempts), 1000);
                }
              }
            }, isTV ? 4000 : 2000); // Longer duration for TV
          })
          .catch(err => {
            console.error(`Error playing prayer alert sound (attempt ${attempt}):`, err);
            
            // Try again with a delay if we haven't reached max attempts
            if (attempt < maxAttempts) {
              setTimeout(() => {
                attemptToPlay(attempt + 1, maxAttempts);
              }, 500);
            } else if (isTV) {
              // Last resort for TV: show a toast notification even if sound fails
              toast({
                title: `${prayerName} Prayer Time`,
                description: "It's time for prayer (sound playback failed)",
                duration: 15000,
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
        
        // Special TV debugging
        if (isTV) {
          console.log(`Checking ${prayer} jamat time ${prayerMinutes} against current time ${currentMinutes}`);
        }
        
        // Alert if time matches and we haven't alerted for this time yet today
        if (prayerMinutes === currentMinutes && !checkedTimesRef.current.has(timeKey)) {
          // Mark this time as checked
          checkedTimesRef.current.add(timeKey);
          console.log(`Prayer time alert triggered for ${prayer} at ${prayerMinutes}`);
          
          // Play alert sound and show notification
          playAlertSound(prayer);
        }
      });
    };
    
    // Check immediately and then every 10 seconds
    checkTimes();
    const interval = setInterval(checkTimes, 10000);
    
    return () => clearInterval(interval);
  }, [detailedTimes, lastCheckedMinute, audioInitializedRef.current, isTV, toast]);

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
