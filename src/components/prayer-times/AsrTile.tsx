
import React from "react";
import { PrayerTime, DetailedPrayerTime } from "@/types";
import { PrayerTile } from "./PrayerTile";
import { getPrayerDetails, getAsrStart, getAsrJamat } from "./PrayerTimeUtils";

interface AsrTileProps {
  prayerTimes: PrayerTime[];
  detailedTimes: DetailedPrayerTime | null;
}

export const AsrTile: React.FC<AsrTileProps> = ({ prayerTimes, detailedTimes }) => {
  const asrDetails = getPrayerDetails(prayerTimes, "Asr");
  
  return (
    <PrayerTile
      title="Asr"
      isActive={asrDetails.isActive}
      isNext={asrDetails.isNext}
      items={[
        {
          label: "Start",
          time: getAsrStart(detailedTimes, prayerTimes)
        },
        {
          label: "Jamat",
          time: getAsrJamat(detailedTimes, prayerTimes)
        }
      ]}
      headerClass="asr-header"
    />
  );
};
