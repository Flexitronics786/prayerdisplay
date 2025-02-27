
import { Hadith } from "@/types";

interface HadithDisplayProps {
  hadith: Hadith;
}

const HadithDisplay = ({ hadith }: HadithDisplayProps) => {
  return (
    <div className="glass-card rounded-xl p-8 animate-fade-in">
      <h3 className="text-2xl font-bold text-mosque-light mb-4">Hadith of the Day</h3>
      <div className="mb-6">
        <p className="text-white text-xl leading-relaxed font-serif">"{hadith.text}"</p>
      </div>
      <p className="text-mosque-light/80 text-right">— {hadith.source}</p>
    </div>
  );
};

export default HadithDisplay;
