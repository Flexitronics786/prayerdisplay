
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
  
  // References to track component mount status and timers
  const isMounted = useRef(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const reminderTimerRef = useRef<NodeJS.Timeout | null>(null);
  
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
  
  // Setup cycling system - completely rewritten
  useEffect(() => {
    // Initialize with provided hadith
    setDisplayedHadith(hadith);
    console.log(`Initial hadith displayed: ${hadith.id}`);
    
    // Function to move to next hadith
    const moveToNextHadith = () => {
      if (activeHadiths.length <= 1) {
        console.log("Only one hadith available, not cycling");
        return;
      }
      
      // Calculate next index
      const nextIndex = (currentHadithIndex + 1) % activeHadiths.length;
      console.log(`Moving to next hadith: index ${currentHadithIndex} → ${nextIndex}`);
      
      // Update state with next hadith
      setCurrentHadithIndex(nextIndex);
      const nextHadith = convertToHadith(activeHadiths[nextIndex]);
      setDisplayedHadith(nextHadith);
      
      console.log(`Next hadith: ${nextHadith.id} - ${nextHadith.text.substring(0, 30)}...`);
    };
    
    // Function to start a new cycle
    const startNewCycle = () => {
      // Clear any existing timers
      if (timerRef.current) clearTimeout(timerRef.current);
      if (reminderTimerRef.current) clearTimeout(reminderTimerRef.current);
      
      // First show hadith for 2 minutes (120000 ms)
      console.log("Starting new cycle - showing hadith for 2 minutes");
      
      // After 2 minutes, show the phone reminder
      timerRef.current = setTimeout(() => {
        if (!isMounted.current) return;
        
        setShowPhoneReminder(true);
        console.log("Showing phone reminder for 30 seconds");
        
        // After 30 seconds of showing the reminder, move to next hadith
        reminderTimerRef.current = setTimeout(() => {
          if (!isMounted.current) return;
          
          setShowPhoneReminder(false);
          moveToNextHadith();
          console.log("Phone reminder done, moved to next hadith");
          
          // Start the cycle again
          startNewCycle();
        }, 30000); // 30 seconds
      }, 120000); // 2 minutes
    };
    
    // Start the initial cycle
    startNewCycle();
    
    // Clean up all timers when unmounting or when dependencies change
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (reminderTimerRef.current) clearTimeout(reminderTimerRef.current);
      console.log("Cleaned up hadith cycling timers");
    };
  }, [hadith, activeHadiths, currentHadithIndex]);
  
  // Render the hadith content
  const renderHadith = () => (
    <>
      <h3 className="text-2xl font-bold text-amber-800 mb-4 font-serif">Hadith</h3>
      
      <div className="mb-4">
        <p className="text-base text-amber-900/90 leading-relaxed">{displayedHadith.text}</p>
      </div>
      
      <div>
        <p className="text-base font-semibold text-amber-800 mb-1">Reference</p>
        <p className="text-sm text-amber-900/80">{displayedHadith.source}</p>
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
