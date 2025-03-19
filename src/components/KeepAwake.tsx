import { useEffect, useRef, useState } from "react";
import { useTVDisplay } from "@/hooks/useTVDisplay";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

// Create unique IDs for the keep-awake elements to avoid conflicts
const KEEP_AWAKE_AUDIO_ID = "keep-awake-sound";
const KEEP_AWAKE_VIDEO_ID = "keep-awake-video";

interface WakeLockSentinel {
  release: () => Promise<void>;
}

interface NavigatorWithWakeLock extends Navigator {
  wakeLock?: {
    request: (type: string) => Promise<WakeLockSentinel>;
  };
}

const KeepAwake = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isTV = useTVDisplay();
  const [keepAwakeActive, setKeepAwakeActive] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [audioDebugMode, setAudioDebugMode] = useState(false);
  const { toast } = useToast();
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  
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
  
  // Use the silent video to keep the screen awake
  useEffect(() => {
    if (!isTV || !videoRef.current) return;
    
    console.log("Initializing video-based keep-awake system");
    
    const video = videoRef.current;
    
    // Set video source to the silent video uploaded to public directory
    video.src = "/silent-video.mp4";
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.volume = 0.001; // Near-silent volume
    
    // Try to start playback (may require user interaction)
    const playVideo = () => {
      if (!video) return;
      
      const playPromise = video.play();
      if (playPromise) {
        playPromise.then(() => {
          console.log("Keep-awake video playback started");
          setKeepAwakeActive(true);
        }).catch(err => {
          console.warn("Auto-play prevented for keep-awake video:", err);
          // Will try again with user interaction
        });
      }
    };
    
    // Try to play immediately
    playVideo();
    
    // Also try to play on user interaction (needed for browsers with strict autoplay policies)
    const unlockVideo = () => {
      playVideo();
    };
    
    document.addEventListener('click', unlockVideo, { once: true });
    document.addEventListener('touchstart', unlockVideo, { once: true });
    
    return () => {
      if (video) {
        video.pause();
        video.src = "";
      }
      document.removeEventListener('click', unlockVideo);
      document.removeEventListener('touchstart', unlockVideo);
      setKeepAwakeActive(false);
    };
  }, [isTV]);
  
  // Keep the canvas animation as a backup method
  useEffect(() => {
    if (!isTV || !canvasRef.current) return;
    
    console.log("Initializing canvas-based keep-awake system as backup");
    
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
    console.log("Canvas animation started as backup to prevent sleep");
    
    // Cleanup function
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isTV]);
  
  // Full screen refresh method - more aggressive approach for difficult TVs
  useEffect(() => {
    if (!isTV) return;
    
    console.log("Initializing aggressive screen refresh system");
    
    // Use a stronger approach every 30 seconds
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
      
      // Create and remove an element to trigger DOM updates
      const forcedRefreshElement = document.createElement('div');
      forcedRefreshElement.style.position = 'fixed';
      forcedRefreshElement.style.top = '0';
      forcedRefreshElement.style.left = '0';
      forcedRefreshElement.style.width = '100%';
      forcedRefreshElement.style.height = '100%';
      forcedRefreshElement.style.pointerEvents = 'none';
      forcedRefreshElement.style.opacity = '0.01';
      forcedRefreshElement.style.zIndex = '-1';
      
      document.body.appendChild(forcedRefreshElement);
      
      setTimeout(() => {
        if (document.body.contains(forcedRefreshElement)) {
          document.body.removeChild(forcedRefreshElement);
        }
      }, 200);
      
    }, 30000); // Every 30 seconds
    
    return () => {
      clearInterval(aggressiveRefreshInterval);
    };
  }, [isTV]);
  
  // Simulate user activity every 15 seconds to prevent sleep
  useEffect(() => {
    if (!isTV) return;
    
    console.log("KeepAwake activity simulation activated for TV display");
    
    // Simulate small DOM interactions to keep the device awake
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
      
      // Log activity occasionally to avoid console spam
      if (Math.random() < 0.1) { // Only log approximately 10% of the time
        console.log("Keep awake: Activity simulated at", new Date().toISOString());
      }
    }, 15000); // Every 15 seconds
    
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
          width: '1px',
          height: '1px',
          opacity: 0.01,
          pointerEvents: 'none',
          zIndex: -1
        }}
      />
      {/* Hidden video element that will use the silent-video.mp4 */}
      <video
        id={KEEP_AWAKE_VIDEO_ID}
        ref={videoRef}
        muted
        loop
        playsInline
        style={{
          position: 'fixed',
          width: '1px',
          height: '1px',
          opacity: 0,
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
              • Video: {keepAwakeActive ? 'Active' : 'Inactive'}
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
                size="sm"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default KeepAwake;
