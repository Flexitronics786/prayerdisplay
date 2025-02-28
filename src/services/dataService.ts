import { Hadith, PrayerTime, User, DetailedPrayerTime } from "@/types";
import { getCurrentTime24h, isTimeBefore } from "@/utils/dateUtils";
import { supabase } from "@/integrations/supabase/client";

// This would be replaced with an actual API call to Supabase or Firebase
const PRAYER_TIMES_KEY = 'mosque-prayer-times';
const HADITH_KEY = 'mosque-hadith';
const USER_KEY = 'mosque-user';

// Default prayer times (example)
const defaultPrayerTimes: PrayerTime[] = [
  { id: '1', name: 'Fajr', time: '05:30' },
  { id: '2', name: 'Dhuhr', time: '12:30' },
  { id: '3', name: 'Asr', time: '15:45' },
  { id: '4', name: 'Maghrib', time: '18:15' },
  { id: '5', name: 'Isha', time: '19:45' }
];

// Default hadith
const defaultHadith: Hadith = {
  id: '1',
  text: "The Messenger of Allah (ﷺ) said: 'The most beloved of deeds to Allah are those that are most consistent, even if they are small.'",
  source: "Sahih al-Bukhari",
  lastUpdated: new Date().toISOString()
};

export const fetchPrayerTimes = async (): Promise<PrayerTime[]> => {
  try {
    // Try to get today's prayer times from Supabase
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const { data, error } = await supabase
      .from('prayer_times')
      .select('*')
      .eq('date', today);

    // Check if we have data for today
    if (error || !data || data.length === 0) {
      console.log('Falling back to localStorage', error);
      
      // Try to get from local fallback storage
      const localTimes = localStorage.getItem('local-prayer-times');
      if (localTimes) {
        const parsedTimes = JSON.parse(localTimes);
        // Find today's entry from local storage
        const todayEntry = parsedTimes.find((entry: any) => entry.date === today);
        if (todayEntry) {
          console.log("Using locally stored prayer time for today:", todayEntry);
          return markActivePrayer(mapToDisplayFormat(todayEntry));
        }
      }
      
      // Fall back to localStorage if no data found for today
      const saved = localStorage.getItem(PRAYER_TIMES_KEY);
      const prayerTimes = saved ? JSON.parse(saved) : defaultPrayerTimes;
      return markActivePrayer(prayerTimes);
    }

    // Map Supabase data to PrayerTime format
    console.log("Using Supabase data for today's prayer times:", data[0]);
    return markActivePrayer(mapToDisplayFormat(data[0]));
  } catch (error) {
    console.error('Error fetching prayer times:', error);
    const saved = localStorage.getItem(PRAYER_TIMES_KEY);
    const prayerTimes = saved ? JSON.parse(saved) : defaultPrayerTimes;
    return markActivePrayer(prayerTimes);
  }
};

// Helper function to map detailed prayer time to display format
const mapToDisplayFormat = (data: DetailedPrayerTime): PrayerTime[] => {
  return [
    { id: '1', name: 'Fajr', time: data.fajr_jamat.slice(0, 5) },
    { id: '2', name: 'Sunrise', time: data.sunrise.slice(0, 5) },
    { id: '3', name: 'Zuhr', time: data.zuhr_jamat.slice(0, 5) },
    { id: '4', name: 'Asr', time: data.asr_jamat.slice(0, 5) },
    { id: '5', name: 'Maghrib', time: data.maghrib_iftar.slice(0, 5) },
    { id: '6', name: 'Isha', time: data.isha_first_jamat.slice(0, 5) }
  ];
};

export const updatePrayerTimes = (prayerTimes: PrayerTime[]): void => {
  try {
    localStorage.setItem(PRAYER_TIMES_KEY, JSON.stringify(prayerTimes));
  } catch (error) {
    console.error('Error updating prayer times:', error);
  }
};

export const fetchHadith = async (): Promise<Hadith> => {
  try {
    const saved = localStorage.getItem(HADITH_KEY);
    return saved ? JSON.parse(saved) : defaultHadith;
  } catch (error) {
    console.error('Error fetching hadith:', error);
    return defaultHadith;
  }
};

export const updateHadith = (hadith: Hadith): void => {
  try {
    hadith.lastUpdated = new Date().toISOString();
    localStorage.setItem(HADITH_KEY, JSON.stringify(hadith));
  } catch (error) {
    console.error('Error updating hadith:', error);
  }
};

// Functions for the detailed prayer times table
export const fetchAllPrayerTimes = async (): Promise<DetailedPrayerTime[]> => {
  try {
    // First try to fetch from Supabase
    const { data, error } = await supabase
      .from('prayer_times')
      .select('*')
      .order('date', { ascending: true });

    let prayerTimes: DetailedPrayerTime[] = [];
    
    if (error || !data || data.length === 0) {
      console.error('Error or no data from Supabase:', error);
    } else {
      prayerTimes = data as DetailedPrayerTime[];
    }

    // Also check local storage for any offline entries
    const localTimes = localStorage.getItem('local-prayer-times');
    if (localTimes) {
      const parsedLocalTimes = JSON.parse(localTimes) as DetailedPrayerTime[];
      // Merge with any data from Supabase, removing duplicates based on date
      const existingDates = new Set(prayerTimes.map(entry => entry.date));
      
      for (const localEntry of parsedLocalTimes) {
        // Only add if we don't already have an entry for this date
        if (!existingDates.has(localEntry.date)) {
          prayerTimes.push(localEntry);
          existingDates.add(localEntry.date);
        }
      }
    }
    
    // Sort by date
    return prayerTimes.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  } catch (error) {
    console.error('Error fetching all prayer times:', error);
    
    // Fallback to local storage completely
    const localTimes = localStorage.getItem('local-prayer-times');
    if (localTimes) {
      return JSON.parse(localTimes) as DetailedPrayerTime[];
    }
    
    return [];
  }
};

export const addPrayerTimeEntry = async (entry: Omit<DetailedPrayerTime, 'id' | 'created_at'>): Promise<DetailedPrayerTime | null> => {
  try {
    console.log("Adding prayer time entry:", entry);
    
    // Create a fallback entry with a temporary ID to display in the UI
    // This will work even if the database operation fails
    const fallbackEntry: DetailedPrayerTime = {
      id: `temp-${Date.now()}`,
      date: entry.date,
      day: entry.day,
      sehri_end: entry.sehri_end || '',
      fajr_jamat: entry.fajr_jamat || '',
      sunrise: entry.sunrise || '',
      zuhr_start: entry.zuhr_start || '',
      zuhr_jamat: entry.zuhr_jamat || '',
      asr_start: entry.asr_start || '',
      asr_jamat: entry.asr_jamat || '',
      maghrib_iftar: entry.maghrib_iftar || '',
      isha_start: entry.isha_start || '',
      isha_first_jamat: entry.isha_first_jamat || '',
      isha_second_jamat: entry.isha_second_jamat || ''
    };
    
    // Try to add to database
    try {
      // Use Supabase client to store data
      const { data, error } = await supabase
        .from('prayer_times')
        .insert(entry)
        .select()
        .single();

      if (error) {
        console.error("Supabase error adding prayer time:", error);
        
        // Save locally if database fails
        const savedTimes = localStorage.getItem('local-prayer-times');
        const localTimes = savedTimes ? JSON.parse(savedTimes) : [];
        localTimes.push(fallbackEntry);
        localStorage.setItem('local-prayer-times', JSON.stringify(localTimes));
        
        // Return the fallback entry so UI can update
        console.log("Returning fallback entry for UI:", fallbackEntry);
        return fallbackEntry;
      }

      console.log("Successfully added prayer time entry to Supabase:", data);
      return data as DetailedPrayerTime;
    } catch (dbError) {
      console.error("Exception during Supabase operation:", dbError);
      
      // Save locally as backup
      const savedTimes = localStorage.getItem('local-prayer-times');
      const localTimes = savedTimes ? JSON.parse(savedTimes) : [];
      localTimes.push(fallbackEntry);
      localStorage.setItem('local-prayer-times', JSON.stringify(localTimes));
      
      // Return the fallback entry so UI can update
      console.log("Returning fallback entry after exception:", fallbackEntry);
      return fallbackEntry;
    }
  } catch (error) {
    console.error('Unexpected error in addPrayerTimeEntry:', error);
    return null;
  }
};

export const updatePrayerTimeEntry = async (id: string, entry: Partial<DetailedPrayerTime>): Promise<DetailedPrayerTime | null> => {
  try {
    // Check if this is a temporary ID (for locally stored entries)
    if (id.startsWith('temp-')) {
      // Update in local storage
      const savedTimes = localStorage.getItem('local-prayer-times');
      if (savedTimes) {
        const localTimes = JSON.parse(savedTimes);
        const updatedTimes = localTimes.map((item: DetailedPrayerTime) => 
          item.id === id ? { ...item, ...entry } : item
        );
        localStorage.setItem('local-prayer-times', JSON.stringify(updatedTimes));
        
        // Find and return the updated entry
        const updatedEntry = updatedTimes.find((item: DetailedPrayerTime) => item.id === id);
        if (updatedEntry) {
          return updatedEntry;
        }
      }
      return null;
    }
    
    // Otherwise update in Supabase
    const { data, error } = await supabase
      .from('prayer_times')
      .update(entry)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error("Supabase error updating prayer time:", error);
      throw error;
    }

    return data as DetailedPrayerTime;
  } catch (error) {
    console.error('Error updating prayer time entry:', error);
    return null;
  }
};

export const deletePrayerTimeEntry = async (id: string): Promise<boolean> => {
  try {
    // Check if this is a temporary ID (for locally stored entries)
    if (id.startsWith('temp-')) {
      // Delete from local storage
      const savedTimes = localStorage.getItem('local-prayer-times');
      if (savedTimes) {
        const localTimes = JSON.parse(savedTimes);
        const filteredTimes = localTimes.filter((item: DetailedPrayerTime) => item.id !== id);
        localStorage.setItem('local-prayer-times', JSON.stringify(filteredTimes));
      }
      return true;
    }
    
    // Otherwise delete from Supabase
    const { error } = await supabase
      .from('prayer_times')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Supabase error deleting prayer time:", error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error deleting prayer time entry:', error);
    return false;
  }
};

// Mock authentication functions
export const login = (email: string, password: string): boolean => {
  // In a real app, this would make an API call to verify credentials
  if (email === 'admin@mosque.com' && password === 'admin123') {
    const user: User = { email, isAdmin: true };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return true;
  }
  return false;
};

export const getCurrentUser = (): User | null => {
  try {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

export const logout = (): void => {
  localStorage.removeItem(USER_KEY);
};

// Helper function to mark active and next prayer times
const markActivePrayer = (prayerTimes: PrayerTime[]): PrayerTime[] => {
  const currentTime = getCurrentTime24h();
  let activeIndex = -1;
  let nextIndex = -1;
  
  // Find active prayer (current or most recent)
  for (let i = prayerTimes.length - 1; i >= 0; i--) {
    if (!isTimeBefore(currentTime, prayerTimes[i].time)) {
      activeIndex = i;
      break;
    }
  }
  
  // If no prayer has passed today yet, set active to last prayer from yesterday
  if (activeIndex === -1) {
    activeIndex = prayerTimes.length - 1;
  }
  
  // Find next prayer
  nextIndex = (activeIndex + 1) % prayerTimes.length;
  
  // Mark prayers with active and next flags
  return prayerTimes.map((prayer, index) => ({
    ...prayer,
    isActive: index === activeIndex,
    isNext: index === nextIndex
  }));
};
