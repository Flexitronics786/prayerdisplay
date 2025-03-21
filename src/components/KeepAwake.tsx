import { useEffect, useRef, useState } from "react";
import { useTVDisplay } from "@/hooks/useTVDisplay";

// Create a unique ID for the keep-awake audio element to avoid conflicts
const KEEP_AWAKE_AUDIO_ID = "keep-awake-sound";

const KeepAwake = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
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
  
  // Generate silent audio tone as an alternative method
  useEffect(() => {
    if (!isTV) return;
    
    try {
      // Create audio context
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) {
        console.warn("AudioContext not supported");
        return;
      }
      
      const audioContext = new AudioContext();
      
      // Create silent oscillator (near-silent tone at very low volume)
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.frequency.value = 1; // 1 Hz, extremely low frequency
      gainNode.gain.value = 0.0001; // Even lower volume to prevent conflict with prayer alerts
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start();
      console.log("Silent audio tone started to prevent sleep");
      
      return () => {
        oscillator.stop();
        audioContext.close();
      };
    } catch (error) {
      console.error("Error creating audio context:", error);
    }
  }, [isTV]);
  
  // Use a separate HTML audio element for keep-awake
  useEffect(() => {
    if (!isTV) return;
    
    // Create a persistent audio element for keep-awake
    let existingAudio = document.getElementById(KEEP_AWAKE_AUDIO_ID) as HTMLAudioElement;
    if (!existingAudio) {
      // Create a new audio element with specific ID to avoid conflicts
      existingAudio = document.createElement('audio');
      existingAudio.id = KEEP_AWAKE_AUDIO_ID;
      existingAudio.volume = 0.0001; // Virtually silent
      existingAudio.loop = true;
      existingAudio.muted = true;
      
      // Create an empty audio buffer - we just need browser to think it's playing
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const audioContext = new AudioContext();
          const source = audioContext.createBufferSource();
          source.buffer = audioContext.createBuffer(1, 1, 22050);
          source.connect(audioContext.destination);
        }
      } catch (e) {
        console.warn("Audio context not supported for keep-awake");
      }
      
      document.body.appendChild(existingAudio);
    }
    
    audioRef.current = existingAudio;
    
    // Try to start playback (may be rejected without user interaction)
    try {
      const playPromise = existingAudio.play();
      if (playPromise) {
        playPromise.catch(e => {
          console.warn("Auto-play prevented for keep-awake audio:", e);
        });
      }
    } catch (e) {
      console.warn("Could not auto-play keep-awake audio");
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [isTV]);
  
  // Simulate user activity every 15 seconds to prevent sleep
  useEffect(() => {
    if (!isTV) return;
    
    console.log("KeepAwake component activated for TV display");
    
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
      
      // Don't log this too often to avoid console spam
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
      {/* Hidden video element that will be activated by user interaction if needed */}
      <video
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
      >
        {/* Video sources can be added here if needed in the future */}
      </video>
      
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
