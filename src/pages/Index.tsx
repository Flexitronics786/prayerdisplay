
import { useState, useEffect } from "react";
import { formatDate } from "@/utils/dateUtils";
import PrayerTimesTable from "@/components/PrayerTimesTable";
import PhoneReminder from "@/components/PhoneReminder";
import PageHeader from "@/components/PageHeader";
import LoadingScreen from "@/components/LoadingScreen";
import KeepAwake from "@/components/KeepAwake";
import { useTVDisplay } from "@/hooks/useTVDisplay";
import { usePrayerTimesData } from "@/hooks/usePrayerTimesData";
import { usePrayerTimeAlerts } from "@/hooks/usePrayerTimeAlerts";
import { Toaster } from "sonner";

const Index = () => {
  const [currentDate, setCurrentDate] = useState(formatDate());
  const { isTV } = useTVDisplay();
  const { prayerTimes, isLoading, detailedTimes } = usePrayerTimesData();
  
  // Initialize prayer time alerts only once in the main component
  // This ensures we don't have multiple instances trying to play sounds
  usePrayerTimeAlerts(prayerTimes, detailedTimes);

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
      <KeepAwake />
      {/* Add Toaster for other notifications (not prayer alerts) */}
      <Toaster position={isTV ? "top-center" : "bottom-right"} toastOptions={{ className: isTV ? 'tv-toast' : '' }} />
      
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        <div className="grid grid-cols-1 gap-4 flex-grow">
          <div className="w-full flex flex-col">
            <PageHeader currentDate={currentDate} isTV={isTV} />
            
            <div className="flex-grow">
              <PrayerTimesTable 
                prayerTimes={prayerTimes} 
                detailedTimes={detailedTimes} 
                compactView={isTV} 
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
