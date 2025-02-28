
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
  const [countdown, setCountdown] = useState<string>("");
  const [allHadiths, setAllHadiths] = useState<HadithCollectionItem[]>([]);
  const [currentHadithIndex, setCurrentHadithIndex] = useState(0);
  const [currentHadith, setCurrentHadith] = useState<Hadith>(hadith);
  
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
      // Toggle between phone reminder and hadiths
      if (showPhoneReminder) {
        // Switch to hadith display
        setShowPhoneReminder(false);
        
        // If we have hadiths from collection, use those
        if (allHadiths.length > 0) {
          const nextIndex = (currentHadithIndex + 1) % allHadiths.length;
          setCurrentHadithIndex(nextIndex);
          setCurrentHadith(convertToHadith(allHadiths[nextIndex]));
        } else {
          // Fallback to the original hadith
          setCurrentHadith(hadith);
        }
      } else {
        // Switch to phone reminder
        setShowPhoneReminder(true);
      }
    };
    
    // Cycle every 30 seconds (phone reminder), and every ~5-7 minutes (hadith)
    // This creates an average cycle of around 5-7 minutes for each hadith
    const interval = setInterval(() => {
      cycleContent();
    }, showPhoneReminder ? 30000 : Math.floor(Math.random() * (420000 - 300000) + 300000)); // 5-7 minutes for hadith, 30s for reminder
    
    return () => clearInterval(interval);
  }, [hadith, showPhoneReminder, allHadiths, currentHadithIndex]);
  
  // Update countdown timer every second
  useEffect(() => {
    if (!nextPrayer) return;
    
    const updateCountdown = () => {
      const now = new Date();
      const [hours, minutes] = nextPrayer.time.split(':').map(Number);
      
      // Create a date object for the next prayer time
      const prayerTime = new Date();
      prayerTime.setHours(hours, minutes, 0);
      
      // If the prayer time is in the past, it's for tomorrow
      if (prayerTime < now) {
        prayerTime.setDate(prayerTime.getDate() + 1);
      }
      
      // Calculate time difference
      const diff = prayerTime.getTime() - now.getTime();
      
      // Convert to hours, minutes, seconds
      const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
      const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secondsLeft = Math.floor((diff % (1000 * 60)) / 1000);
      
      setCountdown(`${hoursLeft}h ${minutesLeft}m ${secondsLeft}s`);
    };
    
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(timer);
  }, [nextPrayer]);
  
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
      <p className="text-lg text-amber-700 text-center mb-6">
        Please turn off your mobile phones while in the mosque as a sign of respect.
      </p>
      
      {nextPrayer && (
        <div className="mt-auto">
          <div className="text-center p-3 bg-amber-100/60 rounded-lg">
            <p className="text-amber-800 font-medium">{nextPrayer.name} starts in</p>
            <p className="text-2xl font-bold text-amber-900">{countdown}</p>
          </div>
        </div>
      )}
    </div>
  );
  
  return (
    <div className="gold-border prayer-card rounded-xl p-4 h-full animate-fade-in">
      {showPhoneReminder ? renderPhoneReminder() : renderHadith()}
    </div>
  );
};

export default HadithDisplay;
