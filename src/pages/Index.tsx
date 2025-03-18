
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
import { toast } from "sonner";

const Index = () => {
  const [currentDate, setCurrentDate] = useState(formatDate());
  const isTV = useTVDisplay();
  const midnightReloadSet = useMidnightRefresh();
  const { prayerTimes, isLoading, loadData } = usePrayerTimesData();
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());

  useEffect(() => {
    const dateInterval = setInterval(() => {
      setCurrentDate(formatDate());
    }, 60000);
    
    // Force a more aggressive refresh for TV displays
    const refreshInterval = isTV ? 
      setInterval(() => {
        console.log("TV periodic refresh triggered at", new Date().toISOString());
        // Clear localStorage cache to force fresh data
        if (isTV) {
          localStorage.removeItem('mosque-prayer-times');
          const cacheKey = `prayer-times-cache-${new Date().toISOString().split('T')[0]}`;
          localStorage.removeItem(cacheKey);
        }
        loadData(true);
        setLastRefreshTime(Date.now());
      }, 5 * 60 * 1000) : null; // Refresh every 5 minutes for TV
    
    return () => {
      clearInterval(dateInterval);
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [isTV, loadData]);

  // Add a manual reload function for debugging
  useEffect(() => {
    // Initial load with forced refresh for TV displays
    if (isTV) {
      console.log("Initial TV mode load with forced refresh");
      setTimeout(() => {
        loadData(true);
      }, 1000);
    }
    
    // Expose reload function globally for debugging
    (window as any).reloadPrayerTimes = () => {
      console.log("Manual reload triggered");
      
      // Clear any cached prayer times
      localStorage.removeItem('mosque-prayer-times');
      const today = new Date().toISOString().split('T')[0];
      const cacheKey = `prayer-times-cache-${today}`;
      localStorage.removeItem(cacheKey);
      
      loadData(true);
      toast.success("Prayer times manually refreshed");
      setLastRefreshTime(Date.now());
    };
    
    // Attach to unload event to clean up
    return () => {
      delete (window as any).reloadPrayerTimes;
    };
  }, [loadData, isTV]);

  // Force a full page reload every 30 minutes for TV displays to clear any memory issues
  useEffect(() => {
    if (!isTV) return;
    
    const fullReloadInterval = setInterval(() => {
      console.log("Performing full page reload for TV display");
      window.location.reload();
    }, 30 * 60 * 1000); // 30 minutes
    
    return () => clearInterval(fullReloadInterval);
  }, [isTV]);

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
                lastRefreshTime={lastRefreshTime}
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
