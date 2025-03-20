
import { PrayerTime, DetailedPrayerTime } from "@/types";
import { convertTo12Hour } from "@/utils/dateUtils";

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

// Using start times for display and calculation
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

export const getIshaFirstJamat = (detailedTimes: DetailedPrayerTime | null, prayerTimes: PrayerTime[]) => {
  if (detailedTimes && detailedTimes.isha_first_jamat) {
    return convertTo12Hour(detailedTimes.isha_first_jamat);
  }
  const isha = getPrayerTime(prayerTimes, "Isha");
  return isha ? convertTo12Hour(isha.time) : "";
};

export const getIshaSecondJamat = (detailedTimes: DetailedPrayerTime | null) => {
  if (detailedTimes && detailedTimes.isha_second_jamat) {
    return convertTo12Hour(detailedTimes.isha_second_jamat);
  }
  return "";
};

export const getSunriseFromDetailedTimes = (detailedTimes: DetailedPrayerTime | null, prayerTimes: PrayerTime[]) => {
  if (detailedTimes && detailedTimes.sunrise) {
    return convertTo12Hour(detailedTimes.sunrise);
  }
  return getSunriseTime(prayerTimes);
};

export const getJummahKhutbahTime = (detailedTimes: DetailedPrayerTime | null, prayerTimes: PrayerTime[]) => {
  const jamatTime = getZuhrJamat(detailedTimes, prayerTimes);
  if (!jamatTime) return "";
  
  const [time, period] = jamatTime.split(' ');
  const [hours, minutes] = time.split(':').map(part => parseInt(part, 10));
  
  const date = new Date();
  let hour = hours;
  
  if (period === 'PM' && hour < 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  
  date.setHours(hour, minutes);
  
  date.setMinutes(date.getMinutes() - 10);
  
  let khutbahHour = date.getHours();
  const khutbahMinutes = date.getMinutes();
  let ampm = 'AM';
  
  if (khutbahHour >= 12) {
    ampm = 'PM';
    if (khutbahHour > 12) khutbahHour -= 12;
  }
  if (khutbahHour === 0) khutbahHour = 12;
  
  return `${khutbahHour}:${khutbahMinutes.toString().padStart(2, '0')} ${ampm}`;
};
