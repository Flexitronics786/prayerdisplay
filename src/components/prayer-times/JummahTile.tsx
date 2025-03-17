
import React from "react";
import { PrayerTime, DetailedPrayerTime } from "@/types";
import { PrayerTile } from "./PrayerTile";
import { getZuhrStart, getZuhrJamat, getJummahKhutbahTime } from "./PrayerTimeUtils";

interface JummahTileProps {
  prayerTimes: PrayerTime[];
  detailedTimes: DetailedPrayerTime | null;
}

export const JummahTile: React.FC<JummahTileProps> = ({ prayerTimes, detailedTimes }) => {
  return (
    <PrayerTile
      title="Jummah"
      arabicTitle="الجمعة"
      isActive={false}
      isNext={false}
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
