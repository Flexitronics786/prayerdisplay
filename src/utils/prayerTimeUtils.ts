
import { DetailedPrayerTime } from "@/types";
import { getCurrentTime24h } from "@/utils/dateUtils";

// Type for our supported prayer notifications
export type PrayerNotificationType = "Fajr" | "Zuhr" | "Asr" | "Maghrib" | "Isha" | "Jummah";

// Interface to track jamat times for the day
export interface DailyJamatTimes {
  [key: string]: string; // Prayer name -> time in HH:MM format
}

// Update daily jamat times for tracking and alerting
export const updateDailyJamatTimes = (detailedTimes: DetailedPrayerTime | null): DailyJamatTimes => {
  const jamatTimes: DailyJamatTimes = {};
  
  if (!detailedTimes) return jamatTimes;
  
  const prayers: PrayerNotificationType[] = ["Fajr", "Zuhr", "Asr", "Maghrib", "Isha"];
  
  // Add Jummah on Fridays
  const dayOfWeek = new Date().getDay();
  if (dayOfWeek === 5) {
    prayers.push("Jummah");
  }
  
  prayers.forEach(prayer => {
    let prayerTime: string | null = null;
    
    // Get the appropriate time for each prayer
    switch (prayer) {
      case "Fajr":
        prayerTime = detailedTimes.fajr_jamat;
        break;
      case "Zuhr":
        prayerTime = detailedTimes.zuhr_jamat;
        break;
      case "Asr":
        prayerTime = detailedTimes.asr_jamat;
        break;
      case "Maghrib":
        prayerTime = detailedTimes.maghrib_iftar; // Use start time for Maghrib
        break;
      case "Isha":
        prayerTime = detailedTimes.isha_first_jamat;
        break;
      case "Jummah":
        prayerTime = detailedTimes.zuhr_jamat; // Use Zuhr Jamat time for Jummah
        break;
    }
    
    if (prayerTime) {
      // Store only the HH:MM part for comparison
      jamatTimes[prayer] = prayerTime.substring(0, 5);
    }
  });
  
  console.log("Updated daily jamat times:", jamatTimes);
  return jamatTimes;
};

// Check if a prayer time matches the current time and should trigger an alert
export const shouldAlertForPrayer = (
  prayer: string,
  prayerMinutes: string,
  currentMinutes: string,
  checkedTimes: Set<string>
): boolean => {
  // Create a unique key for this prayer time
  const timeKey = `${prayer}-${prayerMinutes}-${new Date().toDateString()}`;
  
  // Alert if time matches and we haven't alerted for this time yet today
  if (prayerMinutes === currentMinutes && !checkedTimes.has(timeKey)) {
    return true;
  }
  
  return false;
};
