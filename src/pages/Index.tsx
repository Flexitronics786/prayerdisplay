
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

  useEffect(() => {
    const loadData = async () => {
      try {
        const times = await fetchPrayerTimes();
        const dailyHadith = await fetchHadith();
        
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
        loadData();
      })
      .subscribe();

    // Refresh prayer times status every minute
    const interval = setInterval(loadData, 60000);
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(prayerTimesSubscription);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-mosque-light text-xl animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden p-8">
      {/* Decorative background pattern */}
      <div className="pattern-overlay"></div>
      
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-mosque-light mb-2">Masjid Prayer Times</h1>
          <DigitalClock />
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          <PrayerTimesTable prayerTimes={prayerTimes} />
          {hadith && <HadithDisplay hadith={hadith} />}
        </div>
      </div>
    </div>
  );
};

export default Index;
