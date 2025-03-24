
import React from "react";
import { PrayerTime, DetailedPrayerTime } from "@/types";
import { PrayerTile } from "./PrayerTile";
import { getZuhrStart, getZuhrJamat, getJummahKhutbahTime } from "./PrayerTimeUtils";

interface JummahTileProps {
  prayerTimes: PrayerTime[];
  detailedTimes: DetailedPrayerTime | null;
}

export const JummahTile: React.FC<JummahTileProps> = ({ prayerTimes, detailedTimes }) => {
  const isFriday = new Date().getDay() === 5; // 5 is Friday in JavaScript's getDay()
  
  // Only use Zuhr's active/next status on Fridays
  const zuhrPrayer = prayerTimes.find(p => p.name === "Zuhr" || p.name === "Dhuhr");
  const isActive = isFriday ? (zuhrPrayer?.isActive || false) : false;
  const isNext = isFriday ? (zuhrPrayer?.isNext || false) : false;

  return (
    <PrayerTile
      title="Jummah"
      arabicTitle="الجمعة"
      isActive={isActive}
      isNext={isNext}
      items={[
        {
          label: "Start",
          time: getZuhrStart(detailedTimes, prayerTimes)
        },
        {
          label: "Khutbah",
          time: getJummahKhutbahTime(detailedTimes, prayerTimes)
        },
        {
          label: "Jamat",
          time: getZuhrJamat(detailedTimes, prayerTimes)
        }
      ]}
      headerClass="jummah-header"
    />
  );
};
