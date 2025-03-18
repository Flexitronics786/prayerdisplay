import { useEffect, useRef, useState } from "react";
import { useTVDisplay } from "@/hooks/useTVDisplay";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const KeepAwake = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isTV = useTVDisplay();
  const [videoLoaded, setVideoLoaded] = useState(false);
  
  // Fetch and play the silent video that keeps the screen awake
  useEffect(() => {
    if (!isTV) return;
    
    const fetchKeepAwakeVideo = async () => {
      try {
        // Get public URL for the video
        const { data, error } = await supabase
          .storage
          .from('keep-awake')
          .getPublicUrl('silent-video.mp4');
        
        if (error) {
          console.error("Error getting video URL:", error);
          return;
        }
        
        if (data && videoRef.current) {
          videoRef.current.src = data.publicUrl;
          videoRef.current.load();
          
          // Add event listeners to track video loading
          videoRef.current.onloadeddata = () => {
            console.log("Keep awake video loaded successfully");
            setVideoLoaded(true);
          };
          
          videoRef.current.onerror = (e) => {
            console.error("Video loading error:", e);
            // Don't show error toast on TV displays to avoid disrupting the experience
            if (!isTV) {
              toast.error("Failed to load keep-awake video. Screen may go to sleep.");
            }
          };
          
          // Try to play the video
          videoRef.current.play().catch(e => {
            console.error("Failed to autoplay video:", e);
            // DOM activity will still work as fallback
          });
        }
      } catch (error) {
        console.error("Error fetching keep awake video:", error);
      }
    };
    
    fetchKeepAwakeVideo();
    
    // Cleanup function
    return () => {
      if (videoRef.current) {
        videoRef.current.onloadeddata = null;
        videoRef.current.onerror = null;
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
      if (!videoLoaded) {
        document.body.style.opacity = "0.99999";
        setTimeout(() => {
          document.body.style.opacity = "1";
        }, 10);
      }
      
      console.log("Keep awake: Activity simulated at", new Date().toISOString());
    }, 15000); // Every 15 seconds
    
    return () => {
      clearInterval(activityInterval);
    };
  }, [isTV, videoLoaded]);
  
  // Only render video element on TV displays
  if (!isTV) return null;
  
  return (
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
    />
  );
};

export default KeepAwake;
