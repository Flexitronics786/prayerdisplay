
import { useState, useEffect } from "react";

export const useTVDisplay = () => {
  const [isTV, setIsTV] = useState(false);

  useEffect(() => {
    const checkIfTV = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isSilkBrowser = userAgent.includes('silk');
      const isFireTV = userAgent.includes('firetv') || userAgent.includes('fire tv');
      const isLGTV = userAgent.includes('webos') || userAgent.includes('netcast') || userAgent.includes('lg');
      const isLargeScreen = window.innerWidth >= 1280 && 
                            (window.innerHeight < 900 || window.innerWidth >= 1920);
      
      const result = (isSilkBrowser || isFireTV || isLGTV || isLargeScreen);
      console.log("TV detection:", { 
        userAgent, 
        isSilkBrowser, 
        isFireTV, 
        isLGTV, 
        isLargeScreen, 
        result 
      });
      
      return result;
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

// Helper function to check if we're on a Firestick specifically
export const isFirestick = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.includes('silk') || userAgent.includes('firetv') || userAgent.includes('fire tv');
};

