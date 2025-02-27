
import { useEffect, useState } from "react";
import { formatDate, formatTime } from "@/utils/dateUtils";

const DigitalClock = () => {
  const [time, setTime] = useState(formatTime());
  const [date, setDate] = useState(formatDate());

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(formatTime(now));
      setDate(formatDate(now));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-center mb-6 animate-fade-in">
      <p className="text-mosque-light/80 text-sm mb-1">{date}</p>
      <h2 className="text-4xl font-bold text-white clock-text">{time}</h2>
    </div>
  );
};

export default DigitalClock;
