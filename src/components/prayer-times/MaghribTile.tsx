
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
  
  // Add debug log for Maghrib times
  console.log(`Maghrib time: ${getMaghribTime(detailedTimes, prayerTimes)}, isActive=${maghribDetails.isActive}, isNext=${maghribDetails.isNext}`);
  
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
