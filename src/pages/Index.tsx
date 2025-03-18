
import { useState, useEffect } from "react";
import { formatDate } from "@/utils/dateUtils";
import PrayerTimesTable from "@/components/PrayerTimesTable";
import PhoneReminder from "@/components/PhoneReminder";
import PageHeader from "@/components/PageHeader";
import LoadingScreen from "@/components/LoadingScreen";
import KeepAwake from "@/components/KeepAwake";
import { useTVDisplay } from "@/hooks/useTVDisplay";
import { useMidnightRefresh } from "@/hooks/useMidnightRefresh";
import { usePrayerTimesData } from "@/hooks/usePrayerTimesData";

const Index = () => {
  const [currentDate, setCurrentDate] = useState(formatDate());
  const isTV = useTVDisplay();
  const midnightReloadSet = useMidnightRefresh();
  const { prayerTimes, isLoading, loadData } = usePrayerTimesData();

  useEffect(() => {
    const dateInterval = setInterval(() => {
      setCurrentDate(formatDate());
    }, 60000);
    
    // Force a refresh every 15 minutes for TV displays
    const refreshInterval = isTV ? 
      setInterval(() => {
        console.log("TV periodic refresh triggered");
        loadData(true);
      }, 15 * 60 * 1000) : null;
    
    return () => {
      clearInterval(dateInterval);
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [isTV, loadData]);

  // Add a manual reload function for debugging
  useEffect(() => {
    // Expose reload function globally for debugging
    (window as any).reloadPrayerTimes = () => {
      console.log("Manual reload triggered");
      loadData(true);
    };
    
    // Attach to unload event to clean up
    return () => {
      delete (window as any).reloadPrayerTimes;
    };
  }, [loadData]);

  if (isLoading && prayerTimes.length === 0) {
    return <LoadingScreen />;
  }

  return (
    <div className={`min-h-screen relative overflow-hidden ${isTV ? 'tv-display' : 'py-2 px-3'} bg-gradient-to-b from-amber-100 to-amber-50`}>
      <div className="pattern-overlay"></div>
      
      {/* Add the KeepAwake component */}
      {isTV && <KeepAwake />}
      
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
