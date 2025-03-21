
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

  // Initialize audio element and fetch the audio URL from Supabase
  useEffect(() => {
    const fetchAudioUrl = async () => {
      try {
        // First try to use a local file from the public directory
        const localBeepUrl = "/beep-125033.mp3";
        
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
            existingAudio.muted = false; // Ensure not muted
            document.body.appendChild(existingAudio);
            
            // Try to load the local file first
            const localSource = document.createElement('source');
            localSource.src = localBeepUrl;
            localSource.type = 'audio/mpeg';
            existingAudio.appendChild(localSource);
            
            console.log("Created prayer alert audio element with local source:", localBeepUrl);
          }
          
          audioRef.current = existingAudio;
          setAudioUrl(localBeepUrl);
          audioInitializedRef.current = true;
          
          // Add fallback to Supabase if local file fails
          existingAudio.addEventListener('error', async () => {
            console.log("Local audio file failed, trying Supabase fallback");
            
            try {
              const { data, error } = await supabase.storage
                .from('audio')
                .createSignedUrl('beep-125033.mp3', 60 * 60 * 24); // 24 hour signed URL
              
              if (error) {
                console.error("Error fetching audio URL from Supabase:", error);
                return;
              }
              
              if (data) {
                setAudioUrl(data.signedUrl);
                if (audioRef.current) {
                  // Clear existing sources
                  while (audioRef.current.firstChild) {
                    audioRef.current.removeChild(audioRef.current.firstChild);
                  }
                  
                  // Add Supabase source
                  const supabaseSource = document.createElement('source');
                  supabaseSource.src = data.signedUrl;
                  supabaseSource.type = 'audio/mpeg';
                  audioRef.current.appendChild(supabaseSource);
                  
                  console.log("Added Supabase fallback audio source");
                }
              }
            } catch (error) {
              console.error("Error setting up Supabase audio fallback:", error);
            }
          });
          
          // Initialize with a user interaction to bypass autoplay restrictions
          const unlockAudio = () => {
            if (audioRef.current) {
              // Create a silent buffer to play
              audioRef.current.volume = 0.001;
              audioRef.current.muted = false; // Ensure not muted
              const playPromise = audioRef.current.play();
              if (playPromise !== undefined) {
                playPromise.then(() => {
                  if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                    audioRef.current.volume = 1.0; // Set to max volume
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
          
          // Add event listeners to unlock audio on user interaction
          document.addEventListener('click', unlockAudio, { once: true });
          document.addEventListener('touchstart', unlockAudio, { once: true });
        }
      } catch (error) {
        console.error("Error setting up audio:", error);
      }
    };

    fetchAudioUrl();
    
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

  // Function to play the alert sound once
  const playAlertSound = (prayerName: string) => {
    if (!audioRef.current) {
      console.error("Audio reference not available");
      return;
    }
    
    // For TV devices, create a new audio element for better compatibility
    const isTV = window.navigator.userAgent.toLowerCase().includes('tv') || 
                 window.navigator.userAgent.toLowerCase().includes('firetv') ||
                 window.navigator.userAgent.toLowerCase().includes('fire tv') ||
                 window.navigator.userAgent.toLowerCase().includes('webos') ||
                 window.navigator.userAgent.toLowerCase().includes('tizen');
                 
    if (isTV) {
      console.log("TV device detected, using special playback method for:", prayerName);
      
      // Create a temporary audio element for this specific play
      const tempAudio = new Audio(audioUrl || "/beep-125033.mp3");
      tempAudio.volume = 1.0;
      tempAudio.muted = false;
      tempAudio.autoplay = true;
      
      // Force loading and playing
      tempAudio.load();
      tempAudio.play().then(() => {
        console.log(`Playing TV alert sound for ${prayerName} prayer time`);
      }).catch(err => {
        console.error(`TV audio playback failed for ${prayerName}:`, err);
      });
      
      return;
    }
    
    // For non-TV devices, use the standard approach
    try {
      // Stop any current playback
      if (!audioRef.current.paused) {
        audioRef.current.pause();
      }
      
      // Reset to the beginning 
      audioRef.current.currentTime = 0;
      audioRef.current.volume = 1.0; // Full volume
      audioRef.current.muted = false; // Ensure not muted
      
      console.log(`Playing alert for ${prayerName} prayer time`);
      
      // Play the sound once
      audioRef.current.play().then(() => {
        console.log(`Alert sound played successfully for ${prayerName}`);
      }).catch(err => {
        console.error(`Error playing alert sound for ${prayerName}:`, err);
        
        // Fallback to a new Audio instance if the main one fails
        try {
          const fallbackAudio = new Audio(audioUrl || "/beep-125033.mp3");
          fallbackAudio.volume = 1.0;
          fallbackAudio.play().catch(e => console.error("Fallback audio also failed:", e));
        } catch (fallbackError) {
          console.error("Complete audio failure:", fallbackError);
        }
      });
    } catch (error) {
      console.error("Error during sound playback:", error);
    }
  };

  // Check for prayer times more frequently (every 5 seconds)
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
          
          // Play alert sound (no toast)
          playAlertSound(prayer);
          console.log(`Prayer time alert for ${prayer} at ${prayerMinutes}`);
        }
      });
    };
    
    // Check immediately and then every 5 seconds (more frequent checks)
    checkTimes();
    const interval = setInterval(checkTimes, 5000);
    
    return () => clearInterval(interval);
  }, [detailedTimes, lastCheckedMinute, audioUrl, audioInitializedRef.current]);

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
