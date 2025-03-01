
import React, { useState, useEffect, useRef } from "react";
import { Hadith, PrayerTime } from "@/types";
import { Smartphone } from "lucide-react";
import { fetchHadith } from "@/services/dataService";

interface HadithDisplayProps {
  hadith: Hadith;
  nextPrayer?: PrayerTime | null;
}

const HadithDisplay: React.FC<HadithDisplayProps> = ({ hadith, nextPrayer }) => {
  const [showPhoneReminder, setShowPhoneReminder] = useState(false);
  const [displayedHadith, setDisplayedHadith] = useState<Hadith>(hadith);
  
  // References to track component mount status and timers
  const isMounted = useRef(true);
  const cycleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const phoneReminderTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Check if we're in TV display mode
  const isTV = window.innerWidth >= 1280 && 
               (window.innerHeight < 900 || window.innerWidth >= 1920 || 
                navigator.userAgent.toLowerCase().includes('silk') || 
                navigator.userAgent.toLowerCase().includes('firetv'));
  
  // Load hadith on component mount
  useEffect(() => {
    const loadHadith = async () => {
      try {
        const defaultHadith = await fetchHadith();
        if (isMounted.current) {
          setDisplayedHadith(defaultHadith);
        }
      } catch (error) {
        console.error("Error loading hadith:", error);
      }
    };
    
    loadHadith();
    
    return () => {
      isMounted.current = false;
      
      // Clean up any lingering timers
      if (cycleTimerRef.current) {
        clearTimeout(cycleTimerRef.current);
        cycleTimerRef.current = null;
      }
      
      if (phoneReminderTimerRef.current) {
        clearTimeout(phoneReminderTimerRef.current);
        phoneReminderTimerRef.current = null;
      }
    };
  }, []);
  
  // Setup cycling system
  useEffect(() => {
    console.log("Setting up hadith cycling mechanism");
    
    // Clear any existing timers to avoid duplicates
    if (cycleTimerRef.current) {
      clearTimeout(cycleTimerRef.current);
      cycleTimerRef.current = null;
    }
    
    if (phoneReminderTimerRef.current) {
      clearTimeout(phoneReminderTimerRef.current);
      phoneReminderTimerRef.current = null;
    }
    
    // Initial state: showing hadith (not phone reminder)
    setShowPhoneReminder(false);
    
    // Function to handle the complete cycle
    const startCycle = () => {
      // Phase 1: Show hadith for 2 minutes (120000ms)
      console.log("Showing hadith for 2 minutes");
      setShowPhoneReminder(false);
      
      // After 2 minutes, start Phase 2: Show phone reminder
      cycleTimerRef.current = setTimeout(() => {
        if (!isMounted.current) return;
        
        console.log("Showing phone reminder for 30 seconds");
        setShowPhoneReminder(true);
        
        // After 30 seconds (30000ms), go back to hadith
        phoneReminderTimerRef.current = setTimeout(() => {
          if (!isMounted.current) return;
          
          console.log("Phone reminder timeout completed, going back to hadith");
          startCycle(); // Continue the cycle
        }, 30000);
      }, 120000);
    };
    
    // Start the initial cycle
    startCycle();
    
    // Clean up timers when component unmounts or dependencies change
    return () => {
      console.log("Cleaning up hadith cycling timers");
      if (cycleTimerRef.current) {
        clearTimeout(cycleTimerRef.current);
        cycleTimerRef.current = null;
      }
      if (phoneReminderTimerRef.current) {
        clearTimeout(phoneReminderTimerRef.current);
        phoneReminderTimerRef.current = null;
      }
    };
  }, []); 
  
  // Render the hadith content
  const renderHadith = () => (
    <>
      <h3 className="text-xl sm:text-2xl font-bold text-amber-800 mb-2 sm:mb-3 font-serif">Hadith</h3>
      
      <div className="mb-2 sm:mb-3 flex-grow overflow-hidden">
        <p className={`${isTV ? 'hadith-text' : 'text-sm sm:text-base'} text-amber-900/90 leading-relaxed`}>
          {displayedHadith.text}
        </p>
      </div>
      
      <div className="mt-auto">
        <p className="text-sm font-semibold text-amber-800 mb-1">Reference</p>
        <p className={`${isTV ? 'hadith-source' : 'text-xs sm:text-sm'} text-amber-900/80`}>
          {displayedHadith.source}
        </p>
      </div>
    </>
  );
  
  // Render the phone reminder content
  const renderPhoneReminder = () => (
    <div className="flex flex-col h-full justify-center items-center py-4 sm:py-5 animate-pulse-soft">
      <div className="bg-gradient-to-b from-amber-500/90 to-amber-400/90 p-4 rounded-full mb-4 shadow-lg">
        <Smartphone className={`${isTV ? 'h-12 w-12' : 'h-8 w-8 sm:h-10 sm:w-10'} text-white`} />
      </div>
      
      <h3 className={`${isTV ? 'text-2xl' : 'text-xl sm:text-2xl'} font-bold text-amber-800 mb-2 font-serif text-center bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 bg-clip-text text-transparent`}>
        Mobile Phone Reminder
      </h3>
      
      <div className="bg-gradient-to-r from-amber-100 to-amber-200 p-3 sm:p-4 rounded-xl shadow-md border border-amber-300/50 max-w-xs">
        <p className={`${isTV ? 'text-lg' : 'text-base sm:text-lg'} text-amber-800 text-center leading-relaxed`}>
          Please turn off your mobile phone while in the mosque as a sign of respect.
        </p>
      </div>
    </div>
  );
  
  return (
    <div className={`gold-border prayer-card rounded-xl p-3 sm:p-4 h-full animate-fade-in ${isTV ? 'hadith-container' : ''}`}>
      {showPhoneReminder ? renderPhoneReminder() : renderHadith()}
    </div>
  );
};

export default HadithDisplay;
