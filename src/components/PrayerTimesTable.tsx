
import { PrayerTime } from "@/types";
import { convertTo12Hour } from "@/utils/dateUtils";
import { fetchAllPrayerTimes } from "@/services/dataService";
import { useState, useEffect } from "react";

interface PrayerTimesTableProps {
  prayerTimes: PrayerTime[];
}

const PrayerTimesTable = ({ prayerTimes }: PrayerTimesTableProps) => {
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
        ${isActive ? 'active-prayer border-mosque-accent/70' : 
          isNext ? 'next-prayer border-mosque-accent/50' : 'border-mosque-dark/10'}`}
      >
        <div className="text-center py-3 border-b border-mosque-dark/10 bg-mosque-dark/5">
          <h3 className="text-2xl font-bold text-mosque-dark">
            {title}
            {isActive && (
              <span className="ml-2 inline-block px-2 py-0.5 text-sm rounded-full bg-mosque-accent/30 text-mosque-dark">
                Current
              </span>
            )}
            {isNext && (
              <span className="ml-2 inline-block px-2 py-0.5 text-sm rounded-full bg-mosque-accent/20 text-mosque-dark/90">
                Next
              </span>
            )}
          </h3>
        </div>
        <div className="px-6 py-4">
          {items.map((item, index) => (
            <div key={index} className={`flex justify-between items-center 
              ${index < items.length - 1 ? 'mb-5' : ''} 
              ${index === 1 && title === "Fajr" ? 'pt-3 border-t border-dashed border-mosque-dark/10' : ''}
            `}>
              <span className="text-mosque-dark/80 text-lg">{item.label}:</span>
              <span className="font-medium text-mosque-dark text-xl clock-text">{item.time}</span>
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

  return (
    <div className="animate-scale-in">
      <div className="mb-6">
        <h3 className="text-3xl font-bold text-mosque-dark font-serif">Prayer Times</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              time: getZuhrStart()
            },
            { 
              label: "Jamat", 
              time: getZuhrJamat()
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
              time: getAsrStart()
            },
            { 
              label: "Jamat", 
              time: getAsrJamat()
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
              time: getMaghribTime()
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
          ]
        )}
      </div>
    </div>
  );
};

export default PrayerTimesTable;
