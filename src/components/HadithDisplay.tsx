
import React from "react";
import { Hadith } from "@/types";

interface HadithDisplayProps {
  hadith: Hadith;
}

const HadithDisplay: React.FC<HadithDisplayProps> = ({ hadith }) => {
  return (
    <div className="glass-card rounded-xl p-6 animate-fade-in">
      <h3 className="text-3xl font-bold text-mosque-dark mb-6 font-serif">Hadith of the Day</h3>
      
      <div className="mb-6">
        <p className="text-xl font-semibold text-mosque-dark mb-2">English</p>
        <p className="text-lg text-mosque-dark/90 leading-relaxed">{hadith.text_en}</p>
      </div>
      
      <div className="mb-6">
        <p className="text-xl font-semibold text-mosque-dark mb-2">Arabic</p>
        <p dir="rtl" className="text-xl text-mosque-dark/90 leading-relaxed font-serif">{hadith.text_ar}</p>
      </div>
      
      <div>
        <p className="text-lg font-semibold text-mosque-dark mb-2">Reference</p>
        <p className="text-base text-mosque-dark/80">{hadith.reference}</p>
      </div>
    </div>
  );
};

export default HadithDisplay;
