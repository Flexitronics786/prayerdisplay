
import { useState, useEffect, useRef } from "react";
import { PrayerTime, DetailedPrayerTime } from "@/types";
import { getCurrentTime24h } from "@/utils/dateUtils";
import { 
  initializeAudioElement, 
  setupAudioFallback, 
  unlockAudio,
  playAlertSound 
} from "@/utils/audioUtils";
import {
  DailyJamatTimes,
  updateDailyJamatTimes,
  checkPrayerTimes
} from "@/utils/prayerTimeAlertUtils";

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

  // Initialize audio element and fetch the audio URL
  useEffect(() => {
    const initializeAudio = () => {
      try {
        // Create audio element
        if (typeof window !== "undefined" && !audioInitializedRef.current) {
          const audioElement = initializeAudioElement();
          if (!audioElement) return;
          
          audioRef.current = audioElement;
          setAudioUrl("/beep-125033.mp3");
          audioInitializedRef.current = true;
          
          // Add fallback to Supabase if local file fails
          setupAudioFallback(audioElement, (url) => setAudioUrl(url));
          
          // Initialize with a user interaction to bypass autoplay restrictions
          const handleUserInteraction = () => {
            if (audioRef.current) {
              unlockAudio(audioRef.current);
            }
            
            // Remove event listeners after one use
            document.removeEventListener('click', handleUserInteraction);
            document.removeEventListener('touchstart', handleUserInteraction);
          };
          
          // Add event listeners to unlock audio on user interaction
          document.addEventListener('click', handleUserInteraction, { once: true });
          document.addEventListener('touchstart', handleUserInteraction, { once: true });
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
    
    // Update immediately
    dailyJamatTimesRef.current = updateDailyJamatTimes(detailedTimes);
    
    // Set up a timer to update at midnight
    const midnight = new Date();
    midnight.setHours(24, 0, 5, 0); // 12:00:05 AM next day
    const now = new Date();
    const msUntilMidnight = midnight.getTime() - now.getTime();
    
    const midnightTimer = setTimeout(() => {
      dailyJamatTimesRef.current = updateDailyJamatTimes(detailedTimes);
    }, msUntilMidnight);
    
    return () => clearTimeout(midnightTimer);
  }, [detailedTimes]);

  // Function to play the alert sound once
  const handlePlayAlert = (prayerName: string) => {
    playAlertSound(prayerName, audioRef.current, audioUrl);
  };

  // Check for prayer times frequently (every 5 seconds)
  useEffect(() => {
    if (!detailedTimes || !audioInitializedRef.current) return;
    
    const checkTimes = () => {
      const currentTime24h = getCurrentTime24h();
      // Only check once per minute
      if (currentTime24h === lastCheckedMinute) return;
      setLastCheckedMinute(currentTime24h);
      
      checkPrayerTimes(
        currentTime24h, 
        dailyJamatTimesRef.current, 
        checkedTimesRef.current,
        handlePlayAlert
      );
    };
    
    // Check immediately and then every 5 seconds
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
