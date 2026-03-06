
import { useState, useCallback, useRef, useEffect } from "react";
import { fetchPrayerTimes, fetchTodayTomorrowTimes } from "@/services/dataService";
import { fetchJummahSettings, JummahSettings } from "@/services/settingsService";
import { PrayerTime, DetailedPrayerTime } from "@/types";
import { supabase } from "@/integrations/supabase/client";

/**
 * Builds a merged DetailedPrayerTime object.
 *
 * For any prayer whose "start" time has been rolled over to tomorrow by
 * markActivePrayer() (detectable because prayerTimes[x].time no longer matches
 * today's source value), we replace today's corresponding fields with
 * tomorrow's fields.  This ensures tile components always display the correct
 * next-day times even though they prefer reading from detailedTimes directly.
 */
function buildMergedDetailedTimes(
  prayerTimes: PrayerTime[],
  today: DetailedPrayerTime,
  tomorrow: DetailedPrayerTime | null
): DetailedPrayerTime {
  if (!tomorrow) return today;

  // Start with a shallow copy of today's record
  const merged: DetailedPrayerTime = { ...today };

  const fajrEntry = prayerTimes.find(p => p.name === 'Fajr');
  const zuhrEntry = prayerTimes.find(p => p.name === 'Zuhr' || p.name === 'Dhuhr');
  const asrEntry = prayerTimes.find(p => p.name === 'Asr');
  const maghribEntry = prayerTimes.find(p => p.name === 'Maghrib');
  const ishaEntry = prayerTimes.find(p => p.name === 'Isha');

  // --- Fajr rollover ---
  const todayFajrStart = today.sehri_end?.slice(0, 5) || today.fajr_jamat?.slice(0, 5) || '';
  if (fajrEntry && fajrEntry.time !== todayFajrStart) {
    console.log('[merge] Fajr rolled over → using tomorrow\'s times');
    merged.sehri_end = tomorrow.sehri_end;
    merged.fajr_jamat = tomorrow.fajr_jamat;
    merged.sunrise = tomorrow.sunrise; // sunrise always follows fajr
  }

  // --- Zuhr / Dhuhr rollover ---
  const todayZuhrStart = today.zuhr_start?.slice(0, 5) || today.zuhr_jamat?.slice(0, 5) || '';
  if (zuhrEntry && zuhrEntry.time !== todayZuhrStart) {
    console.log('[merge] Zuhr rolled over → using tomorrow\'s times');
    merged.zuhr_start = tomorrow.zuhr_start;
    merged.zuhr_jamat = tomorrow.zuhr_jamat;
  }

  // --- Asr rollover ---
  const todayAsrStart = today.asr_start?.slice(0, 5) || today.asr_jamat?.slice(0, 5) || '';
  if (asrEntry && asrEntry.time !== todayAsrStart) {
    console.log('[merge] Asr rolled over → using tomorrow\'s times');
    merged.asr_start = tomorrow.asr_start;
    merged.asr_jamat = tomorrow.asr_jamat;
  }

  // --- Maghrib rollover ---
  const todayMaghribStart = today.maghrib_iftar?.slice(0, 5) || '';
  if (maghribEntry && maghribEntry.time !== todayMaghribStart) {
    console.log('[merge] Maghrib rolled over → using tomorrow\'s times');
    merged.maghrib_iftar = tomorrow.maghrib_iftar;
  }

  // --- Isha rollover ---
  const todayIshaStart = today.isha_start?.slice(0, 5) || today.isha_first_jamat?.slice(0, 5) || '';
  if (ishaEntry && ishaEntry.time !== todayIshaStart) {
    console.log('[merge] Isha rolled over → using tomorrow\'s times');
    merged.isha_start = tomorrow.isha_start;
    merged.isha_first_jamat = tomorrow.isha_first_jamat;
    merged.isha_second_jamat = tomorrow.isha_second_jamat;
  }

  return merged;
}

export const usePrayerTimesData = () => {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [detailedTimes, setDetailedTimes] = useState<DetailedPrayerTime | null>(null);
  const [jummahSettings, setJummahSettings] = useState<JummahSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const nextCheckTimerRef = useRef<NodeJS.Timeout | null>(null);
  const nextPrayerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dataLoadingRef = useRef(false);
  const lastCleanupDateRef = useRef<string | null>(null);
  const jummahSettingsCachedRef = useRef<JummahSettings | null>(null);

  const loadData = useCallback(async () => {
    if (dataLoadingRef.current) {
      console.log("Already loading data, skipping this request");
      return;
    }

    try {
      dataLoadingRef.current = true;
      setIsLoading(true);
      console.log("Loading prayer times...");

      // OPTIMIZED: Single query fetches only today + tomorrow (2 rows max)
      // Previously this called fetchAllPrayerTimes() which fetched the ENTIRE table
      const { today: todayTimes, tomorrow: tomorrowTimes } = await fetchTodayTomorrowTimes();

      // Cache Jummah settings — only fetch from DB if not cached yet
      let settings = jummahSettingsCachedRef.current;
      if (!settings) {
        settings = await fetchJummahSettings();
        jummahSettingsCachedRef.current = settings;
      }
      setJummahSettings(settings);

      // fetchPrayerTimes handles mapToDisplayFormat + markActivePrayer logic.
      // It still makes its own DB call for today, but the tomorrow data is passed in.
      const times = await fetchPrayerTimes(tomorrowTimes || undefined, settings);
      setPrayerTimes(times);

      // Build a merged detailedTimes that swaps in tomorrow's values for prayers
      // that have already passed today.
      if (todayTimes) {
        const merged = buildMergedDetailedTimes(times, todayTimes, tomorrowTimes || null);
        setDetailedTimes(merged);
      }

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
    // Clear any existing timers
    if (nextCheckTimerRef.current) {
      clearTimeout(nextCheckTimerRef.current);
    }
    if (nextPrayerTimerRef.current) {
      clearTimeout(nextPrayerTimerRef.current);
    }

    const nextPrayer = prayers.find(prayer => prayer.isNext);

    if (!nextPrayer) {
      console.log("No next prayer found, scheduling check in 30 minutes");
      nextCheckTimerRef.current = setTimeout(() => loadData(), 30 * 60 * 1000);
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

    // Schedule check 5 minutes before next prayer
    nextCheckTimerRef.current = setTimeout(() => loadData(), checkInMinutes * 60 * 1000);

    // Also schedule at the exact prayer time
    if (minutesUntilPrayer > 0) {
      nextPrayerTimerRef.current = setTimeout(() => loadData(), minutesUntilPrayer * 60 * 1000);
    }
  }, [loadData]);

  useEffect(() => {
    loadData();

    // Initial cleanup when component mounts
    cleanupOldPrayerTimes();

    // Schedule a reload at midnight so that when the date changes the app
    // immediately fetches the new day's row. This ensures Isha (and all prayers)
    // show the correct next-day times as soon as 00:00 hits, without waiting
    // until the near-Fajr scheduled check.
    const scheduleMidnightReload = () => {
      const now = new Date();
      const msUntilMidnight =
        new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 10).getTime() -
        now.getTime(); // +10 seconds past midnight to be safe
      console.log(`Midnight reload scheduled in ${Math.round(msUntilMidnight / 60000)} minutes`);
      return setTimeout(() => {
        console.log('Midnight reached – reloading prayer data for new day');
        // Clear jummah settings cache at midnight so it refreshes for the new day
        jummahSettingsCachedRef.current = null;
        loadData();
        cleanupOldPrayerTimes();
      }, msUntilMidnight);
    };
    const midnightTimer = scheduleMidnightReload();

    // NOTE: postgres_changes subscription removed to reduce Realtime egress.
    // Displays still update via: scheduled timer checks, midnight reload,
    // 3AM page reload, and the "Remote Refresh TVs" broadcast button.

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'local-prayer-times') {
        console.log("Prayer times changed in local storage, reloading...");
        loadData();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (nextCheckTimerRef.current) {
        clearTimeout(nextCheckTimerRef.current);
      }
      if (nextPrayerTimerRef.current) {
        clearTimeout(nextPrayerTimerRef.current);
      }
      clearTimeout(midnightTimer);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadData, cleanupOldPrayerTimes]);

  return { prayerTimes, detailedTimes, jummahSettings, isLoading, loadData };
};
