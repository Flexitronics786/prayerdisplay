import { useEffect, useRef, useState } from "react";
import { useTVDisplay } from "@/hooks/useTVDisplay";

const KeepAwake = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isTV = useTVDisplay();
  const [keepAwakeActive, setKeepAwakeActive] = useState(false);
  
  // Method 1: Canvas-based animation that keeps the screen awake
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
  
  // Method 2: CSS Animation to keep display active
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
  
  // Method 3: Periodic visibility changes and focus events
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
  
  // Method 4: Simulate small DOM interactions to keep the device awake
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
  
  // Method 5: HTML5 Page Visibility API manipulation
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
  
  // Method 6: Wake Lock API - modern method to prevent device sleep
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
            // Try to re-acquire the wake lock
            setTimeout(() => requestWakeLock(), 1000);
          });
        } else {
          console.log('Wake Lock API not supported on this device');
        }
      } catch (err) {
        console.error(`Failed to get wake lock: ${err}`);
      }
    };
    
    // Function to handle visibility change events
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && wakeLock === null) {
        // The page has become visible again, try to request a wake lock
        requestWakeLock();
      }
    };
    
    // Add an event listener for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Request a wake lock when the component mounts
    requestWakeLock();
    
    // Cleanup function
    return () => {
      // Remove the event listener
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
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
  
  // Method 7: Video-based Keep-Awake System
  useEffect(() => {
    if (!isTV) return;
    
    console.log("Initializing video-based keep-awake system");
    
    // Create a tiny invisible video element
    const video = document.createElement('video');
    video.style.position = 'fixed';
    video.style.left = '-9999px';
    video.style.width = '1px';
    video.style.height = '1px';
    video.style.opacity = '0.001';
    video.style.pointerEvents = 'none';
    video.style.zIndex = '-1';
    
    // Create a MediaSource object
    const mediaSource = new MediaSource();
    video.src = URL.createObjectURL(mediaSource);
    
    // When MediaSource is open, create an empty buffer
    mediaSource.addEventListener('sourceopen', () => {
      try {
        // Try to create a video buffer (this will vary by browser support)
        const sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vp8"');
        
        // Creating an "empty" ArrayBuffer
        const emptyBuffer = new ArrayBuffer(1024);
        
        // Attempt to append buffer (this may fail safely in some browsers)
        try {
          sourceBuffer.appendBuffer(emptyBuffer);
        } catch (e) {
          console.warn("Could not append buffer for video keep-awake", e);
        }
      } catch (e) {
        console.warn("MediaSource not fully supported for keep-awake", e);
      }
    });
    
    // Add video to DOM
    document.body.appendChild(video);
    
    // Try to play the video (may be blocked by autoplay policies)
    video.play().catch(e => {
      console.warn("Autoplay prevented for keep-awake video", e);
    });
    
    // Periodically try to play the video again
    const videoPlayInterval = setInterval(() => {
      video.play().catch(() => {
        // Silently catch errors to avoid console spam
      });
    }, 30000);
    
    console.log("Video-based keep-awake method initialized");
    
    return () => {
      clearInterval(videoPlayInterval);
      document.body.removeChild(video);
      URL.revokeObjectURL(video.src);
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
