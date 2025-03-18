
import { useState, useCallback, useRef, useEffect } from "react";
import { fetchPrayerTimes } from "@/services/dataService";
import { PrayerTime } from "@/types";
import { supabase, clearPrayerTimesCache } from "@/integrations/supabase/client";

export const usePrayerTimesData = () => {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nextCheckTimer, setNextCheckTimer] = useState<NodeJS.Timeout | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const dataLoadingRef = useRef(false);
  const lastSuccessfulFetchRef = useRef<number | null>(null);

  // Function to force a reload of the page
  const forcePageReload = useCallback(() => {
    console.log("Forcing full page reload to refresh data");
    window.location.reload();
  }, []);

  // Refresh prayer times every 5 minutes on TV displays
  useEffect(() => {
    // Check if this is a TV display
    const isTV = window.location.search.includes('tv=true') || 
                localStorage.getItem('tv-mode') === 'true';
    
    if (isTV) {
      const refreshInterval = setInterval(() => {
        console.log("TV mode refresh interval triggered");
        
        // Clear caches every 10th refresh (about every 50 minutes)
        if (refreshCount % 10 === 0) {
          clearPrayerTimesCache();
        }
        
        // Increment refresh counter
        setRefreshCount(prev => prev + 1);
        
        // Force data reload
        loadData(true);
        
        // Every hour, trigger a full page reload
        if (refreshCount % 12 === 0) {
          forcePageReload();
        }
      }, 5 * 60 * 1000); // 5 minutes
      
      return () => clearInterval(refreshInterval);
    }
    
    return undefined;
  }, [refreshCount, forcePageReload]);

  const loadData = useCallback(async (forceRefresh = false) => {
    if (dataLoadingRef.current && !forceRefresh) {
      console.log("Already loading data, skipping this request");
      return;
    }
    
    const now = Date.now();
    const lastFetchTime = lastSuccessfulFetchRef.current;
    
    // Skip if last successful fetch was less than 60 seconds ago, unless force refresh
    if (!forceRefresh && lastFetchTime && now - lastFetchTime < 60000) {
      console.log("Skipping fetch, last successful fetch was too recent");
      return;
    }
    
    try {
      dataLoadingRef.current = true;
      setIsLoading(true);
      console.log("Loading prayer times (forceRefresh:", forceRefresh, ")...");
      
      // Clear cache if force refresh is true
      if (forceRefresh) {
        clearPrayerTimesCache();
      }
      
      const times = await fetchPrayerTimes(forceRefresh);
      setPrayerTimes(times);
      scheduleNextCheck(times);
      
      // Record successful fetch time
      lastSuccessfulFetchRef.current = Date.now();
    } catch (error) {
      console.error("Error loading data:", error);
      
      // If this is a critical error, retry in 30 seconds
      setTimeout(() => loadData(true), 30000);
    } finally {
      setIsLoading(false);
      dataLoadingRef.current = false;
    }
  }, []);

  const scheduleNextCheck = useCallback((prayers: PrayerTime[]) => {
    if (nextCheckTimer) {
      clearTimeout(nextCheckTimer);
    }
    
    const nextPrayer = prayers.find(prayer => prayer.isNext);
    
    if (!nextPrayer) {
      console.log("No next prayer found, scheduling check in 30 minutes");
      const timer = setTimeout(() => loadData(true), 30 * 60 * 1000);
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
    
    // Check more frequently as we get closer to prayer time
    let checkInMinutes = Math.max(1, minutesUntilPrayer - 5);
    if (minutesUntilPrayer > 60) {
      // If more than an hour away, check every 15 minutes
      checkInMinutes = Math.min(checkInMinutes, 15);
    } else if (minutesUntilPrayer > 10) {
      // If less than an hour but more than 10 minutes, check every 5 minutes
      checkInMinutes = Math.min(checkInMinutes, 5);
    }
    
    console.log(`Next prayer (${nextPrayer.name}) at ${nextPrayer.time}, checking in ${checkInMinutes} minutes`);
    
    const timer = setTimeout(() => loadData(), checkInMinutes * 60 * 1000);
    setNextCheckTimer(timer);
    
    // Also schedule a check exactly at prayer time
    if (minutesUntilPrayer > 0) {
      setTimeout(() => loadData(true), minutesUntilPrayer * 60 * 1000);
    }
  }, [loadData, nextCheckTimer]);

  useEffect(() => {
    // Initial load
    loadData(true);

    // Subscribe to real-time updates from Supabase
    const prayerTimesSubscription = supabase
      .channel('prayer_times_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'prayer_times' 
      }, (payload) => {
        console.log("Prayer times changed in database, reloading...", payload);
        loadData(true);
      })
      .subscribe((status) => {
        console.log("Supabase subscription status:", status);
      });

    // Listen for local storage changes (from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'local-prayer-times' || e.key === 'mosque-prayer-times') {
        console.log("Prayer times changed in local storage, reloading...");
        loadData(true);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      if (nextCheckTimer) {
        clearTimeout(nextCheckTimer);
      }
      supabase.removeChannel(prayerTimesSubscription);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadData, nextCheckTimer]);

  return { 
    prayerTimes, 
    isLoading, 
    loadData, 
    forceReload: () => loadData(true),
    forcePageReload
  };
};
