import { PrayerTime, DetailedPrayerTime, Hadith } from "@/types";
import { getCurrentTime24h, isTimeBefore } from "@/utils/dateUtils";
import { supabase, clearPrayerTimesCache } from "@/integrations/supabase/client";

// This would be replaced with an actual API call to Supabase or Firebase
const PRAYER_TIMES_KEY = 'mosque-prayer-times';
const CACHE_TIMESTAMP_KEY = 'prayer-times-last-refresh';

// Default prayer times (example)
const defaultPrayerTimes: PrayerTime[] = [
  { id: '1', name: 'Fajr', time: '05:30' },
  { id: '2', name: 'Dhuhr', time: '12:30' },
  { id: '3', name: 'Asr', time: '15:45' },
  { id: '4', name: 'Maghrib', time: '18:15' },
  { id: '5', name: 'Isha', time: '19:45' }
];

// Helper function to check if cache is stale (older than 5 minutes)
const isCacheStale = (): boolean => {
  const lastRefresh = localStorage.getItem(CACHE_TIMESTAMP_KEY);
  if (!lastRefresh) return true;
  
  const lastRefreshTime = parseInt(lastRefresh, 10);
  const now = Date.now();
  const cacheDuration = 5 * 60 * 1000; // 5 minutes
  
  return (now - lastRefreshTime) > cacheDuration;
};

// Helper function to update cache timestamp
const updateCacheTimestamp = (): void => {
  localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
};

// Helper function to mark the active prayer time based on current time with updated rules
const markActivePrayer = (prayerTimes: PrayerTime[], detailedTimes?: DetailedPrayerTime): PrayerTime[] => {
  const currentTime = getCurrentTime24h();
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Reset all to inactive
  const updatedTimes = prayerTimes.map(prayer => ({
    ...prayer,
    isActive: false,
    isNext: false
  }));
  
  // Find indices for each prayer time
  const fajrIndex = updatedTimes.findIndex(p => p.name === 'Fajr');
  const sunriseIndex = updatedTimes.findIndex(p => p.name === 'Sunrise');
  const dhuhrIndex = updatedTimes.findIndex(p => p.name === 'Dhuhr' || p.name === 'Zuhr');
  const asrIndex = updatedTimes.findIndex(p => p.name === 'Asr');
  const maghribIndex = updatedTimes.findIndex(p => p.name === 'Maghrib');
  const ishaIndex = updatedTimes.findIndex(p => p.name === 'Isha');
  
  // Get prayer times
  const fajrTime = fajrIndex !== -1 ? updatedTimes[fajrIndex].time : '';
  const sunriseTime = sunriseIndex !== -1 ? updatedTimes[sunriseIndex].time : '';
  const dhuhrTime = dhuhrIndex !== -1 ? updatedTimes[dhuhrIndex].time : '';
  const asrTime = asrIndex !== -1 ? updatedTimes[asrIndex].time : '';
  const maghribTime = maghribIndex !== -1 ? updatedTimes[maghribIndex].time : '';
  const ishaTime = ishaIndex !== -1 ? updatedTimes[ishaIndex].time : '';
  
  let asrStartTime = '';
  let maghribStartTime = '';
  let fajrStartTimeNextDay = '';
  
  if (detailedTimes) {
    asrStartTime = detailedTimes.asr_start || '';
    maghribStartTime = detailedTimes.maghrib_iftar || '';
    fajrStartTimeNextDay = detailedTimes.fajr_jamat || '';
  }
  
  // Calculate one hour after Maghrib
  let oneHourAfterMaghrib = '';
  if (maghribTime) {
    const [mHours, mMinutes] = maghribTime.split(':').map(Number);
    let newHour = mHours + 1;
    if (newHour >= 24) newHour -= 24;
    oneHourAfterMaghrib = `${newHour.toString().padStart(2, '0')}:${mMinutes.toString().padStart(2, '0')}`;
  }
  
  // Determine current prayer based on rules
  // Rule 1: Fajr is active from its start until Sunrise
  if (fajrIndex !== -1 && sunriseIndex !== -1 && 
      !isTimeBefore(currentTime, fajrTime) && 
      isTimeBefore(currentTime, sunriseTime)) {
    updatedTimes[fajrIndex].isActive = true;
  }
  
  // Rule 2: Dhuhr is active from its start until Asr starts
  if (dhuhrIndex !== -1 && 
      !isTimeBefore(currentTime, dhuhrTime) && 
      (asrStartTime ? isTimeBefore(currentTime, asrStartTime) : isTimeBefore(currentTime, asrTime))) {
    updatedTimes[dhuhrIndex].isActive = true;
  }
  
  // Rule 3: Asr is active from its start until Maghrib starts
  if (asrIndex !== -1 && 
      !isTimeBefore(currentTime, asrTime) && 
      isTimeBefore(currentTime, maghribTime)) {
    updatedTimes[asrIndex].isActive = true;
  }
  
  // Rule 4: Maghrib is active from its start until 1 hour after
  if (maghribIndex !== -1 && 
      !isTimeBefore(currentTime, maghribTime) && 
      isTimeBefore(currentTime, oneHourAfterMaghrib)) {
    updatedTimes[maghribIndex].isActive = true;
  }
  
  // Rule 5: Isha is active from its start until Fajr starts (next day)
  if (ishaIndex !== -1 && !isTimeBefore(currentTime, ishaTime)) {
    // If it's after Isha time and before midnight
    updatedTimes[ishaIndex].isActive = true;
  } else if (ishaIndex !== -1 && currentHour < 12) {
    // If it's after midnight but before Fajr (using midnight to noon as approximate)
    if (fajrTime && isTimeBefore(currentTime, fajrTime)) {
      updatedTimes[ishaIndex].isActive = true;
    }
  }
  
  // Determine next prayer
  let nextPrayerFound = false;
  
  // Create an array of prayers in chronological order for the day
  const orderedPrayers = [
    { index: fajrIndex, time: fajrTime },
    { index: sunriseIndex, time: sunriseTime }, // Not a prayer but a time marker
    { index: dhuhrIndex, time: dhuhrTime },
    { index: asrIndex, time: asrTime },
    { index: maghribIndex, time: maghribTime },
    { index: ishaIndex, time: ishaTime }
  ].filter(p => p.index !== -1);
  
  // Find the next prayer that hasn't started yet
  for (const prayer of orderedPrayers) {
    if (isTimeBefore(currentTime, prayer.time)) {
      if (prayer.index !== sunriseIndex) { // Skip sunrise as "next prayer"
        updatedTimes[prayer.index].isNext = true;
        nextPrayerFound = true;
        break;
      }
    }
  }
  
  // If no next prayer found and it's after Isha, next prayer is Fajr tomorrow
  if (!nextPrayerFound && fajrIndex !== -1) {
    updatedTimes[fajrIndex].isNext = true;
  }
  
  return updatedTimes;
};

export const fetchPrayerTimes = async (forceRefresh: boolean = false): Promise<PrayerTime[]> => {
  try {
    // If we're forcing a refresh or cache is stale, skip local storage cache
    if (forceRefresh || isCacheStale()) {
      console.log(`${forceRefresh ? 'Force refreshing' : 'Cache is stale, refreshing'} prayer times from Supabase`);
    } else {
      console.log('Using cached prayer times, cache is still fresh');
    }
    
    // Try to get today's prayer times from Supabase
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    console.log(`Fetching prayer times for date: ${today}`);
    
    const { data, error } = await supabase
      .from('prayer_times')
      .select('*')
      .eq('date', today);

    // Check if we have data for today
    if (error) {
      console.error('Supabase error fetching prayer times:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log('No data found in Supabase for today, checking local storage');
      
      // Try to get from local fallback storage
      const localTimes = localStorage.getItem('local-prayer-times');
      if (localTimes) {
        const parsedTimes = JSON.parse(localTimes);
        // Find today's entry from local storage
        const todayEntry = parsedTimes.find((entry: any) => entry.date === today);
        if (todayEntry) {
          console.log("Using locally stored prayer time for today:", todayEntry);
          updateCacheTimestamp();
          return markActivePrayer(mapToDisplayFormat(todayEntry));
        }
      }
      
      // Fall back to localStorage if no data found for today
      console.log("No entry found for today in local storage either, using fallback");
      const saved = localStorage.getItem(PRAYER_TIMES_KEY);
      const prayerTimes = saved ? JSON.parse(saved) : defaultPrayerTimes;
      return markActivePrayer(prayerTimes);
    }

    // Map Supabase data to PrayerTime format
    console.log("Fetched prayer times from database:", data[0]);
    const formattedTimes = mapToDisplayFormat(data[0]);
    
    // Update local storage with the retrieved data for offline use
    try {
      const localTimes = localStorage.getItem('local-prayer-times');
      const parsedTimes = localTimes ? JSON.parse(localTimes) : [];
      
      // Remove existing entry for today
      const filteredTimes = parsedTimes.filter((entry: any) => entry.date !== today);
      
      // Add the new entry
      filteredTimes.push(data[0]);
      
      // Update local storage
      localStorage.setItem('local-prayer-times', JSON.stringify(filteredTimes));
      console.log("Updated local storage with latest prayer times");
    } catch (storageError) {
      console.error("Error updating local storage:", storageError);
    }
    
    updateCacheTimestamp();
    return markActivePrayer(formattedTimes);
  } catch (error) {
    console.error('Error fetching prayer times:', error);
    
    // Try to get data from local storage as fallback
    const storedTimes = localStorage.getItem('local-prayer-times');
    if (storedTimes) {
      console.log("Using cached prayer times from local storage due to error");
      const parsedTimes = JSON.parse(storedTimes);
      const today = new Date().toISOString().split('T')[0];
      const todayEntry = parsedTimes.find((entry: any) => entry.date === today);
      
      if (todayEntry) {
        return markActivePrayer(mapToDisplayFormat(todayEntry));
      }
    }
    
    // Last resort fallback
    console.log("Using default prayer times as last resort");
    return markActivePrayer(defaultPrayerTimes);
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

// Return default hadith since we no longer have the hadith_collection table
export const fetchHadith = async (): Promise<Hadith> => {
  return getDefaultHadith();
};

// Helper function to return the default hadith
const getDefaultHadith = (): Hadith => {
  return {
    id: 'default',
    text: "The Messenger of Allah (ﷺ) said: 'The most beloved of deeds to Allah are those that are most consistent, even if they are small.'",
    source: "Sahih al-Bukhari",
    lastUpdated: new Date().toISOString()
  };
};

// Functions for the detailed prayer times table
export const fetchAllPrayerTimes = async (forceRefresh: boolean = false): Promise<DetailedPrayerTime[]> => {
  try {
    // Check if we should use cached data
    if (!forceRefresh && !isCacheStale()) {
      const localTimes = localStorage.getItem('local-prayer-times');
      if (localTimes) {
        console.log("Using cached prayer times (not stale yet)");
        return JSON.parse(localTimes) as DetailedPrayerTime[];
      }
    }
    
    console.log("Fetching all prayer times from Supabase...");
    
    // First try to fetch from Supabase
    const { data, error } = await supabase
      .from('prayer_times')
      .select('*')
      .order('date', { ascending: true });

    let prayerTimes: DetailedPrayerTime[] = [];
    
    if (error || !data || data.length === 0) {
      console.error('Error or no data from Supabase:', error);
    } else {
      console.log(`Retrieved ${data.length} prayer times from Supabase`);
      prayerTimes = data as DetailedPrayerTime[];
      
      // Update local storage with the retrieved data
      localStorage.setItem('local-prayer-times', JSON.stringify(prayerTimes));
      updateCacheTimestamp();
    }

    // If no data from Supabase, check local storage
    if (prayerTimes.length === 0) {
      const localTimes = localStorage.getItem('local-prayer-times');
      if (localTimes) {
        console.log("Using local storage data since Supabase returned no data");
        return JSON.parse(localTimes) as DetailedPrayerTime[];
      }
    }
    
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
    console.log("Adding prayer time entry to Supabase:", entry);
    
    // Always try to add to Supabase first
    const { data, error } = await supabase
      .from('prayer_times')
      .insert(entry)
      .select()
      .single();

    if (error) {
      console.error("Supabase error adding prayer time:", error);
      throw error; // Re-throw to handle in the catch block
    }

    console.log("Successfully added prayer time entry to Supabase:", data);
    
    // Always store in local storage as well for redundancy
    const savedTimes = localStorage.getItem('local-prayer-times');
    const localTimes = savedTimes ? JSON.parse(savedTimes) : [];
    
    // Remove any existing entry for this date (to avoid duplicates)
    const filteredTimes = localTimes.filter((item: DetailedPrayerTime) => 
      item.date !== entry.date
    );
    
    // Add the new entry
    filteredTimes.push(data);
    localStorage.setItem('local-prayer-times', JSON.stringify(filteredTimes));
    
    // Clear cache timestamp to force refresh on next fetch
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    
    // Trigger a storage event so other tabs/components know to refresh
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'local-prayer-times'
    }));
    
    return data as DetailedPrayerTime;
  } catch (error) {
    console.error('Error in addPrayerTimeEntry:', error);
    
    // Create a fallback entry with a temporary ID
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
    
    // Save to local storage as backup
    const savedTimes = localStorage.getItem('local-prayer-times');
    const localTimes = savedTimes ? JSON.parse(savedTimes) : [];
    
    // Remove any existing entry for this date (to avoid duplicates)
    const filteredTimes = localTimes.filter((item: DetailedPrayerTime) => 
      item.date !== entry.date
    );
    
    filteredTimes.push(fallbackEntry);
    localStorage.setItem('local-prayer-times', JSON.stringify(filteredTimes));
    
    // Trigger a storage event so other tabs/components know to refresh
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'local-prayer-times'
    }));
    
    return fallbackEntry;
  }
};

export const updatePrayerTimeEntry = async (id: string, entry: Partial<DetailedPrayerTime>): Promise<DetailedPrayerTime | null> => {
  try {
    let updatedEntry: DetailedPrayerTime | null = null;
    
    // Check if this is a temporary ID (for locally stored entries)
    if (id.startsWith('temp-')) {
      // Get the full entry from local storage
      const savedTimes = localStorage.getItem('local-prayer-times');
      if (savedTimes) {
        const localTimes = JSON.parse(savedTimes);
        const existingEntry = localTimes.find((item: DetailedPrayerTime) => item.id === id);
        
        if (existingEntry) {
          // Try to migrate this temp entry to Supabase
          try {
            const fullEntry = { ...existingEntry, ...entry };
            delete fullEntry.id; // Remove temp id for insertion
            
            // Try to add to Supabase
            const { data: supabaseData, error: supabaseError } = await supabase
              .from('prayer_times')
              .insert(fullEntry)
              .select()
              .single();
            
            if (!supabaseError && supabaseData) {
              // Successfully migrated to Supabase
              console.log("Migrated temp entry to Supabase:", supabaseData);
              
              // Update local storage - remove temp entry
              const updatedTimes = localTimes.filter((item: DetailedPrayerTime) => 
                item.id !== id
              );
              // Add the new permanent entry
              updatedTimes.push(supabaseData);
              localStorage.setItem('local-prayer-times', JSON.stringify(updatedTimes));
              
              updatedEntry = supabaseData as DetailedPrayerTime;
            } else {
              // Failed to migrate, just update the temp entry
              console.error("Failed to migrate temp entry to Supabase:", supabaseError);
              const updatedTimes = localTimes.map((item: DetailedPrayerTime) => 
                item.id === id ? { ...item, ...entry } : item
              );
              localStorage.setItem('local-prayer-times', JSON.stringify(updatedTimes));
              
              updatedEntry = updatedTimes.find((item: DetailedPrayerTime) => item.id === id) || null;
            }
          } catch (migrationError) {
            console.error("Error migrating temp entry:", migrationError);
            // Just update locally
            const updatedTimes = localTimes.map((item: DetailedPrayerTime) => 
              item.id === id ? { ...item, ...entry } : item
            );
            localStorage.setItem('local-prayer-times', JSON.stringify(updatedTimes));
            
            updatedEntry = updatedTimes.find((item: DetailedPrayerTime) => item.id === id) || null;
          }
        }
      }
    } else {
      // Update in Supabase
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
      
      // Also update local storage copy for redundancy
      const savedTimes = localStorage.getItem('local-prayer-times');
      if (savedTimes) {
        const localTimes = JSON.parse(savedTimes);
        // Find and update or add
        let found = false;
        const updatedTimes = localTimes.map((item: DetailedPrayerTime) => {
          if (item.id === id) {
            found = true;
            return { ...item, ...entry };
          }
          return item;
        });
        
        if (!found) {
          updatedTimes.push(data);
        }
        
        localStorage.setItem('local-prayer-times', JSON.stringify(updatedTimes));
      }

      updatedEntry = data as DetailedPrayerTime;
    }
    
    // Trigger a storage event so other tabs/components know to refresh
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'local-prayer-times'
    }));
    
    return updatedEntry;
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
      
      // Trigger a storage event so other tabs/components know to refresh
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'local-prayer-times'
      }));
      
      return true;
    }
    
    // Delete from Supabase
    const { error } = await supabase
      .from('prayer_times')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Supabase error deleting prayer time:", error);
      throw error;
    }
    
    // Also delete from local storage if it exists there
    const savedTimes = localStorage.getItem('local-prayer-times');
    if (savedTimes) {
      const localTimes = JSON.parse(savedTimes);
      const filteredTimes = localTimes.filter((item: DetailedPrayerTime) => item.id !== id);
      localStorage.setItem('local-prayer-times', JSON.stringify(filteredTimes));
    }
    
    // Trigger a storage event so other tabs/components know to refresh
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'local-prayer-times'
    }));
    
    return true;
  } catch (error) {
    console.error('Error deleting prayer time entry:', error);
    return false;
  }
};

// New function to delete all prayer times from database and local storage
export const deleteAllPrayerTimes = async (): Promise<boolean> => {
  try {
    console.log("Starting to delete all prayer times...");
    
    // First clear local storage
    localStorage.removeItem('local-prayer-times');
    localStorage.removeItem(PRAYER_TIMES_KEY);
    
    // Delete all data from Supabase prayer_times table
    // Using .eq('id', 'id') will delete every row as all rows have an id
    const { error } = await supabase
      .from('prayer_times')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000');
    
    if (error) {
      console.error("Supabase error deleting all prayer times:", error);
      throw error;
    }
    
    // Trigger a storage event so other tabs/components know to refresh
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'local-prayer-times'
    }));
    
    console.log("Successfully deleted all prayer times");
    return true;
  } catch (error) {
    console.error('Error deleting all prayer times:', error);
    return false;
  }
};

// Helper functions for Google Sheets import
const parseCSV = (text: string): string[][] => {
  const lines = text.split('\n');
  return lines.map(line => {
    // Handle quoted values with commas inside them
    const values: string[] = [];
    let inQuote = false;
    let currentValue = '';
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === ',' && !inQuote) {
        values.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    // Add the last value
    values.push(currentValue);
    return values;
  });
};

// Helper to process rows and columns from CSV data to create prayer time entries
const processCSVData = (csvData: string[][]): Omit<DetailedPrayerTime, 'id' | 'created_at'>[] => {
  // Skip header row if it exists
  const dataRows = csvData.length > 1 ? csvData.slice(1) : csvData;
  
  return dataRows.map(row => {
    // Create prayer time entry from CSV row
    // Mapping depends on the exact CSV format - adjust column indices as needed
    return {
      date: row[0] || '', // Assume date is in the first column
      day: row[1] || '', // Assume day is in the second column
      sehri_end: row[2] || '',
      fajr_jamat: row[3] || '',
      sunrise: row[4] || '',
      zuhr_start: row[5] || '',
      zuhr_jamat: row[6] || '',
      asr_start: row[7] || '',
      asr_jamat: row[8] || '',
      maghrib_iftar: row[9] || '',
      isha_start: row[10] || '',
      isha_first_jamat: row[11] || '',
      isha_second_jamat: row[12] || ''
    };
  });
};

// Function to import prayer times from CSV data
export const importFromCSV = async (csvText: string): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> => {
  try {
    const parsed = parseCSV(csvText);
    console.log("Parsed CSV data:", parsed);
    
    if (parsed.length < 2) {
      return {
        success: false,
        count: 0,
        error: "CSV file contains insufficient data"
      };
    }
    
    const prayerTimes = processCSVData(parsed);
    console.log("Processed prayer times:", prayerTimes);
    
    // Try to add all entries to the database
    let successCount = 0;
    let failCount = 0;
    let supabaseSuccessCount = 0;
    
    for (const entry of prayerTimes) {
      try {
        // Skip entries with missing required data
        if (!entry.date || !entry.day) {
          failCount++;
          continue;
        }
        
        const result = await addPrayerTimeEntry(entry);
        if (result && !result.id.toString().startsWith('temp-')) {
          supabaseSuccessCount++;
        }
        successCount++;
      } catch (error) {
        console.error(`Failed to add entry for date ${entry.date}:`, error);
        failCount++;
      }
    }
    
    console.log(`Import completed: ${successCount} entries added (${supabaseSuccessCount} to Supabase), ${failCount} failed`);
    
    if (successCount === 0 && failCount > 0) {
      return {
        success: false,
        count: 0,
        error: `Failed to import any prayer times. ${failCount} entries had errors.`
      };
    }
    
    let warningMessage = '';
    if (failCount > 0) {
      warningMessage = `Note: ${failCount} entries failed to import.`;
    }
    
    if (supabaseSuccessCount === 0 && successCount > 0) {
      warningMessage += ` Warning: All entries were only saved locally. Check your internet connection and try again.`;
    }
    
    return {
      success: true,
      count: successCount,
      error: warningMessage.length > 0 ? warningMessage : undefined
    };
  } catch (error) {
    console.error("Error importing from CSV:", error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error during import"
    };
  }
};

// Function to import prayer times from Google Sheet
export const importPrayerTimesFromSheet = async (
  sheetId: string,
  tabName: string = 'Sheet1',
  hasHeaderRow: boolean = true,
  isPublic: boolean = true
): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> => {
  try {
    if (!sheetId) {
      return { 
        success: false, 
        count: 0,
        error: "Please provide a valid Google Sheet ID"
      };
    }
    
    // Extract Sheet ID from URL if user pasted a full URL
    if (sheetId.includes('docs.google.com/spreadsheets')) {
      const urlMatch = sheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (urlMatch && urlMatch[1]) {
        sheetId = urlMatch[1];
        console.log("Extracted Sheet ID from URL:", sheetId);
      } else {
        return {
          success: false,
          count: 0,
          error: "Could not extract a valid Sheet ID from the provided URL"
        };
      }
    }
    
    // Create CSV download URL from sheet ID
    // For a specific tab/sheet, we need to use gid, not the tab name directly
    let csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    if (tabName && tabName !== 'Sheet1') {
      // Try to use tab name as provided, but note this might not work correctly
      // For specific sheets, users should use the gid number
      csvUrl += `&gid=${tabName}`;
    }
    
    console.log("Attempting to fetch CSV from:", csvUrl);
    
    // Fetch the sheet data as CSV
    const response = await fetch(csvUrl);
    
    if (!response.ok) {
      // Provide more detailed error information
      let errorMessage = `Failed to fetch sheet: ${response.status}`;
      
      if (response.status === 404) {
        errorMessage += ". Make sure the Sheet ID is correct and the sheet is publicly accessible.";
      } else if (response.status === 403) {
        errorMessage += ". Access forbidden. The sheet must be shared with 'Anyone with the link' or 'Public on the web'.";
      } else {
        errorMessage += ` ${response.statusText}`;
      }
      
      return { 
        success: false, 
        count: 0,
        error: errorMessage
      };
    }
    
    const csvText = await response.text();
    if (!csvText || csvText.trim().length === 0) {
      return { 
        success: false, 
        count: 0,
        error: "Sheet contains no data"
      };
    }
    
    console.log("CSV data retrieved, importing...");
    
    // Clear existing cache before import
    clearPrayerTimesCache();
    
    // Try to establish a test connection to Supabase before proceeding
    try {
      const {
