import { useEffect, useRef, useState } from "react";
import { useTVDisplay } from "@/hooks/useTVDisplay";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

// Create unique ID for the keep-awake audio element to avoid conflicts
const KEEP_AWAKE_AUDIO_ID = "keep-awake-sound";

// Define our own custom types completely separate from browser types
interface CustomWakeLockSentinel {
  release: () => Promise<void>;
}

interface CustomWakeLockAPI {
  request: (type: string) => Promise<CustomWakeLockSentinel>;
}

// Use a type intersection instead of extending Navigator
type NavigatorWithWakeLock = Navigator & {
  wakeLock?: CustomWakeLockAPI;
};

const KeepAwake = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isTV = useTVDisplay();
  const [keepAwakeActive, setKeepAwakeActive] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [audioDebugMode, setAudioDebugMode] = useState(false);
  const { toast } = useToast();
  const wakeLockRef = useRef<CustomWakeLockSentinel | null>(null);
  
  // Wake Lock API - modern browsers support
  useEffect(() => {
    if (!isTV) return;
    
    console.log("Attempting to use Wake Lock API...");
    
    const requestWakeLock = async () => {
      try {
        const navigatorWithWakeLock = navigator as NavigatorWithWakeLock;
        
        if (navigatorWithWakeLock.wakeLock) {
          wakeLockRef.current = await navigatorWithWakeLock.wakeLock.request('screen');
          console.log("Wake Lock API activated successfully");
          setWakeLockActive(true);
          
          // Log Wake Lock success occasionally
          if (process.env.NODE_ENV === 'development') {
            toast({
              title: "Screen Wake Lock active",
              description: "Using native Wake Lock API to keep screen on",
            });
          }
        } else {
          console.log("Wake Lock API not supported by this browser/device");
        }
      } catch (err) {
        console.warn("Wake Lock API request failed:", err);
      }
    };
    
    // Try to request Wake Lock
    requestWakeLock();
    
    // Re-request Wake Lock if document visibility changes (tab becomes visible again)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Release Wake Lock if active
      if (wakeLockRef.current) {
        wakeLockRef.current.release().then(() => {
          console.log("Wake Lock released");
          setWakeLockActive(false);
        }).catch(err => {
          console.error("Error releasing Wake Lock:", err);
        });
      }
    };
  }, [isTV, toast]);
  
  // Enhanced canvas animation for keeping screen active
  useEffect(() => {
    if (!isTV || !canvasRef.current) return;
    
    console.log("Initializing enhanced canvas-based keep-awake system");
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error("Could not get canvas context");
      return;
    }
    
    // Set slightly larger canvas size to ensure activity is registered
    canvas.width = 4;
    canvas.height = 4;
    
    // Animation function that draws a changing pattern
    // This forces screen refresh without visible changes
    let frameCount = 0;
    const animate = () => {
      frameCount++;
      
      // Create a more varied pattern with alternating colors
      ctx.clearRect(0, 0, 4, 4);
      
      // Use a different pattern every few frames to ensure activity is registered
      const pattern = frameCount % 4;
      
      if (pattern === 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.001)';
        ctx.fillRect(0, 0, 2, 2);
        ctx.fillRect(2, 2, 2, 2);
      } else if (pattern === 1) {
        ctx.fillStyle = 'rgba(0,0,0,0.002)';
        ctx.fillRect(0, 2, 2, 2);
        ctx.fillRect(2, 0, 2, 2);
      } else if (pattern === 2) {
        ctx.fillStyle = 'rgba(255,255,255,0.001)';
        ctx.fillRect(0, 0, 4, 2);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.002)';
        ctx.fillRect(0, 0, 2, 4);
      }
      
      // Request next frame to keep animation loop going
      requestAnimationFrame(animate);
    };
    
    // Start animation
    const animationId = requestAnimationFrame(animate);
    setKeepAwakeActive(true);
    console.log("Enhanced canvas animation started to prevent sleep");
    
    // Cleanup function
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isTV]);
  
  // More aggressive screen refresh method - improved for Firestick and TV compatibility
  useEffect(() => {
    if (!isTV) return;
    
    console.log("Initializing aggressive screen refresh system");
    
    // Use a stronger approach every 15 seconds (more frequent than before)
    const aggressiveRefreshInterval = setInterval(() => {
      // Force full reflow by manipulating layout properties
      document.body.style.zoom = "0.99999";
      
      setTimeout(() => {
        document.body.style.zoom = "1";
        
        // Log activity occasionally
        if (Math.random() < 0.1) {
          console.log("Aggressive screen refresh triggered at", new Date().toISOString());
        }
      }, 100);
      
      // Create and remove more elements to trigger DOM updates
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const forcedRefreshElement = document.createElement('div');
          forcedRefreshElement.style.position = 'fixed';
          forcedRefreshElement.style.top = `${i * 10}px`;
          forcedRefreshElement.style.left = `${i * 10}px`;
          forcedRefreshElement.style.width = '100%';
          forcedRefreshElement.style.height = '100%';
          forcedRefreshElement.style.pointerEvents = 'none';
          forcedRefreshElement.style.opacity = '0.001';
          forcedRefreshElement.style.zIndex = '-1';
          
          document.body.appendChild(forcedRefreshElement);
          
          // Force layout calculation
          forcedRefreshElement.getBoundingClientRect();
          
          setTimeout(() => {
            if (document.body.contains(forcedRefreshElement)) {
              document.body.removeChild(forcedRefreshElement);
            }
          }, 100);
        }, i * 50);
      }
      
      // Additional CSS animation trigger
      const styleElement = document.createElement('style');
      styleElement.textContent = `
        @keyframes keepAwakeAnimation {
          0% { opacity: 0.9999; }
          100% { opacity: 1; }
        }
        body {
          animation: keepAwakeAnimation 0.1s;
        }
      `;
      document.head.appendChild(styleElement);
      
      setTimeout(() => {
        document.head.removeChild(styleElement);
      }, 200);
      
    }, 15000); // Every 15 seconds - more frequent for Firestick
    
    return () => {
      clearInterval(aggressiveRefreshInterval);
    };
  }, [isTV]);
  
  // Enhanced activity simulation specifically for Firestick
  useEffect(() => {
    if (!isTV) return;
    
    console.log("Enhanced activity simulation activated for TV display");
    
    // Simulate more varied DOM interactions to keep the device awake
    const activityInterval = setInterval(() => {
      // Simulate scroll events
      window.dispatchEvent(new CustomEvent('scroll'));
      
      // Simulate mouse movement (Firestick might detect this)
      window.dispatchEvent(new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: Math.random() * window.innerWidth,
        clientY: Math.random() * window.innerHeight
      }));
      
      // Create temporary elements with different properties
      for (let i = 0; i < 2; i++) {
        const tempElement = document.createElement('div');
        tempElement.style.position = 'fixed';
        tempElement.style.left = `${Math.random() * 100}%`;
        tempElement.style.top = `${Math.random() * 100}%`;
        tempElement.style.width = '2px';
        tempElement.style.height = '2px';
        tempElement.style.backgroundColor = 'rgba(0,0,0,0.001)';
        document.body.appendChild(tempElement);
        
        // Force layout calculation and remove element 
        tempElement.getBoundingClientRect();
        setTimeout(() => {
          if (document.body.contains(tempElement)) {
            document.body.removeChild(tempElement);
          }
        }, 50);
      }
      
      // Trigger a full repaint using different method
      document.body.style.filter = "brightness(100%)";
      setTimeout(() => {
        document.body.style.filter = "none";
      }, 10);
      
      // Log activity occasionally to avoid console spam
      if (Math.random() < 0.1) { // Only log approximately 10% of the time
        console.log("Keep awake: Enhanced activity simulated at", new Date().toISOString());
      }
    }, 10000); // Every 10 seconds - more frequent for Firestick
    
    return () => {
      clearInterval(activityInterval);
    };
  }, [isTV]);
  
  // Debug mode with periodic audio beep for TVs that need audio to stay awake
  useEffect(() => {
    if (!isTV || !audioDebugMode) return;
    
    console.log("Audio debug mode for keep-awake activated");
    
    // Create audio element for debugging if needed
    if (!audioRef.current) {
      const audio = new Audio();
      audio.id = KEEP_AWAKE_AUDIO_ID;
      audio.src = "/beep-125033.mp3";
      audio.volume = 0.1; // Noticeable but not too loud
      audioRef.current = audio;
    }
    
    // Play a soft beep every minute in debug mode
    const audioDebugInterval = setInterval(() => {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play()
          .then(() => console.log("Audio debug beep played"))
          .catch(err => console.warn("Audio debug beep failed:", err));
      }
    }, 60000); // Every 60 seconds
    
    return () => {
      clearInterval(audioDebugInterval);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, [isTV, audioDebugMode]);
  
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
          width: '4px',
          height: '4px',
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
            background: 'rgba(0,0,0,0.1)', 
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#333',
            zIndex: 9999
          }}
        >
          <div style={{ marginBottom: '4px' }}>
            Keep Awake Status:
          </div>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '4px',
            fontSize: '10px'
          }}>
            <div style={{ 
              color: keepAwakeActive ? 'green' : 'red', 
              fontWeight: 'bold' 
            }}>
              • Canvas Animation: {keepAwakeActive ? 'Active' : 'Inactive'}
            </div>
            <div style={{ 
              color: wakeLockActive ? 'green' : 'red', 
              fontWeight: 'bold' 
            }}>
              • Wake Lock API: {wakeLockActive ? 'Active' : 'Inactive'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
              <span>Audio Debug:</span>
              <Switch 
                id="audio-debug-mode" 
                checked={audioDebugMode} 
                onCheckedChange={setAudioDebugMode}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default KeepAwake;
