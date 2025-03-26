
import { useState, useEffect } from "react";

export const useTVDisplay = () => {
  const [isTV, setIsTV] = useState(false);

  useEffect(() => {
    const checkIfTV = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      
      // Improved Firestick/Fire TV detection with more specific keywords
      const isFireTV = userAgent.includes('firetv') || 
                       userAgent.includes('fire tv') || 
                       userAgent.includes('amazon-fireos') ||
                       userAgent.includes('amazon fire') ||
                       userAgent.includes('afts') || // Amazon Fire TV Stick
                       userAgent.includes('kindle') ||
                       userAgent.includes('silk');
      
      // Check for common TV platforms
      const isLGTV = userAgent.includes('webos') || 
                     userAgent.includes('netcast') || 
                     userAgent.includes('lg netcast') ||
                     userAgent.includes('lg');
      
      const isSamsungTV = userAgent.includes('tizen') || 
                          userAgent.includes('samsung') ||
                          userAgent.includes('smarttv');
      
      const isSonyTV = userAgent.includes('sony') || 
                       userAgent.includes('playstation') ||
                       userAgent.includes('bravia');
      
      // Broader TV platform checks
      const isTVPlatform = isFireTV || isLGTV || isSamsungTV || isSonyTV || 
                          userAgent.includes('tv') || 
                          userAgent.includes('android tv') ||
                          userAgent.includes('googletv') ||
                          userAgent.includes('hbbtv') ||
                          userAgent.includes('philipstv') ||
                          userAgent.includes('appletv') ||
                          userAgent.includes('roku');
      
      // Improved screen dimension check - Firestick typically has 1080p resolution
      const isLargeScreen = (window.innerWidth >= 1280 && 
                          (window.innerHeight < 900 || window.innerWidth >= 1920)) ||
                          (window.innerWidth === 1920 && window.innerHeight === 1080); // Common Firestick resolution
      
      // Also check for lack of touch support (typical for TVs)
      const noTouchSupport = !('ontouchstart' in window) && 
                            navigator.maxTouchPoints <= 0;
      
      // Check if running in WebView (common for TV apps)
      const inWebView = userAgent.includes('wv') || 
                        userAgent.includes('webview');
      
      // Check for specific hardware concurrency and memory patterns typical of TVs
      const hasLimitedResources = navigator.hardwareConcurrency <= 4;
      
      // Combine all checks - multiple signals strengthen the detection
      const result = (isTVPlatform || 
                     (isLargeScreen && noTouchSupport) || 
                     (isLargeScreen && hasLimitedResources) ||
                     (isLargeScreen && inWebView));
      
      // Enhanced logging for debugging
      console.log("Enhanced TV detection:", { 
        userAgent, 
        isFireTV,
        isLGTV,
        isSamsungTV,
        isSonyTV, 
        isTVPlatform,
        isLargeScreen,
        noTouchSupport,
        inWebView,
        hardwareConcurrency: navigator.hardwareConcurrency,
        result 
      });
      
      return result;
    };
    
    // Initial check
    const isTvDisplay = checkIfTV();
    setIsTV(isTvDisplay);
    console.log("Enhanced TV detection result:", isTvDisplay);
    
    // Recheck on resize
    const handleResize = () => {
      setIsTV(checkIfTV());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isTV;
};
