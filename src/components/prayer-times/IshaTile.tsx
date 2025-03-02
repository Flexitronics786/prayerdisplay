
import React from "react";
import { PrayerTime, DetailedPrayerTime } from "@/types";
import { PrayerTile } from "./PrayerTile";
import { getPrayerDetails, getIshaStart, getIshaFirstJamat, getIshaSecondJamat } from "./PrayerTimeUtils";

interface IshaTileProps {
  prayerTimes: PrayerTime[];
  detailedTimes: DetailedPrayerTime | null;
}

export const IshaTile: React.FC<IshaTileProps> = ({ prayerTimes, detailedTimes }) => {
  const ishaDetails = getPrayerDetails(prayerTimes, "Isha");
  
  const timeItems = [
    {
      label: "Start",
      time: getIshaStart(detailedTimes, prayerTimes)
    },
    {
      label: "1st Jamat",
      time: getIshaFirstJamat(detailedTimes, prayerTimes)
    },
    {
      label: "2nd Jamat",
      time: getIshaSecondJamat(detailedTimes)
    }
  ];
  
  return (
    <PrayerTile
      title="Isha"
      isActive={ishaDetails.isActive}
      isNext={ishaDetails.isNext}
      items={timeItems}
      headerClass="isha-header"
    />
  );
};
