
import { useState, useEffect } from "react";

export const useTVDisplay = () => {
  const [isTV, setIsTV] = useState(false);

  useEffect(() => {
    const checkIfTV = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isSilkBrowser = userAgent.includes('silk');
      const isFireTV = userAgent.includes('firetv') || userAgent.includes('fire tv');
      const isLargeScreen = window.innerWidth >= 1280 && 
                            (window.innerHeight < 900 || window.innerWidth >= 1920);
      
      return (isSilkBrowser || isFireTV || isLargeScreen);
    };
    
    setIsTV(checkIfTV());
    console.log("Is TV display:", checkIfTV());
    
    const handleResize = () => {
      setIsTV(checkIfTV());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isTV;
};
