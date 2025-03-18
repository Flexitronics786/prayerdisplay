
import { Hadith } from "@/types";

// Return default hadith
export const fetchHadith = async (): Promise<Hadith> => {
  return getDefaultHadith();
};

// Helper function to return the default hadith
export const getDefaultHadith = (): Hadith => {
  return {
    id: 'default',
    text: "The Messenger of Allah (ﷺ) said: 'The most beloved of deeds to Allah are those that are most consistent, even if they are small.'",
    source: "Sahih al-Bukhari",
    lastUpdated: new Date().toISOString()
  };
};
