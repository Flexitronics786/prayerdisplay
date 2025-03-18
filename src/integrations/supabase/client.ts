
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { toast } from "sonner";

const SUPABASE_URL = "https://ykdwjpsairsfvqjqgykz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrZHdqcHNhaXJzZnZxanFneWt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2OTU0MTQsImV4cCI6MjA1NjI3MTQxNH0.JVdbbw9kpK6NcJMENXHGlfXpePbSiMj-cEn-habkd1E";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    },
    global: {
      headers: { 'x-skip-rls': 'true' }
    },
    db: {
      schema: 'public'
    },
    realtime: {
      timeout: 60000, // Increase timeout to 60 seconds
      params: {
        eventsPerSecond: 10
      }
    },
    // Add additional client options
    fetch: (url, options) => {
      const timeout = 30000; // 30-second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      return fetch(url, {
        ...options,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));
    }
  }
);

// Add a helper function to check connection status
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    console.log("Testing Supabase connection...");
    const startTime = Date.now();
    
    const { error } = await supabase
      .from('prayer_times')
      .select('id', { count: 'exact', head: true })
      .limit(1)
      .timeout(10000);
    
    const endTime = Date.now();
    console.log(`Connection check completed in ${endTime - startTime}ms`);
    
    if (error) {
      console.error("Supabase connection check failed:", error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error("Supabase connection check exception:", err);
    return false;
  }
};

// Function to initialize connection and show status to user
export const initializeSupabaseConnection = async (): Promise<void> => {
  try {
    const isConnected = await checkSupabaseConnection();
    
    if (isConnected) {
      console.log("Successfully connected to Supabase database");
    } else {
      console.error("Failed to connect to Supabase database");
      toast.error("Database connection failed. Using local prayer times.", {
        duration: 5000,
        id: "db-connection-error"
      });
    }
  } catch (error) {
    console.error("Error initializing Supabase connection:", error);
  }
};

// Call this function as soon as possible to detect connection issues early
setTimeout(() => {
  initializeSupabaseConnection();
}, 1000);
