
import { PrayerTime } from "@/types";
import { convertTo12Hour } from "@/utils/dateUtils";

interface PrayerTimesTableProps {
  prayerTimes: PrayerTime[];
}

const PrayerTimesTable = ({ prayerTimes }: PrayerTimesTableProps) => {
  return (
    <div className="glass-card rounded-xl overflow-hidden animate-scale-in">
      <div className="bg-mosque-accent/20 py-3 px-4 border-b border-mosque-accent/30">
        <h3 className="text-2xl font-bold text-white">Prayer Times</h3>
      </div>
      <div className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="py-3 px-4 text-left text-mosque-light/80 font-medium">Prayer</th>
              <th className="py-3 px-4 text-right text-mosque-light/80 font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {prayerTimes.map((prayer) => (
              <tr
                key={prayer.id}
                className={`prayer-transition ${
                  prayer.isActive ? "active-prayer" : 
                  prayer.isNext ? "next-prayer" : 
                  "hover:bg-white/5"
                } border-b border-white/5`}
              >
                <td className="py-4 px-4 text-left font-medium text-lg">
                  {prayer.name}
                  {prayer.isActive && (
                    <span className="ml-2 inline-block px-2 py-0.5 text-xs rounded-full bg-mosque-accent/30 text-mosque-light">
                      Current
                    </span>
                  )}
                  {prayer.isNext && (
                    <span className="ml-2 inline-block px-2 py-0.5 text-xs rounded-full bg-mosque-accent/20 text-mosque-light/90">
                      Next
                    </span>
                  )}
                </td>
                <td className="py-4 px-4 text-right font-medium text-lg clock-text">
                  {convertTo12Hour(prayer.time)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PrayerTimesTable;
