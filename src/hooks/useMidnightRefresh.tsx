
import { useState, useEffect } from "react";

export const useMidnightRefresh = () => {
  const [midnightReloadSet, setMidnightReloadSet] = useState(false);

  useEffect(() => {
    if (!midnightReloadSet) {
      const setupMidnightReload = () => {
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 2, 0, 0);
        
        const timeUntilMidnight = midnight.getTime() - now.getTime();
        console.log(`Page will fully reload at 2 minutes after midnight in ${timeUntilMidnight / 1000 / 60} minutes`);
        
        setTimeout(() => {
          console.log("Midnight+2min reached - refreshing entire page");
          window.location.reload();
        }, timeUntilMidnight);
      };
      
      setupMidnightReload();
      setMidnightReloadSet(true);
    }
  }, [midnightReloadSet]);

  return midnightReloadSet;
};
