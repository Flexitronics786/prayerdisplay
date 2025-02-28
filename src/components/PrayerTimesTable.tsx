
import { PrayerTime } from "@/types";
import { convertTo12Hour } from "@/utils/dateUtils";
import { fetchAllPrayerTimes } from "@/services/dataService";
import { useState, useEffect } from "react";

interface PrayerTimesTableProps {
  prayerTimes: PrayerTime[];
  compactView?: boolean;
}

const PrayerTimesTable = ({ prayerTimes, compactView = false }: PrayerTimesTableProps) => {
  const [detailedTimes, setDetailedTimes] = useState<any>(null);

  useEffect(() => {
    const loadDetailedTimes = async () => {
      try {
        const times = await fetchAllPrayerTimes();
        const today = new Date().toISOString().split('T')[0];
        const todayTimes = times.find(t => t.date === today);
        if (todayTimes) {
          setDetailedTimes(todayTimes);
        }
      } catch (error) {
        console.error("Error loading detailed prayer times:", error);
      }
    };

    loadDetailedTimes();
  }, []);

  // Group prayer times by name for display in tiles
  const getPrayerDetails = (name: string) => {
    const prayers = prayerTimes.filter(prayer => 
      prayer.name.toLowerCase() === name.toLowerCase() || 
      (name === "Zuhr" && prayer.name === "Dhuhr") ||
      (name === "Fajr" && prayer.name === "Sunrise")
    );
    
    // If we have detailed times, apply the custom rules for when prayers end
    let isActive = prayers.some(p => p.isActive);
    let isNext = prayers.some(p => p.isNext);

    // Apply custom rules for when prayers are active
    if (detailedTimes && isActive) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      if (name === "Fajr" && detailedTimes.sunrise && currentTime >= detailedTimes.sunrise) {
        // Fajr ends at Sunrise
        isActive = false;
      } else if (name === "Zuhr" && detailedTimes.asr_start && currentTime >= detailedTimes.asr_start) {
        // Zuhr ends when Asr starts
        isActive = false;
      } else if (name === "Asr" && detailedTimes.maghrib_iftar && currentTime >= detailedTimes.maghrib_iftar) {
        // Asr ends when Maghrib starts
        isActive = false;
      } else if (name === "Maghrib" && detailedTimes.maghrib_iftar) {
        // Maghrib ends after 1 hour
        const maghribParts = detailedTimes.maghrib_iftar.split(':');
        if (maghribParts.length >= 2) {
          const maghribHour = parseInt(maghribParts[0], 10);
          const maghribMinute = parseInt(maghribParts[1], 10);
          
          // Calculate 1 hour after Maghrib
          let oneHourLaterHour = maghribHour + 1;
          if (oneHourLaterHour >= 24) oneHourLaterHour -= 24;
          
          const oneHourLater = `${oneHourLaterHour.toString().padStart(2, '0')}:${maghribMinute.toString().padStart(2, '0')}`;
          
          if (currentTime >= oneHourLater) {
            isActive = false;
          }
        }
      } else if (name === "Isha" && detailedTimes.fajr_jamat) {
        // Isha ends when Fajr starts
        const nextDayFajr = detailedTimes.fajr_jamat;
        
        // If current time is past midnight but before Fajr
        const hour = now.getHours();
        if (hour < 12) { // Morning hours, check if Isha should still be active
          const fajrParts = nextDayFajr.split(':');
          if (fajrParts.length >= 2) {
            const fajrHour = parseInt(fajrParts[0], 10);
            const fajrMinute = parseInt(fajrParts[1], 10);
            
            if (hour > fajrHour || (hour === fajrHour && now.getMinutes() >= fajrMinute)) {
              isActive = false;
            }
          }
        }
      }
    }
    
    return {
      isActive,
      isNext,
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
    items: { label: string, time: string }[],
    headerClass: string
  ) => {
    return (
      <div className={`prayer-card rounded-xl overflow-hidden prayer-transition 
        ${isActive ? 'active-prayer' : 
          isNext ? 'next-prayer' : ''}`}
      >
        <div className={`prayer-tile-header ${headerClass}`}>
          <h3 className="text-xl font-bold">
            {title}
            {isActive && (
              <span className="ml-2 inline-block px-2 py-0.5 text-xs rounded-full bg-white/30 text-white">
                Current
              </span>
            )}
            {isNext && (
              <span className="ml-2 inline-block px-2 py-0.5 text-xs rounded-full bg-white/20 text-white/90">
                Next
              </span>
            )}
          </h3>
        </div>
        <div className="px-4 py-2">
          {items.map((item, index) => (
            <div key={index} className={`flex justify-between items-center 
              ${index < items.length - 1 ? 'mb-2 pb-1 border-b border-amber-100' : ''} 
              ${index === 1 && title === "Fajr" ? 'pt-1' : ''}
            `}>
              <span className="text-amber-900 text-base font-medium">{item.label}:</span>
              <span className="font-bold text-amber-950 text-lg clock-text">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // If we have detailed times, use them; otherwise use the simplified times
  const getFajrStart = () => {
    if (detailedTimes && detailedTimes.sehri_end) {
      return convertTo12Hour(detailedTimes.sehri_end);
    }
    return getPrayerTime("Fajr") ? convertTo12Hour(getPrayerTime("Fajr")!.time) : "";
  };

  const getFajrJamat = () => {
    if (detailedTimes && detailedTimes.fajr_jamat) {
      return convertTo12Hour(detailedTimes.fajr_jamat);
    }
    return getPrayerTime("Fajr") ? convertTo12Hour(getPrayerTime("Fajr")!.time) : "";
  };

  const getZuhrStart = () => {
    if (detailedTimes && detailedTimes.zuhr_start) {
      return convertTo12Hour(detailedTimes.zuhr_start);
    }
    return getPrayerTime("Zuhr") ? convertTo12Hour(getPrayerTime("Zuhr")!.time) : "";
  };

  const getZuhrJamat = () => {
    if (detailedTimes && detailedTimes.zuhr_jamat) {
      return convertTo12Hour(detailedTimes.zuhr_jamat);
    }
    return getPrayerTime("Zuhr") ? convertTo12Hour(getPrayerTime("Zuhr")!.time) : "";
  };

  const getAsrStart = () => {
    if (detailedTimes && detailedTimes.asr_start) {
      return convertTo12Hour(detailedTimes.asr_start);
    }
    return getPrayerTime("Asr") ? convertTo12Hour(getPrayerTime("Asr")!.time) : "";
  };

  const getAsrJamat = () => {
    if (detailedTimes && detailedTimes.asr_jamat) {
      return convertTo12Hour(detailedTimes.asr_jamat);
    }
    return getPrayerTime("Asr") ? convertTo12Hour(getPrayerTime("Asr")!.time) : "";
  };

  const getMaghribTime = () => {
    if (detailedTimes && detailedTimes.maghrib_iftar) {
      return convertTo12Hour(detailedTimes.maghrib_iftar);
    }
    return getPrayerTime("Maghrib") ? convertTo12Hour(getPrayerTime("Maghrib")!.time) : "";
  };

  const getIshaStart = () => {
    if (detailedTimes && detailedTimes.isha_start) {
      return convertTo12Hour(detailedTimes.isha_start);
    }
    return getPrayerTime("Isha") ? convertTo12Hour(getPrayerTime("Isha")!.time) : "";
  };

  const getIshaFirstJamat = () => {
    if (detailedTimes && detailedTimes.isha_first_jamat) {
      return convertTo12Hour(detailedTimes.isha_first_jamat);
    }
    return getPrayerTime("Isha") ? convertTo12Hour(getPrayerTime("Isha")!.time) : "";
  };

  const getIshaSecondJamat = () => {
    if (detailedTimes && detailedTimes.isha_second_jamat) {
      return convertTo12Hour(detailedTimes.isha_second_jamat);
    }
    return "";
  };

  const getSunriseFromDetailedTimes = () => {
    if (detailedTimes && detailedTimes.sunrise) {
      return convertTo12Hour(detailedTimes.sunrise);
    }
    return getSunriseTime();
  };

  // Determine if it's Friday (for Jummah)
  const today = new Date();
  const isFriday = today.getDay() === 5; // 5 represents Friday (0 is Sunday, 1 is Monday, etc.)

  return (
    <div className="animate-scale-in">
      <div className="mb-3">
        <h3 className="text-2xl font-bold text-amber-800 font-serif">Prayer Times</h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Fajr Tile */}
        {renderPrayerTile(
          "Fajr", 
          fajrDetails.isActive, 
          fajrDetails.isNext,
          [
            { 
              label: "Start", 
              time: getFajrStart()
            },
            { 
              label: "Jamat", 
              time: getFajrJamat()
            },
            { 
              label: "Sunrise", 
              time: getSunriseFromDetailedTimes()
            }
          ],
          "fajr-header"
        )}

        {/* Zuhr Tile */}
        {renderPrayerTile(
          "Zuhr", 
          zuhrDetails.isActive, 
          zuhrDetails.isNext,
          [
            { 
              label: "Start", 
              time: getZuhrStart()
            },
            { 
              label: "Jamat", 
              time: getZuhrJamat()
            }
          ],
          "zuhr-header"
        )}

        {/* Asr Tile */}
        {renderPrayerTile(
          "Asr", 
          asrDetails.isActive, 
          asrDetails.isNext,
          [
            { 
              label: "Start", 
              time: getAsrStart()
            },
            { 
              label: "Jamat", 
              time: getAsrJamat()
            }
          ],
          "asr-header"
        )}

        {/* Maghrib Tile */}
        {renderPrayerTile(
          "Maghrib", 
          maghribDetails.isActive, 
          maghribDetails.isNext,
          [
            { 
              label: "Iftar", 
              time: getMaghribTime()
            }
          ],
          "maghrib-header"
        )}

        {/* Isha Tile */}
        {renderPrayerTile(
          "Isha", 
          ishaDetails.isActive, 
          ishaDetails.isNext,
          [
            { 
              label: "Start", 
              time: getIshaStart()
            },
            { 
              label: "1st Jamat", 
              time: getIshaFirstJamat()
            },
            { 
              label: "2nd Jamat", 
              time: getIshaSecondJamat()
            }
          ],
          "isha-header"
        )}

        {/* Jummah Tile (Friday Prayer) */}
        {renderPrayerTile(
          "Jummah", 
          false, // Never active or next since this is a special prayer
          false,
          [
            { 
              label: "Khutbah", 
              time: getZuhrStart() // Same as Zuhr start time
            },
            { 
              label: "Jamat", 
              time: getZuhrJamat() // Same as Zuhr jamat time
            }
          ],
          "zuhr-header" // Use the same styling as Zuhr
        )}
      </div>
    </div>
  );
};

export default PrayerTimesTable;
