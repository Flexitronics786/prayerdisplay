
import { PrayerTime, DetailedPrayerTime } from "@/types";

// Cache keys
export const PRAYER_TIMES_KEY = 'mosque-prayer-times';
export const CACHE_TIMESTAMP_KEY = 'prayer-times-last-refresh';

// Helper function to check if cache is stale (older than 5 minutes)
export const isCacheStale = (): boolean => {
  const lastRefresh = localStorage.getItem(CACHE_TIMESTAMP_KEY);
  if (!lastRefresh) return true;
  
  const lastRefreshTime = parseInt(lastRefresh, 10);
  const now = Date.now();
  const cacheDuration = 5 * 60 * 1000; // 5 minutes
  
  return (now - lastRefreshTime) > cacheDuration;
};

// Helper function to update cache timestamp
export const updateCacheTimestamp = (): void => {
  localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
};

// Clear local storage caches when needed
export const clearPrayerTimesCache = (): void => {
  localStorage.removeItem('local-prayer-times');
  localStorage.removeItem(PRAYER_TIMES_KEY);
  localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  console.log('Prayer times cache cleared');
};

// Helper function to store prayer times in local storage
export const savePrayerTimesToLocalStorage = (
  prayerTimes: PrayerTime[] | DetailedPrayerTime[]
): void => {
  try {
    localStorage.setItem(PRAYER_TIMES_KEY, JSON.stringify(prayerTimes));
  } catch (error) {
    console.error('Error saving prayer times to local storage:', error);
  }
};

// Helper function to store detailed prayer times to local cache
export const saveDetailedPrayerTimesToLocalCache = (
  prayerTimes: DetailedPrayerTime[],
  todayOnly: boolean = false
): void => {
  try {
    const localTimes = localStorage.getItem('local-prayer-times');
    const parsedTimes = localTimes ? JSON.parse(localTimes) : [];
    
    if (todayOnly && prayerTimes.length > 0) {
      // If just saving today's entry, remove any existing entries for today
      const today = new Date().toISOString().split('T')[0];
      const filteredTimes = parsedTimes.filter((entry: any) => entry.date !== today);
      
      // Add just today's entry
      const todayEntry = prayerTimes.find(pt => pt.date === today);
      if (todayEntry) {
        filteredTimes.push(todayEntry);
        localStorage.setItem('local-prayer-times', JSON.stringify(filteredTimes));
      }
    } else {
      // Save all provided prayer times, replacing any with matching dates
      const mergedTimes = [...parsedTimes];
      
      // Remove entries that will be replaced
      prayerTimes.forEach(newEntry => {
        const index = mergedTimes.findIndex((item: any) => item.date === newEntry.date);
        if (index !== -1) {
          mergedTimes.splice(index, 1);
        }
      });
      
      // Add all new entries
      mergedTimes.push(...prayerTimes);
      
      localStorage.setItem('local-prayer-times', JSON.stringify(mergedTimes));
    }
    
    console.log("Updated local storage with prayer times");
  } catch (storageError) {
    console.error("Error updating local storage:", storageError);
  }
};

// Helper function to get today's prayer times from local cache
export const getTodaysPrayerTimesFromCache = (): DetailedPrayerTime | null => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const localTimes = localStorage.getItem('local-prayer-times');
    
    if (localTimes) {
      const parsedTimes = JSON.parse(localTimes);
      const todayEntry = parsedTimes.find((entry: any) => entry.date === today);
      return todayEntry || null;
    }
    
    return null;
  } catch (error) {
    console.error("Error retrieving today's prayer times from cache:", error);
    return null;
  }
};

// Helper function to get all prayer times from local cache
export const getAllPrayerTimesFromCache = (): DetailedPrayerTime[] => {
  try {
    const localTimes = localStorage.getItem('local-prayer-times');
    return localTimes ? JSON.parse(localTimes) : [];
  } catch (error) {
    console.error("Error retrieving all prayer times from cache:", error);
    return [];
  }
};
