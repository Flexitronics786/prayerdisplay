
import { PrayerTime, DetailedPrayerTime } from "@/types";
import { getCurrentTime24h, isTimeBefore } from "@/utils/dateUtils";

// Default prayer times (example)
export const defaultPrayerTimes: PrayerTime[] = [
  { id: '1', name: 'Fajr', time: '05:30' },
  { id: '2', name: 'Dhuhr', time: '12:30' },
  { id: '3', name: 'Asr', time: '15:45' },
  { id: '4', name: 'Maghrib', time: '18:15' },
  { id: '5', name: 'Isha', time: '19:45' }
];

// Helper function to map detailed prayer time to display format
export const mapToDisplayFormat = (data: DetailedPrayerTime): PrayerTime[] => {
  return [
    { id: '1', name: 'Fajr', time: data.fajr_jamat.slice(0, 5) },
    { id: '2', name: 'Sunrise', time: data.sunrise.slice(0, 5) },
    { id: '3', name: 'Zuhr', time: data.zuhr_jamat.slice(0, 5) },
    { id: '4', name: 'Asr', time: data.asr_jamat.slice(0, 5) },
    { id: '5', name: 'Maghrib', time: data.maghrib_iftar.slice(0, 5) },
    { id: '6', name: 'Isha', time: data.isha_first_jamat.slice(0, 5) }
  ];
};

// Helper function to mark the active prayer time based on current time with updated rules
export const markActivePrayer = (prayerTimes: PrayerTime[], detailedTimes?: DetailedPrayerTime): PrayerTime[] => {
  const currentTime = getCurrentTime24h();
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Reset all to inactive
  const updatedTimes = prayerTimes.map(prayer => ({
    ...prayer,
    isActive: false,
    isNext: false
  }));
  
  // Find indices for each prayer time
  const fajrIndex = updatedTimes.findIndex(p => p.name === 'Fajr');
  const sunriseIndex = updatedTimes.findIndex(p => p.name === 'Sunrise');
  const dhuhrIndex = updatedTimes.findIndex(p => p.name === 'Dhuhr' || p.name === 'Zuhr');
  const asrIndex = updatedTimes.findIndex(p => p.name === 'Asr');
  const maghribIndex = updatedTimes.findIndex(p => p.name === 'Maghrib');
  const ishaIndex = updatedTimes.findIndex(p => p.name === 'Isha');
  
  // Get prayer times
  const fajrTime = fajrIndex !== -1 ? updatedTimes[fajrIndex].time : '';
  const sunriseTime = sunriseIndex !== -1 ? updatedTimes[sunriseIndex].time : '';
  const dhuhrTime = dhuhrIndex !== -1 ? updatedTimes[dhuhrIndex].time : '';
  const asrTime = asrIndex !== -1 ? updatedTimes[asrIndex].time : '';
  const maghribTime = maghribIndex !== -1 ? updatedTimes[maghribIndex].time : '';
  const ishaTime = ishaIndex !== -1 ? updatedTimes[ishaIndex].time : '';
  
  let asrStartTime = '';
  let maghribStartTime = '';
  let fajrStartTimeNextDay = '';
  
  if (detailedTimes) {
    asrStartTime = detailedTimes.asr_start || '';
    maghribStartTime = detailedTimes.maghrib_iftar || '';
    fajrStartTimeNextDay = detailedTimes.fajr_jamat || '';
  }
  
  // Calculate one hour after Maghrib
  let oneHourAfterMaghrib = '';
  if (maghribTime) {
    const [mHours, mMinutes] = maghribTime.split(':').map(Number);
    let newHour = mHours + 1;
    if (newHour >= 24) newHour -= 24;
    oneHourAfterMaghrib = `${newHour.toString().padStart(2, '0')}:${mMinutes.toString().padStart(2, '0')}`;
  }
  
  // Determine current prayer based on rules
  // Rule 1: Fajr is active from its start until Sunrise
  if (fajrIndex !== -1 && sunriseIndex !== -1 && 
      !isTimeBefore(currentTime, fajrTime) && 
      isTimeBefore(currentTime, sunriseTime)) {
    updatedTimes[fajrIndex].isActive = true;
  }
  
  // Rule 2: Dhuhr is active from its start until Asr starts
  if (dhuhrIndex !== -1 && 
      !isTimeBefore(currentTime, dhuhrTime) && 
      (asrStartTime ? isTimeBefore(currentTime, asrStartTime) : isTimeBefore(currentTime, asrTime))) {
    updatedTimes[dhuhrIndex].isActive = true;
  }
  
  // Rule 3: Asr is active from its start until Maghrib starts
  if (asrIndex !== -1 && 
      !isTimeBefore(currentTime, asrTime) && 
      isTimeBefore(currentTime, maghribTime)) {
    updatedTimes[asrIndex].isActive = true;
  }
  
  // Rule 4: Maghrib is active from its start until 1 hour after
  if (maghribIndex !== -1 && 
      !isTimeBefore(currentTime, maghribTime) && 
      isTimeBefore(currentTime, oneHourAfterMaghrib)) {
    updatedTimes[maghribIndex].isActive = true;
  }
  
  // Rule 5: Isha is active from its start until Fajr starts (next day)
  if (ishaIndex !== -1 && !isTimeBefore(currentTime, ishaTime)) {
    // If it's after Isha time and before midnight
    updatedTimes[ishaIndex].isActive = true;
  } else if (ishaIndex !== -1 && currentHour < 12) {
    // If it's after midnight but before Fajr (using midnight to noon as approximate)
    if (fajrTime && isTimeBefore(currentTime, fajrTime)) {
      updatedTimes[ishaIndex].isActive = true;
    }
  }
  
  // Determine next prayer
  let nextPrayerFound = false;
  
  // Create an array of prayers in chronological order for the day
  const orderedPrayers = [
    { index: fajrIndex, time: fajrTime },
    { index: sunriseIndex, time: sunriseTime }, // Not a prayer but a time marker
    { index: dhuhrIndex, time: dhuhrTime },
    { index: asrIndex, time: asrTime },
    { index: maghribIndex, time: maghribTime },
    { index: ishaIndex, time: ishaTime }
  ].filter(p => p.index !== -1);
  
  // Find the next prayer that hasn't started yet
  for (const prayer of orderedPrayers) {
    if (isTimeBefore(currentTime, prayer.time)) {
      if (prayer.index !== sunriseIndex) { // Skip sunrise as "next prayer"
        updatedTimes[prayer.index].isNext = true;
        nextPrayerFound = true;
        break;
      }
    }
  }
  
  // If no next prayer found and it's after Isha, next prayer is Fajr tomorrow
  if (!nextPrayerFound && fajrIndex !== -1) {
    updatedTimes[fajrIndex].isNext = true;
  }
  
  return updatedTimes;
};
