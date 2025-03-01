import { PrayerTime } from "@/types";
import { convertTo12Hour } from "@/utils/dateUtils";
import { fetchAllPrayerTimes } from "@/services/dataService";
import { useState, useEffect } from "react";
import { useTVDisplay } from "@/hooks/useTVDisplay";

interface PrayerTimesTableProps {
  prayerTimes: PrayerTime[];
  compactView?: boolean;
}

const PrayerTimesTable = ({ prayerTimes, compactView = false }: PrayerTimesTableProps) => {
  const [detailedTimes, setDetailedTimes] = useState<any>(null);
  const isTV = useTVDisplay();

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

  const getPrayerDetails = (name: string) => {
    const prayers = prayerTimes.filter(prayer => 
      prayer.name.toLowerCase() === name.toLowerCase() || 
      (name === "Zuhr" && prayer.name === "Dhuhr") ||
      (name === "Fajr" && prayer.name === "Sunrise")
    );
    
    let isActive = prayers.some(p => p.isActive);
    let isNext = prayers.some(p => p.isNext);
    
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

  const getPrayerTime = (name: string) => {
    return prayerTimes.find(prayer => 
      prayer.name.toLowerCase() === name.toLowerCase() || 
      (name === "Zuhr" && prayer.name === "Dhuhr")
    );
  };

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
          <h3 className={`text-xl sm:text-2xl font-bold ${isTV ? 'text-2xl' : ''}`}>
            {title}
          </h3>
        </div>
        <div className="px-2 sm:px-4 py-2">
          {items.map((item, index) => (
            <div key={index} className={`flex justify-between items-center 
              ${index < items.length - 1 ? 'mb-1 sm:mb-2 pb-1 border-b border-amber-100' : ''} 
              ${index === 1 && title === "Fajr" ? 'pt-1' : ''}
            `}>
              <span className="text-amber-900 text-base sm:text-lg font-bold">{item.label}:</span>
              <span className={`font-bold text-amber-950 text-xl sm:text-2xl clock-text ${isTV ? 'tv-time-text' : ''}`}>
                {item.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

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

  const getJummahKhutbahTime = () => {
    const jamatTime = getZuhrJamat();
    if (!jamatTime) return "";
    
    const [time, period] = jamatTime.split(' ');
    const [hours, minutes] = time.split(':').map(part => parseInt(part, 10));
    
    const date = new Date();
    let hour = hours;
    
    if (period === 'PM' && hour < 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    
    date.setHours(hour, minutes);
    
    date.setMinutes(date.getMinutes() - 10);
    
    let khutbahHour = date.getHours();
    const khutbahMinutes = date.getMinutes();
    let ampm = 'AM';
    
    if (khutbahHour >= 12) {
      ampm = 'PM';
      if (khutbahHour > 12) khutbahHour -= 12;
    }
    if (khutbahHour === 0) khutbahHour = 12;
    
    return `${khutbahHour}:${khutbahMinutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const today = new Date();
  const isFriday = today.getDay() === 5;

  return (
    <div className="animate-scale-in">
      <div className="mb-2 sm:mb-3">
        <h3 className="text-2xl sm:text-3xl font-bold text-amber-800 font-serif">Prayer Times</h3>
      </div>

      <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 ${isTV ? 'grid-cols-3 gap-3 tv-prayer-grid' : 'mobile-prayer-grid'}`}>
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

        {renderPrayerTile(
          "Jummah", 
          false,
          false,
          [
            { 
              label: "Start", 
              time: getZuhrStart()
            },
            { 
              label: "Khutbah", 
              time: getJummahKhutbahTime()
            },
            { 
              label: "Jamat", 
              time: getZuhrJamat()
            }
          ],
          "jummah-header"
        )}
      </div>
    </div>
  );
};

export default PrayerTimesTable;
