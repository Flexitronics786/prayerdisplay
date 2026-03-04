
import React, { useEffect } from "react";
import { PrayerTime, DetailedPrayerTime } from "@/types";
import { PrayerTile } from "./PrayerTile";
import { getPrayerDetails, getPrayerTime, getMaghribTime } from "./PrayerTimeUtils";

interface MaghribTileProps {
  prayerTimes: PrayerTime[];
  detailedTimes: DetailedPrayerTime | null;
}

export const MaghribTile: React.FC<MaghribTileProps> = ({ prayerTimes, detailedTimes }) => {
  const maghribDetails = getPrayerDetails(prayerTimes, "Maghrib");
  const maghribEntry = getPrayerTime(prayerTimes, "Maghrib");

  useEffect(() => {
    if (detailedTimes?.maghrib_iftar) {
      console.log("Maghrib time loaded:", detailedTimes.maghrib_iftar);
    }
  }, [detailedTimes]);

  return (
    <PrayerTile
      title="Maghrib"
      arabicTitle="مغرب"
      isActive={maghribDetails.isActive}
      isNext={maghribDetails.isNext}
      isTomorrow={maghribEntry?.isTomorrow}
      countdownTime={maghribDetails.isNext ? maghribEntry?.time : undefined}
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
