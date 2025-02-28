
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

  // Group prayer times by category for layout purposes
  const mainPrayers = sortedPrayerTimes.filter(prayer => 
    ['Fajr', 'Zuhr', 'Asr', 'Maghrib', 'Isha'].includes(prayer.name)
  );

  // Get status labels
  const getStatusLabel = (prayer: PrayerTime) => {
    if (prayer.isActive) return "Current";
    if (prayer.isNext) return "Next";
    return "";
  };

  return (
    <div className="prayer-card gold-border rounded-xl p-3 sm:p-4 animate-fade-in">
      <h3 className="text-2xl font-bold text-amber-800 mb-4 text-center font-serif">
        Prayer Times
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {mainPrayers.map((prayer) => (
          <div
            key={prayer.id}
            className="prayer-tile bg-white border border-amber-100 rounded-lg overflow-hidden"
          >
            <div className={`prayer-header ${prayer.name.toLowerCase()}-header p-2 text-center text-white font-medium`}>
              {prayer.name}
              {getStatusLabel(prayer) && (
                <span className="ml-2 inline-block px-2 py-0.5 text-xs rounded-full bg-white/20">
                  {getStatusLabel(prayer)}
                </span>
              )}
            </div>
            
            <div className="p-3">
              {prayer.name === 'Fajr' && (
                <>
                  <div className="flex justify-between py-1">
                    <span className="text-amber-700">Start:</span>
                    <span className="font-medium">{prayer.time}</span>
                  </div>
                  {prayer.iqamahTime && (
                    <div className="flex justify-between py-1">
                      <span className="text-amber-700">Jamat:</span>
                      <span className="font-medium">{prayer.iqamahTime}</span>
                    </div>
                  )}
                  {/* Add sunrise time if available */}
                  {sortedPrayerTimes.find(p => p.name === 'Sunrise')?.time && (
                    <div className="flex justify-between py-1">
                      <span className="text-amber-700">Sunrise:</span>
                      <span className="font-medium">
                        {sortedPrayerTimes.find(p => p.name === 'Sunrise')?.time}
                      </span>
                    </div>
                  )}
                </>
              )}
              
              {prayer.name === 'Zuhr' && (
                <>
                  <div className="flex justify-between py-1">
                    <span className="text-amber-700">Start:</span>
                    <span className="font-medium">{prayer.time}</span>
                  </div>
                  {prayer.iqamahTime && (
                    <div className="flex justify-between py-1">
                      <span className="text-amber-700">Jamat:</span>
                      <span className="font-medium">{prayer.iqamahTime}</span>
                    </div>
                  )}
                </>
              )}
              
              {prayer.name === 'Asr' && (
                <>
                  <div className="flex justify-between py-1">
                    <span className="text-amber-700">Start:</span>
                    <span className="font-medium">{prayer.time}</span>
                  </div>
                  {prayer.iqamahTime && (
                    <div className="flex justify-between py-1">
                      <span className="text-amber-700">Jamat:</span>
                      <span className="font-medium">{prayer.iqamahTime}</span>
                    </div>
                  )}
                </>
              )}
              
              {prayer.name === 'Maghrib' && (
                <div className="flex justify-between py-1">
                  <span className="text-amber-700">Iftar:</span>
                  <span className="font-medium">{prayer.time}</span>
                </div>
              )}
              
              {prayer.name === 'Isha' && (
                <>
                  <div className="flex justify-between py-1">
                    <span className="text-amber-700">Start:</span>
                    <span className="font-medium">{prayer.time}</span>
                  </div>
                  {prayer.iqamahTime && (
                    <div className="flex justify-between py-1">
                      <span className="text-amber-700">1st Jamat:</span>
                      <span className="font-medium">{prayer.iqamahTime}</span>
                    </div>
                  )}
                  {/* If we have second jamat time for Isha */}
                  {sortedPrayerTimes.find(p => p.name === 'Isha 2nd')?.time && (
                    <div className="flex justify-between py-1">
                      <span className="text-amber-700">2nd Jamat:</span>
                      <span className="font-medium">
                        {sortedPrayerTimes.find(p => p.name === 'Isha 2nd')?.time}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PrayerTimesTable;
