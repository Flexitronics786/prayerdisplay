
import React from "react";
import { Hadith } from "@/types";

interface HadithDisplayProps {
  hadith: Hadith;
}

const HadithDisplay: React.FC<HadithDisplayProps> = ({ hadith }) => {
  return (
    <div className="gold-border prayer-card rounded-xl p-4 h-full animate-fade-in">
      <h3 className="text-2xl font-bold text-amber-800 mb-4 font-serif">Hadith of the Day</h3>
      
      <div className="mb-4">
        <p className="text-lg font-semibold text-amber-800 mb-1">Hadith</p>
        <p className="text-base text-amber-900/90 leading-relaxed">{hadith.text}</p>
      </div>
      
      <div>
        <p className="text-base font-semibold text-amber-800 mb-1">Reference</p>
        <p className="text-sm text-amber-900/80">{hadith.source}</p>
      </div>
    </div>
  );
};

export default HadithDisplay;
