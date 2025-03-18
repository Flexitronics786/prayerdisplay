import React, { useEffect, useRef } from "react";
import { isFirestick } from "@/hooks/useTVDisplay";

// This component helps prevent TVs and streaming devices from going into sleep mode
// by playing a small invisible video on loop and periodically interacting with the screen
const KeepAwake: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isFireTV = isFirestick();
  
  useEffect(() => {
    // Start the video when component mounts
    if (videoRef.current) {
      videoRef.current.play().catch(error => {
        console.error("Failed to auto-play video:", error);
      });
    }
    
    // Setup an interval to ensure the device stays awake
    // by doing small operations that prevent sleep mode
    const interval = setInterval(() => {
      // Move an invisible element to trigger screen refresh
      const elem = document.createElement('div');
      elem.style.position = 'absolute';
      elem.style.opacity = '0';
      elem.style.pointerEvents = 'none';
      document.body.appendChild(elem);
      
      // Random position changes to simulate activity
      const x = Math.random() * window.innerWidth;
      const y = Math.random() * window.innerHeight;
      elem.style.transform = `translate(${x}px, ${y}px)`;
      
      // Remove after a small delay
      setTimeout(() => {
        document.body.removeChild(elem);
      }, 100);
      
      // For Firestick and similar devices, try to ensure video is playing
      if (videoRef.current && (videoRef.current.paused || videoRef.current.ended)) {
        videoRef.current.play().catch(e => console.log("Video restart attempt"));
      }
      
      console.log("Keep-awake ping - preventing sleep mode");
    }, 15000); // Every 15 seconds
    
    return () => {
      clearInterval(interval);
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };
  }, [isFireTV]);
  
  return (
    <div className="keep-awake-container" style={{ position: 'fixed', opacity: 0, pointerEvents: 'none' }}>
      {/* Tiny video element that keeps playing to prevent sleep mode */}
      <video 
        ref={videoRef}
        width="2" 
        height="2"
        muted
        loop
        playsInline
        preload="auto"
        autoPlay
        src="data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAA+NtZGF0AAACrQYF//+p3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE0MiByMjQ3OSBkZDc5YTYxIC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAxNCAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MzoweDExMyBtZT1oZXggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MSBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTMgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0zIGJfcHlyYW1pZD0yIGJfYWRhcHQ9MSBiX2JpYXM9MCBkaXJlY3Q9MSB3ZWlnaHRiPTEgb3Blbl9nb3A9MCB3ZWlnaHRwPTIga2V5aW50PTI1MCBrZXlpbnRfbWluPTI1IHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9NDAgcmM9Y3JmIG1idHJlZT0xIGNyZj0yMy4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMACAAAAADmWIhABf/ysAlD3dyLu5BYZGWrEo6YdYsSirRn0T4+T981EAAAACAAADAAADAAADAALDi/8J/r4Ir1yBkgAAAwAAQAADMTwdZYDw/IfNQwAABN2/n6f2KAOAHDSgAAA4B3DHTgJ2AkYxODk0ADgJ2AkYxNDkyADgJ2AkYxODkyADgJ2AkYxNDkwADgJ2AkYxODg4ADgJ2AkYxNDg4ADgJ2AkYxODg3ADgJ2AkYxNDg3ADgJ2AkYxODg1ADgJ2AkYxNDg1AA=="
      />
    </div>
  );
};

export default KeepAwake;
