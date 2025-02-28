
import React, { useState, useEffect } from "react";
import { Hadith, PrayerTime } from "@/types";
import { Smartphone } from "lucide-react";

interface HadithDisplayProps {
  hadith: Hadith;
  nextPrayer?: PrayerTime | null;
}

const HadithDisplay: React.FC<HadithDisplayProps> = ({ hadith, nextPrayer }) => {
  const [showPhoneReminder, setShowPhoneReminder] = useState(false);
  const [countdown, setCountdown] = useState<string>("");
  
  // Toggle between hadith and reminder every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setShowPhoneReminder(prev => !prev);
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, []);
  
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
        <p className="text-base text-amber-900/90 leading-relaxed">{hadith.text}</p>
      </div>
      
      <div>
        <p className="text-base font-semibold text-amber-800 mb-1">Reference</p>
        <p className="text-sm text-amber-900/80">{hadith.source}</p>
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
