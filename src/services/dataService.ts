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
      .eq('date', today)
      .single();

    if (error || !data) {
      console.log('Falling back to localStorage', error);
      // Fall back to localStorage if no data found for today
      const saved = localStorage.getItem(PRAYER_TIMES_KEY);
      const prayerTimes = saved ? JSON.parse(saved) : defaultPrayerTimes;
      return markActivePrayer(prayerTimes);
    }

    // Map Supabase data to PrayerTime format
    const prayerTimesFromDb: PrayerTime[] = [
      { id: '1', name: 'Fajr', time: data.fajr_jamat.slice(0, 5) },
      { id: '2', name: 'Sunrise', time: data.sunrise.slice(0, 5) },
      { id: '3', name: 'Zuhr', time: data.zuhr_jamat.slice(0, 5) },
      { id: '4', name: 'Asr', time: data.asr_jamat.slice(0, 5) },
      { id: '5', name: 'Maghrib', time: data.maghrib_iftar.slice(0, 5) },
      { id: '6', name: 'Isha', time: data.isha_first_jamat.slice(0, 5) }
    ];

    return markActivePrayer(prayerTimesFromDb);
  } catch (error) {
    console.error('Error fetching prayer times:', error);
    const saved = localStorage.getItem(PRAYER_TIMES_KEY);
    const prayerTimes = saved ? JSON.parse(saved) : defaultPrayerTimes;
    return markActivePrayer(prayerTimes);
  }
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
    const { data, error } = await supabase
      .from('prayer_times')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      throw error;
    }

    return data as DetailedPrayerTime[];
  } catch (error) {
    console.error('Error fetching all prayer times:', error);
    return [];
  }
};

export const addPrayerTimeEntry = async (entry: Omit<DetailedPrayerTime, 'id' | 'created_at'>): Promise<DetailedPrayerTime | null> => {
  try {
    console.log("Adding prayer time entry:", entry);
    
    // Fix: Don't convert to an array of objects, keep as a single object
    // Make sure all required fields have values
    const sanitizedEntry: Omit<DetailedPrayerTime, 'id' | 'created_at'> = {
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
    
    const { data, error } = await supabase
      .from('prayer_times')
      .insert(sanitizedEntry)
      .select()
      .single();

    if (error) {
      console.error("Supabase error adding prayer time:", error);
      throw error;
    }

    if (!data) {
      console.error("No data returned after adding prayer time");
      throw new Error("No data returned after insert");
    }

    console.log("Successfully added prayer time entry, received data:", data);
    return data as DetailedPrayerTime;
  } catch (error) {
    console.error('Error adding prayer time entry:', error);
    return null;
  }
};

export const updatePrayerTimeEntry = async (id: string, entry: Partial<DetailedPrayerTime>): Promise<DetailedPrayerTime | null> => {
  try {
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
