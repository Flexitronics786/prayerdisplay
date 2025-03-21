
// Audio utility functions for prayer time alerts
import { supabase } from "@/integrations/supabase/client";

const PRAYER_ALERT_AUDIO_ID = "prayer-alert-sound";

/**
 * Initialize audio element for prayer alerts
 */
export const initializeAudioElement = (): HTMLAudioElement | null => {
  if (typeof window === "undefined") return null;
  
  // Check if we already have an audio element with this ID
  let audioElement = document.getElementById(PRAYER_ALERT_AUDIO_ID) as HTMLAudioElement;
  
  if (!audioElement) {
    // Create a new audio element with ID to avoid conflicts
    audioElement = document.createElement('audio');
    audioElement.id = PRAYER_ALERT_AUDIO_ID;
    audioElement.preload = "auto"; // Preload the audio
    audioElement.volume = 1.0; // Maximum volume
    audioElement.muted = false; // Ensure not muted
    document.body.appendChild(audioElement);
    
    // Try to load the local file first
    const localSource = document.createElement('source');
    localSource.src = "/beep-125033.mp3";
    localSource.type = 'audio/mpeg';
    audioElement.appendChild(localSource);
    
    console.log("Created prayer alert audio element with local source");
  }
  
  return audioElement;
};

/**
 * Sets up a fallback to Supabase if local audio file fails
 */
export const setupAudioFallback = (audioElement: HTMLAudioElement, onSuccess: (url: string) => void): void => {
  audioElement.addEventListener('error', async () => {
    console.log("Local audio file failed, trying Supabase fallback");
    
    try {
      const { data, error } = await supabase.storage
        .from('audio')
        .createSignedUrl('beep-125033.mp3', 60 * 60 * 24); // 24 hour signed URL
      
      if (error) {
        console.error("Error fetching audio URL from Supabase:", error);
        return;
      }
      
      if (data) {
        onSuccess(data.signedUrl);
        
        // Clear existing sources
        while (audioElement.firstChild) {
          audioElement.removeChild(audioElement.firstChild);
        }
        
        // Add Supabase source
        const supabaseSource = document.createElement('source');
        supabaseSource.src = data.signedUrl;
        supabaseSource.type = 'audio/mpeg';
        audioElement.appendChild(supabaseSource);
        
        console.log("Added Supabase fallback audio source");
      }
    } catch (error) {
      console.error("Error setting up Supabase audio fallback:", error);
    }
  });
};

/**
 * Unlock audio on first user interaction to bypass autoplay restrictions
 */
export const unlockAudio = (audioElement: HTMLAudioElement): void => {
  // Create a silent buffer to play
  audioElement.volume = 0.001;
  audioElement.muted = false; // Ensure not muted
  const playPromise = audioElement.play();
  if (playPromise !== undefined) {
    playPromise.then(() => {
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
        audioElement.volume = 1.0; // Set to max volume
        console.log("Audio unlocked for future playback");
      }
    }).catch(e => {
      console.warn("Audio unlock failed, will try again on user interaction:", e);
    });
  }
};

/**
 * Check if device is a TV based on userAgent
 */
export const isDeviceTV = (): boolean => {
  if (typeof window === "undefined") return false;
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  return userAgent.includes('tv') || 
         userAgent.includes('firetv') ||
         userAgent.includes('fire tv') ||
         userAgent.includes('webos') ||
         userAgent.includes('tizen');
};

/**
 * Play alert sound for prayer time
 */
export const playAlertSound = (prayerName: string, audioElement: HTMLAudioElement | null, audioUrl: string): void => {
  if (!audioElement) {
    console.error("Audio reference not available");
    return;
  }
  
  // For TV devices, create a new audio element for better compatibility
  if (isDeviceTV()) {
    console.log("TV device detected, using special playback method for:", prayerName);
    
    // Create a temporary audio element for this specific play
    const tempAudio = new Audio(audioUrl || "/beep-125033.mp3");
    tempAudio.volume = 1.0;
    tempAudio.muted = false;
    tempAudio.autoplay = true;
    
    // Force loading and playing
    tempAudio.load();
    tempAudio.play().then(() => {
      console.log(`Playing TV alert sound for ${prayerName} prayer time`);
    }).catch(err => {
      console.error(`TV audio playback failed for ${prayerName}:`, err);
    });
    
    return;
  }
  
  // For non-TV devices, use the standard approach
  try {
    // Stop any current playback
    if (!audioElement.paused) {
      audioElement.pause();
    }
    
    // Reset to the beginning 
    audioElement.currentTime = 0;
    audioElement.volume = 1.0; // Full volume
    audioElement.muted = false; // Ensure not muted
    
    console.log(`Playing alert for ${prayerName} prayer time`);
    
    // Play the sound once
    audioElement.play().then(() => {
      console.log(`Alert sound played successfully for ${prayerName}`);
    }).catch(err => {
      console.error(`Error playing alert sound for ${prayerName}:`, err);
      
      // Fallback to a new Audio instance if the main one fails
      try {
        const fallbackAudio = new Audio(audioUrl || "/beep-125033.mp3");
        fallbackAudio.volume = 1.0;
        fallbackAudio.play().catch(e => console.error("Fallback audio also failed:", e));
      } catch (fallbackError) {
        console.error("Complete audio failure:", fallbackError);
      }
    });
  } catch (error) {
    console.error("Error during sound playback:", error);
  }
};
