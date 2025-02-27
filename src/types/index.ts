
export interface PrayerTime {
  id: string;
  name: string;
  time: string;
  isActive?: boolean;
  isNext?: boolean;
}

export interface Hadith {
  id: string;
  text: string;
  source: string;
  lastUpdated?: string;
}

export interface User {
  email: string;
  isAdmin: boolean;
}

export interface DetailedPrayerTime {
  id: string;
  date: string;
  day: string;
  sehri_end: string;
  fajr_jamat: string;
  sunrise: string;
  zuhr_start: string;
  zuhr_jamat: string;
  asr_start: string;
  asr_jamat: string;
  maghrib_iftar: string;
  isha_start: string;
  isha_first_jamat: string;
  isha_second_jamat: string;
  created_at?: string;
}
