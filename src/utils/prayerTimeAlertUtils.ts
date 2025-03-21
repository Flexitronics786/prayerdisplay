
import { PrayerTime, DetailedPrayerTime } from "@/types";
import { getCurrentTime24h } from "@/utils/dateUtils";

// Create a type for our supported prayer notifications
export type PrayerNotificationType = "Fajr" | "Zuhr" | "Asr" | "Maghrib" | "Isha" | "Jummah";

// Interface to track jamat times for the day
export interface DailyJamatTimes {
  [key: string]: string; // Prayer name -> time in HH:MM format
}

/**
 * Get prayer time for a specific prayer
 */
export const getPrayerTime = (
  name: PrayerNotificationType, 
  isJamat: boolean,
  detailedTimes: DetailedPrayerTime | null
): string | null => {
  if (!detailedTimes) return null;
  
  switch (name) {
    case "Fajr":
      return isJamat ? detailedTimes.fajr_jamat : detailedTimes.sehri_end;
    case "Zuhr":
      return isJamat ? detailedTimes.zuhr_jamat : detailedTimes.zuhr_start;
    case "Asr":
      return isJamat ? detailedTimes.asr_jamat : detailedTimes.asr_start;
    case "Maghrib":
      return detailedTimes.maghrib_iftar; // Use start time for Maghrib
    case "Isha":
      return isJamat ? detailedTimes.isha_first_jamat : detailedTimes.isha_start;
    case "Jummah":
      return isJamat ? detailedTimes.zuhr_jamat : detailedTimes.zuhr_start; // Use Zuhr Jamat time for Jummah
    default:
      return null;
  }
};

/**
 * Update daily jamat times from detailed prayer times
 */
export const updateDailyJamatTimes = (detailedTimes: DetailedPrayerTime | null): DailyJamatTimes => {
  if (!detailedTimes) return {};
  
  const jamatTimes: DailyJamatTimes = {};
  const prayers: PrayerNotificationType[] = ["Fajr", "Zuhr", "Asr", "Maghrib", "Isha"];
  
  // Add Jummah on Fridays
  const dayOfWeek = new Date().getDay();
  if (dayOfWeek === 5) { // 5 is Friday
    prayers.push("Jummah");
  }
  
  prayers.forEach(prayer => {
    // For Maghrib use start time, for others use Jamat time
    const useJamat = prayer !== "Maghrib";
    const prayerTime = getPrayerTime(prayer, useJamat, detailedTimes);
    
    if (prayerTime) {
      // Store only the HH:MM part for comparison
      jamatTimes[prayer] = prayerTime.substring(0, 5);
    }
  });
  
  console.log("Updated daily jamat times:", jamatTimes);
  return jamatTimes;
};

/**
 * Check if it's time to play prayer alert
 */
export const checkPrayerTimes = (
  currentTime: string,
  jamatTimes: DailyJamatTimes,
  checkedTimes: Set<string>,
  onPlayAlert: (prayerName: string) => void
): void => {
  // Format: HH:MM
  const currentMinutes = currentTime.substring(0, 5);
  
  // Debug current time check
  console.log(`Checking prayer times at ${currentMinutes}`);
  
  // Check each stored jamat time from our daily record
  Object.entries(jamatTimes).forEach(([prayer, prayerMinutes]) => {
    // Create a unique key for this prayer time
    const timeKey = `${prayer}-${prayerMinutes}-${new Date().toDateString()}`;
    
    // Alert if time matches and we haven't alerted for this time yet today
    if (prayerMinutes === currentMinutes && !checkedTimes.has(timeKey)) {
      // Mark this time as checked
      checkedTimes.add(timeKey);
      
      // Play alert sound
      onPlayAlert(prayer);
      console.log(`Prayer time alert triggered for ${prayer} at ${prayerMinutes}`);
    }
  });
};

/**
 * Compare times to track upcoming prayers
 */
export const isUpcomingPrayer = (
  prayerTime: string, 
  currentTime: string,
  windowMinutes: number = 5
): boolean => {
  try {
    const [prayerHour, prayerMinute] = prayerTime.split(':').map(Number);
    const [currentHour, currentMinute] = currentTime.split(':').map(Number);
    
    const prayerTotalMinutes = prayerHour * 60 + prayerMinute;
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    
    const minutesUntilPrayer = prayerTotalMinutes - currentTotalMinutes;
    
    // Return true if prayer is within the window (but not past)
    return minutesUntilPrayer >= 0 && minutesUntilPrayer <= windowMinutes;
  } catch (error) {
    console.error("Error comparing prayer times:", error);
    return false;
  }
};

