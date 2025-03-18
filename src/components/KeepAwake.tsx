import { useEffect, useRef } from "react";
import { useTVDisplay } from "@/hooks/useTVDisplay";
import { supabase } from "@/integrations/supabase/client";

const KeepAwake = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isTV = useTVDisplay();
  
  // Fetch and play the silent video that keeps the screen awake
  useEffect(() => {
    if (!isTV) return;
    
    const fetchKeepAwakeVideo = async () => {
      try {
        // Get public URL for the video
        const { data } = await supabase
          .storage
          .from('keep-awake')
          .getPublicUrl('silent-video.mp4');
        
        if (data && videoRef.current) {
          videoRef.current.src = data.publicUrl;
          videoRef.current.load();
          videoRef.current.play().catch(e => console.error("Failed to autoplay video:", e));
        }
      } catch (error) {
        console.error("Error fetching keep awake video:", error);
      }
    };
    
    fetchKeepAwakeVideo();
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
      
      console.log("Keep awake: Activity simulated at", new Date().toISOString());
    }, 15000); // Every 15 seconds
    
    return () => {
      clearInterval(activityInterval);
    };
  }, [isTV]);
  
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
