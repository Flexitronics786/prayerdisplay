
import React, { useState, useEffect } from "react";
import { Hadith, PrayerTime } from "@/types";
import { Smartphone } from "lucide-react";
import { fetchHadithCollection } from "@/services/dataService";
import { HadithCollectionItem } from "@/types";

interface HadithDisplayProps {
  hadith: Hadith;
  nextPrayer?: PrayerTime | null;
}

const HadithDisplay: React.FC<HadithDisplayProps> = ({ hadith, nextPrayer }) => {
  const [showPhoneReminder, setShowPhoneReminder] = useState(false);
  const [allHadiths, setAllHadiths] = useState<HadithCollectionItem[]>([]);
  const [currentHadithIndex, setCurrentHadithIndex] = useState(0);
  const [currentHadith, setCurrentHadith] = useState<Hadith>(hadith);
  const [reminderCount, setReminderCount] = useState(0);
  
  // Load all active hadiths from collection
  useEffect(() => {
    const loadAllHadiths = async () => {
      try {
        const hadithCollection = await fetchHadithCollection();
        const activeHadiths = hadithCollection.filter(h => h.is_active);
        if (activeHadiths.length > 0) {
          setAllHadiths(activeHadiths);
          console.log(`Loaded ${activeHadiths.length} active hadiths for cycling`);
        }
      } catch (error) {
        console.error("Error loading hadith collection:", error);
      }
    };
    
    loadAllHadiths();
  }, []);
  
  // Convert hadith collection item to Hadith format
  const convertToHadith = (item: HadithCollectionItem): Hadith => {
    return {
      id: item.id,
      text: item.text,
      source: item.source,
      lastUpdated: item.created_at || new Date().toISOString()
    };
  };
  
  // Cycle between hadiths and reminder
  useEffect(() => {
    // Initial hadith
    setCurrentHadith(hadith);
    
    const cycleContent = () => {
      if (showPhoneReminder) {
        // After showing reminder, go back to hadith
        setShowPhoneReminder(false);
        
        // If we've shown the reminder 3 times, switch to a new hadith
        if (reminderCount >= 3) {
          // Reset reminder count
          setReminderCount(0);
          
          // Change to next hadith
          if (allHadiths.length > 0) {
            const nextIndex = (currentHadithIndex + 1) % allHadiths.length;
            setCurrentHadithIndex(nextIndex);
            setCurrentHadith(convertToHadith(allHadiths[nextIndex]));
          } else {
            // Fallback to the original hadith
            setCurrentHadith(hadith);
          }
        }
      } else {
        // Switch to phone reminder
        setShowPhoneReminder(true);
        setReminderCount(prevCount => prevCount + 1);
      }
    };
    
    // Phone reminder shows for 30 seconds
    // Hadith shows for approximately 2 minutes between reminders
    // After 3 reminders (about 7 minutes total), we switch to a new hadith
    const interval = setInterval(() => {
      cycleContent();
    }, showPhoneReminder ? 30000 : 120000); // 30s for reminder, 2min for hadith
    
    return () => clearInterval(interval);
  }, [hadith, showPhoneReminder, allHadiths, currentHadithIndex, reminderCount]);
  
  const renderHadith = () => (
    <>
      <h3 className="text-2xl font-bold text-amber-800 mb-4 font-serif">Hadith of the Day</h3>
      
      <div className="mb-4">
        <p className="text-lg font-semibold text-amber-800 mb-1">Hadith</p>
        <p className="text-base text-amber-900/90 leading-relaxed">{currentHadith.text}</p>
      </div>
      
      <div>
        <p className="text-base font-semibold text-amber-800 mb-1">Reference</p>
        <p className="text-sm text-amber-900/80">{currentHadith.source}</p>
      </div>
    </>
  );
  
  const renderPhoneReminder = () => (
    <div className="flex flex-col h-full justify-center items-center py-8">
      <Smartphone className="h-12 w-12 text-amber-600 mb-4" />
      <h3 className="text-2xl font-bold text-amber-800 mb-3 font-serif text-center">Reminder</h3>
      <p className="text-lg text-amber-700 text-center">
        Please turn off your mobile phones while in the mosque as a sign of respect.
      </p>
    </div>
  );
  
  return (
    <div className="gold-border prayer-card rounded-xl p-4 h-full animate-fade-in">
      {showPhoneReminder ? renderPhoneReminder() : renderHadith()}
    </div>
  );
};

export default HadithDisplay;
