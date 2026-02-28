
import { PrayerTime, DetailedPrayerTime } from "@/types";
import { convertTo12Hour } from "@/utils/dateUtils";
import { JummahSettings } from "@/services/settingsService";

export const getPrayerDetails = (prayerTimes: PrayerTime[], name: string) => {
  const prayers = prayerTimes.filter(
    (prayer) =>
      prayer.name.toLowerCase() === name.toLowerCase() ||
      (name === "Zuhr" && prayer.name === "Dhuhr") ||
      (name === "Fajr" && prayer.name === "Sunrise")
  );

  let isActive = prayers.some((p) => p.isActive);
  let isNext = prayers.some((p) => p.isNext);

  return {
    isActive,
    isNext,
    times: prayers,
  };
};

export const getPrayerTime = (prayerTimes: PrayerTime[], name: string) => {
  return prayerTimes.find(
    (prayer) =>
      prayer.name.toLowerCase() === name.toLowerCase() ||
      (name === "Zuhr" && prayer.name === "Dhuhr")
  );
};

export const getSunriseTime = (prayerTimes: PrayerTime[]) => {
  const sunrise = prayerTimes.find((prayer) => prayer.name === "Sunrise");
  return sunrise ? convertTo12Hour(sunrise.time) : "";
};

export const getFajrStart = (detailedTimes: DetailedPrayerTime | null, prayerTimes: PrayerTime[]) => {
  if (detailedTimes && detailedTimes.sehri_end) {
    return convertTo12Hour(detailedTimes.sehri_end);
  }
  const fajr = getPrayerTime(prayerTimes, "Fajr");
  return fajr ? convertTo12Hour(fajr.time) : "";
};

export const getFajrJamat = (detailedTimes: DetailedPrayerTime | null, prayerTimes: PrayerTime[]) => {
  if (detailedTimes && detailedTimes.fajr_jamat) {
    return convertTo12Hour(detailedTimes.fajr_jamat);
  }
  const fajr = getPrayerTime(prayerTimes, "Fajr");
  return fajr ? convertTo12Hour(fajr.time) : "";
};

export const getZuhrStart = (detailedTimes: DetailedPrayerTime | null, prayerTimes: PrayerTime[]) => {
  if (detailedTimes && detailedTimes.zuhr_start) {
    return convertTo12Hour(detailedTimes.zuhr_start);
  }
  const zuhr = getPrayerTime(prayerTimes, "Zuhr");
  return zuhr ? convertTo12Hour(zuhr.time) : "";
};

export const getZuhrJamat = (detailedTimes: DetailedPrayerTime | null, prayerTimes: PrayerTime[]) => {
  if (detailedTimes && detailedTimes.zuhr_jamat) {
    return convertTo12Hour(detailedTimes.zuhr_jamat);
  }
  const zuhr = getPrayerTime(prayerTimes, "Zuhr");
  return zuhr ? convertTo12Hour(zuhr.time) : "";
};

export const getAsrStart = (detailedTimes: DetailedPrayerTime | null, prayerTimes: PrayerTime[]) => {
  if (detailedTimes && detailedTimes.asr_start) {
    return convertTo12Hour(detailedTimes.asr_start);
  }
  const asr = getPrayerTime(prayerTimes, "Asr");
  return asr ? convertTo12Hour(asr.time) : "";
};

export const getAsrJamat = (detailedTimes: DetailedPrayerTime | null, prayerTimes: PrayerTime[]) => {
  if (detailedTimes && detailedTimes.asr_jamat) {
    return convertTo12Hour(detailedTimes.asr_jamat);
  }
  const asr = getPrayerTime(prayerTimes, "Asr");
  return asr ? convertTo12Hour(asr.time) : "";
};

export const getMaghribTime = (detailedTimes: DetailedPrayerTime | null, prayerTimes: PrayerTime[]) => {
  if (detailedTimes && detailedTimes.maghrib_iftar) {
    return convertTo12Hour(detailedTimes.maghrib_iftar);
  }
  const maghrib = getPrayerTime(prayerTimes, "Maghrib");
  return maghrib ? convertTo12Hour(maghrib.time) : "";
};

export const getIshaStart = (detailedTimes: DetailedPrayerTime | null, prayerTimes: PrayerTime[]) => {
  if (detailedTimes && detailedTimes.isha_start) {
    return convertTo12Hour(detailedTimes.isha_start);
  }
  const isha = getPrayerTime(prayerTimes, "Isha");
  return isha ? convertTo12Hour(isha.time) : "";
};

export const getIshaJamat = (detailedTimes: DetailedPrayerTime | null, prayerTimes: PrayerTime[]) => {
  if (detailedTimes && detailedTimes.isha_first_jamat) {
    return convertTo12Hour(detailedTimes.isha_first_jamat);
  }
  const isha = getPrayerTime(prayerTimes, "Isha");
  return isha ? convertTo12Hour(isha.time) : "";
};

export const getSunriseFromDetailedTimes = (detailedTimes: DetailedPrayerTime | null, prayerTimes: PrayerTime[]) => {
  if (detailedTimes && detailedTimes.sunrise) {
    return convertTo12Hour(detailedTimes.sunrise);
  }
  return getSunriseTime(prayerTimes);
};

export const getJummahStart = (detailedTimes: DetailedPrayerTime | null, prayerTimes: PrayerTime[], jummahSettings?: JummahSettings | null) => {
  return getZuhrStart(detailedTimes, prayerTimes);
};

export const getJummahJamat1 = (detailedTimes: DetailedPrayerTime | null, prayerTimes: PrayerTime[], jummahSettings?: JummahSettings | null) => {
  if (jummahSettings && jummahSettings.jamat1) {
    return convertTo12Hour(jummahSettings.jamat1);
  }
  return getZuhrJamat(detailedTimes, prayerTimes);
};

export const getJummahJamat2 = (detailedTimes: DetailedPrayerTime | null, prayerTimes: PrayerTime[], jummahSettings?: JummahSettings | null) => {
  if (jummahSettings && jummahSettings.jamat2) {
    return convertTo12Hour(jummahSettings.jamat2);
  }
  return "";
};
