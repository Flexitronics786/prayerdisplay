import { PrayerTime } from "@/types";
import { fetchAllPrayerTimes, clearPrayerTimesCache } from "@/services/dataService";
import { useState, useEffect } from "react";
import { useTVDisplay } from "@/hooks/useTVDisplay";
import { FajrTile } from "./prayer-times/FajrTile";
import { ZuhrTile } from "./prayer-times/ZuhrTile";
import { AsrTile } from "./prayer-times/AsrTile";
import { MaghribTile } from "./prayer-times/MaghribTile";
import { IshaTile } from "./prayer-times/IshaTile";
import { JummahTile } from "./prayer-times/JummahTile";

interface PrayerTimesTableProps {
  prayerTimes: PrayerTime[];
  compactView?: boolean;
  onReloadRequest?: () => void;
}

const PrayerTimesTable = ({ prayerTimes, compactView = false, onReloadRequest }: PrayerTimesTableProps) => {
  const [detailedTimes, setDetailedTimes] = useState<any>(null);
  const isTV = useTVDisplay();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Load detailed times whenever prayer times change or refresh is needed
  useEffect(() => {
    const loadDetailedTimes = async () => {
      try {
        console.log("Loading detailed prayer times from Supabase...");
        const times = await fetchAllPrayerTimes(true); // Force refresh from Supabase
        const today = new Date().toISOString().split('T')[0];
        const todayTimes = times.find(t => t.date === today);
        
        if (todayTimes) {
          console.log("Found today's detailed prayer times:", todayTimes);
          setDetailedTimes(todayTimes);
        } else {
          console.warn("No detailed times found for today:", today);
          // If no times found for today, try to clear cache and reload
          clearPrayerTimesCache();
          if (onReloadRequest) {
            onReloadRequest();
          }
        }
        
        setLastUpdate(new Date());
      } catch (error) {
        console.error("Error loading detailed prayer times:", error);
      }
    };

    loadDetailedTimes();
    
    // On TV displays, refresh detailed times every 5 minutes
    let intervalId: NodeJS.Timeout | null = null;
    if (isTV) {
      intervalId = setInterval(loadDetailedTimes, 5 * 60 * 1000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [prayerTimes, isTV, onReloadRequest]);

  // Display debug info when in TV mode
  useEffect(() => {
    if (isTV) {
      const debugInterval = setInterval(() => {
        const now = new Date();
        const minutesSinceUpdate = Math.round((now.getTime() - lastUpdate.getTime()) / (60 * 1000));
        console.log(`[TV Debug] Prayer times last updated ${minutesSinceUpdate} minutes ago. Current time: ${now.toISOString()}`);
        
        if (detailedTimes) {
          console.log(`[TV Debug] Currently showing prayer times for: ${detailedTimes.date} (${detailedTimes.day})`);
        } else {
          console.log(`[TV Debug] No detailed times loaded yet`);
        }
      }, 60 * 1000); // Log every minute
      
      return () => clearInterval(debugInterval);
    }
  }, [isTV, lastUpdate, detailedTimes]);

  return (
    <div className="animate-scale-in">
      <div className="mb-2 sm:mb-3">
        <h3 className="text-2xl sm:text-3xl font-bold text-amber-800 font-serif">Prayer Times</h3>
      </div>

      <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 ${isTV ? 'grid-cols-3 gap-3 tv-prayer-grid' : 'mobile-prayer-grid'}`}>
        <FajrTile prayerTimes={prayerTimes} detailedTimes={detailedTimes} />
        <ZuhrTile prayerTimes={prayerTimes} detailedTimes={detailedTimes} />
        <AsrTile prayerTimes={prayerTimes} detailedTimes={detailedTimes} />
        <MaghribTile prayerTimes={prayerTimes} detailedTimes={detailedTimes} />
        <IshaTile prayerTimes={prayerTimes} detailedTimes={detailedTimes} />
        <JummahTile prayerTimes={prayerTimes} detailedTimes={detailedTimes} />
      </div>
    </div>
  );
};

export default PrayerTimesTable;
