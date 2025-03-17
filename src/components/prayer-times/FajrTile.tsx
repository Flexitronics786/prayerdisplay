
import React from "react";
import { PrayerTime, DetailedPrayerTime } from "@/types";
import { PrayerTile } from "./PrayerTile";
import { getPrayerDetails, getFajrStart, getFajrJamat, getSunriseFromDetailedTimes } from "./PrayerTimeUtils";

interface FajrTileProps {
  prayerTimes: PrayerTime[];
  detailedTimes: DetailedPrayerTime | null;
}

export const FajrTile: React.FC<FajrTileProps> = ({ prayerTimes, detailedTimes }) => {
  const fajrDetails = getPrayerDetails(prayerTimes, "Fajr");
  
  return (
    <PrayerTile
      title="Fajr"
      arabicTitle="فجر"
      isActive={fajrDetails.isActive}
      isNext={fajrDetails.isNext}
      items={[
        {
          label: "Start",
          time: getFajrStart(detailedTimes, prayerTimes)
        },
        {
          label: "Jamat",
          time: getFajrJamat(detailedTimes, prayerTimes)
        },
        {
          label: "Sunrise",
          time: getSunriseFromDetailedTimes(detailedTimes, prayerTimes)
        }
      ]}
      headerClass="fajr-header"
    />
  );
};
