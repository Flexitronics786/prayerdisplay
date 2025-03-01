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
  
  const convertToHadith = (item: HadithCollectionItem): Hadith => {
    return {
      id: item.id,
      text: item.text,
      source: item.source,
      lastUpdated: item.created_at || new Date().toISOString()
    };
  };
  
  useEffect(() => {
    setCurrentHadith(hadith);
    
    const cycleContent = () => {
      if (showPhoneReminder) {
        setShowPhoneReminder(false);
        
        if (reminderCount >= 3) {
          setReminderCount(0);
          
          if (allHadiths.length > 0) {
            const nextIndex = (currentHadithIndex + 1) % allHadiths.length;
            setCurrentHadithIndex(nextIndex);
            setCurrentHadith(convertToHadith(allHadiths[nextIndex]));
          } else {
            setCurrentHadith(hadith);
          }
        }
      } else {
        setShowPhoneReminder(true);
        setReminderCount(prevCount => prevCount + 1);
      }
    };
    
    const interval = setInterval(() => {
      cycleContent();
    }, showPhoneReminder ? 30000 : 120000);
    
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
    <div className="flex flex-col h-full justify-center items-center py-6 animate-pulse-soft">
      <div className="bg-gradient-to-b from-amber-500/90 to-amber-400/90 p-5 rounded-full mb-5 shadow-lg">
        <Smartphone className="h-12 w-12 text-white" />
      </div>
      
      <h3 className="text-2xl font-bold text-amber-800 mb-3 font-serif text-center bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 bg-clip-text text-transparent">
        Mobile Phone Reminder
      </h3>
      
      <div className="bg-gradient-to-r from-amber-100 to-amber-200 p-4 rounded-xl shadow-md border border-amber-300/50 max-w-xs">
        <p className="text-lg text-amber-800 text-center leading-relaxed">
          Please turn off your mobile phone while in the mosque as a sign of respect.
        </p>
      </div>
    </div>
  );
  
  return (
    <div className="gold-border prayer-card rounded-xl p-4 h-full animate-fade-in">
      {showPhoneReminder ? renderPhoneReminder() : renderHadith()}
    </div>
  );
};

export default HadithDisplay;
