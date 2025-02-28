
import { useEffect, useState } from "react";
import DigitalClock from "@/components/DigitalClock";
import PrayerTimesTable from "@/components/PrayerTimesTable";
import HadithDisplay from "@/components/HadithDisplay";
import { fetchHadith, fetchPrayerTimes } from "@/services/dataService";
import { Hadith, PrayerTime } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const Index = () => {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [hadith, setHadith] = useState<Hadith | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        console.log("Loading prayer times and hadith...");
        const times = await fetchPrayerTimes();
        const dailyHadith = await fetchHadith();
        
        console.log("Fetched prayer times:", times);
        setPrayerTimes(times);
        setHadith(dailyHadith);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // Listen for changes to the prayer_times table
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

    // Also check for changes in local storage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'local-prayer-times') {
        console.log("Prayer times changed in local storage, reloading...");
        loadData();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Refresh prayer times status every minute
    const interval = setInterval(loadData, 60000);
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(prayerTimesSubscription);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-100 to-amber-50">
        <div className="text-amber-800 text-xl animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden p-4 sm:p-6 md:p-8 bg-gradient-to-b from-amber-100 to-amber-50">
      <div className="pattern-overlay"></div>
      
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="gold-border p-6 bg-gradient-to-b from-amber-50/90 to-white/90 backdrop-blur-sm shadow-lg mb-6">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-3">
                <img src="/lovable-uploads/92733e4c-a477-4c2d-b8a9-b2ba9006795b.png" alt="Masjid Logo" className="w-full object-contain" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold gold-gradient-text mb-2 font-serif">
                JAMIA MASJID BILAL
              </h1>
              <h2 className="text-xl text-amber-700 mb-4">
                MINHAJ-UL-QURAN INT. DUNDEE
              </h2>
              <div className="h-0.5 w-32 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 mx-auto rounded-full mb-4"></div>
              <DigitalClock />
            </div>
          </div>
        </header>

        <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-8">
          <PrayerTimesTable prayerTimes={prayerTimes} />
          {hadith && <HadithDisplay hadith={hadith} />}
        </div>
        
        <footer className="mt-10 text-center">
          <Link 
            to="/admin" 
            className="text-amber-700/50 text-xs hover:text-amber-700/70 transition-colors"
          >
            Admin Access
          </Link>
        </footer>
      </div>
    </div>
  );
};

export default Index;
