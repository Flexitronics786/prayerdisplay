
import React from "react";
import { PrayerTime, DetailedPrayerTime } from "@/types";
import { PrayerTile } from "./PrayerTile";
import { getPrayerDetails, getPrayerTime, getFajrStart, getFajrJamat, getSunriseFromDetailedTimes } from "./PrayerTimeUtils";

interface FajrTileProps {
  prayerTimes: PrayerTime[];
  detailedTimes: DetailedPrayerTime | null;
}

export const FajrTile: React.FC<FajrTileProps> = ({ prayerTimes, detailedTimes }) => {
  const fajrDetails = getPrayerDetails(prayerTimes, "Fajr");
  const fajrEntry = getPrayerTime(prayerTimes, "Fajr");

  return (
    <PrayerTile
      title="Fajr"
      arabicTitle="فجر"
      isActive={fajrDetails.isActive}
      isNext={fajrDetails.isNext}
      isTomorrow={fajrEntry?.isTomorrow}
      countdownTime={fajrDetails.isNext ? fajrEntry?.time : undefined}
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
