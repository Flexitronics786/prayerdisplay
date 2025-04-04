
import { useState, useEffect } from "react";

export const useTVDisplay = () => {
  const [isTV, setIsTV] = useState(false);

  useEffect(() => {
    const checkIfTV = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      
      // Enhanced Firestick/Fire TV detection
      const isFireTV = userAgent.includes('firetv') || 
                       userAgent.includes('fire tv') || 
                       userAgent.includes('kindle') ||
                       userAgent.includes('silk') ||
                       userAgent.includes('aftb') ||    // Added Amazon Fire TV Stick code
                       userAgent.includes('aftt') ||    // Added Amazon Fire TV code
                       userAgent.includes('afts');      // Added older Fire TV Stick code
      
      // Check for common TV platforms
      const isLGTV = userAgent.includes('webos') || 
                     userAgent.includes('netcast') || 
                     userAgent.includes('lg');
      
      const isSamsungTV = userAgent.includes('tizen') || 
                         userAgent.includes('samsung');
      
      const isSonyTV = userAgent.includes('sony') || 
                       userAgent.includes('playstation') ||
                       userAgent.includes('bravia');
      
      // Check for any TV or TV-like platform
      const isTVPlatform = isFireTV || isLGTV || isSamsungTV || isSonyTV || 
                          userAgent.includes('tv') || 
                          userAgent.includes('android tv');
      
      // Also check screen dimensions as a fallback
      const isLargeScreen = window.innerWidth >= 1280 && 
                          (window.innerHeight < 900 || window.innerWidth >= 1920);
      
      // Combine all checks
      const result = (isTVPlatform || isLargeScreen);
      
      // Log detection info for debugging
      console.log("TV detection:", { 
        userAgent, 
        isFireTV,
        isLGTV,
        isSamsungTV,
        isSonyTV, 
        isTVPlatform,
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
