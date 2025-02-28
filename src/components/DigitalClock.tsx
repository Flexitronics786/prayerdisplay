
import { useState, useEffect } from "react";

const DigitalClock = () => {
  const [time, setTime] = useState(new Date());
  const [date, setDate] = useState<string>("");
  const [islamicDate, setIslamicDate] = useState<string>("");

  useEffect(() => {
    const getIslamicDate = () => {
      const today = new Date();
      
      // This is a simplified way to get Islamic date - for production, use a proper Hijri calendar library
      const options: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        calendar: 'islamic',
      };
      
      try {
        return new Intl.DateTimeFormat('en-US', options).format(today);
      } catch (error) {
        console.error("Error getting Islamic date:", error);
        return "Calculating...";
      }
    };

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
      setIslamicDate(getIslamicDate());
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
    <div className="text-center">
      <div className="text-3xl font-bold text-mosque-light clock-text">{formatTime(time)}</div>
      <div className="mt-1 text-lg text-mosque-light/80">{date}</div>
      <div className="mt-1 text-base text-mosque-light/70">{islamicDate}</div>
    </div>
  );
};

export default DigitalClock;
