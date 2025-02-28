
import { Hadith, PrayerTime, DailyHadith, DetailedPrayerTime } from "@/types";
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

// Helper functions for the importPrayerTimesFromSheet function
const parseCSV = (csvText: string): string[][] => {
  const rows: string[][] = [];
  
  // Split by newline and handle both \r\n and \n
  const lines = csvText.split(/\r?\n/);
  
  for (const line of lines) {
    if (!line.trim()) continue; // Skip empty lines
    
    const row: string[] = [];
    let inQuotes = false;
    let currentValue = '';
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        // Handle quotes
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          // Double quotes inside quotes mean a literal quote
          currentValue += '"';
          i++; // Skip the next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        row.push(currentValue);
        currentValue = '';
      } else {
        // Normal character
        currentValue += char;
      }
    }
    
    // Add the last value
    row.push(currentValue);
    rows.push(row);
  }
  
  return rows;
};

const formatDate = (dateStr: string): string => {
  // Try to parse and format the date to YYYY-MM-DD
  try {
    // Check if it's already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Try to parse as MM/DD/YYYY or DD/MM/YYYY
    const parts = dateStr.split(/[\/.-]/);
    if (parts.length === 3) {
      // Check if it's MM/DD/YYYY (US format)
      if (parts[0].length <= 2 && parts[1].length <= 2 && parts[2].length === 4) {
        const month = String(parseInt(parts[0], 10)).padStart(2, '0');
        const day = String(parseInt(parts[1], 10)).padStart(2, '0');
        return `${parts[2]}-${month}-${day}`;
      }
      
      // Check if it's DD/MM/YYYY (UK format)
      if (parts[0].length <= 2 && parts[1].length <= 2 && parts[2].length === 4) {
        const day = String(parseInt(parts[0], 10)).padStart(2, '0');
        const month = String(parseInt(parts[1], 10)).padStart(2, '0');
        return `${parts[2]}-${month}-${day}`;
      }
    }
    
    // Try to parse as a JavaScript Date
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    // Return as is if nothing worked
    return dateStr;
  } catch (e) {
    console.error("Error formatting date:", e);
    return dateStr;
  }
};

const formatTime = (timeStr: string): string => {
  // Try to parse and format the time to HH:MM:SS
  try {
    // Remove any AM/PM indicators and trim
    let cleanTime = timeStr.replace(/\s*(am|pm|a\.m\.|p\.m\.)\s*$/i, '').trim();
    
    // Check if it's in HH:MM:SS format
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(cleanTime)) {
      // Ensure hours are padded to 2 digits
      const [hours, minutes, seconds] = cleanTime.split(':');
      return `${String(parseInt(hours, 10)).padStart(2, '0')}:${minutes}:${seconds}`;
    }
    
    // Check if it's in HH:MM format
    if (/^\d{1,2}:\d{2}$/.test(cleanTime)) {
      // Add seconds and ensure hours are padded
      const [hours, minutes] = cleanTime.split(':');
      return `${String(parseInt(hours, 10)).padStart(2, '0')}:${minutes}:00`;
    }
    
    // Return as is if nothing worked
    return cleanTime;
  } catch (e) {
    console.error("Error formatting time:", e);
    return timeStr;
  }
};

const validateRequiredFields = (entry: Partial<DetailedPrayerTime>): string[] => {
  const missingFields: string[] = [];
  
  // Check for required fields
  if (!entry.date) missingFields.push('date');
  if (!entry.day) missingFields.push('day');
  if (!entry.fajr_jamat) missingFields.push('fajr_jamat');
  if (!entry.sunrise) missingFields.push('sunrise');
  if (!entry.zuhr_jamat) missingFields.push('zuhr_jamat');
  if (!entry.asr_jamat) missingFields.push('asr_jamat');
  if (!entry.maghrib_iftar) missingFields.push('maghrib_iftar');
  if (!entry.isha_first_jamat) missingFields.push('isha_first_jamat');
  
  return missingFields;
};

const updateLocalStorageWithImportedEntry = (entry: DetailedPrayerTime): void => {
  const savedTimes = localStorage.getItem('local-prayer-times');
  if (savedTimes) {
    const localTimes = JSON.parse(savedTimes);
    // Check if we already have this date
    const exists = localTimes.some((item: DetailedPrayerTime) => item.date === entry.date);
    
    if (exists) {
      // Update existing entry
      const updatedTimes = localTimes.map((item: DetailedPrayerTime) => 
        item.date === entry.date ? { ...item, ...entry } : item
      );
      localStorage.setItem('local-prayer-times', JSON.stringify(updatedTimes));
    } else {
      // Add new entry
      localTimes.push(entry);
      localStorage.setItem('local-prayer-times', JSON.stringify(localTimes));
    }
  } else {
    // Create new local storage entry
    localStorage.setItem('local-prayer-times', JSON.stringify([entry]));
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

      if (data && data.length > 0) {
        const detailedPrayerTimes = data as DetailedPrayerTime[];
        prayerTimes = mapDetailedToSimple(detailedPrayerTimes[0]);
      } else {
        prayerTimes = [];
      }

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

// Map detailed prayer time to simple format
const mapDetailedToSimple = (detailedTime: DetailedPrayerTime): PrayerTime[] => {
  return [
    { id: '1', name: 'Fajr', time: detailedTime.fajr_jamat.slice(0, 5) },
    { id: '2', name: 'Sunrise', time: detailedTime.sunrise.slice(0, 5) },
    { id: '3', name: 'Zuhr', time: detailedTime.zuhr_jamat.slice(0, 5) },
    { id: '4', name: 'Asr', time: detailedTime.asr_jamat.slice(0, 5) },
    { id: '5', name: 'Maghrib', time: detailedTime.maghrib_iftar.slice(0, 5) },
    { id: '6', name: 'Isha', time: detailedTime.isha_first_jamat.slice(0, 5) }
  ];
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
export const markActivePrayer = (prayerTimes: PrayerTime[]): PrayerTime[] => {
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
};

// Add the function that PrayerTimesEditor depends on
export const updatePrayerTimes = (prayerTimes: PrayerTime[]): void => {
  try {
    localStorage.setItem(PRAYER_TIMES_KEY, JSON.stringify(prayerTimes));
  } catch (error) {
    console.error('Error updating prayer times:', error);
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
    // Delete all data from Supabase prayer_times table
    const { error } = await supabase
      .from('prayer_times')
      .delete()
      .neq('id', 'placeholder'); // This effectively deletes all rows
    
    if (error) {
      console.error("Supabase error deleting all prayer times:", error);
      throw error;
    }
    
    // Also clear local storage
    localStorage.removeItem('local-prayer-times');
    localStorage.removeItem(PRAYER_TIMES_KEY);
    
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

// New function to import data from Google Sheets
export const importPrayerTimesFromSheet = async (
  sheetId: string, 
  tabName: string = 'Sheet1',
  hasHeaderRow: boolean = true,
  isPublic: boolean = true
): Promise<{ success: boolean; count: number; error?: string }> => {
  try {
    // Construct the Google Sheets API URL
    // For public sheets, we can use the CSV export feature
    let url;
    if (isPublic) {
      url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
    } else {
      // For non-public sheets, we would need a different approach that involves authentication
      return { 
        success: false, 
        count: 0, 
        error: "Non-public sheets are not supported. Please make your sheet public or use another method." 
      };
    }

    console.log("Fetching Google Sheet from URL:", url);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.status} ${response.statusText}`);
    }
    
    const csvText = await response.text();
    const rows = parseCSV(csvText);
    
    if (rows.length === 0) {
      return { success: false, count: 0, error: "No data found in the sheet" };
    }
    
    // Skip header row if specified
    const dataRows = hasHeaderRow ? rows.slice(1) : rows;
    
    if (dataRows.length === 0) {
      return { success: false, count: 0, error: "No data rows found after header" };
    }
    
    console.log(`Processing ${dataRows.length} rows from Google Sheet`);
    
    // Process each row and insert into local storage directly
    const importedEntries: DetailedPrayerTime[] = [];
    const errors: string[] = [];
    
    // Get current local storage entries
    const savedTimes = localStorage.getItem('local-prayer-times');
    const localTimes: DetailedPrayerTime[] = savedTimes ? JSON.parse(savedTimes) : [];
    const existingDates = new Set(localTimes.map((item: DetailedPrayerTime) => item.date));
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      
      // Check if row has enough columns
      if (row.length < 13) {
        errors.push(`Row ${i + (hasHeaderRow ? 2 : 1)} doesn't have enough columns (${row.length}/13)`);
        continue;
      }
      
      try {
        // Map columns to prayer time fields
        const entry: Omit<DetailedPrayerTime, 'id' | 'created_at'> = {
          date: formatDate(row[0]),
          day: row[1],
          sehri_end: formatTime(row[2]),
          fajr_jamat: formatTime(row[3]),
          sunrise: formatTime(row[4]),
          zuhr_start: formatTime(row[5]),
          zuhr_jamat: formatTime(row[6]),
          asr_start: formatTime(row[7]),
          asr_jamat: formatTime(row[8]),
          maghrib_iftar: formatTime(row[9]),
          isha_start: formatTime(row[10]),
          isha_first_jamat: formatTime(row[11]),
          isha_second_jamat: formatTime(row[12])
        };
        
        // Validate required fields
        const missingFields = validateRequiredFields(entry);
        if (missingFields.length > 0) {
          errors.push(`Row ${i + (hasHeaderRow ? 2 : 1)} is missing required fields: ${missingFields.join(', ')}`);
          continue;
        }
        
        // First try to insert into Supabase - but catch and continue if RLS errors occur
        try {
          const { data, error } = await supabase
            .from('prayer_times')
            .upsert({ ...entry }, { onConflict: 'date' })
            .select()
            .single();
            
          if (error) {
            // If it's the RLS error we're trying to work around, continue with local storage
            if (error.message.includes('infinite recursion detected in policy')) {
              console.warn(`RLS error for row ${i}, falling back to local storage:`, error.message);
              // We'll handle this with local storage below
            } else {
              console.error(`Error upserting row ${i}:`, error);
              errors.push(`Row ${i + (hasHeaderRow ? 2 : 1)}: ${error.message}`);
              continue;
            }
          } else if (data) {
            importedEntries.push(data as DetailedPrayerTime);
            
            // Also update local storage for redundancy
            updateLocalStorageWithImportedEntry(data as DetailedPrayerTime);
            continue; // Skip to next row since we successfully added to Supabase
          }
        } catch (supabaseError) {
          console.warn(`Supabase error for row ${i}, falling back to local storage:`, supabaseError);
          // We'll handle this with local storage below
        }
        
        // If we reach here, we need to create a local storage entry
        const localEntry: DetailedPrayerTime = {
          id: `temp-${Date.now()}-${i}`, // Add index to make unique
          ...entry
        };
        
        // Check if we already have this date in local storage
        if (existingDates.has(localEntry.date)) {
          // Update the existing entry
          const updatedLocalTimes = localTimes.map((item: DetailedPrayerTime) => 
            item.date === localEntry.date ? { ...item, ...localEntry, id: item.id } : item
          );
          localTimes.length = 0; // Clear the array
          localTimes.push(...updatedLocalTimes); // Replace with updated items
        } else {
          // Add new entry
          localTimes.push(localEntry);
          existingDates.add(localEntry.date);
        }
        
        importedEntries.push(localEntry);
      } catch (rowError) {
        console.error(`Error processing row ${i}:`, rowError);
        errors.push(`Row ${i + (hasHeaderRow ? 2 : 1)}: ${rowError instanceof Error ? rowError.message : String(rowError)}`);
      }
    }
    
    // Save all local entries
    localStorage.setItem('local-prayer-times', JSON.stringify(localTimes));
    
    // Trigger refresh event
    window.dispatchEvent(new StorageEvent('storage', { key: 'local-prayer-times' }));
    
    console.log(`Import complete: ${importedEntries.length} rows imported, ${errors.length} errors`);
    
    // Return summary
    if (errors.length > 0) {
      const errorMessage = errors.length <= 3 
        ? errors.join('; ') 
        : `${errors.slice(0, 3).join('; ')}... and ${errors.length - 3} more errors`;
        
      if (importedEntries.length > 0) {
        return { 
          success: true, 
          count: importedEntries.length, 
          error: `Imported ${importedEntries.length} entries with ${errors.length} errors: ${errorMessage}` 
        };
      } else {
        return { 
          success: false, 
          count: 0, 
          error: `Failed to import any entries. Errors: ${errorMessage}` 
        };
      }
    }
    
    return { 
      success: true, 
      count: importedEntries.length 
    };
  } catch (error) {
    console.error("Error importing from Google Sheets:", error);
    return { 
      success: false, 
      count: 0, 
      error: error instanceof Error ? error.message : String(error)
    };
  }
};
