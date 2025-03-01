import { useEffect, useState, useCallback, useRef } from "react";
import DigitalClock from "@/components/DigitalClock";
import PrayerTimesTable from "@/components/PrayerTimesTable";
import PhoneReminder from "@/components/PhoneReminder";
import { fetchPrayerTimes } from "@/services/dataService";
import { PrayerTime } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/utils/dateUtils";

const Index = () => {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTV, setIsTV] = useState(false);
  const [midnightReloadSet, setMidnightReloadSet] = useState(false);
  const [currentDate, setCurrentDate] = useState(formatDate());
  const [nextCheckTimer, setNextCheckTimer] = useState<NodeJS.Timeout | null>(null);
  const dataLoadingRef = useRef(false);

  useEffect(() => {
    const checkIfTV = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isSilkBrowser = userAgent.includes('silk');
      const isFireTV = userAgent.includes('firetv') || userAgent.includes('fire tv');
      const isLargeScreen = window.innerWidth >= 1280 && 
                          (window.innerHeight < 900 || window.innerWidth >= 1920);
      
      return (isSilkBrowser || isFireTV || isLargeScreen);
    };
    
    setIsTV(checkIfTV());
    console.log("Is TV display:", checkIfTV());
    
    const handleResize = () => {
      setIsTV(checkIfTV());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const dateInterval = setInterval(() => {
      setCurrentDate(formatDate());
    }, 60000);
    
    return () => clearInterval(dateInterval);
  }, []);

  const loadData = useCallback(async () => {
    if (dataLoadingRef.current) {
      console.log("Already loading data, skipping this request");
      return;
    }
    
    try {
      dataLoadingRef.current = true;
      setIsLoading(true);
      console.log("Loading prayer times...");
      const times = await fetchPrayerTimes();
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

  const getDayOfYear = (date: Date): number => {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  };

  useEffect(() => {
    if (!midnightReloadSet) {
      const setupMidnightReload = () => {
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 2, 0, 0);
        
        const timeUntilMidnight = midnight.getTime() - now.getTime();
        console.log(`Page will fully reload at 2 minutes after midnight in ${timeUntilMidnight / 1000 / 60} minutes`);
        
        setTimeout(() => {
          console.log("Midnight+2min reached - refreshing entire page");
          window.location.reload();
        }, timeUntilMidnight);
      };
      
      setupMidnightReload();
      setMidnightReloadSet(true);
    }
  }, [midnightReloadSet]);

  useEffect(() => {
    loadData();

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
  }, [loadData, nextCheckTimer]);

  if (isLoading && prayerTimes.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-100 to-amber-50">
        <div className="text-amber-800 text-xl animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen relative overflow-hidden ${isTV ? 'tv-display' : 'py-2 px-3'} bg-gradient-to-b from-amber-100 to-amber-50`}>
      <div className="pattern-overlay"></div>
      
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        <div className="grid grid-cols-1 gap-4 flex-grow">
          <div className="w-full flex flex-col">
            <header className={`${isTV ? 'mb-2' : 'mb-4'}`}>
              <div className="gold-border p-2 sm:p-3 bg-gradient-to-b from-amber-50/90 to-white/90 backdrop-blur-sm shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                  <div className="text-left md:pl-4 order-2 md:order-1">
                    <div className="text-lg sm:text-xl md:text-2xl text-amber-700">
                      {currentDate}
                    </div>
                  </div>
                  
                  <div className="text-center order-1 md:order-2">
                    <h1 className={`${isTV ? 'text-4xl' : 'text-2xl sm:text-3xl md:text-4xl'} font-bold gold-gradient-text mb-1 font-serif`}>
                      JAMIA MASJID BILAL
                    </h1>
                    <h2 className={`${isTV ? 'text-xl' : 'text-base sm:text-xl'} text-amber-700 mb-1`}>
                      MINHAJ-UL-QURAN INT. DUNDEE
                    </h2>
                    <div className="h-0.5 w-24 sm:w-48 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 mx-auto rounded-full"></div>
                  </div>
                  
                  <div className="order-3 md:pr-4">
                    <DigitalClock showDate={false} />
                  </div>
                </div>
              </div>
            </header>
            <div className="flex-grow">
              <PrayerTimesTable prayerTimes={prayerTimes} compactView={isTV} />
            </div>
            
            <PhoneReminder isTVMode={isTV} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
