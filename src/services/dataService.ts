import { supabase } from "@/integrations/supabase/client";
import { PrayerTime, DetailedPrayerTime, Hadith, DailyHadith } from "@/types";

// Helper function to get current time in 24h format (HH:MM)
const getCurrentTime24h = (): string => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

// Helper function to check if time1 is before time2 (both in 24h format)
const isTimeBefore = (time1: string, time2: string): boolean => {
  const [hours1, minutes1] = time1.split(':').map(Number);
  const [hours2, minutes2] = time2.split(':').map(Number);
  
  if (hours1 < hours2) return true;
  if (hours1 > hours2) return false;
  return minutes1 < minutes2;
};

// Helper function to mark active prayer and next prayer
const markActivePrayer = (prayerTimes: PrayerTime[]): PrayerTime[] => {
  const currentTime = getCurrentTime24h();
  
  // First, find the next prayer
  let activeIndex = -1;
  let nextIndex = -1;
  
  for (let i = 0; i < prayerTimes.length; i++) {
    const prayerTime = prayerTimes[i];
    
    // Check if this prayer time is before current time
    if (isTimeBefore(currentTime, prayerTime.time)) {
      nextIndex = i;
      break;
    }
    
    // Otherwise, this is the current active prayer
    activeIndex = i;
  }
  
  // If no active prayer was found, it means the last prayer of the day is active
  if (nextIndex === -1 && activeIndex === -1) {
    activeIndex = prayerTimes.length - 1;
  }
  
  // Apply light background colors to different prayer times
  const updatedPrayerTimes = prayerTimes.map((prayer, index) => {
    const updatedPrayer = { ...prayer };
    
    // Add style for specific prayer names
    if (prayer.name === "Maghrib") {
      updatedPrayer.style = { backgroundColor: "rgba(240, 253, 244, 0.8)" }; // Light green
    } else if (prayer.name === "Isha") {
      updatedPrayer.style = { backgroundColor: "rgba(243, 232, 255, 0.8)" }; // Light purple
    } else if (prayer.name === "Jummah") {
      updatedPrayer.style = { backgroundColor: "rgba(254, 249, 195, 0.8)" }; // Light yellow
    }
    
    // Mark active and next prayers
    if (index === activeIndex) {
      updatedPrayer.isActive = true;
    } else if (index === nextIndex) {
      updatedPrayer.isNext = true;
    }
    
    return updatedPrayer;
  });
  
  return updatedPrayerTimes;
};

// Function to convert detailed prayer time to simplified format
const convertToSimplePrayerTimes = (detailedTime: DetailedPrayerTime): PrayerTime[] => {
  const prayerTimes: PrayerTime[] = [];
  
  // Add Fajr
  prayerTimes.push({
    id: `fajr-${detailedTime.id}`,
    name: "Fajr",
    time: detailedTime.sehri_end,
    iqamahTime: detailedTime.fajr_jamat
  });
  
  // Add Sunrise
  prayerTimes.push({
    id: `sunrise-${detailedTime.id}`,
    name: "Sunrise",
    time: detailedTime.sunrise
  });
  
  // Add Zuhr
  prayerTimes.push({
    id: `zuhr-${detailedTime.id}`,
    name: "Zuhr",
    time: detailedTime.zuhr_start,
    iqamahTime: detailedTime.zuhr_jamat
  });
  
  // Check if it's Friday and add Jummah
  const date = new Date(detailedTime.date);
  if (date.getDay() === 5) { // 5 is Friday
    prayerTimes.push({
      id: `jummah-${detailedTime.id}`,
      name: "Jummah",
      time: "13:15", // Hardcoded for now, could be added to the database schema
      iqamahTime: "13:30" // Hardcoded for now
    });
  }
  
  // Add Asr
  prayerTimes.push({
    id: `asr-${detailedTime.id}`,
    name: "Asr",
    time: detailedTime.asr_start,
    iqamahTime: detailedTime.asr_jamat
  });
  
  // Add Maghrib
  prayerTimes.push({
    id: `maghrib-${detailedTime.id}`,
    name: "Maghrib",
    time: detailedTime.maghrib_iftar
  });
  
  // Add Isha
  prayerTimes.push({
    id: `isha-${detailedTime.id}`,
    name: "Isha",
    time: detailedTime.isha_start,
    iqamahTime: detailedTime.isha_first_jamat
  });
  
  return markActivePrayer(prayerTimes);
};

// Function to fetch today's prayer times
export const fetchPrayerTimes = async (): Promise<PrayerTime[]> => {
  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Try to get from local storage first
    const cachedData = localStorage.getItem('local-prayer-times');
    if (cachedData) {
      const { date, data } = JSON.parse(cachedData);
      if (date === today) {
        console.log("Using cached prayer times from local storage");
        return markActivePrayer(data); // Re-mark active prayer with current time
      }
    }
    
    // If not in cache or cache is outdated, fetch from Supabase
    console.log("Fetching prayer times from Supabase for date:", today);
    const { data, error } = await supabase
      .from('prayer_times')
      .select('*')
      .eq('date', today)
      .single();
    
    if (error) {
      console.error("Error fetching prayer times:", error);
      
      // If no data for today, try to get the closest date
      const { data: closestData, error: closestError } = await supabase
        .from('prayer_times')
        .select('*')
        .gte('date', today)
        .order('date')
        .limit(1);
      
      if (closestError || !closestData || closestData.length === 0) {
        console.error("Error fetching closest prayer times:", closestError);
        return [];
      }
      
      console.log("Using closest available prayer times for date:", closestData[0].date);
      const prayerTimes = convertToSimplePrayerTimes(closestData[0]);
      
      // Cache the result
      localStorage.setItem('local-prayer-times', JSON.stringify({
        date: today,
        data: prayerTimes
      }));
      
      return prayerTimes;
    }
    
    console.log("Found prayer times for today:", data);
    const prayerTimes = convertToSimplePrayerTimes(data);
    
    // Cache the result
    localStorage.setItem('local-prayer-times', JSON.stringify({
      date: today,
      data: prayerTimes
    }));
    
    return prayerTimes;
  } catch (error) {
    console.error("Error in fetchPrayerTimes:", error);
    return [];
  }
};

// Function to fetch today's hadith
export const fetchHadith = async (): Promise<Hadith | null> => {
  try {
    // Get today's date
    const today = new Date();
    const dayOfMonth = today.getDate();
    const currentMonth = today.toISOString().substring(0, 7); // YYYY-MM format
    
    console.log(`Fetching hadith for day ${dayOfMonth} in month ${currentMonth}`);
    
    // Try to get hadith for current month and day
    const { data: monthSpecificData, error: monthSpecificError } = await supabase
      .from('daily_hadiths')
      .select('*')
      .eq('day_of_month', dayOfMonth)
      .eq('month', currentMonth)
      .single();
    
    if (!monthSpecificError && monthSpecificData) {
      console.log("Found month-specific hadith:", monthSpecificData);
      return {
        id: monthSpecificData.id,
        text: monthSpecificData.text,
        source: monthSpecificData.source
      };
    }
    
    // If no month-specific hadith, get general hadith for this day
    console.log("No month-specific hadith found, trying general hadith");
    const { data: generalData, error: generalError } = await supabase
      .from('daily_hadiths')
      .select('*')
      .eq('day_of_month', dayOfMonth)
      .is('month', null)
      .single();
    
    if (generalError) {
      console.error("Error fetching general hadith:", generalError);
      
      // If still no hadith, get any random hadith
      console.log("No general hadith found, getting random hadith");
      const { data: randomData, error: randomError } = await supabase
        .from('daily_hadiths')
        .select('*')
        .limit(1);
      
      if (randomError || !randomData || randomData.length === 0) {
        console.error("Error fetching random hadith:", randomError);
        return null;
      }
      
      console.log("Using random hadith:", randomData[0]);
      return {
        id: randomData[0].id,
        text: randomData[0].text,
        source: randomData[0].source
      };
    }
    
    console.log("Found general hadith for today:", generalData);
    return {
      id: generalData.id,
      text: generalData.text,
      source: generalData.source
    };
  } catch (error) {
    console.error("Error in fetchHadith:", error);
    return null;
  }
};

// Function to fetch all prayer times for admin view
export const fetchAllPrayerTimes = async (): Promise<DetailedPrayerTime[]> => {
  try {
    const { data, error } = await supabase
      .from('prayer_times')
      .select('*')
      .order('date', { ascending: false })
      .limit(100);
    
    if (error) {
      console.error("Error fetching all prayer times:", error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error("Error in fetchAllPrayerTimes:", error);
    return [];
  }
};

// Function to add a new prayer time entry
export const addPrayerTimeEntry = async (
  prayerTime: Omit<DetailedPrayerTime, 'id' | 'created_at'>
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('prayer_times')
      .insert([prayerTime])
      .select();
    
    if (error) {
      console.error("Error adding prayer time:", error);
      return false;
    }
    
    console.log("Added prayer time:", data);
    return true;
  } catch (error) {
    console.error("Error in addPrayerTimeEntry:", error);
    return false;
  }
};

// Function to update an existing prayer time entry
export const updatePrayerTimeEntry = async (
  id: string,
  prayerTime: Omit<DetailedPrayerTime, 'id' | 'created_at'>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('prayer_times')
      .update(prayerTime)
      .eq('id', id);
    
    if (error) {
      console.error("Error updating prayer time:", error);
      return false;
    }
    
    console.log("Updated prayer time with ID:", id);
    return true;
  } catch (error) {
    console.error("Error in updatePrayerTimeEntry:", error);
    return false;
  }
};

// Function to delete a prayer time entry
export const deletePrayerTimeEntry = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('prayer_times')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error("Error deleting prayer time:", error);
      return false;
    }
    
    console.log("Deleted prayer time with ID:", id);
    return true;
  } catch (error) {
    console.error("Error in deletePrayerTimeEntry:", error);
    return false;
  }
};

// Function to import prayer times from Google Sheets
export const importPrayerTimesFromSheet = async (
  sheetId: string,
  tabName: string = 'Sheet1',
  hasHeaderRow: boolean = true,
  isPublic: boolean = true
): Promise<{ success: boolean; count?: number; error?: string }> => {
  try {
    if (!isPublic) {
      return {
        success: false,
        error: "Private Google Sheets are not supported yet."
      };
    }
    
    // Construct the Google Sheets API URL
    const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tabName)}?key=${process.env.NEXT_PUBLIC_GOOGLE_API_KEY}`;
    
    // If no API key is configured, use the CSV export URL (limited but works without API key)
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
    
    const url = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ? apiUrl : csvUrl;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.statusText}`);
    }
    
    let data;
    if (process.env.NEXT_PUBLIC_GOOGLE_API_KEY) {
      // Parse JSON response from Google Sheets API
      const jsonData = await response.json();
      data = jsonData.values;
    } else {
      // Parse CSV response
      const csvData = await response.text();
      data = parseCSV(csvData);
    }
    
    if (!data || data.length === 0) {
      return {
        success: false,
        error: "No data found in the spreadsheet."
      };
    }
    
    // Skip header row if specified
    const startRow = hasHeaderRow ? 1 : 0;
    
    // Map spreadsheet data to prayer times
    const prayerTimes: Omit<DetailedPrayerTime, 'id' | 'created_at'>[] = [];
    
    for (let i = startRow; i < data.length; i++) {
      const row = data[i];
      
      // Check if row has enough columns
      if (row.length < 5) {
        console.warn(`Row ${i + 1} doesn't have enough columns, skipping`);
        continue;
      }
      
      // Extract data from row
      // Expected format: Date, Day, Sehri End, Fajr Jamat, Sunrise, Zuhr Start, Zuhr Jamat, Asr Start, Asr Jamat, Maghrib/Iftar, Isha Start, Isha First Jamat, Isha Second Jamat
      const prayerTime: Omit<DetailedPrayerTime, 'id' | 'created_at'> = {
        date: formatDate(row[0]),
        day: row[1],
        sehri_end: formatTime(row[2]),
        fajr_jamat: formatTime(row[3]),
        sunrise: formatTime(row[4]),
        zuhr_start: row[5] ? formatTime(row[5]) : '',
        zuhr_jamat: formatTime(row[6]),
        asr_start: row[7] ? formatTime(row[7]) : '',
        asr_jamat: formatTime(row[8]),
        maghrib_iftar: formatTime(row[9]),
        isha_start: row[10] ? formatTime(row[10]) : '',
        isha_first_jamat: formatTime(row[11]),
        isha_second_jamat: row[12] ? formatTime(row[12]) : ''
      };
      
      prayerTimes.push(prayerTime);
    }
    
    if (prayerTimes.length === 0) {
      return {
        success: false,
        error: "No valid prayer times found in the spreadsheet."
      };
    }
    
    // Insert prayer times into database
    const { data: insertedData, error } = await supabase
      .from('prayer_times')
      .insert(prayerTimes)
      .select();
    
    if (error) {
      console.error("Error inserting prayer times:", error);
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }
    
    console.log(`Imported ${insertedData.length} prayer times`);
    
    return {
      success: true,
      count: insertedData.length
    };
  } catch (error) {
    console.error("Error importing prayer times from sheet:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

// Function to delete all prayer times (admin only)
export const deleteAllPrayerTimes = async (): Promise<boolean> => {
  try {
    // This is a dangerous operation, so we'll add some safeguards
    // In a real app, you might want to add additional confirmation or backup data first
    
    const { error } = await supabase
      .from('prayer_times')
      .delete()
      .neq('id', ''); // This is a trick to delete all rows
    
    if (error) {
      console.error("Error deleting all prayer times:", error);
      return false;
    }
    
    console.log("Deleted all prayer times");
    return true;
  } catch (error) {
    console.error("Error in deleteAllPrayerTimes:", error);
    return false;
  }
};

// Helper function to parse CSV data
const parseCSV = (csvText: string): string[][] => {
  const lines = csvText.split('\n');
  return lines.map(line => {
    // Handle quoted values (which might contain commas)
    const result = [];
    let inQuote = false;
    let currentValue = '';
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === ',' && !inQuote) {
        result.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    // Add the last value
    result.push(currentValue);
    
    return result;
  });
};

// Helper function to format date string to YYYY-MM-DD
const formatDate = (dateStr: string): string => {
  try {
    // Try to parse the date string
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      // If parsing fails, try to handle common formats like DD/MM/YYYY
      const parts = dateStr.split(/[\/\-\.]/);
      if (parts.length === 3) {
        // Assume DD/MM/YYYY format if day is > 12
        if (parseInt(parts[0]) > 12) {
          date.setFullYear(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        } else {
          // Otherwise try MM/DD/YYYY
          date.setFullYear(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
        }
      }
    }
    
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date format: ${dateStr}, using as-is`);
      return dateStr;
    }
    
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  } catch (e) {
    console.warn(`Error formatting date: ${dateStr}`, e);
    return dateStr;
  }
};

// Helper function to format time string to HH:MM
const formatTime = (timeStr: string): string => {
  try {
    if (!timeStr) return '';
    
    // Remove any non-digit, non-colon, non-period characters
    timeStr = timeStr.replace(/[^\d:\.]/g, '');
    
    // Handle different time formats
    if (timeStr.includes(':')) {
      // Already in HH:MM format
      const [hours, minutes] = timeStr.split(':');
      return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    } else if (timeStr.includes('.')) {
      // Decimal format (e.g., 7.30)
      const [hours, minutes] = timeStr.split('.');
      return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    } else if (timeStr.length === 4) {
      // Military format (e.g., 0730)
      return `${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}`;
    } else if (timeStr.length <= 2) {
      // Just hours (e.g., 7)
      return `${timeStr.padStart(2, '0')}:00`;
    }
    
    console.warn(`Unrecognized time format: ${timeStr}, using as-is`);
    return timeStr;
  } catch (e) {
    console.warn(`Error formatting time: ${timeStr}`, e);
    return timeStr;
  }
};
