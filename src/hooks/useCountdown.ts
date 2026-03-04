import { useEffect, useState } from "react";

/**
 * Returns a live-updating countdown string like "in 2 hrs 34 mins"
 * towards the given HH:MM target time (handles overnight rollover).
 * Updates every 60 seconds.
 */
export const useCountdown = (targetTime: string): string => {
    const calcRemaining = () => {
        const now = new Date();
        const [th, tm] = targetTime.split(":").map(Number);
        let target = new Date(now);
        target.setHours(th, tm, 0, 0);

        // If target is in the past today, it must be tomorrow
        if (target.getTime() <= now.getTime()) {
            target.setDate(target.getDate() + 1);
        }

        const diffMs = target.getTime() - now.getTime();
        const totalMins = Math.round(diffMs / 60000);
        const hrs = Math.floor(totalMins / 60);
        const mins = totalMins % 60;

        if (hrs > 0 && mins > 0) return `in ${hrs} hr${hrs > 1 ? "s" : ""} ${mins} min${mins > 1 ? "s" : ""}`;
        if (hrs > 0) return `in ${hrs} hr${hrs > 1 ? "s" : ""}`;
        if (mins > 0) return `in ${mins} min${mins > 1 ? "s" : ""}`;
        return "starting now";
    };

    const [countdown, setCountdown] = useState(calcRemaining);

    useEffect(() => {
        if (!targetTime) return;
        setCountdown(calcRemaining());
        const interval = setInterval(() => setCountdown(calcRemaining()), 60000);
        return () => clearInterval(interval);
    }, [targetTime]);

    return countdown;
};
