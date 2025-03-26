import { useEffect, useRef, useState } from "react";
import { useTVDisplay } from "@/hooks/useTVDisplay";

// Define a unique ID for the keep awake audio element to avoid conflicts with alert audio
const KEEP_AWAKE_AUDIO_ID = "keep-awake-audio";

const KeepAwake = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isTV, isFirestick } = useTVDisplay();
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
    
    // Set small canvas size (2x2 pixels)
    canvas.width = 2;
    canvas.height = 2;
    
    // Animation function that draws a tiny changing pattern
    // This forces screen refresh without visible changes
    let frameCount = 0;
    const animate = () => {
      frameCount++;
      
      // More subtle pixel color changes to reduce resource usage
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
  
  // Method 2: CSS Animation to keep display active with reduced frequency
  useEffect(() => {
    if (!isTV) return;
    
    console.log("Initializing CSS animation-based keep-awake system");
    
    // Create a style element for our animation with less frequent changes
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      @keyframes keepAwakeAnimation {
        0% { opacity: 0.998; }
        50% { opacity: 0.999; }
        100% { opacity: 1; }
      }
      
      .keep-awake-element {
        position: fixed;
        width: 2px;
        height: 2px;
        bottom: 0;
        right: 0;
        opacity: 0.001;
        z-index: -1;
        animation: keepAwakeAnimation 10s infinite; /* Slower animation */
        pointer-events: none;
      }
    `;
    
    document.head.appendChild(styleElement);
    
    // Create fewer elements that use this animation
    const elements = [];
    const animatedElement = document.createElement('div');
    animatedElement.className = 'keep-awake-element';
    document.body.appendChild(animatedElement);
    elements.push(animatedElement);
    
    console.log("CSS animation method initialized for keep-awake");
    
    return () => {
      document.head.removeChild(styleElement);
      elements.forEach(el => document.body.removeChild(el));
    };
  }, [isTV]);
  
  // Method 3: Periodic visibility changes and focus events (reduced frequency)
  useEffect(() => {
    if (!isTV) return;
    
    console.log("Initializing visibility/focus-based keep-awake system");
    
    const focusInterval = setInterval(() => {
      // Force focus cycle once
      window.dispatchEvent(new Event('focus'));
      
      // Force visibility state check
      if (document.hidden) {
        console.log("Document appears hidden, triggering visibility change");
      }
      
      // Update document title less aggressively
      const currentTitle = document.title;
      document.title = currentTitle + " ";
      setTimeout(() => {
        document.title = currentTitle;
      }, 200);
      
    }, 30000); // Every 30 seconds (less frequent)
    
    console.log("Visibility/focus-based keep-awake method initialized");
    
    return () => {
      clearInterval(focusInterval);
    };
  }, [isTV]);
  
  // Method 4: Wake Lock API - modern method to prevent device sleep
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
  
  // Method 5: SPECIAL FIRESTICK PREVENTION - Modified to avoid audio conflicts
  useEffect(() => {
    if (!isFirestick) return;
    
    console.log("Initializing Firestick-specific keep-awake system");
    
    // Create an audio element that plays silent audio periodically
    // Use a unique ID to avoid conflicts with prayer alert audio
    let silentAudio = document.getElementById(KEEP_AWAKE_AUDIO_ID) as HTMLAudioElement;
    
    if (!silentAudio) {
      silentAudio = new Audio();
      silentAudio.id = KEEP_AWAKE_AUDIO_ID;
      silentAudio.loop = false; // Don't loop continuously
      silentAudio.volume = 0.001; // Nearly silent
      
      // Very short silent MP3
      silentAudio.src = "data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==";
      document.body.appendChild(silentAudio);
    }
    
    // Set up a timer to periodically play a very short silent audio
    // Use a less frequent interval and don't overlap with alert times
    const silentAudioInterval = setInterval(() => {
      // Only try to play audio if no other audio is currently playing
      // This helps avoid conflicts with prayer alert sounds
      const allAudioElements = document.querySelectorAll('audio');
      let otherAudioPlaying = false;
      
      allAudioElements.forEach(audio => {
        if (audio.id !== KEEP_AWAKE_AUDIO_ID && !audio.paused) {
          otherAudioPlaying = true;
        }
      });
      
      if (!otherAudioPlaying) {
        try {
          // Reset to beginning and keep volume very low
          silentAudio.currentTime = 0;
          silentAudio.volume = 0.001;
          
          // Play very briefly and then pause
          const playPromise = silentAudio.play();
          if (playPromise) {
            playPromise.then(() => {
              setTimeout(() => {
                silentAudio.pause();
              }, 100); // Very short play time
            }).catch(() => {
              // Silently catch autoplay errors
            });
          }
        } catch (e) {
          // Silent catch
        }
      }
    }, 45000); // Every 45 seconds (less frequent)
    
    // Set up touch/click simulation with reduced frequency
    const touchSimulationInterval = setInterval(() => {
      // Create a random spot slightly offscreen
      const x = window.innerWidth * 0.99; 
      const y = window.innerHeight * 0.99;
      
      // Create and dispatch touch/mouse events
      try {
        // Only use mouse events as they are less resource intensive
        const mouseEvent = new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: x,
          clientY: y
        });
        
        document.body.dispatchEvent(mouseEvent);
      } catch (e) {
        // Silent catch
      }
      
    }, 20000); // Every 20 seconds
    
    // Method to prevent common TV browser timeouts with reduced frequency
    const historyInterval = setInterval(() => {
      try {
        // Push a tiny state change to history without changing the URL
        const stateObj = { keepAlive: Date.now() };
        window.history.replaceState(stateObj, document.title);
        
        // Force minimal layout recalculation (keeps rendering pipeline active)
        document.body.style.zIndex = "0";
        setTimeout(() => {
          document.body.style.zIndex = "auto";
        }, 10);
      } catch (e) {
        // Silent catch
      }
    }, 25000); // Every 25 seconds
    
    return () => {
      clearInterval(silentAudioInterval);
      clearInterval(touchSimulationInterval);
      clearInterval(historyInterval);
      
      // Properly clean up audio element
      if (silentAudio) {
        silentAudio.pause();
        try {
          document.body.removeChild(silentAudio);
        } catch (e) {
          // Silent catch if already removed
        }
      }
    };
  }, [isFirestick]);
  
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
          Keep Awake: {keepAwakeActive ? 'Active' : 'Inactive'} {isFirestick ? '(Firestick Mode)' : ''}
        </div>
      )}
    </>
  );
};

export default KeepAwake;
