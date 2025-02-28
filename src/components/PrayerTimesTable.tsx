
import { PrayerTime } from "@/types";
import { convertTo12Hour } from "@/utils/dateUtils";

interface PrayerTimesTableProps {
  prayerTimes: PrayerTime[];
}

const PrayerTimesTable = ({ prayerTimes }: PrayerTimesTableProps) => {
  // Group prayer times by name for display in tiles
  const getPrayerDetails = (name: string) => {
    const prayers = prayerTimes.filter(prayer => 
      prayer.name.toLowerCase() === name.toLowerCase() || 
      (name === "Zuhr" && prayer.name === "Dhuhr") ||
      (name === "Fajr" && prayer.name === "Sunrise")
    );
    
    return {
      isActive: prayers.some(p => p.isActive),
      isNext: prayers.some(p => p.isNext),
      times: prayers
    };
  };

  const fajrDetails = getPrayerDetails("Fajr");
  const zuhrDetails = getPrayerDetails("Zuhr");
  const asrDetails = getPrayerDetails("Asr");
  const maghribDetails = getPrayerDetails("Maghrib");
  const ishaDetails = getPrayerDetails("Isha");

  // Function to get details for a specific prayer
  const getPrayerTime = (name: string) => {
    return prayerTimes.find(prayer => 
      prayer.name.toLowerCase() === name.toLowerCase() || 
      (name === "Zuhr" && prayer.name === "Dhuhr")
    );
  };

  // Function to get sunrise time
  const getSunriseTime = () => {
    const sunrise = prayerTimes.find(prayer => prayer.name === "Sunrise");
    return sunrise ? convertTo12Hour(sunrise.time) : "";
  };

  const renderPrayerTile = (
    title: string, 
    isActive: boolean, 
    isNext: boolean,
    items: { label: string, time: string }[]
  ) => {
    return (
      <div className={`glass-card rounded-xl overflow-hidden prayer-transition 
        ${isActive ? 'active-prayer border-mosque-accent/50' : 
          isNext ? 'next-prayer border-mosque-accent/30' : 'border-white/10'}`}
      >
        <div className="text-center py-3 border-b border-white/10">
          <h3 className="text-xl font-bold text-mosque-light">
            {title}
            {isActive && (
              <span className="ml-2 inline-block px-2 py-0.5 text-xs rounded-full bg-mosque-accent/30 text-mosque-light">
                Current
              </span>
            )}
            {isNext && (
              <span className="ml-2 inline-block px-2 py-0.5 text-xs rounded-full bg-mosque-accent/20 text-mosque-light/90">
                Next
              </span>
            )}
          </h3>
        </div>
        <div className="px-6 py-4">
          {items.map((item, index) => (
            <div key={index} className={`flex justify-between items-center 
              ${index < items.length - 1 ? 'mb-4' : ''} 
              ${index === 1 && title === "Fajr" ? 'pt-3 border-t border-dashed border-white/10' : ''}
            `}>
              <span className="text-mosque-light/80">{item.label}:</span>
              <span className="font-medium text-white clock-text">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="animate-scale-in">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white">Prayer Times</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Fajr Tile */}
        {renderPrayerTile(
          "Fajr", 
          fajrDetails.isActive, 
          fajrDetails.isNext,
          [
            { 
              label: "Start", 
              time: getPrayerTime("Fajr") ? convertTo12Hour(getPrayerTime("Fajr")!.time) : "" 
            },
            { 
              label: "Jamat", 
              time: getPrayerTime("Fajr") ? convertTo12Hour(getPrayerTime("Fajr")!.time) : "" 
            },
            { 
              label: "Sunrise", 
              time: getSunriseTime() 
            }
          ]
        )}

        {/* Zuhr Tile */}
        {renderPrayerTile(
          "Zuhr", 
          zuhrDetails.isActive, 
          zuhrDetails.isNext,
          [
            { 
              label: "Start", 
              time: getPrayerTime("Zuhr") ? convertTo12Hour(getPrayerTime("Zuhr")!.time) : "" 
            },
            { 
              label: "Jamat", 
              time: getPrayerTime("Zuhr") ? convertTo12Hour(getPrayerTime("Zuhr")!.time) : "" 
            }
          ]
        )}

        {/* Asr Tile */}
        {renderPrayerTile(
          "Asr", 
          asrDetails.isActive, 
          asrDetails.isNext,
          [
            { 
              label: "Start", 
              time: getPrayerTime("Asr") ? convertTo12Hour(getPrayerTime("Asr")!.time) : "" 
            },
            { 
              label: "Jamat", 
              time: getPrayerTime("Asr") ? convertTo12Hour(getPrayerTime("Asr")!.time) : "" 
            }
          ]
        )}

        {/* Maghrib Tile */}
        {renderPrayerTile(
          "Maghrib", 
          maghribDetails.isActive, 
          maghribDetails.isNext,
          [
            { 
              label: "Azan", 
              time: getPrayerTime("Maghrib") ? convertTo12Hour(getPrayerTime("Maghrib")!.time) : "" 
            }
          ]
        )}

        {/* Isha Tile */}
        {renderPrayerTile(
          "Isha", 
          ishaDetails.isActive, 
          ishaDetails.isNext,
          [
            { 
              label: "Start", 
              time: getPrayerTime("Isha") ? convertTo12Hour(getPrayerTime("Isha")!.time) : "" 
            },
            { 
              label: "Jamat", 
              time: getPrayerTime("Isha") ? convertTo12Hour(getPrayerTime("Isha")!.time) : "" 
            }
          ]
        )}
      </div>
    </div>
  );
};

export default PrayerTimesTable;
