import { useEffect, useRef, useState } from "react";
import { useTVDisplay } from "@/hooks/useTVDisplay";

const KeepAwake = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isTV = useTVDisplay();
  const [keepAwakeActive, setKeepAwakeActive] = useState(false);
  
  // Method 1: Canvas-based animation that keeps the screen awake (MORE AGGRESSIVE)
  useEffect(() => {
    if (!isTV || !canvasRef.current) return;
    
    console.log("Initializing canvas-based keep-awake system");
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error("Could not get canvas context");
      return;
    }
    
    // Set small canvas size (2x2 pixels)
    canvas.width = 2;
    canvas.height = 2;
    
    // Animation function that draws a tiny changing pattern
    // This forces screen refresh without visible changes
    let frameCount = 0;
    const animate = () => {
      frameCount++;
      
      // More aggressive pixel color changes (still visually subtle)
      const color = frameCount % 2 === 0 ? 'rgba(0,0,0,0.003)' : 'rgba(0,0,0,0.004)';
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 2, 2);
      
      // Request next frame to keep animation loop going
      requestAnimationFrame(animate);
    };
    
    // Start animation
    const animationId = requestAnimationFrame(animate);
    setKeepAwakeActive(true);
    console.log("Canvas animation started to prevent sleep (aggressive mode)");
    
    // Cleanup function
    return () => {
      cancelAnimationFrame(animationId);
      setKeepAwakeActive(false);
    };
  }, [isTV]);
  
  // Method 2: CSS Animation to keep display active (MORE AGGRESSIVE)
  useEffect(() => {
    if (!isTV) return;
    
    console.log("Initializing CSS animation-based keep-awake system");
    
    // Create a style element for our animation with more frequent changes
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      @keyframes keepAwakeAnimation {
        0% { opacity: 0.999; }
        25% { opacity: 0.9995; }
        50% { opacity: 0.999; }
        75% { opacity: 0.9995; }
        100% { opacity: 1; }
      }
      
      .keep-awake-element {
        position: fixed;
        width: 2px;
        height: 2px;
        bottom: 0;
        right: 0;
        opacity: 0.002;
        z-index: -1;
        animation: keepAwakeAnimation 5s infinite; /* Faster animation */
        pointer-events: none;
      }
    `;
    
    document.head.appendChild(styleElement);
    
    // Create multiple elements that use this animation
    const elements = [];
    for (let i = 0; i < 3; i++) {
      const animatedElement = document.createElement('div');
      animatedElement.className = 'keep-awake-element';
      animatedElement.style.right = `${i * 2}px`;
      document.body.appendChild(animatedElement);
      elements.push(animatedElement);
    }
    
    console.log("CSS animation method initialized for keep-awake (aggressive mode)");
    
    return () => {
      document.head.removeChild(styleElement);
      elements.forEach(el => document.body.removeChild(el));
    };
  }, [isTV]);
  
  // Method 3: Periodic visibility changes and focus events (MORE AGGRESSIVE)
  useEffect(() => {
    if (!isTV) return;
    
    console.log("Initializing visibility/focus-based keep-awake system");
    
    const focusInterval = setInterval(() => {
      // Force multiple focus/blur cycles
      window.dispatchEvent(new Event('focus'));
      setTimeout(() => window.dispatchEvent(new Event('blur')), 100);
      setTimeout(() => window.dispatchEvent(new Event('focus')), 200);
      
      // Force visibility state check
      if (document.hidden) {
        console.log("Document appears hidden, triggering visibility change");
      }
      
      // Update document title more aggressively
      const currentTitle = document.title;
      document.title = currentTitle + " ";
      setTimeout(() => {
        document.title = currentTitle;
      }, 200);
      
      // Force a layout recalculation
      document.body.getBoundingClientRect();
      
    }, 20000); // Every 20 seconds (more frequent)
    
    console.log("Visibility/focus-based keep-awake method initialized (aggressive mode)");
    
    return () => {
      clearInterval(focusInterval);
    };
  }, [isTV]);
  
  // Method 4: Simulate DOM interactions to keep the device awake (MORE AGGRESSIVE)
  useEffect(() => {
    if (!isTV) return;
    
    console.log("KeepAwake DOM interaction method activated");
    
    const activityInterval = setInterval(() => {
      // Create multiple temporary elements to force more layout calculations
      for (let i = 0; i < 3; i++) {
        const tempElement = document.createElement('div');
        tempElement.style.position = 'fixed';
        tempElement.style.left = `-${9999 + i}px`;
        tempElement.style.width = '1px';
        tempElement.style.height = '1px';
        document.body.appendChild(tempElement);
        
        // Force layout calculation
        tempElement.getBoundingClientRect();
        
        setTimeout(() => {
          document.body.removeChild(tempElement);
        }, 50);
      }
      
      // Trigger a more aggressive repaint cycle
      document.body.style.opacity = "0.9999";
      setTimeout(() => {
        document.body.style.opacity = "1";
      }, 10);
      setTimeout(() => {
        document.body.style.opacity = "0.9999";
      }, 20);
      setTimeout(() => {
        document.body.style.opacity = "1";
      }, 30);
      
      // Don't log this too often to avoid console spam
      if (Math.random() < 0.1) { // Only log approximately 10% of the time
        console.log("Keep awake: Aggressive DOM activity simulated at", new Date().toISOString());
      }
    }, 10000); // Every 10 seconds (more frequent)
    
    return () => {
      clearInterval(activityInterval);
    };
  }, [isTV]);
  
  // Method 5: HTML5 Page Visibility API manipulation (MORE AGGRESSIVE)
  useEffect(() => {
    if (!isTV) return;
    
    console.log("Initializing Page Visibility API keep-awake system");
    
    // Create multiple hidden iframes that we can manipulate
    const iframes = [];
    for (let i = 0; i < 2; i++) {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = `-${9999 + i}px`;
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.opacity = '0.001';
      iframe.style.pointerEvents = 'none';
      iframe.style.zIndex = '-1';
      document.body.appendChild(iframe);
      iframes.push(iframe);
    }
    
    // Access iframe documents periodically
    const iframeVisibilityInterval = setInterval(() => {
      iframes.forEach((iframe, idx) => {
        try {
          if (iframe.contentWindow && iframe.contentWindow.document) {
            // Change something in the iframe to trigger visibility processing
            iframe.contentWindow.document.title = "keepAwake" + new Date().getTime() + idx;
            
            // Create and remove elements in the iframe
            const div = iframe.contentWindow.document.createElement('div');
            iframe.contentWindow.document.body.appendChild(div);
            setTimeout(() => {
              try {
                iframe.contentWindow.document.body.removeChild(div);
              } catch (e) {
                // Silent catch
              }
            }, 50);
          }
        } catch (e) {
          // Silent catch to avoid console spam
        }
      });
    }, 15000); // Every 15 seconds (more frequent)
    
    console.log("Page Visibility API keep-awake method initialized (aggressive mode)");
    
    return () => {
      clearInterval(iframeVisibilityInterval);
      iframes.forEach(iframe => document.body.removeChild(iframe));
    };
  }, [isTV]);
  
  // Method 6: Wake Lock API - modern method to prevent device sleep (MORE AGGRESSIVE)
  useEffect(() => {
    if (!isTV) return;
    
    console.log("Initializing Wake Lock API keep-awake system");
    
    let wakeLock: any = null;
    
    // Function to request a wake lock
    const requestWakeLock = async () => {
      try {
        // Check if the Wake Lock API is supported
        if ('wakeLock' in navigator) {
          // Request a screen wake lock
          wakeLock = await (navigator as any).wakeLock.request('screen');
          
          console.log('Wake Lock is active!');
          
          // Listen for wake lock release
          wakeLock.addEventListener('release', () => {
            console.log('Wake Lock was released');
            // Try to re-acquire the wake lock immediately
            setTimeout(() => requestWakeLock(), 100);
          });
        } else {
          console.log('Wake Lock API not supported on this device');
        }
      } catch (err) {
        console.error(`Failed to get wake lock: ${err}`);
        // Try again after a short delay
        setTimeout(() => requestWakeLock(), 1000);
      }
    };
    
    // Function to handle visibility change events
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // The page has become visible, try to request a wake lock
        requestWakeLock();
      }
    };
    
    // Add an event listener for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Request a wake lock immediately and retry on an interval
    requestWakeLock();
    
    // Also set up a periodic wake lock refresh
    const wakeLockInterval = setInterval(() => {
      if (wakeLock === null) {
        requestWakeLock();
      }
    }, 30000); // Try to reacquire every 30 seconds if needed
    
    // Cleanup function
    return () => {
      // Remove the event listener
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(wakeLockInterval);
      
      // Release the wake lock if it's active
      if (wakeLock !== null) {
        wakeLock.release()
          .then(() => {
            console.log('Wake Lock released by cleanup');
            wakeLock = null;
          })
          .catch((err: any) => {
            console.error(`Failed to release Wake Lock: ${err}`);
          });
      }
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
          width: '2px',
          height: '2px',
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
