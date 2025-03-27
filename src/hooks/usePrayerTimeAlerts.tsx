import { useState, useEffect, useRef } from "react";
import { PrayerTime, DetailedPrayerTime } from "@/types";
import { getCurrentTime24h } from "@/utils/dateUtils";
import { supabase } from "@/integrations/supabase/client";
import { useTVDisplay } from "./useTVDisplay";

// Create a type for our supported prayer notifications
type PrayerNotificationType = "Fajr" | "Zuhr" | "Asr" | "Maghrib" | "Isha" | "Jummah";

// Interface to track jamat times for the day
interface DailyJamatTimes {
  [key: string]: string; // Prayer name -> time in HH:MM format
}

// Create a unique ID for this hook instance to avoid conflicts with KeepAwake
const PRAYER_ALERT_AUDIO_ID = "prayer-alert-sound";
// Add multiple audio elements for TV platforms
const MAX_AUDIO_ELEMENTS = 3;

export const usePrayerTimeAlerts = (
  prayerTimes: PrayerTime[],
  detailedTimes: DetailedPrayerTime | null
) => {
  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const checkedTimesRef = useRef<Set<string>>(new Set());
  const [lastCheckedMinute, setLastCheckedMinute] = useState<string>("");
  const [audioUrl, setAudioUrl] = useState<string>("");
  const dailyJamatTimesRef = useRef<DailyJamatTimes>({});
  const audioInitializedRef = useRef<boolean>(false);
  const isTV = useTVDisplay(); // Add TV detection
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const audioLoadAttemptsRef = useRef<number>(0); // Track loading attempts
  const lastPlayedTimeRef = useRef<number>(0);

  // Initialize audio elements and fetch the audio URL from Supabase
  useEffect(() => {
    const fetchAudioUrl = async () => {
      try {
        // First try to use a local file from the public directory
        const localBeepUrl = "/alert-beep.mp3";
        
        // Create audio elements - different approach for TV vs regular browser
        if (typeof window !== "undefined" && !audioInitializedRef.current) {
          // For all devices, set up the AudioContext for more reliable playback
          try {
            // Create AudioContext - this works better on TVs and FireStick
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
              audioContextRef.current = new AudioContextClass();
              console.log("Created AudioContext for prayer alerts");
              
              // Load the audio file as an ArrayBuffer
              const response = await fetch(localBeepUrl);
              const arrayBuffer = await response.arrayBuffer();
              
              // Decode the audio data
              audioContextRef.current.decodeAudioData(arrayBuffer, (buffer) => {
                audioBufferRef.current = buffer;
                console.log("Audio buffer loaded successfully");
              }, (error) => {
                console.error("Error decoding audio data:", error);
                
                // Try loading from Supabase if local file decoding fails
                loadSupabaseAudio();
              });
            }
          } catch (e) {
            console.error("Error creating AudioContext:", e);
          }
          
          // Create multiple audio elements for better reliability on TV platforms
          const numAudioElements = isTV ? MAX_AUDIO_ELEMENTS : 1;
          
          for (let i = 0; i < numAudioElements; i++) {
            const elementId = `${PRAYER_ALERT_AUDIO_ID}-${i}`;
            let existingAudio = document.getElementById(elementId) as HTMLAudioElement;
            
            if (!existingAudio) {
              // Create a new audio element with ID to avoid conflicts
              existingAudio = document.createElement('audio');
              existingAudio.id = elementId;
              existingAudio.preload = "auto"; // Preload the audio
              existingAudio.volume = isTV ? 1.0 : 0.7; // Louder on TV
              existingAudio.loop = false; // No looping
              
              // Add multiple sources for better compatibility
              const localSource = document.createElement('source');
              localSource.src = localBeepUrl;
              localSource.type = 'audio/mpeg';
              existingAudio.appendChild(localSource);
              
              // Add MP3 format for better compatibility
              const mp3Source = document.createElement('source');
              mp3Source.src = localBeepUrl;
              mp3Source.type = 'audio/mp3';
              existingAudio.appendChild(mp3Source);
              
              // Create a fallback to embedded base64 audio (for Firestick)
              if (isTV) {
                // Very short beep sound encoded as base64 (fallback for Firestick)
                const base64Audio = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tAwAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADmADMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzM//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAZHAAAAAAAAA5jZuYWYAAAAAAAAAAAAAAAAAAAA//tQwAAM8AAAf4AAAAwDAAh/gAAAQERERERERERERGRkZGRkZGRkZGRkZGRkZERERERERE/+5BEREY/8REf/EREZGf/ERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////8=";
                const base64Source = document.createElement('source');
                base64Source.src = base64Audio;
                base64Source.type = 'audio/mp3';
                existingAudio.appendChild(base64Source);
              }
              
              document.body.appendChild(existingAudio);
              console.log(`Created prayer alert audio element ${i} (TV mode: ${isTV}):`, localBeepUrl);
            }
            
            audioRefs.current.push(existingAudio);
            
            // Preload the audio on Firestick/TVs
            if (isTV) {
              try {
                existingAudio.load();
                console.log(`Preloaded audio element ${i} for TV`);
                
                // Try to play a silent version to unlock audio
                existingAudio.volume = 0.001;
                const silentPlay = existingAudio.play();
                if (silentPlay) {
                  silentPlay.then(() => {
                    existingAudio.pause();
                    existingAudio.currentTime = 0;
                    existingAudio.volume = 1.0;
                    console.log(`Audio ${i} preplay successful on TV`);
                  }).catch(e => {
                    console.log(`Silent audio ${i} preplay failed:`, e);
                  });
                }
              } catch (e) {
                console.error(`Error preloading audio ${i}:`, e);
              }
            }
          }
          
          setAudioUrl(localBeepUrl);
          audioInitializedRef.current = true;
          
          // Add fallback to Supabase if local file fails
          const loadSupabaseAudio = async () => {
            console.log("Loading Supabase fallback audio");
            
            try {
              const { data, error } = await supabase.storage
                .from('audio')
                .createSignedUrl('beep-125033.mp3', 60 * 60 * 24); // 24 hour signed URL
              
              if (error) {
                console.error("Error fetching audio URL from Supabase:", error);
                return;
              }
              
              if (data) {
                setAudioUrl(data.signedUrl);
                
                // Update all audio elements with the new source
                audioRefs.current.forEach((audioElement, index) => {
                  if (audioElement) {
                    // Clear existing sources
                    while (audioElement.firstChild) {
                      audioElement.removeChild(audioElement.firstChild);
                    }
                    
                    // Add Supabase source
                    const supabaseSource = document.createElement('source');
                    supabaseSource.src = data.signedUrl;
                    supabaseSource.type = 'audio/mpeg';
                    audioElement.appendChild(supabaseSource);
                    
                    // Add MP3 format for better compatibility
                    const mp3Source = document.createElement('source');
                    mp3Source.src = data.signedUrl;
                    mp3Source.type = 'audio/mp3';
                    audioElement.appendChild(mp3Source);
                    
                    console.log(`Added Supabase fallback audio source to element ${index}`);
                    
                    // Preload on TV
                    if (isTV) {
                      audioElement.load();
                    }
                  }
                });
                
                // Try to load this into the AudioContext
                if (audioContextRef.current) {
                  fetch(data.signedUrl)
                    .then(response => response.arrayBuffer())
                    .then(arrayBuffer => {
                      audioContextRef.current?.decodeAudioData(arrayBuffer, (buffer) => {
                        audioBufferRef.current = buffer;
                        console.log("Supabase audio buffer loaded successfully");
                      });
                    })
                    .catch(e => console.error("Error loading Supabase audio into AudioContext:", e));
                }
              }
            } catch (error) {
              console.error("Error setting up Supabase audio fallback:", error);
            }
          };
          
          // Handle audio element error events
          audioRefs.current.forEach((audioElement, index) => {
            audioElement.addEventListener('error', () => {
              console.log(`Local audio file ${index} failed, trying Supabase fallback`);
              loadSupabaseAudio();
            });
          });
          
          // Initialize with a user interaction to bypass autoplay restrictions
          const unlockAudio = () => {
            // Unlock standard HTML5 Audio elements
            audioRefs.current.forEach((audioElement, index) => {
              if (audioElement) {
                audioElement.volume = 0.001;
                const playPromise = audioElement.play();
                if (playPromise !== undefined) {
                  playPromise.then(() => {
                    if (audioElement) {
                      audioElement.pause();
                      audioElement.currentTime = 0;
                      audioElement.volume = isTV ? 1.0 : 0.7;
                      console.log(`HTML5 Audio ${index} unlocked for future playback`);
                    }
                  }).catch(e => {
                    console.warn(`HTML5 Audio ${index} unlock failed:`, e);
                  });
                }
              }
            });
            
            // Also resume AudioContext if available
            if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
              audioContextRef.current.resume().then(() => {
                console.log("AudioContext resumed successfully");
              }).catch(e => {
                console.error("Failed to resume AudioContext:", e);
              });
            }
            
            // Remove event listeners after one use
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
          };
          
          // Add event listeners to unlock audio on user interaction
          document.addEventListener('click', unlockAudio, { once: true });
          document.addEventListener('touchstart', unlockAudio, { once: true });
          
          // Also try to resume the AudioContext periodically (helps on TVs)
          const resumeInterval = setInterval(() => {
            if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
              audioContextRef.current.resume().then(() => {
                console.log("AudioContext resumed via interval");
              }).catch(() => {});
            }
          }, 10000); // Try every 10 seconds
          
          // Special handling for Firestick: create and play a short audio clip after 5 seconds
          if (isTV) {
            setTimeout(() => {
              // Try with all audio elements for better chances of success
              audioRefs.current.forEach((audioElement, index) => {
                try {
                  if (audioElement) {
                    audioElement.volume = 0.001; // Nearly silent
                    const tvUnlockPromise = audioElement.play();
                    if (tvUnlockPromise) {
                      tvUnlockPromise.then(() => {
                        setTimeout(() => {
                          if (audioElement) {
                            audioElement.pause();
                            audioElement.currentTime = 0;
                            console.log(`TV audio unlock ${index} successful`);
                          }
                        }, 100);
                      }).catch(e => {
                        console.log(`TV audio unlock ${index} failed:`, e);
                      });
                    }
                  }
                } catch (e) {
                  console.error(`TV audio unlock error ${index}:`, e);
                }
              });
            }, 5000);
          }
          
          return () => clearInterval(resumeInterval);
        }
      } catch (error) {
        console.error("Error setting up audio:", error);
      }
    };

    fetchAudioUrl();
    
    return () => {
      // Reset audio references on cleanup
      audioRefs.current = [];
      
      // Close AudioContext if it exists
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [isTV]);

  // Update daily jamat times at midnight or when detailed times change
  useEffect(() => {
    if (!detailedTimes) return;
    
    // Store all jamat times for the current day
    const updateDailyJamatTimes = () => {
      const jamatTimes: DailyJamatTimes = {};
      const prayers: PrayerNotificationType[] = ["Fajr", "Zuhr", "Asr", "Maghrib", "Isha"];
      
      // Add Jummah on Fridays
      const dayOfWeek = new Date().getDay();
      if (dayOfWeek === 5) {
        prayers.push("Jummah");
      }
      
      prayers.forEach(prayer => {
        let prayerTime: string | null = null;
        
        // Get the appropriate time for each prayer
        switch (prayer) {
          case "Fajr":
            prayerTime = detailedTimes.fajr_jamat;
            break;
          case "Zuhr":
            prayerTime = detailedTimes.zuhr_jamat;
            break;
          case "Asr":
            prayerTime = detailedTimes.asr_jamat;
            break;
          case "Maghrib":
            prayerTime = detailedTimes.maghrib_iftar; // Use start time for Maghrib
            break;
          case "Isha":
            prayerTime = detailedTimes.isha_first_jamat;
            break;
          case "Jummah":
            prayerTime = detailedTimes.zuhr_jamat; // Use Zuhr Jamat time for Jummah
            break;
        }
        
        if (prayerTime) {
          // Store only the HH:MM part for comparison
          jamatTimes[prayer] = prayerTime.substring(0, 5);
        }
      });
      
      console.log("Updated daily jamat times:", jamatTimes);
      dailyJamatTimesRef.current = jamatTimes;
    };
    
    // Update immediately
    updateDailyJamatTimes();
    
    // Set up a timer to update at midnight
    const midnight = new Date();
    midnight.setHours(24, 0, 5, 0); // 12:00:05 AM next day
    const now = new Date();
    const msUntilMidnight = midnight.getTime() - now.getTime();
    
    const midnightTimer = setTimeout(() => {
      updateDailyJamatTimes();
    }, msUntilMidnight);
    
    return () => clearTimeout(midnightTimer);
  }, [detailedTimes]);

  // Function to play the alert sound using both methods simultaneously for better results
  const playAlertSound = (prayerName: string) => {
    console.log(`Playing alert for ${prayerName} prayer time (TV mode: ${isTV})`);
    
    // Prevent multiple plays within 3 seconds (avoid duplicates)
    const now = Date.now();
    if (now - lastPlayedTimeRef.current < 3000) {
      console.log("Skipping alert sound - already played within the last 3 seconds");
      return;
    }
    lastPlayedTimeRef.current = now;
    
    // On TV/Firestick, use both methods simultaneously and play multiple times
    if (isTV) {
      // Method 1: AudioContext approach (most reliable on Firestick)
      if (audioContextRef.current && audioBufferRef.current) {
        try {
          // Create multiple sources for better volume
          for (let i = 0; i < 3; i++) {
            setTimeout(() => {
              try {
                if (!audioContextRef.current || !audioBufferRef.current) return;
                
                // Create a new source node
                const source = audioContextRef.current.createBufferSource();
                source.buffer = audioBufferRef.current;
                
                // Create a gain node for volume control
                const gainNode = audioContextRef.current.createGain();
                gainNode.gain.value = 1.0; // Full volume
                
                // Connect nodes
                source.connect(gainNode);
                gainNode.connect(audioContextRef.current.destination);
                
                // Play the sound
                source.start(0);
                console.log(`Playing alert #${i+1} using AudioContext`);
                
                // Stop after 2 seconds
                setTimeout(() => {
                  try {
                    source.stop();
                  } catch (e) {
                    // Already stopped, ignore
                  }
                }, 2000);
              } catch (e) {
                console.error(`Error playing with AudioContext (attempt ${i+1}):`, e);
              }
            }, i * 200); // Stagger by 200ms
          }
        } catch (e) {
          console.error("Error with AudioContext playback:", e);
        }
      }
      
      // Method 2: Create a temporary audio element approach (works on some Firesticks)
      try {
        const tempAudio = new Audio("/alert-beep.mp3");
        tempAudio.volume = 1.0;
        
        // Try multiple plays for better success chances
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            const clonedAudio = new Audio("/alert-beep.mp3");
            clonedAudio.volume = 1.0;
            const tempPlayPromise = clonedAudio.play();
            if (tempPlayPromise) {
              tempPlayPromise.then(() => {
                console.log(`Firestick temp audio #${i+1} playback successful`);
                // Let it play to completion
              }).catch(e => {
                console.error(`Firestick temp audio #${i+1} failed:`, e);
              });
            }
          }, i * 300); // Stagger attempts
        }
      } catch (e) {
        console.error("Error with temp audio approach:", e);
      }
      
      // Method 3: Use our pre-created audio elements
      if (audioRefs.current.length > 0) {
        // Try playing each audio element with staggered timing
        audioRefs.current.forEach((audioElement, index) => {
          if (!audioElement) return;
          
          setTimeout(() => {
            try {
              audioElement.volume = 1.0; // Full volume for TV
              audioElement.currentTime = 0; // Reset to beginning
              
              const playPromise = audioElement.play();
              if (playPromise) {
                playPromise.then(() => {
                  console.log(`Audio element ${index} playing successfully`);
                }).catch(e => {
                  console.error(`Audio element ${index} play failed:`, e);
                });
              }
            } catch (e) {
              console.error(`Error playing audio element ${index}:`, e);
            }
          }, index * 250); // Stagger timing
        });
      }
      
      return;
    }
    
    // Non-TV devices just need a simple approach
    if (audioRefs.current[0]) {
      audioRefs.current[0].volume = 0.7;
      audioRefs.current[0].currentTime = 0;
      audioRefs.current[0].play().catch(e => {
        console.error("Error playing alert sound:", e);
      });
    }
  };

  // Check and play alerts
  useEffect(() => {
    if (!detailedTimes || !audioInitializedRef.current) return;
    
    const checkTimes = () => {
      const currentTime24h = getCurrentTime24h();
      // Only check once per minute
      if (currentTime24h === lastCheckedMinute) return;
      setLastCheckedMinute(currentTime24h);
      
      // Format: HH:MM
      const currentMinutes = currentTime24h.substring(0, 5);
      
      // Log current time every minute on TV platforms for debugging
      if (isTV) {
        console.log(`⏰ Checking prayer times at ${currentMinutes}`, { 
          audioInitialized: audioInitializedRef.current,
          audioElementsCount: audioRefs.current.length,
          audioContextReady: !!audioBufferRef.current,
          jamatTimes: dailyJamatTimesRef.current
        });
      }
      
      // Check each stored jamat time from our daily record
      Object.entries(dailyJamatTimesRef.current).forEach(([prayer, prayerMinutes]) => {
        // Create a unique key for this prayer time
        const timeKey = `${prayer}-${prayerMinutes}-${new Date().toDateString()}`;
        
        // Alert if time matches and we haven't alerted for this time yet today
        if (prayerMinutes === currentMinutes && !checkedTimesRef.current.has(timeKey)) {
          // Mark this time as checked
          checkedTimesRef.current.add(timeKey);
          
          console.log(`⏰⏰⏰ JAMAT TIME ALERT for ${prayer} prayer at ${prayerMinutes} ⏰⏰⏰`);
          
          // Play alert sound multiple times for better visibility
          playAlertSound(prayer);
          
          // Schedule another play after 1 second for TV platforms (more reliable alerting)
          if (isTV) {
            setTimeout(() => {
              playAlertSound(prayer);
            }, 1000);
          }
        }
      });
    };
    
    // Check immediately and then every 3 seconds (more frequent for better reliability)
    checkTimes();
    const interval = setInterval(checkTimes, 3000);
    
    return () => clearInterval(interval);
  }, [detailedTimes, lastCheckedMinute, isTV]);

  // Reset the checked times at midnight
  useEffect(() => {
    const resetAtMidnight = () => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        console.log("Midnight reset - clearing checked prayer times");
        checkedTimesRef.current.clear();
      }
    };
    
    const midnight = setInterval(resetAtMidnight, 60000);
    return () => clearInterval(midnight);
  }, []);

  return null; // This hook doesn't render anything
};
