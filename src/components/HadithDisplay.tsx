
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
  const [activeHadiths, setActiveHadiths] = useState<HadithCollectionItem[]>([]);
  const [currentHadithIndex, setCurrentHadithIndex] = useState(0);
  const [displayedHadith, setDisplayedHadith] = useState<Hadith>(hadith);
  const [cycleCount, setCycleCount] = useState(0);
  
  // References to track component mount status and timers
  const isMounted = useRef(true);
  const cycleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const phoneReminderTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Check if we're in TV display mode
  const isTV = window.innerWidth >= 1280 && 
               (window.innerHeight < 900 || window.innerWidth >= 1920 || 
                navigator.userAgent.toLowerCase().includes('silk') || 
                navigator.userAgent.toLowerCase().includes('firetv'));
  
  // Load all active hadiths on component mount
  useEffect(() => {
    const loadHadiths = async () => {
      try {
        console.log("Fetching hadith collection...");
        const collection = await fetchHadithCollection();
        const filtered = collection.filter(h => h.is_active);
        
        if (filtered.length > 0 && isMounted.current) {
          setActiveHadiths(filtered);
          console.log(`Loaded ${filtered.length} active hadiths:`, filtered.map(h => h.id));
          
          // Set initial index
          const initialIndex = filtered.findIndex(h => h.id === hadith.id);
          if (initialIndex !== -1) {
            setCurrentHadithIndex(initialIndex);
            console.log(`Starting with hadith index: ${initialIndex}, ID: ${hadith.id}`);
          }
        } else {
          console.warn("No active hadiths found in collection");
        }
      } catch (error) {
        console.error("Error loading hadith collection:", error);
      }
    };
    
    loadHadiths();
    
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
  }, [hadith.id]);
  
  // Helper function to convert HadithCollectionItem to Hadith type
  const convertToHadith = (item: HadithCollectionItem): Hadith => {
    return {
      id: item.id,
      text: item.text,
      source: item.source,
      lastUpdated: item.created_at || new Date().toISOString()
    };
  };
  
  // Move to the next hadith in the collection
  const moveToNextHadith = () => {
    if (activeHadiths.length <= 1) {
      console.log("Only one hadith available, not cycling");
      return;
    }
    
    setCurrentHadithIndex(prevIndex => {
      // Calculate next index with proper wrapping
      const nextIndex = (prevIndex + 1) % activeHadiths.length;
      console.log(`Moving to next hadith: index ${prevIndex} → ${nextIndex}`);
      
      // Update displayed hadith
      const nextHadith = convertToHadith(activeHadiths[nextIndex]);
      setDisplayedHadith(nextHadith);
      console.log(`Next hadith displayed: ${nextHadith.id}`);
      
      // Track if we've completed a full cycle
      if (nextIndex === 0) {
        setCycleCount(prev => prev + 1);
        console.log("Completed full cycle through all hadiths");
      }
      
      return nextIndex;
    });
  };
  
  // Setup cycling system
  useEffect(() => {
    // Only set up cycling if we have active hadiths
    if (activeHadiths.length === 0) return;
    
    console.log("Setting up hadith cycling mechanism");
    
    // Initialize with the current hadith
    if (activeHadiths[currentHadithIndex]) {
      const initialHadith = convertToHadith(activeHadiths[currentHadithIndex]);
      setDisplayedHadith(initialHadith);
      console.log(`Initial hadith displayed: ${initialHadith.id}`);
    }
    
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
        
        // After 30 seconds (30000ms), check if all hadiths have been shown before restarting cycle
        phoneReminderTimerRef.current = setTimeout(() => {
          if (!isMounted.current) return;
          
          console.log("Phone reminder timeout completed, moving to next hadith");
          
          // Calculate if we've shown all hadiths at least once
          const nextIndex = (currentHadithIndex + 1) % activeHadiths.length;
          const willCompleteFullCycle = nextIndex === 0;
          
          moveToNextHadith();
          
          // Check if we need to restart the cycle or continue
          if (willCompleteFullCycle) {
            console.log("We've shown all hadiths at least once, completing cycle");
          }
          
          startCycle(); // Continue the cycle with the next hadith
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
  }, [activeHadiths, currentHadithIndex]); // Re-run when either activeHadiths or currentHadithIndex changes
  
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
