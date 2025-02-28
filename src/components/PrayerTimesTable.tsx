
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
  // Function to get the class names based on the prayer state
  const getRowClasses = (prayer: PrayerTime) => {
    const baseClasses = "text-center md:text-left transition-colors ";
    
    if (prayer.isActive) {
      return baseClasses + "bg-amber-100 border-amber-300";
    }
    if (prayer.isNext) {
      return baseClasses + "bg-amber-50 border-amber-200";
    }
    return baseClasses + "hover:bg-amber-50/50";
  };
  
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

  return (
    <div className="prayer-card gold-border rounded-xl p-3 sm:p-4 animate-fade-in">
      <h3 className="text-2xl font-bold text-amber-800 mb-4 text-center font-serif">
        Prayer Times
      </h3>

      <div className="overflow-hidden rounded-lg border border-amber-200">
        <table className="min-w-full divide-y divide-amber-200">
          <thead className="bg-amber-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-amber-800">
                Prayer
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-amber-800">
                {compactView ? "Time" : "Adhan"}
              </th>
              {!compactView && (
                <th className="px-4 py-3 text-center text-sm font-semibold text-amber-800">
                  Iqamah
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-amber-100">
            {sortedPrayerTimes.map((prayer) => (
              <tr 
                key={prayer.id} 
                className={getRowClasses(prayer)}
                style={prayer.style}
              >
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-amber-900">
                  {prayer.name}
                  {prayer.isActive && (
                    <span className="ml-2 inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                  )}
                  {prayer.isNext && (
                    <span className="ml-2 inline-block w-2 h-2 bg-amber-400 rounded-full"></span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-amber-800 text-center">
                  {prayer.time}
                </td>
                {!compactView && (
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-amber-800 text-center">
                    {prayer.iqamahTime || "-"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PrayerTimesTable;
