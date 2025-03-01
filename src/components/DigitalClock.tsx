
import { useState, useEffect } from "react";

const DigitalClock = ({ showDate = true }: { showDate?: boolean }) => {
  const [time, setTime] = useState(new Date());
  const [date, setDate] = useState<string>("");

  useEffect(() => {
    const getGregorianDate = () => {
      const today = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      };
      return today.toLocaleDateString('en-US', options);
    };

    const updateTime = () => {
      setTime(new Date());
    };

    const updateDate = () => {
      setDate(getGregorianDate());
    };

    // Update date and time immediately
    updateTime();
    updateDate();

    // Set up intervals to update time and date
    const timeInterval = setInterval(updateTime, 1000);
    const dateInterval = setInterval(updateDate, 60000); // Update date every minute

    return () => {
      clearInterval(timeInterval);
      clearInterval(dateInterval);
    };
  }, []);

  const formatTime = (time: Date) => {
    const hours = time.getHours();
    const minutes = time.getMinutes();
    const seconds = time.getSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;
    
    return `${formattedHours}:${formattedMinutes}:${formattedSeconds} ${ampm}`;
  };

  return (
    <div className="text-center h-full flex flex-col justify-center">
      <div className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-extrabold text-amber-800 clock-text">{formatTime(time)}</div>
      {showDate && <div className="text-2xl md:text-3xl text-amber-700">{date}</div>}
    </div>
  );
};

export default DigitalClock;
