
import React from "react";
import { useTVDisplay } from "@/hooks/useTVDisplay";

interface PrayerTileProps {
  title: string;
  arabicTitle?: string;
  isActive: boolean;
  isNext: boolean;
  items: { label: string; time: string }[];
  headerClass: string;
}

export const PrayerTile: React.FC<PrayerTileProps> = ({
  title,
  arabicTitle,
  isActive,
  isNext,
  items,
  headerClass,
}) => {
  const isTV = useTVDisplay();

  return (
    <div
      className={`prayer-card rounded-xl overflow-hidden prayer-transition 
        ${isActive ? "active-prayer" : isNext ? "next-prayer" : ""}`}
    >
      <div className={`prayer-tile-header ${headerClass}`}>
        <div className="flex justify-between items-center px-2">
          <h3 className={`text-2xl sm:text-3xl font-extrabold text-black ${isTV ? "text-3xl" : ""}`}>
            {title}
          </h3>
          {arabicTitle && (
            <div className={`text-2xl sm:text-4xl mt-0.5 font-bold text-black ${isTV ? "text-4xl" : ""}`}>
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
              ${index < items.length - 1 ? "mb-1 sm:mb-2 pb-1 border-b border-amber-100" : ""} 
              ${index === 1 && title === "Fajr" ? "pt-1" : ""}
            `}
          >
            <span className="text-black text-base sm:text-lg font-bold">{item.label}:</span>
            <span
              className={`font-bold text-black text-xl sm:text-2xl clock-text ${
                isTV ? "tv-time-text" : ""
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
