
import { Hadith, PrayerTime, User } from "@/types";
import { getCurrentTime24h, isTimeBefore } from "@/utils/dateUtils";

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

export const fetchPrayerTimes = (): PrayerTime[] => {
  try {
    const saved = localStorage.getItem(PRAYER_TIMES_KEY);
    const prayerTimes = saved ? JSON.parse(saved) : defaultPrayerTimes;
    return markActivePrayer(prayerTimes);
  } catch (error) {
    console.error('Error fetching prayer times:', error);
    return markActivePrayer(defaultPrayerTimes);
  }
};

export const updatePrayerTimes = (prayerTimes: PrayerTime[]): void => {
  try {
    localStorage.setItem(PRAYER_TIMES_KEY, JSON.stringify(prayerTimes));
  } catch (error) {
    console.error('Error updating prayer times:', error);
  }
};

export const fetchHadith = (): Hadith => {
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
