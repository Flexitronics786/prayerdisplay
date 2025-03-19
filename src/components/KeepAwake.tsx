import { useEffect, useRef, useState } from "react";
import { useTVDisplay } from "@/hooks/useTVDisplay";

// Create a unique ID for the keep-awake audio element to avoid conflicts
const KEEP_AWAKE_AUDIO_ID = "keep-awake-sound";
const KEEP_AWAKE_VIDEO_ID = "keep-awake-video";

const KeepAwake = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isTV = useTVDisplay();
  const [keepAwakeActive, setKeepAwakeActive] = useState(false);
  
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
