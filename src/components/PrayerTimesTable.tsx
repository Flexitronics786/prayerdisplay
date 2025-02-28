
import React from "react";
import { PrayerTime } from "@/types";

interface PrayerTimesTableProps {
  prayerTimes: PrayerTime[];
  compactView?: boolean;
}

const PrayerTimesTable: React.FC<PrayerTimesTableProps> = ({ 
  prayerTimes, 
  compactView = false 
}) => {
  // Sort prayer times to ensure they're in the correct order
  const sortedPrayerTimes = [...prayerTimes].sort((a, b) => {
    // Use a map for ordering prayer names
    const order: Record<string, number> = {
      "Fajr": 1,
      "Sunrise": 2,
      "Zuhr": 3,
      "Jummah": 3.5, // Position Jummah after Zuhr
      "Asr": 4,
      "Maghrib": 5,
      "Isha": 6
    };
    
    // Get the order value, default to 100 for unknown prayers
    const orderA = order[a.name] || 100;
    const orderB = order[b.name] || 100;
    
    return orderA - orderB;
  });

  // Function to get appropriate classes for prayer tiles based on status
  const getTileClasses = (prayer: PrayerTime) => {
    const baseClasses = "flex flex-col justify-between p-4 rounded-lg transition-all";
    
    // Get prayer-specific header class
    let headerClass = "";
    if (prayer.name === "Fajr") headerClass = "fajr-header";
    else if (prayer.name === "Zuhr" || prayer.name === "Jummah") headerClass = "zuhr-header";
    else if (prayer.name === "Asr") headerClass = "asr-header";
    else if (prayer.name === "Maghrib") headerClass = "maghrib-header";
    else if (prayer.name === "Isha") headerClass = "isha-header";
    else headerClass = "bg-amber-100 text-amber-800 border-amber-200";
    
    // Add active/next classes
    if (prayer.isActive) {
      return `${baseClasses} active-prayer border border-amber-300 shadow-md`;
    }
    if (prayer.isNext) {
      return `${baseClasses} next-prayer border border-amber-200`;
    }
    
    return `${baseClasses} border border-amber-100 hover:bg-amber-50/50`;
  };

  return (
    <div className="prayer-card gold-border rounded-xl p-3 sm:p-4 animate-fade-in">
      <h3 className="text-2xl font-bold text-amber-800 mb-4 text-center font-serif">
        Prayer Times
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {sortedPrayerTimes.map((prayer) => (
          <div
            key={prayer.id}
            className={getTileClasses(prayer)}
            style={prayer.style}
          >
            <div className={`prayer-tile-header -mx-4 -mt-4 mb-2 rounded-t-lg ${prayer.name.toLowerCase()}-header`}>
              <h4 className="font-medium text-lg">
                {prayer.name}
                {prayer.isActive && (
                  <span className="ml-2 inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                )}
                {prayer.isNext && (
                  <span className="ml-2 inline-block w-2 h-2 bg-amber-400 rounded-full"></span>
                )}
              </h4>
            </div>
            
            <div className="flex-grow"></div>
            
            <div className="text-center">
              <div className="text-2xl font-bold tracking-wide clock-text">
                {prayer.time}
              </div>
              {!compactView && prayer.iqamahTime && (
                <div className="text-sm mt-1 text-amber-700">
                  Iqamah: {prayer.iqamahTime}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PrayerTimesTable;
