import React from "react";
import { PrayerTime, DetailedPrayerTime } from "@/types";
import { PrayerTile } from "./PrayerTile";
import { getJummahStart, getJummahJamat1, getJummahJamat2 } from "./PrayerTimeUtils";
import { JummahSettings } from "@/services/settingsService";

interface JummahTileProps {
  prayerTimes: PrayerTime[];
  detailedTimes: DetailedPrayerTime | null;
  jummahSettings?: JummahSettings | null;
}

export const JummahTile: React.FC<JummahTileProps> = ({ prayerTimes, detailedTimes, jummahSettings }) => {
  const today = new Date();
  const isFriday = today.getDay() === 5; // 5 is Friday in JavaScript's getDay()

  // Only use Zuhr's active/next status on Fridays
  const zuhrPrayer = prayerTimes.find(p => p.name === "Zuhr" || p.name === "Dhuhr");
  const isActive = isFriday ? (zuhrPrayer?.isActive || false) : false;
  const isNext = isFriday ? (zuhrPrayer?.isNext || false) : false;

  console.log(`JummahTile: Today is ${today.toLocaleDateString()}, isFriday=${isFriday}, isActive=${isActive}, isNext=${isNext}`);

  const jamat2 = getJummahJamat2(detailedTimes, prayerTimes, jummahSettings);

  const items = [
    {
      label: "Start",
      time: getJummahStart(detailedTimes, prayerTimes, jummahSettings)
    },
    {
      label: "Jamat 1",
      time: getJummahJamat1(detailedTimes, prayerTimes, jummahSettings)
    }
  ];

  if (jamat2) {
    items.push({
      label: "Jamat 2",
      time: jamat2
    });
  }

  return (
    <PrayerTile
      title="Jummah"
      arabicTitle="الجمعة"
      isActive={isActive}
      isNext={isNext}
      items={items}
      headerClass={`jummah-header${isFriday ? " friday" : ""}`}
    />
  );
};
