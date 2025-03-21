
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

export const isTimeBefore = (time1: string, time2: string): boolean => {
  if (!time1 || !time2) return false;
  
  // Ensure we have just HH:MM format
  const t1 = time1.split(':').slice(0, 2).join(':');
  const t2 = time2.split(':').slice(0, 2).join(':');
  
  const [hours1, minutes1] = t1.split(':').map(Number);
  const [hours2, minutes2] = t2.split(':').map(Number);
  
  if (hours1 < hours2) {
    return true;
  } else if (hours1 === hours2 && minutes1 < minutes2) {
    return true;
  }
  
  return false;
};

export const getCurrentTime24h = (): string => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
};
