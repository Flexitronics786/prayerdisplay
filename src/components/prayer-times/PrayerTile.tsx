
import React from "react";
import { useTVDisplay } from "@/hooks/useTVDisplay";

interface PrayerTileProps {
  title: string;
  arabicTitle?: string;
  isActive: boolean;
  isNext: boolean;
  isTomorrow?: boolean;
  items: { label: string; time: string }[];
  headerClass: string;
}

export const PrayerTile: React.FC<PrayerTileProps> = ({
  title,
  arabicTitle,
  isActive,
  isNext,
  isTomorrow,
  items,
  headerClass,
}) => {
  const isTV = useTVDisplay();
  const showTomorrow = isTomorrow && !isNext && !isActive;

  return (
    <div
      className={`prayer-card rounded-xl overflow-hidden prayer-transition 
        ${isActive ? "active-prayer" : isNext ? "next-prayer" : ""}`}
    >
      <div className={`prayer-tile-header ${headerClass}`}>
        <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-2">
            <h3 className={`text-2xl sm:text-3xl font-extrabold text-black ${isTV ? "text-3xl" : ""}`}>
              {title}
            </h3>
            {showTomorrow && (
              <span className="text-[10px] sm:text-xs font-bold text-slate-700 bg-white/90 border border-slate-300 rounded-full px-2 py-0.5 uppercase tracking-wider shadow-sm">
                📅 Tomorrow
              </span>
            )}
          </div>
          {arabicTitle && (
            <div className={`text-2xl sm:text-4xl mt-0.5 font-bold text-black ${isTV ? "text-4xl" : ""}`} style={{ fontFamily: "'Amiri', serif" }}>
              {arabicTitle}
            </div>
          )}
        </div>
      </div>
      <div className="px-2 sm:px-4 py-2">
        {items.map((item, index) => (
          <div
            key={index}
            className={`flex justify-between items-center 
                ${index < items.length - 1 ? "mb-1 pb-1 border-b border-amber-100" : ""} 
                ${index === 1 && title === "Fajr" ? "pt-1" : ""}
                ${items.length > 2 ? "text-sm sm:text-base" : ""}
              `}
          >
            <span className="text-black text-base sm:text-lg font-bold">{item.label}:</span>
            <span
              className={`font-bold text-black text-xl sm:text-2xl clock-text ${isTV ? "tv-time-text" : ""
                }`}
            >
              {item.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
