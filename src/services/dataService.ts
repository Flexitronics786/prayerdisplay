import { PrayerTime, DetailedPrayerTime, Hadith } from "@/types";
import { getCurrentTime24h, isTimeBefore } from "@/utils/dateUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

export const fetchPrayerTimes = async (): Promise<PrayerTime[]> => {
  try {
    // Try to get today's prayer times from Supabase
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    console.log("Fetching prayer times for today:", today);
    
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
      console.log('No prayer times found for today in database');
      // Fall back to default times if no data found for today
      console.log("Using default prayer times");
      return markActivePrayer(defaultPrayerTimes);
    }

    // Map Supabase data to PrayerTime format
    console.log("Fetched prayer times from database:", data[0]);
    const formattedTimes = mapToDisplayFormat(data[0]);
    return markActivePrayer(formattedTimes);
  } catch (error) {
    console.error('Error fetching prayer times:', error);
    // Use default prayer times as ultimate fallback
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
  // This function is no longer used as we're only saving to the database
  console.warn('updatePrayerTimes is deprecated. Use addPrayerTimeEntry instead.');
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
    console.log("Fetching all prayer times from database...");
    // Fetch from Supabase
    const { data, error } = await supabase
      .from('prayer_times')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching prayer times from Supabase:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log("No prayer times found in database");
      return [];
    }
    
    console.log("Successfully fetched prayer times from database:", data.length);
    return data as DetailedPrayerTime[];
  } catch (error) {
    console.error('Error fetching all prayer times:', error);
    toast.error("Failed to fetch prayer times from database");
    return [];
  }
};

export const addPrayerTimeEntry = async (entry: Omit<DetailedPrayerTime, 'id' | 'created_at'>): Promise<DetailedPrayerTime | null> => {
  try {
    console.log("Adding prayer time entry to database:", entry);
    
    // Try to establish a test connection to Supabase before proceeding
    try {
      const { error: testError } = await supabase.from('prayer_times').select('id', { count: 'exact', head: true });
      if (testError) {
        console.error("Supabase connection test failed:", testError);
        throw new Error(`Database connection error: ${testError.message}`);
      }
    } catch (testError) {
      console.error("Failed to test Supabase connection:", testError);
      throw testError;
    }
    
    // Add to Supabase
    const { data, error } = await supabase
      .from('prayer_times')
      .insert(entry)
      .select()
      .single();

    if (error) {
      console.error("Supabase error adding prayer time:", error);
      throw error;
    }

    console.log("Successfully added prayer time entry to Supabase:", data);
    return data as DetailedPrayerTime;
  } catch (error) {
    console.error('Error in addPrayerTimeEntry:', error);
    toast.error("Failed to save prayer time to database");
    return null;
  }
};

export const updatePrayerTimeEntry = async (id: string, entry: Partial<DetailedPrayerTime>): Promise<DetailedPrayerTime | null> => {
  try {
    // Check if this is a temporary ID (for locally stored entries)
    if (id.startsWith('temp-')) {
      console.error("Cannot update temporary entries");
      toast.error("Cannot update temporary entries. Please add as a new entry instead.");
      return null;
    }
    
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

    return data as DetailedPrayerTime;
  } catch (error) {
    console.error('Error updating prayer time entry:', error);
    toast.error("Failed to update prayer time in database");
    return null;
  }
};

export const deletePrayerTimeEntry = async (id: string): Promise<boolean> => {
  try {
    // Check if this is a temporary ID (for locally stored entries)
    if (id.startsWith('temp-')) {
      console.error("Cannot delete temporary entries");
      toast.error("Cannot delete temporary entries. This shouldn't exist.");
      return false;
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
    
    return true;
  } catch (error) {
    console.error('Error deleting prayer time entry:', error);
    toast.error("Failed to delete prayer time from database");
    return false;
  }
};

// New function to delete all prayer times from database
export const deleteAllPrayerTimes = async (): Promise<boolean> => {
  try {
    console.log("Starting to delete all prayer times...");
    
    // Delete all data from Supabase prayer_times table
    // Using .gte('id', ...) will delete every row
    const { error } = await supabase
      .from('prayer_times')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000');
    
    if (error) {
      console.error("Supabase error deleting all prayer times:", error);
      throw error;
    }
    
    console.log("Successfully deleted all prayer times");
    return true;
  } catch (error) {
    console.error('Error deleting all prayer times:', error);
    toast.error("Failed to delete all prayer times from database");
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
    
    // Test Supabase connection before attempting to add entries
    try {
      const { error: testError } = await supabase.from('prayer_times').select('id', { count: 'exact', head: true });
      if (testError) {
        console.error("Supabase connection test failed during import:", testError);
        throw new Error(`Database connection error: ${testError.message}`);
      }
    } catch (testError) {
      console.error("Failed to test Supabase connection during import:", testError);
      return {
        success: false,
        count: 0,
        error: "Cannot connect to database. Please check your connection and try again."
      };
    }
    
    // Try to add all entries to the database
    let successCount = 0;
    let failCount = 0;
    
    for (const entry of prayerTimes) {
      try {
        // Skip entries with missing required data
        if (!entry.date || !entry.day) {
          failCount++;
          continue;
        }
        
        const result = await addPrayerTimeEntry(entry);
        if (result) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`Failed to add entry for date ${entry.date}:`, error);
        failCount++;
      }
    }
    
    console.log(`Import completed: ${successCount} entries added to DB, ${failCount} failed`);
    
    if (successCount === 0 && failCount > 0) {
      return {
        success: false,
        count: 0,
        error: `Failed to import any prayer times. ${failCount} entries had errors.`
      };
    }
    
    let warningMessage = '';
    if (failCount > 0) {
      warningMessage = `${failCount} entries failed to import.`;
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
    return await importFromCSV(csvText);
  } catch (error) {
    console.error("Error importing from Google Sheet:", error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error during import"
    };
  }
};
