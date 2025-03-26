
import { PrayerTime } from "@/types";
import { useTVDisplay } from "@/hooks/useTVDisplay";
import { usePrayerTimeAlerts } from "@/hooks/usePrayerTimeAlerts";
import { FajrTile } from "./prayer-times/FajrTile";
import { ZuhrTile } from "./prayer-times/ZuhrTile";
import { AsrTile } from "./prayer-times/AsrTile";
import { MaghribTile } from "./prayer-times/MaghribTile";
import { IshaTile } from "./prayer-times/IshaTile";
import { JummahTile } from "./prayer-times/JummahTile";
import { useEffect } from "react";

interface PrayerTimesTableProps {
  prayerTimes: PrayerTime[];
  detailedTimes: any;
  compactView?: boolean;
}

const PrayerTimesTable = ({ prayerTimes, detailedTimes, compactView = false }: PrayerTimesTableProps) => {
  const isTV = useTVDisplay();
  const isFriday = new Date().getDay() === 5; // 5 is Friday in JavaScript's getDay()

  // Use our updated hook for prayer time alerts - this will play sounds at jamat times
  const alertsActive = usePrayerTimeAlerts(prayerTimes, detailedTimes);
  
  // Additional check to periodically log prayer times for debugging
  useEffect(() => {
    // Log jamat times on component mount and every 5 minutes
    const logJamatTimes = () => {
      if (detailedTimes) {
        console.log("Current detailed prayer times for alerts:", {
          fajr: detailedTimes.fajr_jamat,
          zuhr: detailedTimes.zuhr_jamat,
          asr: detailedTimes.asr_jamat,
          maghrib: detailedTimes.maghrib_iftar,
          isha: detailedTimes.isha_first_jamat,
          isTV,
          alertsActive
        });
      }
    };
    
    // Log immediately and then every 5 minutes
    logJamatTimes();
    const interval = setInterval(logJamatTimes, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [detailedTimes, isTV, alertsActive]);

  return (
    <div className="animate-scale-in">
      <div className="mb-2 sm:mb-3">
        <h3 className="text-2xl sm:text-3xl font-bold text-black font-serif">Prayer Times</h3>
      </div>

      <div className={`grid gap-2 sm:gap-3 ${
        isTV 
          ? 'grid-cols-3 gap-3 tv-prayer-grid' 
          : 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 mobile-prayer-grid'
      }`}>
        <FajrTile prayerTimes={prayerTimes} detailedTimes={detailedTimes} />
        {!isFriday && <ZuhrTile prayerTimes={prayerTimes} detailedTimes={detailedTimes} />}
        <AsrTile prayerTimes={prayerTimes} detailedTimes={detailedTimes} />
        <MaghribTile prayerTimes={prayerTimes} detailedTimes={detailedTimes} />
        <IshaTile prayerTimes={prayerTimes} detailedTimes={detailedTimes} />
        <JummahTile prayerTimes={prayerTimes} detailedTimes={detailedTimes} />
      </div>
    </div>
  );
};

export default PrayerTimesTable;
