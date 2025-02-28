
import { Hadith, PrayerTime, DetailedPrayerTime } from "@/types";
import { getCurrentTime24h, isTimeBefore } from "@/utils/dateUtils";
import { supabase } from "@/integrations/supabase/client";

// This would be replaced with an actual API call to Supabase or Firebase
const PRAYER_TIMES_KEY = 'mosque-prayer-times';
const HADITH_KEY = 'mosque-hadith';

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
    
    // Process each row and insert into local storage directly, skipping Supabase due to RLS errors
    const importedEntries: DetailedPrayerTime[] = [];
    const errors: string[] = [];
    
    // Get current local storage entries
    const savedTimes = localStorage.getItem('local-prayer-times');
    const localTimes = savedTimes ? JSON.parse(savedTimes) : [];
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
          error: `Imported ${importedEntries.length} entries to local storage due to RLS errors. ${errorMessage}` 
        };
      } else {
        return { 
          success: false, 
          count: 0, 
          error: `Import failed with errors: ${errorMessage}` 
        };
      }
    }
    
    return { 
      success: true, 
      count: importedEntries.length,
      error: importedEntries.length > 0 ? "Imported to local storage due to RLS errors with profiles table." : undefined
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

// Helper function to parse CSV text
const parseCSV = (text: string): string[][] => {
  const lines = text.split('\n');
  return lines.map(line => {
    // Handle quoted values (which may contain commas)
    const result = [];
    let inQuotes = false;
    let currentValue = '';
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    // Add the last value
    result.push(currentValue.trim());
    
    return result;
  }).filter(row => row.length > 0 && row.some(cell => cell.trim() !== ''));
};

// Helper function to format date values
const formatDate = (dateStr: string): string => {
  // Try to parse and standardize the date format
  let formattedDate = dateStr.trim();
  
  try {
    // Check if it's already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
      return formattedDate;
    }
    
    // Try to parse as a date
    const dateObj = new Date(formattedDate);
    if (!isNaN(dateObj.getTime())) {
      // Format as YYYY-MM-DD
      return dateObj.toISOString().split('T')[0];
    }
    
    // If we get here, use the original string
    return formattedDate;
  } catch (error) {
    console.warn("Error formatting date:", dateStr, error);
    return formattedDate; // Return original if parsing fails
  }
};

// Helper function to format time values
const formatTime = (timeStr: string): string => {
  // Standardize time format to HH:MM:SS
  let formattedTime = timeStr.trim();
  
  try {
    // If it's empty, return an empty string
    if (!formattedTime) {
      return '';
    }
    
    // Check if it's already in HH:MM format
    if (/^\d{1,2}:\d{2}$/.test(formattedTime)) {
      // Ensure it has leading zeros for hours
      const [hours, minutes] = formattedTime.split(':');
      return `${hours.padStart(2, '0')}:${minutes}:00`;
    }
    
    // Check if it's already in HH:MM:SS format
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(formattedTime)) {
      // Ensure it has leading zeros for hours
      const [hours, minutes, seconds] = formattedTime.split(':');
      return `${hours.padStart(2, '0')}:${minutes}:${seconds}`;
    }
    
    // Try to parse as a time (e.g., "7:30 AM")
    const match = formattedTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
    if (match) {
      let [, hours, minutes, seconds = '00', period] = match;
      
      // Convert to 24-hour format if AM/PM is specified
      if (period) {
        let hourNum = parseInt(hours, 10);
        if (period.toUpperCase() === 'PM' && hourNum < 12) {
          hourNum += 12;
        } else if (period.toUpperCase() === 'AM' && hourNum === 12) {
          hourNum = 0;
        }
        hours = hourNum.toString();
      }
      
      return `${hours.padStart(2, '0')}:${minutes}:${seconds}`;
    }
    
    // If we get here, try using the original string
    console.warn("Using original time string (couldn't format):", formattedTime);
    return formattedTime;
  } catch (error) {
    console.warn("Error formatting time:", timeStr, error);
    return formattedTime; // Return original if parsing fails
  }
};

// Helper function to validate required fields
const validateRequiredFields = (entry: Omit<DetailedPrayerTime, 'id' | 'created_at'>): string[] => {
  const requiredFields: (keyof Omit<DetailedPrayerTime, 'id' | 'created_at'>)[] = [
    'date', 'day', 'fajr_jamat', 'sunrise', 'zuhr_jamat', 
    'asr_jamat', 'maghrib_iftar', 'isha_first_jamat'
  ];
  
  return requiredFields.filter(field => !entry[field]);
};

// Helper function to update local storage with imported entry
const updateLocalStorageWithImportedEntry = (entry: DetailedPrayerTime): void => {
  const savedTimes = localStorage.getItem('local-prayer-times');
  const localTimes = savedTimes ? JSON.parse(savedTimes) : [];
  
  // Remove any existing entry for this date
  const filteredTimes = localTimes.filter((item: DetailedPrayerTime) => 
    item.date !== entry.date
  );
  
  // Add the new entry
  filteredTimes.push(entry);
  
  // Store back in local storage
  localStorage.setItem('local-prayer-times', JSON.stringify(filteredTimes));
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
