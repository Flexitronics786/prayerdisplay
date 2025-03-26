import { useState, useEffect, useRef } from "react";
import { PrayerTime, DetailedPrayerTime } from "@/types";
import { getCurrentTime24h } from "@/utils/dateUtils";
import { useTVDisplay } from "./useTVDisplay";
import { 
  useAudioInitialization, 
  playAlertSound 
} from "@/utils/audioUtils";
import { 
  updateDailyJamatTimes, 
  shouldAlertForPrayer,
  type DailyJamatTimes
} from "@/utils/prayerTimeUtils";

// Create a unique ID for this hook instance to avoid conflicts with KeepAwake
const PRAYER_ALERT_AUDIO_ID = "prayer-alert-sound";

export const usePrayerTimeAlerts = (
  prayerTimes: PrayerTime[],
  detailedTimes: DetailedPrayerTime | null,
  isSonyFirestick: boolean = false // Add the third parameter with a default value
) => {
  const checkedTimesRef = useRef<Set<string>>(new Set());
  const [lastCheckedMinute, setLastCheckedMinute] = useState<string>("");
  const dailyJamatTimesRef = useRef<DailyJamatTimes>({});
  const { isTV } = useTVDisplay();
  
  // Initialize audio components
  const {
    audioRef,
    audioContextRef,
    audioBufferRef,
    audioSourceRef,
    audioInitializedRef,
    audioLoadAttemptsRef
  } = useAudioInitialization({ isTV, isSonyFirestick });

  // Update daily jamat times at midnight or when detailed times change
  useEffect(() => {
    if (!detailedTimes) return;
    
    // Update the jamat times
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
        if (shouldAlertForPrayer(prayer, prayerMinutes, currentMinutes, checkedTimesRef.current)) {
          // Mark this time as checked
          checkedTimesRef.current.add(`${prayer}-${prayerMinutes}-${new Date().toDateString()}`);
          
          console.log(`⏰ JAMAT TIME ALERT for ${prayer} prayer at ${prayerMinutes} ⏰`);
          
          // Play alert sound and show notification
          playAlertSound(
            prayer, 
            { 
              audioRef, 
              audioContextRef, 
              audioBufferRef, 
              audioSourceRef, 
              audioLoadAttemptsRef 
            },
            { isTV, isSonyFirestick }
          );
        }
      });
    };
    
    // Check immediately and then every 5 seconds (more frequent for reliability)
    checkTimes();
    const interval = setInterval(checkTimes, 5000);
    
    return () => clearInterval(interval);
  }, [detailedTimes, lastCheckedMinute, isTV, isSonyFirestick, audioInitializedRef]);

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
