
import { DetailedPrayerTime } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { addPrayerTimeEntry } from "./prayerTimeService";
import { clearPrayerTimesCache } from "./cacheService";

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
      const { error } = await supabase.from('prayer_times').select('count', { count: 'exact', head: true });
      if (error) {
        console.warn("Unable to connect to Supabase, data will be stored locally only:", error);
      }
    } catch (connectionError) {
      console.warn("Error testing Supabase connection:", connectionError);
    }
    
    // Process the CSV data and import it
    return await importFromCSV(csvText);
    
  } catch (error) {
    console.error("Error importing from Google Sheets:", error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error during import"
    };
  }
};
