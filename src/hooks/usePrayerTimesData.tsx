
import { useState, useCallback, useRef, useEffect } from "react";
import { fetchPrayerTimes } from "@/services/dataService";
import { PrayerTime } from "@/types";
import { supabase } from "@/integrations/supabase/client";

export const usePrayerTimesData = () => {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nextCheckTimer, setNextCheckTimer] = useState<NodeJS.Timeout | null>(null);
  const dataLoadingRef = useRef(false);

  const loadData = useCallback(async () => {
    if (dataLoadingRef.current) {
      console.log("Already loading data, skipping this request");
      return;
    }
    
    try {
      dataLoadingRef.current = true;
      setIsLoading(true);
      console.log("Loading prayer times from server...");
      const times = await fetchPrayerTimes();
      console.log("Successfully loaded prayer times:", times);
      setPrayerTimes(times);
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
    // Initial data load
    loadData();

    // Set up a regular refresh interval (every 10 minutes) as a fallback
    const regularRefreshInterval = setInterval(() => {
      console.log("Regular refresh interval triggered");
      loadData();
    }, 10 * 60 * 1000);

    // Subscribe to changes on the prayer_times table
    const prayerTimesSubscription = supabase
      .channel('prayer_times_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'prayer_times' 
      }, (payload) => {
        console.log("Prayer times changed in database, reloading...", payload);
        loadData();
      })
      .subscribe();

    // Handle storage changes for multi-tab support
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'local-prayer-times') {
        console.log("Prayer times changed in local storage, reloading...");
        loadData();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      if (nextCheckTimer) {
        clearTimeout(nextCheckTimer);
      }
      clearInterval(regularRefreshInterval);
      supabase.removeChannel(prayerTimesSubscription);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadData, nextCheckTimer]);

  return { prayerTimes, isLoading, loadData };
};
