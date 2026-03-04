
import React from "react";
import { PrayerTime, DetailedPrayerTime } from "@/types";
import { PrayerTile } from "./PrayerTile";
import { getPrayerDetails, getPrayerTime, getZuhrStart, getZuhrJamat } from "./PrayerTimeUtils";

interface ZuhrTileProps {
  prayerTimes: PrayerTime[];
  detailedTimes: DetailedPrayerTime | null;
}

export const ZuhrTile: React.FC<ZuhrTileProps> = ({ prayerTimes, detailedTimes }) => {
  const today = new Date();
  const isFriday = today.getDay() === 5;
  const zuhrDetails = getPrayerDetails(prayerTimes, "Zuhr");
  const zuhrEntry = getPrayerTime(prayerTimes, "Zuhr");

  // Ensure Zuhr doesn't have active/next state on Fridays (to prioritize Jummah)
  const isActive = isFriday ? false : zuhrDetails.isActive;
  const isNext = isFriday ? false : zuhrDetails.isNext;

  return (
    <PrayerTile
      title="Zuhr"
      arabicTitle="ظهر"
      isActive={isActive}
      isNext={isNext}
      isTomorrow={zuhrEntry?.isTomorrow}
      countdownTime={isNext ? zuhrEntry?.time : undefined}
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
