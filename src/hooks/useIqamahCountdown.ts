import { useState, useEffect } from "react";
import { DetailedPrayerTime, PrayerTime } from "@/types";
import { JummahSettings } from "@/services/settingsService";

interface IqamahState {
    isIqamahSoon: boolean;
    prayerName: string;
    minutesLeft: number;
    secondsLeft: number;
    jamatTime: string;
}

const getJamatTimeForPrayer = (
    prayerName: string,
    detailedTimes: DetailedPrayerTime,
    jummahSettings?: JummahSettings | null
): string | null => {
    switch (prayerName) {
        case "Fajr":
            return detailedTimes.fajr_jamat;
        case "Zuhr":
        case "Dhuhr":
            return detailedTimes.zuhr_jamat;
        case "Asr":
            return detailedTimes.asr_jamat;
        case "Maghrib":
            return null; // Maghrib jamat = start time, no separate countdown
        case "Isha":
            return detailedTimes.isha_first_jamat;
        case "Jummah":
            return jummahSettings?.jamat1 || detailedTimes.zuhr_jamat;
        default:
            return null;
    }
};

export const useIqamahCountdown = (
    prayerTimes: PrayerTime[],
    detailedTimes: DetailedPrayerTime | null,
    jummahSettings?: JummahSettings | null
): IqamahState => {
    const [state, setState] = useState<IqamahState>({
        isIqamahSoon: false,
        prayerName: "",
        minutesLeft: 0,
        secondsLeft: 0,
        jamatTime: "",
    });

    useEffect(() => {
        if (!detailedTimes) return;

        const calculate = () => {
            const now = new Date();

            // Only show the Iqamah countdown for the ACTIVE prayer
            // (i.e. adhan has been called, prayer has started, waiting for jamat)
            const activePrayer = prayerTimes.find((p) => p.isActive);

            if (!activePrayer) {
                setState({ isIqamahSoon: false, prayerName: "", minutesLeft: 0, secondsLeft: 0, jamatTime: "" });
                return;
            }

            const jamatTime = getJamatTimeForPrayer(activePrayer.name, detailedTimes, jummahSettings);
            if (!jamatTime) {
                setState({ isIqamahSoon: false, prayerName: "", minutesLeft: 0, secondsLeft: 0, jamatTime: "" });
                return;
            }

            const [h, m] = jamatTime.split(":").map(Number);
            const jamatDate = new Date(now);
            jamatDate.setHours(h, m, 0, 0);

            // If jamat time already passed, no countdown
            if (jamatDate.getTime() <= now.getTime()) {
                setState({ isIqamahSoon: false, prayerName: "", minutesLeft: 0, secondsLeft: 0, jamatTime: "" });
                return;
            }

            const diffMs = jamatDate.getTime() - now.getTime();
            const totalSeconds = Math.floor(diffMs / 1000);
            const mins = Math.floor(totalSeconds / 60);
            const secs = totalSeconds % 60;

            setState({
                isIqamahSoon: true,
                prayerName: activePrayer.name,
                minutesLeft: mins,
                secondsLeft: secs,
                jamatTime: jamatTime,
            });
        };

        calculate();
        const interval = setInterval(calculate, 1000);
        return () => clearInterval(interval);
    }, [prayerTimes, detailedTimes, jummahSettings]);

    return state;
};
