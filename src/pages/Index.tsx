
import { useEffect, useState, useCallback } from "react";
import DigitalClock from "@/components/DigitalClock";
import PrayerTimesTable from "@/components/PrayerTimesTable";
import HadithDisplay from "@/components/HadithDisplay";
import { fetchHadith, fetchPrayerTimes } from "@/services/dataService";
import { Hadith, PrayerTime } from "@/types";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [hadith, setHadith] = useState<Hadith | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log("Loading prayer times and hadith...");
      const times = await fetchPrayerTimes();
      
      // Check hadith collection status
      const { data: hadithCollection, error: hadithsError } = await supabase
        .from('hadith_collection')
        .select('*')
        .eq('is_active', true);
      
      if (hadithsError) {
        console.error("Error fetching hadith collection:", hadithsError);
      } else {
        console.log(`Found ${hadithCollection?.length || 0} active hadiths in collection:`, hadithCollection);
      }
      
      const dailyHadith = await fetchHadith();
      const today = new Date();
      const dayOfYear = getDayOfYear(today);
      console.log(`Today is day ${dayOfYear} of the year`);
      console.log("Fetched hadith for today:", dailyHadith);
      
      setPrayerTimes(times);
      setHadith(dailyHadith);
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

    const hadithsSubscription = supabase
      .channel('hadith_collection_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'hadith_collection' 
      }, () => {
        console.log("Hadith collection changed in database, reloading...");
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
    
    // Set up midnight page reload
    const setupMidnightReload = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0); // Set to next midnight (00:00:00)
      
      const timeUntilMidnight = midnight.getTime() - now.getTime();
      console.log(`Page will reload at midnight in ${timeUntilMidnight / 1000 / 60} minutes`);
      
      setTimeout(() => {
        console.log("Midnight reached - reloading page to refresh prayer times");
        window.location.reload();
      }, timeUntilMidnight);
    };
    
    setupMidnightReload();
    
    // Auto refresh prayer times status every minute
    const interval = setInterval(() => {
      console.log("Checking prayer times status...");
      loadData(); // Reload data to update active/next prayer
    }, 60000); // Every minute
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(prayerTimesSubscription);
      supabase.removeChannel(hadithsSubscription);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadData]);

  const getNextPrayer = (): PrayerTime | null => {
    if (!prayerTimes || prayerTimes.length === 0) return null;
    
    const nextPrayerIndex = prayerTimes.findIndex(prayer => prayer.isNext);
    return nextPrayerIndex !== -1 ? prayerTimes[nextPrayerIndex] : null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-100 to-amber-50">
        <div className="text-amber-800 text-xl animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden py-2 px-3 bg-gradient-to-b from-amber-100 to-amber-50">
      <div className="pattern-overlay"></div>
      
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8">
            <header className="mb-4">
              <div className="gold-border p-3 sm:p-4 bg-gradient-to-b from-amber-50/90 to-white/90 backdrop-blur-sm shadow-lg">
                <div className="text-center">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold gold-gradient-text mb-1 font-serif">
                    JAMIA MASJID BILAL
                  </h1>
                  <h2 className="text-base sm:text-lg text-amber-700 mb-2">
                    MINHAJ-UL-QURAN INT. DUNDEE
                  </h2>
                  <div className="h-0.5 w-24 sm:w-32 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 mx-auto rounded-full mb-2"></div>
                  <DigitalClock />
                </div>
              </div>
            </header>
            <PrayerTimesTable prayerTimes={prayerTimes} compactView={true} />
          </div>
          
          <div className="lg:col-span-4 mt-2 lg:mt-0">
            {hadith && <HadithDisplay hadith={hadith} nextPrayer={getNextPrayer()} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
