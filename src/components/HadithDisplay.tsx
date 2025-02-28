
import React from "react";
import { Hadith } from "@/types";

interface HadithDisplayProps {
  hadith: Hadith;
}

const HadithDisplay: React.FC<HadithDisplayProps> = ({ hadith }) => {
  // Format the date from lastUpdated
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return !isNaN(date.getTime()) 
        ? date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })
        : 'Date unavailable';
    } catch (error) {
      console.error("Error formatting date:", error);
      return 'Date unavailable';
    }
  };

  return (
    <div className="gold-border prayer-card rounded-xl p-4 h-full animate-fade-in">
      <h3 className="text-2xl font-bold text-amber-800 mb-4 font-serif">Hadith of the Day</h3>
      
      <div className="mb-4">
        <p className="text-lg font-semibold text-amber-800 mb-1">Hadith</p>
        <p className="text-base text-amber-900/90 leading-relaxed">{hadith.text}</p>
      </div>
      
      <div className="mb-2">
        <p className="text-base font-semibold text-amber-800 mb-1">Reference</p>
        <p className="text-sm text-amber-900/80">{hadith.source}</p>
      </div>
      
      {hadith.lastUpdated && (
        <div className="text-xs text-amber-700/60 text-right mt-3">
          Last updated: {formatDate(hadith.lastUpdated)}
        </div>
      )}
    </div>
  );
};

export default HadithDisplay;
