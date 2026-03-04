
import React from "react";
import { PrayerTime, DetailedPrayerTime } from "@/types";
import { PrayerTile } from "./PrayerTile";
import { getPrayerDetails, getPrayerTime, getIshaStart, getIshaJamat } from "./PrayerTimeUtils";

interface IshaTileProps {
  prayerTimes: PrayerTime[];
  detailedTimes: DetailedPrayerTime | null;
}

export const IshaTile: React.FC<IshaTileProps> = ({ prayerTimes, detailedTimes }) => {
  const ishaDetails = getPrayerDetails(prayerTimes, "Isha");
  const ishaEntry = getPrayerTime(prayerTimes, "Isha");

  const timeItems = [
    {
      label: "Start",
      time: getIshaStart(detailedTimes, prayerTimes)
    },
    {
      label: "Jamat",
      time: getIshaJamat(detailedTimes, prayerTimes)
    }
  ];

  return (
    <PrayerTile
      title="Isha"
      arabicTitle="عشاء"
      isActive={ishaDetails.isActive}
      isNext={ishaDetails.isNext}
      isTomorrow={ishaEntry?.isTomorrow}
      countdownTime={ishaDetails.isNext ? ishaEntry?.time : undefined}
      items={timeItems}
      headerClass="isha-header"
    />
  );
};
