
import { PrayerTime } from "@/types";
import { fetchAllPrayerTimes } from "@/services/dataService";
import { useState, useEffect, useCallback } from "react";
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
}

const PrayerTimesTable = ({ prayerTimes, compactView = false }: PrayerTimesTableProps) => {
  const [detailedTimes, setDetailedTimes] = useState<any>(null);
  const isTV = useTVDisplay();
  
  const loadDetailedTimes = useCallback(async () => {
    try {
      console.log("Loading detailed prayer times...");
      const times = await fetchAllPrayerTimes();
      const today = new Date().toISOString().split('T')[0];
      const todayTimes = times.find(t => t.date === today);
      
      if (todayTimes) {
        console.log("Detailed times loaded for today:", todayTimes);
        setDetailedTimes(todayTimes);
      } else {
        console.log("No detailed times found for today:", today);
      }
    } catch (error) {
      console.error("Error loading detailed prayer times:", error);
    }
  }, []);

  useEffect(() => {
    loadDetailedTimes();
    
    // Set up a refresh interval for TV displays (every 5 minutes)
    const refreshInterval = isTV ? 
      setInterval(() => {
        console.log("TV refresh interval triggered for detailed times");
        loadDetailedTimes();
      }, 5 * 60 * 1000) : null;
      
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [loadDetailedTimes, isTV]);
  
  // Reload detailed times when prayer times change
  useEffect(() => {
    if (prayerTimes.length > 0) {
      loadDetailedTimes();
    }
  }, [prayerTimes, loadDetailedTimes]);

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
