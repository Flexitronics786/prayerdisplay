
import React from "react";
import { PrayerTime, DetailedPrayerTime } from "@/types";
import { PrayerTile } from "./PrayerTile";
import { getPrayerDetails, getZuhrStart, getZuhrJamat } from "./PrayerTimeUtils";

interface ZuhrTileProps {
  prayerTimes: PrayerTime[];
  detailedTimes: DetailedPrayerTime | null;
}

export const ZuhrTile: React.FC<ZuhrTileProps> = ({ prayerTimes, detailedTimes }) => {
  const zuhrDetails = getPrayerDetails(prayerTimes, "Zuhr");
  
  return (
    <PrayerTile
      title="Zuhr"
      arabicTitle="الظهر"
      isActive={zuhrDetails.isActive}
      isNext={zuhrDetails.isNext}
      items={[
        {
          label: "Start",
          time: getZuhrStart(detailedTimes, prayerTimes)
        },
        {
          label: "Jamat",
          time: getZuhrJamat(detailedTimes, prayerTimes)
        }
      ]}
      headerClass="zuhr-header"
    />
  );
};
