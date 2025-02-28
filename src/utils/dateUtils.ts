
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
  // If already in 24h format, return as is
  if (time12h.length <= 5 && !time12h.includes(' ')) {
    return time12h;
  }

  // Try to parse 12h format
  try {
    const [timePart, modifier] = time12h.split(' ');
    
    if (!timePart || !modifier) {
      console.warn("Invalid 12-hour time format:", time12h);
      return time12h;
    }
    
    let [hours, minutes] = timePart.split(':').map(part => part.trim());
    
    if (!hours || !minutes) {
      console.warn("Invalid time parts:", timePart);
      return time12h;
    }
    
    let hoursNum = parseInt(hours, 10);
    
    // Convert hours based on AM/PM
    if (modifier.toUpperCase() === 'PM' && hoursNum < 12) {
      hoursNum += 12;
    } else if (modifier.toUpperCase() === 'AM' && hoursNum === 12) {
      hoursNum = 0;
    }
    
    // Format with leading zeros
    return `${hoursNum.toString().padStart(2, '0')}:${minutes}`;
  } catch (error) {
    console.error("Error converting to 24h format:", error, time12h);
    return time12h;
  }
};

export const convertTo12Hour = (time24h: string): string => {
  // If already in 12h format, return as is
  if (time24h.includes(' ')) {
    return time24h;
  }
  
  // If no time provided or invalid format, return empty
  if (!time24h || !time24h.includes(':')) {
    return '';
  }
  
  try {
    const [hours, minutes] = time24h.split(':');
    const hoursNum = parseInt(hours, 10);
    
    if (isNaN(hoursNum)) {
      return time24h;
    }
    
    let period = 'AM';
    if (hoursNum >= 12) {
      period = 'PM';
    }
    
    let hours12 = hoursNum % 12;
    if (hours12 === 0) {
      hours12 = 12;
    }
    
    return `${hours12}:${minutes} ${period}`;
  } catch (error) {
    console.error("Error converting to 12h format:", error, time24h);
    return time24h;
  }
};

export const isTimeBefore = (time1: string, time2: string): boolean => {
  const [hours1, minutes1] = time1.split(':').map(Number);
  const [hours2, minutes2] = time2.split(':').map(Number);
  
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
