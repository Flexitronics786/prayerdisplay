
import React from "react";
import { PrayerTime, DetailedPrayerTime } from "@/types";
import { PrayerTile } from "./PrayerTile";
import { getPrayerDetails, getZuhrStart, getZuhrJamat } from "./PrayerTimeUtils";

interface ZuhrTileProps {
  prayerTimes: PrayerTime[];
  detailedTimes: DetailedPrayerTime | null;
}

export const ZuhrTile: React.FC<ZuhrTileProps> = ({ prayerTimes, detailedTimes }) => {
  const today = new Date();
  const isFriday = today.getDay() === 5; // 5 is Friday in JavaScript's getDay()
  const zuhrDetails = getPrayerDetails(prayerTimes, "Zuhr");

  // Ensure Zuhr doesn't have active/next state on Fridays (to prioritize Jummah)
  const isActive = isFriday ? false : zuhrDetails.isActive;
  const isNext = isFriday ? false : zuhrDetails.isNext;
  
  return (
    <PrayerTile
      title="Zuhr"
      arabicTitle="ظهر"
      isActive={isActive}
      isNext={isNext}
      items={[
        {
          label: "Start",
          time: getZuhrStart(detailedTimes, prayerTimes)
        },
        {
          label: "Jamat",
          time: getZuhrJamat(detailedTimes, prayerTimes)
        }
      ]}
      headerClass="zuhr-header"
    />
  );
};
