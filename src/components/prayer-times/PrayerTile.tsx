
import React from "react";
import { useTVDisplay } from "@/hooks/useTVDisplay";

interface PrayerTileProps {
  title: string;
  isActive: boolean;
  isNext: boolean;
  items: { label: string; time: string }[];
  headerClass: string;
}

export const PrayerTile: React.FC<PrayerTileProps> = ({
  title,
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
        <h3 className={`text-xl sm:text-2xl font-bold ${isTV ? "text-2xl" : ""}`}>
          {title}
        </h3>
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
            <span className="text-amber-900 text-base sm:text-lg font-bold">{item.label}:</span>
            <span
              className={`font-bold text-amber-950 text-xl sm:text-2xl clock-text ${
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
