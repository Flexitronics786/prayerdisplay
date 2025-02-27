
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
