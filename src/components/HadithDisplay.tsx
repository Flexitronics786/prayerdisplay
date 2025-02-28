
import React from "react";
import { Hadith } from "@/types";

interface HadithDisplayProps {
  hadith: Hadith;
}

const HadithDisplay: React.FC<HadithDisplayProps> = ({ hadith }) => {
  return (
    <div className="gold-border prayer-card rounded-xl p-6 animate-fade-in">
      <h3 className="text-3xl font-bold text-amber-800 mb-6 font-serif">Hadith of the Day</h3>
      
      <div className="mb-6">
        <p className="text-xl font-semibold text-amber-800 mb-2">Hadith</p>
        <p className="text-lg text-amber-900/90 leading-relaxed">{hadith.text}</p>
      </div>
      
      <div>
        <p className="text-lg font-semibold text-amber-800 mb-2">Reference</p>
        <p className="text-base text-amber-900/80">{hadith.source}</p>
      </div>
      
      {hadith.lastUpdated && (
        <div className="mt-4 text-sm text-amber-700/60">
          Last updated: {new Date(hadith.lastUpdated).toLocaleDateString()}
        </div>
      )}
    </div>
  );
};

export default HadithDisplay;
