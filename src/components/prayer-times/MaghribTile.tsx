
import React from "react";
import { PrayerTime, DetailedPrayerTime } from "@/types";
import { PrayerTile } from "./PrayerTile";
import { getPrayerDetails, getMaghribTime } from "./PrayerTimeUtils";

interface MaghribTileProps {
  prayerTimes: PrayerTime[];
  detailedTimes: DetailedPrayerTime | null;
}

export const MaghribTile: React.FC<MaghribTileProps> = ({ prayerTimes, detailedTimes }) => {
  const maghribDetails = getPrayerDetails(prayerTimes, "Maghrib");
  
  // Log Maghrib details for debugging
  console.log("Maghrib details:", { 
    isActive: maghribDetails.isActive, 
    isNext: maghribDetails.isNext,
    time: getMaghribTime(detailedTimes, prayerTimes)
  });
  
  return (
    <PrayerTile
      title="Maghrib"
      arabicTitle="مغرب"
      isActive={maghribDetails.isActive}
      isNext={maghribDetails.isNext}
      items={[
        {
          label: "Start",
          time: getMaghribTime(detailedTimes, prayerTimes)
        }
      ]}
      headerClass="maghrib-header"
    />
  );
};
