import { useEffect, useRef, useState } from "react";
import { useTVDisplay } from "@/hooks/useTVDisplay";

const KeepAwake = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isTV = useTVDisplay();
  const [keepAwakeActive, setKeepAwakeActive] = useState(false);
  
  // Create and play a silent canvas animation that keeps the screen awake
  useEffect(() => {
    if (!isTV || !canvasRef.current) return;
    
    console.log("Initializing canvas-based keep-awake system");
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error("Could not get canvas context");
      return;
    }
    
    // Set small canvas size (1x1 pixel is enough)
    canvas.width = 2;
    canvas.height = 2;
    
    // Animation function that draws a tiny changing pattern
    // This forces screen refresh without visible changes
    let frameCount = 0;
    const animate = () => {
      frameCount++;
      
      // Alternate pixel colors very subtly (barely noticeable)
      const color = frameCount % 2 === 0 ? 'rgba(0,0,0,0.001)' : 'rgba(0,0,0,0.002)';
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 2, 2);
      
      // Request next frame to keep animation loop going
      requestAnimationFrame(animate);
    };
    
    // Start animation
    const animationId = requestAnimationFrame(animate);
    setKeepAwakeActive(true);
    console.log("Canvas animation started to prevent sleep");
    
    // Cleanup function
    return () => {
      cancelAnimationFrame(animationId);
      setKeepAwakeActive(false);
    };
  }, [isTV]);
  
  // Method 1: CSS Animation to keep display active
  useEffect(() => {
    if (!isTV) return;
    
    console.log("Initializing CSS animation-based keep-awake system");
    
    // Create a style element for our animation
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      @keyframes keepAwakeAnimation {
        0% { opacity: 0.999999; }
        100% { opacity: 1; }
      }
      
      .keep-awake-element {
        position: fixed;
        width: 1px;
        height: 1px;
        bottom: 0;
        right: 0;
        opacity: 0.001;
        z-index: -1;
        animation: keepAwakeAnimation 10s infinite;
        pointer-events: none;
      }
    `;
    
    document.head.appendChild(styleElement);
    
    // Create an element that uses this animation
    const animatedElement = document.createElement('div');
    animatedElement.className = 'keep-awake-element';
    document.body.appendChild(animatedElement);
    
    console.log("CSS animation method initialized for keep-awake");
    
    return () => {
      document.head.removeChild(styleElement);
      document.body.removeChild(animatedElement);
    };
  }, [isTV]);
  
  // Method 2: Periodic visibility changes and focus events
  useEffect(() => {
    if (!isTV) return;
    
    console.log("Initializing visibility/focus-based keep-awake system");
    
    const focusInterval = setInterval(() => {
      // Force a focus/blur cycle
      window.dispatchEvent(new Event('focus'));
      
      // Force visibility state check
      if (document.hidden) {
        console.log("Document appears hidden, triggering visibility change");
      }
      
      // Update document title slightly (can prevent sleep on some systems)
      const currentTitle = document.title;
      document.title = currentTitle + " ";
      setTimeout(() => {
        document.title = currentTitle;
      }, 500);
      
    }, 30000); // Every 30 seconds
    
    console.log("Visibility/focus-based keep-awake method initialized");
    
    return () => {
      clearInterval(focusInterval);
    };
  }, [isTV]);
  
  // Method 3: Simulate small DOM interactions to keep the device awake
  useEffect(() => {
    if (!isTV) return;
    
    console.log("KeepAwake DOM interaction method activated");
    
    const activityInterval = setInterval(() => {
      // Create a temporary div with minimal visual impact
      const tempElement = document.createElement('div');
      tempElement.style.position = 'fixed';
      tempElement.style.left = '-9999px';
      tempElement.style.width = '1px';
      tempElement.style.height = '1px';
      document.body.appendChild(tempElement);
      
      // Force layout calculation and remove element 
      tempElement.getBoundingClientRect();
      setTimeout(() => {
        document.body.removeChild(tempElement);
      }, 50);
      
      // Trigger a full repaint for devices that need more activity
      document.body.style.opacity = "0.99999";
      setTimeout(() => {
        document.body.style.opacity = "1";
      }, 10);
      
      // Don't log this too often to avoid console spam
      if (Math.random() < 0.1) { // Only log approximately 10% of the time
        console.log("Keep awake: DOM activity simulated at", new Date().toISOString());
      }
    }, 15000); // Every 15 seconds
    
    return () => {
      clearInterval(activityInterval);
    };
  }, [isTV]);
  
  // Method 4: HTML5 Page Visibility API manipulation
  useEffect(() => {
    if (!isTV) return;
    
    console.log("Initializing Page Visibility API keep-awake system");
    
    // Create a hidden iframe that we can manipulate
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.opacity = '0.001';
    iframe.style.pointerEvents = 'none';
    iframe.style.zIndex = '-1';
    
    document.body.appendChild(iframe);
    
    // Access iframe document if possible
    const iframeVisibilityInterval = setInterval(() => {
      try {
        if (iframe.contentWindow && iframe.contentWindow.document) {
          // Change something in the iframe to trigger visibility processing
          iframe.contentWindow.document.title = "keepAwake" + new Date().getTime();
        }
      } catch (e) {
        console.warn("Could not access iframe content for keep-awake", e);
      }
    }, 20000); // Every 20 seconds
    
    console.log("Page Visibility API keep-awake method initialized");
    
    return () => {
      clearInterval(iframeVisibilityInterval);
      document.body.removeChild(iframe);
    };
  }, [isTV]);
  
  // Only render elements on TV displays
  if (!isTV) return null;
  
  return (
    <>
      <canvas 
        ref={canvasRef}
        style={{
          position: 'fixed',
          right: 0,
          bottom: 0,
          width: '1px',
          height: '1px',
          opacity: 0.01,
          pointerEvents: 'none',
          zIndex: -1
        }}
      />
      
      {/* Status indicator only shown during development */}
      {process.env.NODE_ENV === 'development' && (
        <div 
          style={{ 
            position: 'fixed', 
            bottom: 5, 
            right: 5, 
            background: keepAwakeActive ? 'rgba(0,255,0,0.2)' : 'rgba(255,0,0,0.2)', 
            padding: '2px 4px',
            borderRadius: '2px',
            fontSize: '10px',
            color: keepAwakeActive ? 'darkgreen' : 'darkred',
            zIndex: 9999
          }}
        >
          Keep Awake: {keepAwakeActive ? 'Active' : 'Inactive'}
        </div>
      )}
    </>
  );
};

export default KeepAwake;
