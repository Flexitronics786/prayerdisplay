
import { useEffect, useState, useCallback } from "react";
import DigitalClock from "@/components/DigitalClock";
import PrayerTimesTable from "@/components/PrayerTimesTable";
import HadithDisplay from "@/components/HadithDisplay";
import { fetchHadith, fetchPrayerTimes } from "@/services/dataService";
import { Hadith, PrayerTime } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Smartphone } from "lucide-react";

const Index = () => {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [hadith, setHadith] = useState<Hadith | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [showPhoneReminder, setShowPhoneReminder] = useState(true);

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
        setDebugInfo(`Error: ${hadithsError.message}`);
      } else {
        console.log(`Found ${hadithCollection?.length || 0} active hadiths in collection:`, hadithCollection);
        setDebugInfo(`Collection has ${hadithCollection?.length || 0} active hadiths.`);
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
      setDebugInfo(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Helper function to get the day of the year (1-366)
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
    
    const interval = setInterval(() => {
      console.log("Checking prayer times status...");
    }, 60000);
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(prayerTimesSubscription);
      supabase.removeChannel(hadithsSubscription);
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
    <div className="min-h-screen relative overflow-hidden py-2 px-3 bg-gradient-to-b from-amber-100 to-amber-50">
      <div className="pattern-overlay"></div>
      
      {showPhoneReminder && (
        <div className="max-w-7xl mx-auto mb-4">
          <Alert className="bg-amber-50/90 border-amber-400 shadow-sm">
            <Smartphone className="h-4 w-4 mr-2 text-amber-600" />
            <AlertTitle className="font-serif text-amber-800">Reminder</AlertTitle>
            <AlertDescription className="text-amber-700">
              Please turn off your mobile phones while in the mosque as a sign of respect.
            </AlertDescription>
            <button 
              className="absolute top-2 right-2 text-amber-700 hover:text-amber-900" 
              onClick={() => setShowPhoneReminder(false)}
            >
              ×
            </button>
          </Alert>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
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
          
          <div className="lg:col-span-4">
            {hadith && <HadithDisplay hadith={hadith} />}
            {debugInfo && (
              <div className="mt-4 p-2 bg-amber-50 rounded-lg text-sm text-amber-800">
                <details>
                  <summary className="cursor-pointer">Debug Info</summary>
                  <div className="mt-2 whitespace-pre-wrap">{debugInfo}</div>
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
