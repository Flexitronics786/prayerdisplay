
import { useState, useEffect } from "react";
import { formatDate } from "@/utils/dateUtils";
import PrayerTimesTable from "@/components/PrayerTimesTable";
import PhoneReminder from "@/components/PhoneReminder";
import PageHeader from "@/components/PageHeader";
import LoadingScreen from "@/components/LoadingScreen";
import { useTVDisplay } from "@/hooks/useTVDisplay";
import { useMidnightRefresh } from "@/hooks/useMidnightRefresh";
import { usePrayerTimesData } from "@/hooks/usePrayerTimesData";

const Index = () => {
  const [currentDate, setCurrentDate] = useState(formatDate());
  const isTV = useTVDisplay();
  const midnightReloadSet = useMidnightRefresh();
  const { prayerTimes, isLoading } = usePrayerTimesData();

  useEffect(() => {
    const dateInterval = setInterval(() => {
      setCurrentDate(formatDate());
    }, 60000);
    
    return () => clearInterval(dateInterval);
  }, []);

  if (isLoading && prayerTimes.length === 0) {
    return <LoadingScreen />;
  }

  return (
    <div className={`min-h-screen relative overflow-hidden ${isTV ? 'tv-display' : 'py-2 px-3'} bg-gradient-to-b from-amber-100 to-amber-50`}>
      <div className="pattern-overlay"></div>
      
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        <div className="grid grid-cols-1 gap-4 flex-grow">
          <div className="w-full flex flex-col">
            <PageHeader currentDate={currentDate} isTV={isTV} />
            
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
