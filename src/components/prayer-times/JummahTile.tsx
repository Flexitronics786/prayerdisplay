
import React from "react";
import { PrayerTime, DetailedPrayerTime } from "@/types";
import { PrayerTile } from "./PrayerTile";
import { getZuhrStart, getZuhrJamat, getJummahKhutbahTime } from "./PrayerTimeUtils";

interface JummahTileProps {
  prayerTimes: PrayerTime[];
  detailedTimes: DetailedPrayerTime | null;
}

export const JummahTile: React.FC<JummahTileProps> = ({ prayerTimes, detailedTimes }) => {
  // On Friday, Jummah replaces Zuhr, so we'll use the same logic to determine if it's active or next
  const zuhrPrayer = prayerTimes.find(p => p.name === "Zuhr" || p.name === "Dhuhr");
  const isActive = zuhrPrayer?.isActive || false;
  const isNext = zuhrPrayer?.isNext || false;

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
