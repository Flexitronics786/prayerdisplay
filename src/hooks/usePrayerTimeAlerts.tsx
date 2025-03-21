
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
  const userInteractionOccurredRef = useRef<boolean>(false);

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
          
          console.log("Prayer alert audio system initialized");
          
          // Try to initialize audio immediately for browsers that allow it
          unlockAudio(audioElement);
        }
      } catch (error) {
        console.error("Error setting up audio:", error);
      }
    };

    initializeAudio();
    
    return () => {
      // Don't remove the audio element on cleanup, just release our reference
      audioRef.current = null;
    };
  }, []);

  // Listen for user interaction to unlock audio
  useEffect(() => {
    if (!audioRef.current || userInteractionOccurredRef.current) return;
    
    const handleUserInteraction = () => {
      if (audioRef.current && !userInteractionOccurredRef.current) {
        unlockAudio(audioRef.current);
        userInteractionOccurredRef.current = true;
        console.log("Audio unlocked via user interaction");
      }
    };
    
    // Add event listeners to unlock audio on user interaction
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
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
      checkedTimesRef.current.clear(); // Reset checked times at midnight
      dailyJamatTimesRef.current = updateDailyJamatTimes(detailedTimes);
    }, msUntilMidnight);
    
    return () => clearTimeout(midnightTimer);
  }, [detailedTimes]);

  // Function to play the alert sound once
  const handlePlayAlert = (prayerName: string) => {
    console.log(`Prayer time alert triggered for ${prayerName}`);
    playAlertSound(prayerName, audioRef.current, audioUrl);
  };

  // Check for prayer times every few seconds
  useEffect(() => {
    if (!detailedTimes) return;
    
    const checkTimes = () => {
      const currentTime24h = getCurrentTime24h();
      // Only check once per minute
      if (currentTime24h.substring(0, 5) === lastCheckedMinute) return;
      setLastCheckedMinute(currentTime24h.substring(0, 5));
      
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
  }, [detailedTimes, lastCheckedMinute, audioUrl]);

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

