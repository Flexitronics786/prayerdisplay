
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

/**
 * Update daily jamat times from detailed prayer times
 */
export const updateDailyJamatTimes = (detailedTimes: DetailedPrayerTime | null): DailyJamatTimes => {
  if (!detailedTimes) return {};
  
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
      console.log(`Prayer time alert for ${prayer} at ${prayerMinutes}`);
    }
  });
};
