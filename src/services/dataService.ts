import { PrayerTime, DetailedPrayerTime, Hadith } from "@/types";
import { getCurrentTime24h, isTimeBefore } from "@/utils/dateUtils";
import { supabase } from "@/integrations/supabase/client";
import { JummahSettings } from "@/services/settingsService";

// This would be replaced with an actual API call to Supabase or Firebase
const PRAYER_TIMES_KEY = 'mosque-prayer-times';

// Default prayer times (example)
const defaultPrayerTimes: PrayerTime[] = [
  { id: '1', name: 'Fajr', time: '05:30' },
  { id: '2', name: 'Dhuhr', time: '12:30' },
  { id: '3', name: 'Asr', time: '15:45' },
  { id: '4', name: 'Maghrib', time: '18:15' },
  { id: '5', name: 'Isha', time: '19:45' }
];

// Helper function to mark the active prayer time based on current time with updated rules
const markActivePrayer = (
  prayerTimes: PrayerTime[],
  detailedTimes?: DetailedPrayerTime,
  tomorrowTimes?: DetailedPrayerTime,
  jummahSettings?: JummahSettings
): PrayerTime[] => {
  const currentTime = getCurrentTime24h();
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  console.log(`Current time: ${currentTime}`);

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

  // Get START times for prayers (critical for determining active status)
  const fajrStartTime = detailedTimes?.sehri_end || (fajrIndex !== -1 ? updatedTimes[fajrIndex].time : '');
  const sunriseTime = detailedTimes?.sunrise || (sunriseIndex !== -1 ? updatedTimes[sunriseIndex].time : '');

  // For Dhuhr, we need to check if it's Friday and use Jummah start if available
  let dhuhrStartTime = detailedTimes?.zuhr_start || (dhuhrIndex !== -1 ? updatedTimes[dhuhrIndex].time : '');

  const asrStartTime = detailedTimes?.asr_start || (asrIndex !== -1 ? updatedTimes[asrIndex].time : '');
  const maghribStartTime = detailedTimes?.maghrib_iftar || (maghribIndex !== -1 ? updatedTimes[maghribIndex].time : '');
  const ishaStartTime = detailedTimes?.isha_start || (ishaIndex !== -1 ? updatedTimes[ishaIndex].time : '');

  // Rule 2: Dhuhr is active from its start until Asr starts
  if (dhuhrIndex !== -1 &&
    !isTimeBefore(currentTime, dhuhrStartTime) &&
    isTimeBefore(currentTime, asrStartTime)) {
    updatedTimes[dhuhrIndex].isActive = true;
    console.log("Dhuhr is active");
  }

  // Rule 3: Asr is active from its start until Maghrib starts
  if (asrIndex !== -1 &&
    !isTimeBefore(currentTime, asrStartTime) &&
    isTimeBefore(currentTime, maghribStartTime)) {
    updatedTimes[asrIndex].isActive = true;
    console.log("Asr is active");
  }

  // Rule 4: MODIFIED - Maghrib is active from its start until Isha starts
  if (maghribIndex !== -1 &&
    !isTimeBefore(currentTime, maghribStartTime) &&
    isTimeBefore(currentTime, ishaStartTime)) {
    updatedTimes[maghribIndex].isActive = true;
    console.log("Maghrib is active");
  }

  // Rule 5: Isha is active from its start until midnight 
  if (ishaIndex !== -1 && !isTimeBefore(currentTime, ishaStartTime)) {
    // If it's after Isha time and before midnight
    updatedTimes[ishaIndex].isActive = true;
    console.log("Isha is active (evening)");
  }

  // Determine next prayer - also using START times
  let nextPrayerFound = false;

  // Create an array of prayers in chronological order for the day
  const orderedPrayers = [
    { index: fajrIndex, time: fajrStartTime, name: 'Fajr' },
    { index: dhuhrIndex, time: dhuhrStartTime, name: 'Dhuhr/Zuhr' },
    { index: asrIndex, time: asrStartTime, name: 'Asr' },
    { index: maghribIndex, time: maghribStartTime, name: 'Maghrib' },
    { index: ishaIndex, time: ishaStartTime, name: 'Isha' }
  ].filter(p => p.index !== -1 && p.time !== '');

  // Find the next prayer that hasn't started yet
  for (const prayer of orderedPrayers) {
    if (isTimeBefore(currentTime, prayer.time)) {
      updatedTimes[prayer.index].isNext = true;
      nextPrayerFound = true;
      console.log(`Next prayer will be ${prayer.name} at ${prayer.time} (current time: ${currentTime})`);
      break;
    }
  }

  let isAfterIsha = false;
  // If no next prayer found and it's after Isha, next prayer is Fajr tomorrow
  if (!nextPrayerFound && fajrIndex !== -1) {
    updatedTimes[fajrIndex].isNext = true;
    isAfterIsha = true;
    console.log(`Next prayer will be Fajr tomorrow at ${fajrStartTime} (current time: ${currentTime})`);
  }

  // --- NEW LOGIC: ROLLOVER PAST PRAYERS TO TOMORROW ---
  // If we have tomorrow's data, check which prayers are already completely in the past today,
  // and overwrite their display times with exactly what is coming tomorrow.

  // Guard clause for Midnight-to-Fajr window:
  // When the clock hits 00:00, the system instantly loads "today's" row instead of "yesterday's" row.
  // During this window (00:00 to Fajr Start), no prayers have officially "passed" yet for this new day,
  // so we must NOT overwrite anything with tomorrow's data. Everything should remain exactly as loaded.
  const isPostMidnightPreFajrWindow = fajrStartTime && isTimeBefore(currentTime, fajrStartTime);

  if (tomorrowTimes && !isPostMidnightPreFajrWindow) {
    let prayersToRollover: typeof orderedPrayers = [];

    if (isAfterIsha) {
      // ALL prayers have passed for today. We roll over all of them.
      prayersToRollover = orderedPrayers;
    } else {
      const activeOrNextPrayer = updatedTimes.find(p => p.isActive || p.isNext);
      if (activeOrNextPrayer) {
        // Find where we are in the chronological order. 
        // Use the index directly from the matching object, since .name check might fail due to "Dhuhr/Zuhr" vs "Zuhr" differences.
        const currentIndexInOrder = orderedPrayers.findIndex(p => p.index === updatedTimes.indexOf(activeOrNextPrayer));
        if (currentIndexInOrder > 0) {
          // All prayers before the currentIndexInOrder have passed for today.
          prayersToRollover = orderedPrayers.slice(0, currentIndexInOrder);
        }
      }
    }

    // Process the rollover for the determined passed prayers
    for (const passedPrayer of prayersToRollover) {
      const passedIndex = passedPrayer.index;

      if (passedIndex !== -1) {
        // Map the name back to tomorrow's detailed data fields
        // The mapping logic here is similar to mapToDisplayFormat
        let tomorrowTimeStr = '';
        const t = tomorrowTimes;
        switch (updatedTimes[passedIndex].name) {
          case 'Fajr': tomorrowTimeStr = t.sehri_end?.slice(0, 5) || t.fajr_jamat?.slice(0, 5); break;
          case 'Sunrise': tomorrowTimeStr = t.sunrise?.slice(0, 5); break;
          case 'Dhuhr':
          case 'Zuhr': tomorrowTimeStr = t.zuhr_start?.slice(0, 5) || t.zuhr_jamat?.slice(0, 5); break;
          case 'Asr': tomorrowTimeStr = t.asr_start?.slice(0, 5) || t.asr_jamat?.slice(0, 5); break;
          case 'Maghrib': tomorrowTimeStr = t.maghrib_iftar?.slice(0, 5); break;
          case 'Isha': tomorrowTimeStr = t.isha_start?.slice(0, 5) || t.isha_first_jamat?.slice(0, 5); break;
        }

        if (tomorrowTimeStr) {
          updatedTimes[passedIndex].time = tomorrowTimeStr;
          console.log(`Rolled over ${updatedTimes[passedIndex].name} to tomorrow's time: ${tomorrowTimeStr}`);
        }
      }
    }
  }

  return updatedTimes;
};

export const fetchPrayerTimes = async (tomorrowTimes?: DetailedPrayerTime, jummahSettings?: JummahSettings): Promise<PrayerTime[]> => {
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
          return markActivePrayer(mapToDisplayFormat(todayEntry, jummahSettings), todayEntry, tomorrowTimes, jummahSettings);
        }
      }

      // Fall back to localStorage if no data found for today
      const saved = localStorage.getItem(PRAYER_TIMES_KEY);
      const prayerTimes = saved ? JSON.parse(saved) : defaultPrayerTimes;
      return markActivePrayer(prayerTimes, undefined, tomorrowTimes, jummahSettings);
    }

    // Map Supabase data to PrayerTime format
    console.log("Fetched prayer times from database");
    const formattedTimes = mapToDisplayFormat(data[0], jummahSettings);
    return markActivePrayer(formattedTimes, data[0], tomorrowTimes, jummahSettings);
  } catch (error) {
    console.error('Error fetching prayer times:', error);

    // Try to get data from local storage as fallback
    const storedTimes = localStorage.getItem('local-prayer-times');
    if (storedTimes) {
      console.log("Using cached prayer times from local storage");

      const parsedStored = JSON.parse(storedTimes);
      // Let's at least mark active properly from cached storage if it's the right array shape
      // (assuming storedTimes might be the old PrayerTime[] format)
      if (Array.isArray(parsedStored) && parsedStored.length > 0 && typeof parsedStored[0].name === 'string') {
        return markActivePrayer(parsedStored, undefined, tomorrowTimes, jummahSettings);
      }
      return parsedStored;
    }

    throw error;
  }
};

const mapToDisplayFormat = (data: DetailedPrayerTime, jummahSettings?: JummahSettings): PrayerTime[] => {
  // CRITICAL FIX: Use START times rather than Jamat times
  let dhuhrTime = data.zuhr_start?.slice(0, 5) || data.zuhr_jamat.slice(0, 5);

  return [
    { id: '1', name: 'Fajr', time: data.sehri_end?.slice(0, 5) || data.fajr_jamat.slice(0, 5) },
    { id: '2', name: 'Sunrise', time: data.sunrise.slice(0, 5) },
    { id: '3', name: 'Zuhr', time: dhuhrTime },
    { id: '4', name: 'Asr', time: data.asr_start?.slice(0, 5) || data.asr_jamat.slice(0, 5) },
    { id: '5', name: 'Maghrib', time: data.maghrib_iftar.slice(0, 5) },
    { id: '6', name: 'Isha', time: data.isha_start?.slice(0, 5) || data.isha_first_jamat.slice(0, 5) }
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
    console.log("Updating prayer time entry:", id, entry);
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
      console.log("Updating in Supabase:", id, entry);
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

      console.log("Supabase update result:", data);

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

// New function to cleanup past days and keep the database tidy (also removes duplicates)
export const cleanupPrayerTimes = async (): Promise<{ success: boolean; deletedCount: number; error?: string }> => {
  try {
    console.log("Starting cleanup of past prayer times and duplicates...");

    // 1. Fetch all times
    const allTimes = await fetchAllPrayerTimes();

    const todayStr = new Date().toISOString().split('T')[0];
    const idsToDelete: string[] = [];
    const seenDates = new Set<string>();

    for (const time of allTimes) {
      // Rule 1: Delete if the day is in the past
      // Rule 2: Delete if we already saw this date (duplicate)
      if (time.date < todayStr || seenDates.has(time.date)) {
        if (time.id) idsToDelete.push(time.id);
      } else {
        seenDates.add(time.date);
      }
    }

    if (idsToDelete.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    let deletedCount = 0;

    // Clean up one by one
    for (const id of idsToDelete) {
      const success = await deletePrayerTimeEntry(id);
      if (success) deletedCount++;
    }

    console.log(`Cleanup completed. Deleted ${deletedCount} old/duplicate entries.`);
    return { success: true, deletedCount };
  } catch (error) {
    console.error('Error during cleanup:', error);
    return {
      success: false,
      deletedCount: 0,
      error: error instanceof Error ? error.message : "Unknown error during cleanup"
    };
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

// Function to import prayer times from CSV file
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

    // Fetch existing dates to prevent importing duplicates
    const allExistingTimes = await fetchAllPrayerTimes();
    const existingDates = new Set(allExistingTimes.map(t => t.date));

    // Try to add all entries to the database
    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    for (const entry of prayerTimes) {
      try {
        // Skip entries with missing required data
        if (!entry.date || !entry.day) {
          failCount++;
          continue;
        }

        // Skip entries that already exist in the database based on date
        if (existingDates.has(entry.date)) {
          skippedCount++;
          continue;
        }

        await addPrayerTimeEntry(entry);
        successCount++;
      } catch (error) {
        console.error(`Failed to add entry for date ${entry.date}:`, error);
        failCount++;
      }
    }

    console.log(`Import completed: ${successCount} entries added, ${skippedCount} skipped (already in DB), ${failCount} failed`);

    if (successCount === 0 && failCount > 0) {
      return {
        success: false,
        count: 0,
        error: `Failed to import any prayer times. ${failCount} entries had errors.`
      };
    }

    let warningMessage = '';
    if (failCount > 0 || skippedCount > 0) {
      warningMessage = `Note: `;
      if (skippedCount > 0) warningMessage += `${skippedCount} existing entries were skipped. `;
      if (failCount > 0) warningMessage += `${failCount} entries failed to import.`;
    }

    return {
      success: true,
      count: successCount,
      error: warningMessage.trim().length > 0 ? warningMessage.trim() : undefined
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
    return await importFromCSV(csvText);
  } catch (error) {
    console.error("Error importing from Google Sheet:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      count: 0,
      error: `Error: ${errorMessage}`
    };
  }
};
