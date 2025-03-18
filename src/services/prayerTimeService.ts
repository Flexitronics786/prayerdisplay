
import { PrayerTime, DetailedPrayerTime } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { 
  isCacheStale, 
  updateCacheTimestamp, 
  saveDetailedPrayerTimesToLocalCache, 
  getTodaysPrayerTimesFromCache,
  getAllPrayerTimesFromCache,
  savePrayerTimesToLocalStorage,
  PRAYER_TIMES_KEY
} from "./cacheService";
import { 
  defaultPrayerTimes, 
  mapToDisplayFormat, 
  markActivePrayer 
} from "./prayerTimeUtils";

// Core function to fetch prayer times
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
      const todayEntry = getTodaysPrayerTimesFromCache();
      if (todayEntry) {
        console.log("Using locally stored prayer time for today:", todayEntry);
        updateCacheTimestamp();
        return markActivePrayer(mapToDisplayFormat(todayEntry));
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
    saveDetailedPrayerTimesToLocalCache([data[0]], true);
    
    updateCacheTimestamp();
    return markActivePrayer(formattedTimes);
  } catch (error) {
    console.error('Error fetching prayer times:', error);
    
    // Try to get data from local storage as fallback
    const todayEntry = getTodaysPrayerTimesFromCache();
    if (todayEntry) {
      console.log("Using cached prayer times from local storage due to error");
      return markActivePrayer(mapToDisplayFormat(todayEntry));
    }
    
    // Last resort fallback
    console.log("Using default prayer times as last resort");
    return markActivePrayer(defaultPrayerTimes);
  }
};

export const updatePrayerTimes = (prayerTimes: PrayerTime[]): void => {
  savePrayerTimesToLocalStorage(prayerTimes);
};

// Functions for the detailed prayer times table
export const fetchAllPrayerTimes = async (forceRefresh: boolean = false): Promise<DetailedPrayerTime[]> => {
  try {
    // Check if we should use cached data
    if (!forceRefresh && !isCacheStale()) {
      const cachedTimes = getAllPrayerTimesFromCache();
      if (cachedTimes.length > 0) {
        console.log("Using cached prayer times (not stale yet)");
        return cachedTimes;
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
      saveDetailedPrayerTimesToLocalCache(prayerTimes);
      updateCacheTimestamp();
    }

    // If no data from Supabase, check local storage
    if (prayerTimes.length === 0) {
      const cachedTimes = getAllPrayerTimesFromCache();
      if (cachedTimes.length > 0) {
        console.log("Using local storage data since Supabase returned no data");
        return cachedTimes;
      }
    }
    
    return prayerTimes.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  } catch (error) {
    console.error('Error fetching all prayer times:', error);
    
    // Fallback to local storage completely
    const cachedTimes = getAllPrayerTimesFromCache();
    return cachedTimes;
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
    saveDetailedPrayerTimesToLocalCache([data], false);
    
    // Clear cache timestamp to force refresh on next fetch
    localStorage.removeItem('prayer-times-last-refresh');
    
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
    saveDetailedPrayerTimesToLocalCache([fallbackEntry], false);
    
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
      const cachedTimes = getAllPrayerTimesFromCache();
      const existingEntry = cachedTimes.find(item => item.id === id);
      
      if (existingEntry) {
        // Try to migrate this temp entry to Supabase
        try {
          const fullEntry = { ...existingEntry, ...entry };
          delete (fullEntry as any).id; // Remove temp id for insertion
          
          // Try to add to Supabase
          const { data: supabaseData, error: supabaseError } = await supabase
            .from('prayer_times')
            .insert(fullEntry)
            .select()
            .single();
          
          if (!supabaseError && supabaseData) {
            // Successfully migrated to Supabase
            console.log("Migrated temp entry to Supabase:", supabaseData);
            
            // Update local storage - remove temp entry and add the new permanent entry
            const updatedTimes = cachedTimes.filter(item => item.id !== id);
            updatedTimes.push(supabaseData);
            saveDetailedPrayerTimesToLocalCache(updatedTimes, false);
            
            updatedEntry = supabaseData as DetailedPrayerTime;
          } else {
            // Failed to migrate, just update the temp entry
            console.error("Failed to migrate temp entry to Supabase:", supabaseError);
            const updatedTimes = cachedTimes.map(item => 
              item.id === id ? { ...item, ...entry } : item
            );
            saveDetailedPrayerTimesToLocalCache(updatedTimes, false);
            
            updatedEntry = updatedTimes.find(item => item.id === id) || null;
          }
        } catch (migrationError) {
          console.error("Error migrating temp entry:", migrationError);
          // Just update locally
          const updatedTimes = cachedTimes.map(item => 
            item.id === id ? { ...item, ...entry } : item
          );
          saveDetailedPrayerTimesToLocalCache(updatedTimes, false);
          
          updatedEntry = updatedTimes.find(item => item.id === id) || null;
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
      const cachedTimes = getAllPrayerTimesFromCache();
      // Find and update or add
      let found = false;
      const updatedTimes = cachedTimes.map(item => {
        if (item.id === id) {
          found = true;
          return { ...item, ...entry };
        }
        return item;
      });
      
      if (!found && data) {
        updatedTimes.push(data);
      }
      
      saveDetailedPrayerTimesToLocalCache(updatedTimes, false);
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
      const cachedTimes = getAllPrayerTimesFromCache();
      const filteredTimes = cachedTimes.filter(item => item.id !== id);
      saveDetailedPrayerTimesToLocalCache(filteredTimes, false);
      
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
    const cachedTimes = getAllPrayerTimesFromCache();
    const filteredTimes = cachedTimes.filter(item => item.id !== id);
    saveDetailedPrayerTimesToLocalCache(filteredTimes, false);
    
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
