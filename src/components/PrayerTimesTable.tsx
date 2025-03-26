
import { PrayerTime } from "@/types";
import { useTVDisplay } from "@/hooks/useTVDisplay";
import { usePrayerTimeAlerts } from "@/hooks/usePrayerTimeAlerts";
import { FajrTile } from "./prayer-times/FajrTile";
import { ZuhrTile } from "./prayer-times/ZuhrTile";
import { AsrTile } from "./prayer-times/AsrTile";
import { MaghribTile } from "./prayer-times/MaghribTile";
import { IshaTile } from "./prayer-times/IshaTile";
import { JummahTile } from "./prayer-times/JummahTile";

interface PrayerTimesTableProps {
  prayerTimes: PrayerTime[];
  detailedTimes: any;
  compactView?: boolean;
}

const PrayerTimesTable = ({ prayerTimes, detailedTimes, compactView = false }: PrayerTimesTableProps) => {
  const { isTV } = useTVDisplay();
  const isFriday = new Date().getDay() === 5; // 5 is Friday in JavaScript's getDay()

  // Use our updated hook for prayer time alerts - this will play sounds at jamat times
  // We don't use this instance's return value to avoid duplication with Index.tsx
  // Just let Index.tsx handle the alerts
  // usePrayerTimeAlerts(prayerTimes, detailedTimes);

  return (
    <div className="animate-scale-in">
      <div className="mb-2 sm:mb-3">
        <h3 className="text-2xl sm:text-3xl font-bold text-black font-serif">Prayer Times</h3>
      </div>

      <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 ${isTV ? 'grid-cols-3 gap-3 tv-prayer-grid' : 'mobile-prayer-grid'}`}>
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
