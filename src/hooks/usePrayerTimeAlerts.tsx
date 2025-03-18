
import { useState, useEffect, useRef } from "react";
import { PrayerTime, DetailedPrayerTime } from "@/types";
import { getCurrentTime24h } from "@/utils/dateUtils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Create a type for our supported prayer notifications
type PrayerNotificationType = "Fajr" | "Zuhr" | "Asr" | "Maghrib" | "Isha" | "Jummah";

export const usePrayerTimeAlerts = (
  prayerTimes: PrayerTime[],
  detailedTimes: DetailedPrayerTime | null
) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const checkedTimesRef = useRef<Set<string>>(new Set());
  const [lastCheckedMinute, setLastCheckedMinute] = useState<string>("");
  const [audioUrl, setAudioUrl] = useState<string>("");

  // Initialize audio element and fetch the audio URL from Supabase
  useEffect(() => {
    const fetchAudioUrl = async () => {
      try {
        const { data, error } = await supabase.storage
          .from('audio')
          .createSignedUrl('beep-125033.mp3', 60 * 60 * 24); // 24 hour signed URL
        
        if (error) {
          console.error("Error fetching audio URL:", error);
          return;
        }
        
        if (data) {
          setAudioUrl(data.signedUrl);
          
          // Create audio element once we have the URL
          if (typeof window !== "undefined") {
            audioRef.current = new Audio(data.signedUrl);
            audioRef.current.volume = 0.7;
          }
        }
      } catch (error) {
        console.error("Error setting up audio:", error);
      }
    };

    fetchAudioUrl();
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

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
  const playAlertSound = () => {
    if (!audioRef.current) return;
    
    // Reset to the beginning and play
    audioRef.current.currentTime = 0;
    
    // Play the sound
    const playPromise = audioRef.current.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // Set a timeout to stop the sound after 1 second
          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
            }
          }, 1000); // 1 second duration
        })
        .catch(err => {
          console.error("Error playing alert sound:", err);
        });
    }
  };

  // Check and play alerts
  useEffect(() => {
    if (!detailedTimes || !audioUrl) return;
    
    const checkTimes = () => {
      const currentTime24h = getCurrentTime24h();
      // Only check once per minute
      if (currentTime24h === lastCheckedMinute) return;
      setLastCheckedMinute(currentTime24h);
      
      // Format: HH:MM
      const currentMinutes = currentTime24h.substring(0, 5);
      
      // Check each prayer time
      const prayers: PrayerNotificationType[] = ["Fajr", "Zuhr", "Asr", "Maghrib", "Isha"];
      
      // Get current day of week (0 = Sunday, 1 = Monday, ..., 5 = Friday, ...)
      const dayOfWeek = new Date().getDay();
      
      // Add Jummah to the notification list on Fridays (day 5)
      if (dayOfWeek === 5) {
        prayers.push("Jummah");
      }
      
      prayers.forEach(prayer => {
        // For Maghrib use start time, for others use Jamat time
        const useJamat = prayer !== "Maghrib";
        const prayerTime = getPrayerTime(prayer, useJamat);
        
        if (!prayerTime) return;
        
        // We only care about HH:MM format for comparison
        const prayerMinutes = prayerTime.substring(0, 5);
        
        // Create a unique key for this prayer time
        const timeKey = `${prayer}-${prayerMinutes}-${new Date().toDateString()}`;
        
        // Alert if time matches and we haven't alerted for this time yet today
        if (prayerMinutes === currentMinutes && !checkedTimesRef.current.has(timeKey)) {
          // Mark this time as checked
          checkedTimesRef.current.add(timeKey);
          
          // Play alert sound for 1 second
          playAlertSound();
          
          // Show toast notification
          toast.success(`${prayer} ${prayer === "Maghrib" ? "start" : "Jamat"} time`, {
            description: `It's time for ${prayer} ${prayer === "Maghrib" ? "" : "Jamat"}`,
            duration: 6000,
          });
        }
      });
    };
    
    // Check immediately and then every 10 seconds
    checkTimes();
    const interval = setInterval(checkTimes, 10000);
    
    return () => clearInterval(interval);
  }, [detailedTimes, lastCheckedMinute, prayerTimes, audioUrl]);

  // Reset the checked times at midnight
  useEffect(() => {
    const resetAtMidnight = () => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        checkedTimesRef.current.clear();
      }
    };
    
    const midnight = setInterval(resetAtMidnight, 60000);
    return () => clearInterval(midnight);
  }, []);

  return null; // This hook doesn't render anything
};
