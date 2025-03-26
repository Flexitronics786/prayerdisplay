
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
  
  // Add console logs to help debug Maghrib timing
  console.log(`Maghrib prayer details:`, maghribDetails);
  
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
