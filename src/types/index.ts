
export interface PrayerTime {
  id: string;
  name: string;
  time: string;
  isActive?: boolean;
  isNext?: boolean;
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
  jummah_start?: string;
  jummah_jamat_1?: string;
  jummah_jamat_2?: string;
  created_at?: string | null;
}

export interface Hadith {
  id: string;
  text: string;
  source: string;
  lastUpdated?: string;
}

export interface DailyHadith {
  id?: string;
  day_of_month: number;
  month: string;
  text: string;
  source: string;
  created_at?: string | null;
}

export interface HadithCollectionItem {
  id: string;
  text: string;
  source: string;
  is_active: boolean;
  created_at: string | null;
}

export interface User {
  id: string;
  email: string;
  isAdmin: boolean;
}
