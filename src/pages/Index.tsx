
import { useEffect, useState } from "react";
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
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        console.log("Loading prayer times and hadith...");
        const times = await fetchPrayerTimes();
        
        // Get today's date for debugging
        const today = new Date();
        const dayOfMonth = today.getDate();
        const currentMonth = today.toISOString().substring(0, 7); // YYYY-MM format
        
        console.log(`Today is day ${dayOfMonth} in month ${currentMonth}`);
        
        // Debug log to check database content
        const { data: allHadiths, error: hadithsError } = await supabase
          .from('daily_hadiths')
          .select('*');
        
        if (hadithsError) {
          console.error("Error fetching all hadiths:", hadithsError);
          setDebugInfo(`Error: ${hadithsError.message}`);
        } else {
          console.log(`Found ${allHadiths?.length || 0} total hadiths in database:`, allHadiths);
          
          // Group hadiths by month for better debugging
          const hadithsByMonth: Record<string, any[]> = {};
          allHadiths?.forEach(h => {
            if (!hadithsByMonth[h.month]) {
              hadithsByMonth[h.month] = [];
            }
            hadithsByMonth[h.month].push(h);
          });
          
          setDebugInfo(`Database has ${allHadiths?.length || 0} hadiths. Grouped by month: ${JSON.stringify(hadithsByMonth, null, 2)}`);
        }
        
        const dailyHadith = await fetchHadith();
        console.log("Fetched hadith for today:", dailyHadith);
        
        setPrayerTimes(times);
        setHadith(dailyHadith);
        setLastRefresh(new Date()); // Track when data was last refreshed
      } catch (error) {
        console.error("Error loading data:", error);
        setDebugInfo(`Error: ${error instanceof Error ? error.message : String(error)}`);
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

    // Subscribe to changes in the daily_hadiths table
    const hadithsSubscription = supabase
      .channel('daily_hadiths_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'daily_hadiths' 
      }, () => {
        console.log("Daily hadiths changed in database, reloading...");
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
    
    // Refresh prayer times status every 5 minutes instead of every minute
    const interval = setInterval(loadData, 300000); // Changed from 60000 (1 min) to 300000 (5 mins)
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(prayerTimesSubscription);
      supabase.removeChannel(hadithsSubscription);
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
    <div className="min-h-screen relative overflow-hidden py-2 px-3 bg-gradient-to-b from-amber-100 to-amber-50">
      <div className="pattern-overlay"></div>
      
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left side - Prayer Times */}
          <div className="lg:col-span-8">
            <header className="mb-4">
              <div className="gold-border p-3 bg-gradient-to-b from-amber-50/90 to-white/90 backdrop-blur-sm shadow-lg">
                <div className="text-center">
                  <h1 className="text-3xl sm:text-4xl font-bold gold-gradient-text mb-1 font-serif">
                    JAMIA MASJID BILAL
                  </h1>
                  <h2 className="text-lg text-amber-700 mb-2">
                    MINHAJ-UL-QURAN INT. DUNDEE
                  </h2>
                  <div className="h-0.5 w-32 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 mx-auto rounded-full mb-2"></div>
                  <DigitalClock />
                </div>
              </div>
            </header>
            <PrayerTimesTable prayerTimes={prayerTimes} compactView={true} />
          </div>
          
          {/* Right side - Hadith */}
          <div className="lg:col-span-4">
            {hadith && <HadithDisplay hadith={hadith} />}
            {debugInfo && (
              <div className="mt-4 p-2 bg-amber-50 rounded-lg text-sm text-amber-800">
                <details>
                  <summary className="cursor-pointer">Debug Info (Last refreshed: {lastRefresh.toLocaleTimeString()})</summary>
                  <div className="mt-2 whitespace-pre-wrap overflow-auto max-h-64">{debugInfo}</div>
                </details>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
