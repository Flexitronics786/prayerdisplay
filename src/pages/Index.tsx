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
import { clearPrayerTimesCache } from "@/services/dataService";

const Index = () => {
  const [currentDate, setCurrentDate] = useState(formatDate());
  const isTV = useTVDisplay();
  const midnightReloadSet = useMidnightRefresh();
  const { prayerTimes, isLoading, forceReload, forcePageReload } = usePrayerTimesData();

  // Update date every minute
  useEffect(() => {
    const dateInterval = setInterval(() => {
      setCurrentDate(formatDate());
    }, 60000);
    
    return () => clearInterval(dateInterval);
  }, []);

  // Special refresh handling for TV mode
  useEffect(() => {
    if (isTV) {
      console.log("[TV Mode] Setting up periodic refresh");
      
      // Clear cache on initial load
      clearPrayerTimesCache();
      
      // Full reload every hour
      const hourlyReload = setInterval(() => {
        console.log("[TV Mode] Hourly reload triggered");
        forcePageReload();
      }, 60 * 60 * 1000);
      
      // Force refresh every 15 minutes
      const refreshInterval = setInterval(() => {
        console.log("[TV Mode] 15-minute refresh triggered");
        forceReload();
      }, 15 * 60 * 1000);
      
      return () => {
        clearInterval(hourlyReload);
        clearInterval(refreshInterval);
      };
    }
  }, [isTV, forceReload, forcePageReload]);

  // Handle reload request from child components
  const handleReloadRequest = () => {
    console.log("Reload requested by child component");
    forceReload();
  };

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
              <PrayerTimesTable 
                prayerTimes={prayerTimes} 
                compactView={isTV} 
                onReloadRequest={handleReloadRequest}
              />
            </div>
            
            <PhoneReminder isTVMode={isTV} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
