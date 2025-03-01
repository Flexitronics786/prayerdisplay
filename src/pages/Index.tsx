
import { useEffect, useState, useCallback } from "react";
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

  // Combined interval for date and clock updates
  useEffect(() => {
    const dateInterval = setInterval(() => {
      setCurrentDate(formatDate());
    }, 60000); // Update every minute
    
    return () => clearInterval(dateInterval);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log("Loading prayer times...");
      const times = await fetchPrayerTimes();
      setPrayerTimes(times);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getDayOfYear = (date: Date): number => {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  };

  // Setup midnight reload only once
  useEffect(() => {
    if (!midnightReloadSet) {
      const setupMidnightReload = () => {
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        
        const timeUntilMidnight = midnight.getTime() - now.getTime();
        console.log(`Page will reload at midnight in ${timeUntilMidnight / 1000 / 60} minutes`);
        
        // Use setTimeout not page reload to reduce disruption
        setTimeout(() => {
          console.log("Midnight reached - refreshing prayer times");
          loadData();
        }, timeUntilMidnight);
      };
      
      setupMidnightReload();
      setMidnightReloadSet(true);
    }
  }, [midnightReloadSet, loadData]);

  // Main data loading and subscription effect
  useEffect(() => {
    // Initial data load
    loadData();

    // Setup Supabase real-time subscription
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

    // Handle localStorage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'local-prayer-times') {
        console.log("Prayer times changed in local storage, reloading...");
        loadData();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Reduce checking frequency to every 5 minutes instead of every minute
    const interval = setInterval(() => {
      console.log("Checking prayer times status...");
      loadData();
    }, 300000); // Changed from 60000 (1 minute) to 300000 (5 minutes)
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(prayerTimesSubscription);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadData]);

  if (isLoading) {
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
