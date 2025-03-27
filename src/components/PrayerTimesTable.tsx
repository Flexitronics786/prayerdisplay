
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
import { getCurrentTime24h } from "@/utils/dateUtils";

interface PrayerTimesTableProps {
  prayerTimes: PrayerTime[];
  detailedTimes: any;
  compactView?: boolean;
}

const PrayerTimesTable = ({ prayerTimes, detailedTimes, compactView = false }: PrayerTimesTableProps) => {
  const isTV = useTVDisplay();
  const isFriday = new Date().getDay() === 5; // 5 is Friday in JavaScript's getDay()

  // Use our updated hook for prayer time alerts - this will play sounds at jamat times
  usePrayerTimeAlerts(prayerTimes, detailedTimes);
  
  // Add periodic logging of prayer times and current time for debugging
  useEffect(() => {
    const logInterval = setInterval(() => {
      if (isTV) {
        const currentTime = getCurrentTime24h();
        console.log(`[${currentTime}] Prayer times check (Firestick):`, {
          detailedTimesLoaded: !!detailedTimes,
          jamatTimes: detailedTimes ? {
            fajr: detailedTimes.fajr_jamat,
            zuhr: detailedTimes.zuhr_jamat,
            asr: detailedTimes.asr_jamat,
            maghrib: detailedTimes.maghrib_iftar,
            isha: detailedTimes.isha_first_jamat
          } : 'No detailed times'
        });
      }
    }, 60000); // Log every minute on TV devices
    
    return () => clearInterval(logInterval);
  }, [isTV, detailedTimes]);

  return (
    <div className="animate-scale-in">
      <div className="mb-2 sm:mb-3">
        <h3 className="text-2xl sm:text-3xl font-bold text-black font-serif">Prayer Times</h3>
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
