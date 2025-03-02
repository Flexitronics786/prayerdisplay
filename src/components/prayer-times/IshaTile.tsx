
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
  
  const currentDate = new Date();
  const march2025 = new Date('2025-03-01');
  const showSecondJamat = currentDate < march2025;
  
  const timeItems = [
    {
      label: "Start",
      time: getIshaStart(detailedTimes, prayerTimes)
    }
  ];
  
  if (showSecondJamat) {
    timeItems.push(
      {
        label: "1st Jamat",
        time: getIshaFirstJamat(detailedTimes, prayerTimes)
      },
      {
        label: "2nd Jamat",
        time: getIshaSecondJamat(detailedTimes)
      }
    );
  } else {
    timeItems.push({
      label: "Jamat",
      time: getIshaFirstJamat(detailedTimes, prayerTimes)
    });
  }
  
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
