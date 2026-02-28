
import { useState, useCallback, useRef, useEffect } from "react";
import { fetchPrayerTimes, fetchAllPrayerTimes } from "@/services/dataService";
import { fetchJummahSettings, JummahSettings } from "@/services/settingsService";
import { PrayerTime, DetailedPrayerTime } from "@/types";
import { supabase } from "@/integrations/supabase/client";

export const usePrayerTimesData = () => {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [detailedTimes, setDetailedTimes] = useState<DetailedPrayerTime | null>(null);
  const [jummahSettings, setJummahSettings] = useState<JummahSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [nextCheckTimer, setNextCheckTimer] = useState<NodeJS.Timeout | null>(null);
  const dataLoadingRef = useRef(false);
  const lastCleanupDateRef = useRef<string | null>(null);

  const loadData = useCallback(async () => {
    if (dataLoadingRef.current) {
      console.log("Already loading data, skipping this request");
      return;
    }

    try {
      dataLoadingRef.current = true;
      setIsLoading(true);
      console.log("Loading prayer times...");

      // Load detailed prayer times for the current day and tomorrow
      const allTimes = await fetchAllPrayerTimes();
      const todayDate = new Date();
      const today = todayDate.toISOString().split('T')[0];

      const tomorrowDate = new Date(todayDate);
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrow = tomorrowDate.toISOString().split('T')[0];

      const todayTimes = allTimes.find(t => t.date === today);
      const tomorrowTimes = allTimes.find(t => t.date === tomorrow);

      if (todayTimes) {
        setDetailedTimes(todayTimes);
      }

      const settings = await fetchJummahSettings();
      setJummahSettings(settings);

      // Load standard prayer times (passing tomorrow's data to handle the rollover)
      const times = await fetchPrayerTimes(tomorrowTimes, settings);
      setPrayerTimes(times);

      scheduleNextCheck(times);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
      dataLoadingRef.current = false;
    }
  }, []);

  const cleanupOldPrayerTimes = useCallback(async () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Only run cleanup once per day
    if (lastCleanupDateRef.current === todayStr) {
      return;
    }

    console.log("Cleaning up old prayer times...");

    try {
      // Delete from Supabase database
      const { error } = await supabase
        .from('prayer_times')
        .delete()
        .lt('date', todayStr);

      if (error) {
        console.error("Error deleting old prayer times from database:", error);
      } else {
        console.log("Successfully deleted old prayer times from database");
      }

      // Clean up local storage
      const localTimes = localStorage.getItem('local-prayer-times');
      if (localTimes) {
        const parsedTimes = JSON.parse(localTimes);
        const filteredTimes = parsedTimes.filter((entry: any) =>
          entry.date >= todayStr
        );

        if (parsedTimes.length !== filteredTimes.length) {
          localStorage.setItem('local-prayer-times', JSON.stringify(filteredTimes));
          console.log(`Removed ${parsedTimes.length - filteredTimes.length} old entries from local storage`);

          // Trigger storage event to notify other components
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'local-prayer-times'
          }));
        }
      }

      // Record that we've done cleanup today
      lastCleanupDateRef.current = todayStr;
    } catch (err) {
      console.error("Error in cleanup process:", err);
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
    loadData();

    // Initial cleanup when component mounts
    cleanupOldPrayerTimes();

    const prayerTimesSubscription = supabase
      .channel('prayer_times_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'prayer_times'
      }, () => {
        console.log("Prayer times changed in database, reloading...");
        loadData();
      })
      .subscribe();

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
      supabase.removeChannel(prayerTimesSubscription);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadData, nextCheckTimer, cleanupOldPrayerTimes]);

  return { prayerTimes, detailedTimes, jummahSettings, isLoading, loadData };
};
