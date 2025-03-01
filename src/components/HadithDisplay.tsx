
import React, { useState, useEffect, useRef } from "react";
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
  
  // Reference to track if component is mounted
  const isMounted = useRef(true);
  
  // Load all active hadiths on component mount
  useEffect(() => {
    const loadAllHadiths = async () => {
      try {
        const hadithCollection = await fetchHadithCollection();
        const activeHadiths = hadithCollection.filter(h => h.is_active);
        
        if (activeHadiths.length > 0 && isMounted.current) {
          setAllHadiths(activeHadiths);
          console.log(`Loaded ${activeHadiths.length} active hadiths for cycling`);
          
          // Find initial hadith index
          const initialIndex = activeHadiths.findIndex(h => h.id === hadith.id);
          if (initialIndex !== -1) {
            setCurrentHadithIndex(initialIndex);
            console.log(`Initial hadith index set to ${initialIndex}`);
          }
        }
      } catch (error) {
        console.error("Error loading hadith collection:", error);
      }
    };
    
    loadAllHadiths();
    
    // Cleanup function
    return () => {
      isMounted.current = false;
    };
  }, [hadith.id]);
  
  const convertToHadith = (item: HadithCollectionItem): Hadith => {
    return {
      id: item.id,
      text: item.text,
      source: item.source,
      lastUpdated: item.created_at || new Date().toISOString()
    };
  };
  
  // Set up cycling timer
  useEffect(() => {
    // Initialize with the provided hadith
    setCurrentHadith(hadith);
    console.log(`Starting with hadith: ${hadith.id}`);
    
    let cycleTimer: NodeJS.Timeout | null = null;
    
    // Function to handle cycling
    const runCycle = () => {
      // Start with showing the hadith for 2 minutes
      console.log("Starting cycle: showing hadith for 2 minutes");
      
      // After 2 minutes, show phone reminder
      const phoneReminderTimer = setTimeout(() => {
        if (isMounted.current) {
          console.log("Showing phone reminder for 30 seconds");
          setShowPhoneReminder(true);
          
          // After 30 seconds of phone reminder, show next hadith
          const nextHadithTimer = setTimeout(() => {
            if (isMounted.current) {
              setShowPhoneReminder(false);
              
              if (allHadiths.length > 1) {
                // Move to next hadith
                const nextIndex = (currentHadithIndex + 1) % allHadiths.length;
                console.log(`Moving to next hadith: index ${currentHadithIndex} → ${nextIndex}`);
                setCurrentHadithIndex(nextIndex);
                
                const nextHadith = convertToHadith(allHadiths[nextIndex]);
                console.log(`Next hadith: ${nextHadith.id} - ${nextHadith.text.substring(0, 30)}...`);
                setCurrentHadith(nextHadith);
              }
            }
          }, 30000); // 30 seconds for phone reminder
          
          return () => clearTimeout(nextHadithTimer);
        }
      }, 120000); // 2 minutes for hadith
      
      return () => clearTimeout(phoneReminderTimer);
    };
    
    // Start the cycle
    let clearFn = runCycle();
    
    // Set up recurring cycle every 2.5 minutes (2min hadith + 30sec reminder)
    cycleTimer = setInterval(() => {
      if (clearFn) clearFn();
      clearFn = runCycle();
    }, 150000); // 2.5 minutes total cycle time
    
    // Clean up all timers when component unmounts or dependencies change
    return () => {
      if (clearFn) clearFn();
      if (cycleTimer) clearInterval(cycleTimer);
    };
  }, [hadith, allHadiths, currentHadithIndex]);
  
  // Render the hadith content
  const renderHadith = () => (
    <>
      <h3 className="text-2xl font-bold text-amber-800 mb-4 font-serif">Hadith</h3>
      
      <div className="mb-4">
        <p className="text-base text-amber-900/90 leading-relaxed">{currentHadith.text}</p>
      </div>
      
      <div>
        <p className="text-base font-semibold text-amber-800 mb-1">Reference</p>
        <p className="text-sm text-amber-900/80">{currentHadith.source}</p>
      </div>
    </>
  );
  
  // Render the phone reminder content
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
