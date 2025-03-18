
import { useState, useCallback, useRef, useEffect } from "react";
import { fetchPrayerTimes } from "@/services/dataService";
import { PrayerTime } from "@/types";
import { supabase } from "@/integrations/supabase/client";

export const usePrayerTimesData = () => {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nextCheckTimer, setNextCheckTimer] = useState<NodeJS.Timeout | null>(null);
  const dataLoadingRef = useRef(false);
  const lastLoadTimeRef = useRef<number>(0);

  const loadData = useCallback(async (force = false) => {
    // Prevent multiple simultaneous requests
    if (dataLoadingRef.current) {
      console.log("Already loading data, skipping this request");
      return;
    }
    
    // Throttle requests to prevent excessive reloading
    // Only reload if it's been at least 5 seconds since the last load
    // unless force=true
    const now = Date.now();
    if (!force && now - lastLoadTimeRef.current < 5000) {
      console.log("Throttling data load, last load was less than 5 seconds ago");
      return;
    }
    
    try {
      dataLoadingRef.current = true;
      setIsLoading(true);
      console.log("Loading prayer times from server...");
      const times = await fetchPrayerTimes();
      console.log("Successfully loaded prayer times:", times);
      setPrayerTimes(times);
      lastLoadTimeRef.current = Date.now();
      scheduleNextCheck(times);
    } catch (error) {
      console.error("Error loading data:", error);
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
    
    const checkOffsetMinutes = 5;
    const checkInMinutes = Math.max(0, minutesUntilPrayer - checkOffsetMinutes);
    
    console.log(`Next prayer (${nextPrayer.name}) at ${nextPrayer.time}, checking in ${checkInMinutes} minutes`);
    
    const timer = setTimeout(() => loadData(true), checkInMinutes * 60 * 1000);
    setNextCheckTimer(timer);
    
    if (minutesUntilPrayer > 0) {
      setTimeout(() => loadData(true), minutesUntilPrayer * 60 * 1000);
    }
  }, [loadData, nextCheckTimer]);

  useEffect(() => {
    // Initial data load with force=true to ensure fresh data
    loadData(true);

    // Set up a regular refresh interval (every 3 minutes as a fallback)
    // Reduced from 10 to 3 minutes for more frequent updates, especially for TV displays
    const regularRefreshInterval = setInterval(() => {
      console.log("Regular refresh interval triggered");
      loadData(true);
    }, 3 * 60 * 1000);

    // Hard refresh to ensure data consistency every hour
    const hourlyRefreshInterval = setInterval(() => {
      console.log("Hourly hard refresh triggered");
      // Force a reload of the page to ensure all state is fresh
      window.location.reload();
    }, 60 * 60 * 1000);

    // Subscribe to changes on the prayer_times table
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
        console.log("Supabase channel subscription status:", status);
      });

    // Handle storage changes for multi-tab support
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'local-prayer-times') {
        console.log("Prayer times changed in local storage, reloading...");
        loadData(true);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Check data loading status if still loading after 5 seconds
    const loadingCheckTimeout = setTimeout(() => {
      if (isLoading || prayerTimes.length === 0) {
        console.log("Data still loading after 5 seconds, attempting reload");
        loadData(true);
      }
    }, 5000);
    
    return () => {
      if (nextCheckTimer) {
        clearTimeout(nextCheckTimer);
      }
      clearInterval(regularRefreshInterval);
      clearInterval(hourlyRefreshInterval);
      clearTimeout(loadingCheckTimeout);
      supabase.removeChannel(prayerTimesSubscription);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadData, prayerTimes.length, isLoading]);

  return { prayerTimes, isLoading, loadData };
};
