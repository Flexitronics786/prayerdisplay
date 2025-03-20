
export const formatDate = (date: Date = new Date()): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const formatTime = (date: Date = new Date()): string => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

export const convertTo24Hour = (time12h: string): string => {
  if (!time12h || !time12h.includes(' ')) return time12h;
  
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  
  if (hours === '12') {
    hours = '00';
  }
  
  if (modifier === 'PM') {
    hours = String(parseInt(hours, 10) + 12);
  }
  
  return `${hours}:${minutes}`;
};

export const convertTo12Hour = (time24h: string): string => {
  if (!time24h || !time24h.includes(':')) return "";
  
  let [hours, minutes] = time24h.split(':');
  const hoursNum = parseInt(hours, 10);
  
  let period = 'AM';
  if (hoursNum >= 12) {
    period = 'PM';
  }
  
  let hours12 = hoursNum % 12;
  if (hours12 === 0) {
    hours12 = 12;
  }
  
  return `${hours12}:${minutes} ${period}`;
};

// Fixed time comparison function
export const isTimeBefore = (time1: string, time2: string): boolean => {
  if (!time1 || !time2) return false;
  
  // Convert time strings to minutes since midnight for easier comparison
  const getMinutesSinceMidnight = (timeStr: string): number => {
    // Ensure we're using 24-hour format
    const timeParts = timeStr.split(':');
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1].split(' ')[0], 10);
    return hours * 60 + minutes;
  };
  
  // Ensure both times are in 24-hour format
  let t1 = time1;
  let t2 = time2;
  
  if (time1.includes(' ')) {
    t1 = convertTo24Hour(time1);
  }
  
  if (time2.includes(' ')) {
    t2 = convertTo24Hour(time2);
  }
  
  const minutes1 = getMinutesSinceMidnight(t1);
  const minutes2 = getMinutesSinceMidnight(t2);
  
  return minutes1 < minutes2;
};

export const getCurrentTime24h = (): string => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
};
