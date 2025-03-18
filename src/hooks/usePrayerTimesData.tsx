
import { useState, useCallback, useRef, useEffect } from "react";
import { fetchPrayerTimes } from "@/services/dataService";
import { PrayerTime } from "@/types";
import { supabase, checkSupabaseConnection } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const usePrayerTimesData = () => {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCheckTimer, setNextCheckTimer] = useState<NodeJS.Timeout | null>(null);
  const [dbConnectionStatus, setDbConnectionStatus] = useState<boolean | null>(null);
  const dataLoadingRef = useRef(false);
  const connectionRetryCountRef = useRef(0);
  const connectionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const MAX_RETRIES = 5;
  const RETRY_DELAY_BASE = 2000;

  const checkConnection = useCallback(async (showToast = true) => {
    try {
      console.log("Checking database connection...");
      const isConnected = await checkSupabaseConnection();
      
      // Only update if status changed to avoid unnecessary re-renders
      if (dbConnectionStatus !== isConnected) {
        setDbConnectionStatus(isConnected);
        
        if (isConnected) {
          connectionRetryCountRef.current = 0;
          if (dbConnectionStatus === false && showToast) {
            toast.success("Database connection restored!", { id: "db-connection-restored" });
          }
        }
      }
      
      if (!isConnected && connectionRetryCountRef.current < MAX_RETRIES) {
        connectionRetryCountRef.current += 1;
        console.log(`Database connection failed, retry attempt ${connectionRetryCountRef.current} of ${MAX_RETRIES}`);
        
        // Only show toast on first attempt to avoid spamming
        if (connectionRetryCountRef.current === 1 && showToast) {
          toast.error("Database connection issue. Retrying...", { 
            duration: 5000,
            id: "db-connection-retry"
          });
        }
        
        // Exponential backoff for retries
        const retryDelay = RETRY_DELAY_BASE * Math.pow(2, connectionRetryCountRef.current - 1);
        setTimeout(() => checkConnection(false), retryDelay);
      } else if (!isConnected) {
        console.error("Database connection failed after maximum retry attempts");
        if (showToast) {
          toast.error("Could not connect to database. Using default prayer times.", {
            duration: 8000,
            id: "db-connection-failed"
          });
        }
      }
      
      return isConnected;
    } catch (error) {
      console.error("Error checking database connection:", error);
      setDbConnectionStatus(false);
      return false;
    }
  }, [dbConnectionStatus]);

  const loadData = useCallback(async () => {
    if (dataLoadingRef.current) {
      console.log("Already loading data, skipping this request");
      return;
    }
    
    try {
      dataLoadingRef.current = true;
      setIsLoading(true);
      setError(null);
      
      // Check connection before attempting to fetch
      const isConnected = await checkConnection(false);
      
      console.log("Loading prayer times...");
      const times = await fetchPrayerTimes();
      console.log("Prayer times loaded:", times);
      setPrayerTimes(times);
      scheduleNextCheck(times);
      
      if (!isConnected) {
        console.warn("Using default prayer times due to database connection issues");
      }
    } catch (error) {
      console.error("Error loading data:", error);
      setError(error instanceof Error ? error.message : "Unknown error loading prayer times");
      toast.error("Failed to load prayer times. Using default times.", {
        id: "prayer-times-load-error"
      });
    } finally {
      setIsLoading(false);
      dataLoadingRef.current = false;
    }
  }, [checkConnection]);

  const scheduleNextCheck = useCallback((prayers: PrayerTime[]) => {
    if (nextCheckTimer) {
      clearTimeout(nextCheckTimer);
    }
    
    const nextPrayer = prayers.find(prayer => prayer.isNext);
    
    if (!nextPrayer) {
      console.log("No next prayer found, scheduling check in 30 minutes");
      const timer = setTimeout(() => loadData(), 30 * 60 * 1000);
      setNextCheckTimer(timer);
      return;
    }
    
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeInMinutes = currentHours * 60 + currentMinutes;
    
    const [prayerHours, prayerMinutes] = nextPrayer.time.split(':').map(Number);
    let prayerTimeInMinutes = prayerHours * 60 + prayerMinutes;
    
    if (prayerTimeInMinutes < currentTimeInMinutes) {
      prayerTimeInMinutes += 24 * 60;
    }
    
    const minutesUntilPrayer = prayerTimeInMinutes - currentTimeInMinutes;
    
    const checkOffsetMinutes = 5;
    const checkInMinutes = Math.max(0, minutesUntilPrayer - checkOffsetMinutes);
    
    console.log(`Next prayer (${nextPrayer.name}) at ${nextPrayer.time}, checking in ${checkInMinutes} minutes`);
    
    const timer = setTimeout(() => loadData(), checkInMinutes * 60 * 1000);
    setNextCheckTimer(timer);
    
    if (minutesUntilPrayer > 0) {
      setTimeout(() => loadData(), minutesUntilPrayer * 60 * 1000);
    }
  }, [loadData, nextCheckTimer]);

  useEffect(() => {
    loadData();
    checkConnection(true);

    // Use type assertion for the subscription to avoid type errors
    const prayerTimesSubscription = supabase
      .channel('prayer_times_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'prayer_times' 
      }, (payload) => {
        console.log("Prayer times changed in database:", payload);
        loadData();
      })
      .subscribe((status) => {
        console.log("Supabase subscription status:", status);
      });
    
    // Periodic recheck of connection
    if (connectionCheckIntervalRef.current) {
      clearInterval(connectionCheckIntervalRef.current);
    }
    
    connectionCheckIntervalRef.current = setInterval(() => {
      if (dbConnectionStatus === false) {
        checkConnection(false);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes if not connected
    
    return () => {
      if (nextCheckTimer) {
        clearTimeout(nextCheckTimer);
      }
      if (connectionCheckIntervalRef.current) {
        clearInterval(connectionCheckIntervalRef.current);
      }
      supabase.removeChannel(prayerTimesSubscription);
    };
  }, [loadData, checkConnection, dbConnectionStatus, nextCheckTimer]);

  return { 
    prayerTimes, 
    isLoading, 
    error, 
    loadData,
    dbConnectionStatus,
    retryConnection: () => checkConnection(true)
  };
};
