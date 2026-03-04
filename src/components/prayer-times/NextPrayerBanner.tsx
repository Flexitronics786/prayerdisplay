import React from "react";
import { PrayerTime, DetailedPrayerTime } from "@/types";
import { useCountdown } from "@/hooks/useCountdown";
import { useIqamahCountdown } from "@/hooks/useIqamahCountdown";
import { convertTo12Hour } from "@/utils/dateUtils";
import { useTVDisplay } from "@/hooks/useTVDisplay";
import { JummahSettings } from "@/services/settingsService";

interface NextPrayerBannerProps {
    prayerTimes: PrayerTime[];
    detailedTimes: DetailedPrayerTime | null;
    jummahSettings?: JummahSettings | null;
}

export const NextPrayerBanner: React.FC<NextPrayerBannerProps> = ({ prayerTimes, detailedTimes, jummahSettings }) => {
    const isTV = useTVDisplay();
    const nextPrayer = prayerTimes.find(p => p.isNext);
    const countdown = useCountdown(nextPrayer?.time ?? "");
    const iqamah = useIqamahCountdown(prayerTimes, detailedTimes, jummahSettings);

    if (!nextPrayer) return null;

    const displayTime = convertTo12Hour(nextPrayer.time);

    // Iqamah mode — prominent green banner when jamat is within 15 mins
    if (iqamah.isIqamahSoon) {
        const minsDisplay = iqamah.minutesLeft > 0
            ? `${iqamah.minutesLeft}m ${String(iqamah.secondsLeft).padStart(2, "0")}s`
            : `${iqamah.secondsLeft}s`;

        return (
            <div className={`flex items-center justify-center gap-2 mx-auto px-4 py-1.5 rounded-xl 
              bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-lg w-fit
              text-white animate-pulse-soft ${isTV ? "text-lg py-2 px-6" : "text-sm sm:text-base"}`}
            >
                <span>🕌</span>
                <span className="font-semibold">Iqamah:</span>
                <span className="font-extrabold">{iqamah.prayerName}</span>
                <span className="opacity-60">•</span>
                <span className="font-bold">{convertTo12Hour(iqamah.jamatTime)}</span>
                <span className="opacity-60">•</span>
                <span className="font-extrabold tracking-wide tabular-nums">{minsDisplay}</span>
            </div>
        );
    }

    // Normal mode — next prayer countdown
    return (
        <div className={`flex items-center justify-center gap-2 mx-auto px-4 py-1 rounded-xl 
      bg-gradient-to-r from-slate-700 to-slate-600 shadow-md w-fit
      text-white ${isTV ? "text-lg py-2 px-6" : "text-sm sm:text-base"}`}
        >
            <span>⏱</span>
            <span className="font-semibold">Next:</span>
            <span className="font-extrabold">{nextPrayer.name}</span>
            <span className="opacity-60">•</span>
            <span className="font-bold">{displayTime}</span>
            <span className="opacity-60">•</span>
            <span className="font-extrabold tracking-wide">{countdown}</span>
        </div>
    );
};
