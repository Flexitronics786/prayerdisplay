import { Hadith, PrayerTime, DailyHadith } from "@/types";
import { supabase } from "@/integrations/supabase/client";

const PRAYER_TIMES_KEY = 'local-prayer-times';
const HADITH_KEY = 'daily-hadith';

// Helper function to get current time in HH:mm format
const getCurrentTime24h = (): string => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

// Helper function to check if a time is before another time
const isTimeBefore = (time1: string, time2: string): boolean => {
  const [hours1, minutes1] = time1.split(':').map(Number);
  const [hours2, minutes2] = time2.split(':').map(Number);

  if (hours1 < hours2) {
    return true;
  } else if (hours1 === hours2) {
    return minutes1 < minutes2;
  } else {
    return false;
  }
};

// Fetch prayer times from local storage
export const fetchLocalPrayerTimes = (): PrayerTime[] => {
  try {
    const storedTimes = localStorage.getItem(PRAYER_TIMES_KEY);
    return storedTimes ? JSON.parse(storedTimes) : [];
  } catch (error) {
    console.error('Error fetching prayer times from local storage:', error);
    return [];
  }
};

// Fetch prayer times from Supabase
export const fetchPrayerTimes = async (): Promise<PrayerTime[]> => {
  try {
    // Fetch prayer times from local storage first
    let prayerTimes = fetchLocalPrayerTimes();
    
    // If local storage is empty, fetch from Supabase
    if (!prayerTimes.length) {
      console.log("Fetching prayer times from Supabase...");
      const { data, error } = await supabase
        .from('prayer_times')
        .select('*');

      if (error) {
        console.error("Error fetching prayer times from Supabase:", error);
        throw error;
      }

      prayerTimes = data as PrayerTime[];

      // Store the fetched prayer times in local storage
      localStorage.setItem(PRAYER_TIMES_KEY, JSON.stringify(prayerTimes));
    } else {
      console.log("Using prayer times from local storage.");
    }

    // Mark active and next prayers
    prayerTimes = markActivePrayer(prayerTimes);
    
    return prayerTimes;
  } catch (error) {
    console.error("Error fetching prayer times:", error);
    return [];
  }
};

// Fetch hadith from local storage
export const fetchLocalHadith = (): Hadith | null => {
  try {
    const storedHadith = localStorage.getItem(HADITH_KEY);
    return storedHadith ? JSON.parse(storedHadith) : null;
  } catch (error) {
    console.error('Error fetching hadith from local storage:', error);
    return null;
  }
};

// Fetch a single hadith for the current day from Supabase
export const fetchHadith = async (): Promise<Hadith | null> => {
  try {
    // Get today's date
    const today = new Date();
    const dayOfMonth = today.getDate();
    const currentMonth = today.toISOString().substring(0, 7); // YYYY-MM format
    
    // First, try to fetch the hadith from local storage
    let hadith = fetchLocalHadith();
    
    // If hadith is not in local storage, fetch from Supabase
    if (!hadith) {
      console.log("Fetching hadith from Supabase...");
      const { data, error } = await supabase
        .from('daily_hadiths')
        .select('*')
        .eq('day_of_month', dayOfMonth)
        .eq('month', currentMonth)
        .single();
      
      if (error) {
        console.error("Error fetching hadith from Supabase:", error);
        return null;
      }
      
      if (data) {
        hadith = {
          id: data.id,
          text: data.text,
          source: data.source,
          lastUpdated: new Date().toISOString(),
        };
        
        // Store the fetched hadith in local storage
        localStorage.setItem(HADITH_KEY, JSON.stringify(hadith));
      }
    } else {
      console.log("Using hadith from local storage.");
    }
    
    return hadith;
  } catch (error) {
    console.error("Error fetching hadith:", error);
    return null;
  }
};

// Helper function to mark the active and next prayers
const markActivePrayer = (prayerTimes: PrayerTime[]): PrayerTime[] => {
  const now = getCurrentTime24h();
  
  // Sort times to determine current and next
  const sortedTimes = [...prayerTimes].sort((a, b) => {
    return a.time.localeCompare(b.time);
  });
  
  // Find current prayer
  let activeIndex = -1;
  let nextIndex = -1;

  // First find if any prayer is happening now
  for (let i = 0; i < sortedTimes.length - 1; i++) {
    const currentPrayer = sortedTimes[i];
    const nextPrayer = sortedTimes[i + 1];
    
    // If current time is after current prayer and before next prayer
    if (!isTimeBefore(now, currentPrayer.time) && isTimeBefore(now, nextPrayer.time)) {
      activeIndex = i;
      nextIndex = i + 1;
      break;
    }
  }
  
  // If no prayer is active, find the next prayer
  if (activeIndex === -1) {
    for (let i = 0; i < sortedTimes.length; i++) {
      if (isTimeBefore(now, sortedTimes[i].time)) {
        nextIndex = i;
        break;
      }
    }
    
    // If we've passed the last prayer of the day, the next prayer is the first one tomorrow
    if (nextIndex === -1) {
      nextIndex = 0;
    }
  }
  
  // Mark active and next prayers
  return sortedTimes.map((prayer, index) => ({
    ...prayer,
    isActive: index === activeIndex,
    isNext: index === nextIndex
  }));
};

// Re-export the function that HadithEditor depends on
export const updateHadith = (hadith: Hadith): void => {
  console.log("updateHadith function called but is deprecated", hadith);
  // This function is kept for compatibility but doesn't do anything
  // It was already defined in the file but we're ensuring it's exported
};

// Add the function that PrayerTimesEditor depends on
export const updatePrayerTimes = (prayerTimes: PrayerTime[]): void => {
  try {
    localStorage.setItem(PRAYER_TIMES_KEY, JSON.stringify(prayerTimes));
  } catch (error) {
    console.error('Error updating prayer times:', error);
  }
};
