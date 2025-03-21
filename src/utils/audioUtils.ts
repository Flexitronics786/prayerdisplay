
// Audio utility functions for prayer time alerts
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    audioElement.setAttribute('playsinline', ''); // Important for iOS
    audioElement.setAttribute('webkit-playsinline', ''); // For older iOS versions
    document.body.appendChild(audioElement);
    
    // Try to load the local file first
    const localSource = document.createElement('source');
    localSource.src = "/beep-125033.mp3";
    localSource.type = 'audio/mpeg';
    audioElement.appendChild(localSource);
    
    // Add a backup source directly
    const backupSource = document.createElement('source');
    backupSource.src = "/alert-beep.mp3";
    backupSource.type = 'audio/mpeg';
    audioElement.appendChild(backupSource);
    
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
  if (!audioElement) return;
  
  // Create a silent buffer to play
  const originalVolume = audioElement.volume;
  audioElement.volume = 0.001;
  audioElement.muted = false; // Ensure not muted
  const playPromise = audioElement.play();
  if (playPromise !== undefined) {
    playPromise.then(() => {
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
        audioElement.volume = originalVolume; // Restore original volume
        console.log("Audio unlocked for future playback");
      }
    }).catch(e => {
      console.warn("Audio unlock failed, will try again on user interaction:", e);
    });
  }
};

/**
 * More comprehensive TV detection
 */
export const isDeviceTV = (): boolean => {
  if (typeof window === "undefined") return false;
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  
  // Check for explicit TV indicators
  const explicitTvs = [
    'tv', 'android tv', 'google tv', 'firetv', 'fire tv', 'webos',
    'tizen', 'vidaa', 'hbbtv', 'netcast', 'viera', 'aquos', 'bravia',
    'playstation', 'xbox', 'roku', 'appletv', 'apple tv', 'smart-tv', 'smarttv'
  ];
  
  const isTvUserAgent = explicitTvs.some(tvTerm => userAgent.includes(tvTerm));
  
  // Check for TV-like browsers
  const tvBrowsers = userAgent.includes('silk') && !userAgent.includes('mobile');
  
  // Check screen dimensions typical for TVs
  const isLargeScreen = window.innerWidth >= 1280 && window.innerHeight >= 720;
  const isWideAspectRatio = window.innerWidth / window.innerHeight >= 1.7; // 16:9 or wider
  
  // Combine checks (explicit TV UA or TV browser with large screen)
  const isTV = isTvUserAgent || (tvBrowsers && isLargeScreen && isWideAspectRatio);
  
  console.log("TV detection result:", { 
    userAgent, 
    isTvUserAgent,
    tvBrowsers,
    dimensions: `${window.innerWidth}x${window.innerHeight}`,
    aspectRatio: (window.innerWidth / window.innerHeight).toFixed(2),
    isTV
  });
  
  return isTV;
};

/**
 * Creates multiple audio elements for more reliable playback
 */
const createMultipleAudioElements = (url: string, count: number = 3): HTMLAudioElement[] => {
  const audioElements: HTMLAudioElement[] = [];
  
  for (let i = 0; i < count; i++) {
    const audio = new Audio(url);
    audio.volume = 1.0;
    audio.muted = false;
    audio.autoplay = false;
    audio.preload = 'auto';
    audio.setAttribute('playsinline', '');
    audio.setAttribute('webkit-playsinline', '');
    audioElements.push(audio);
  }
  
  return audioElements;
};

/**
 * Play alert sound for prayer time with enhanced reliability for TVs
 */
export const playAlertSound = (prayerName: string, audioElement: HTMLAudioElement | null, audioUrl: string): void => {
  console.log(`Attempting to play alert sound for ${prayerName}`);
  
  if (!audioElement && !audioUrl) {
    console.error("No audio reference or URL available");
    return;
  }
  
  // For TV devices, create multiple audio elements for better compatibility
  if (isDeviceTV()) {
    console.log(`TV device detected, using enhanced playback method for: ${prayerName}`);
    
    // Try multiple audio formats and elements
    const localUrl = "/beep-125033.mp3";
    const backupUrl = "/alert-beep.mp3";
    const urls = [audioUrl, localUrl, backupUrl].filter(Boolean);
    
    // Create multiple audio elements for each URL for redundancy
    urls.forEach(url => {
      const audioElements = createMultipleAudioElements(url);
      
      // Try to play each audio element with a slight delay
      audioElements.forEach((audio, index) => {
        setTimeout(() => {
          try {
            const playPromise = audio.play();
            if (playPromise) {
              playPromise.then(() => {
                console.log(`Playing TV alert sound (attempt ${index+1}) for ${prayerName}`);
              }).catch(err => {
                console.error(`TV audio playback failed (attempt ${index+1}) for ${prayerName}:`, err);
              });
            }
          } catch (err) {
            console.error(`Error in TV audio playback (attempt ${index+1}):`, err);
          }
        }, index * 500); // Stagger attempts by 500ms
      });
    });
    
    return;
  }
  
  // For non-TV devices, use the standard approach with fallbacks
  try {
    // Try the main audio element first
    if (audioElement) {
      // Stop any current playback
      if (!audioElement.paused) {
        audioElement.pause();
      }
      
      // Reset to the beginning 
      audioElement.currentTime = 0;
      audioElement.volume = 1.0; // Full volume
      audioElement.muted = false; // Ensure not muted
      
      console.log(`Playing alert for ${prayerName} prayer time`);
      
      // Play the sound
      const mainPlayPromise = audioElement.play();
      if (mainPlayPromise) {
        mainPlayPromise.then(() => {
          console.log(`Alert sound played successfully for ${prayerName}`);
        }).catch(err => {
          console.error(`Error playing alert sound for ${prayerName}:`, err);
          tryFallbackAudio(audioUrl || "/beep-125033.mp3", prayerName);
        });
      }
    } else {
      // If no main audio element, go straight to fallback
      tryFallbackAudio(audioUrl || "/beep-125033.mp3", prayerName);
    }
  } catch (error) {
    console.error("Error during sound playback:", error);
    tryFallbackAudio(audioUrl || "/beep-125033.mp3", prayerName);
  }
};

/**
 * Try fallback audio playback methods
 */
const tryFallbackAudio = (audioUrl: string, prayerName: string): void => {
  try {
    console.log(`Trying fallback audio for ${prayerName}`);
    
    // Try multiple fallback methods
    const fallbackAudio1 = new Audio(audioUrl);
    fallbackAudio1.volume = 1.0;
    fallbackAudio1.play().catch(() => {
      // If that fails, try with the backup audio file
      const fallbackAudio2 = new Audio("/alert-beep.mp3");
      fallbackAudio2.volume = 1.0;
      fallbackAudio2.play().catch(e => {
        console.error("All fallback audio attempts failed:", e);
      });
    });
  } catch (fallbackError) {
    console.error("Complete audio failure:", fallbackError);
  }
};

