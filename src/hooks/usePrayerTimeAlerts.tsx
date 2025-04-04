
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

export const usePrayerTimeAlerts = (
  prayerTimes: PrayerTime[],
  detailedTimes: DetailedPrayerTime | null
) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
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

  // Initialize audio element and fetch the audio URL from Supabase
  useEffect(() => {
    const fetchAudioUrl = async () => {
      try {
        // First try to use a local file from the public directory
        const localBeepUrl = "/alert-beep.mp3";
        
        // Create audio element - different approach for TV vs regular browser
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
          
          // Also set up the standard HTML5 Audio element as fallback
          let existingAudio = document.getElementById(PRAYER_ALERT_AUDIO_ID) as HTMLAudioElement;
          
          if (!existingAudio) {
            // Create a new audio element with ID to avoid conflicts
            existingAudio = document.createElement('audio');
            existingAudio.id = PRAYER_ALERT_AUDIO_ID;
            existingAudio.preload = "auto"; // Preload the audio
            existingAudio.volume = isTV ? 1.0 : 0.7; // Louder on TV
            document.body.appendChild(existingAudio);
            
            // Try to load the local file first
            const localSource = document.createElement('source');
            localSource.src = localBeepUrl;
            localSource.type = 'audio/mpeg';
            existingAudio.appendChild(localSource);
            
            // Add MP3 format for better compatibility
            const mp3Source = document.createElement('source');
            mp3Source.src = localBeepUrl;
            mp3Source.type = 'audio/mp3';
            existingAudio.appendChild(mp3Source);
            
            console.log(`Created prayer alert audio element with local source (TV mode: ${isTV}):`, localBeepUrl);
          }
          
          audioRef.current = existingAudio;
          setAudioUrl(localBeepUrl);
          audioInitializedRef.current = true;
          
          // Preload the audio on Firestick/TVs
          if (isTV) {
            try {
              existingAudio.load();
              console.log("Preloaded audio for TV");
              
              // Try to play a silent version to unlock audio
              existingAudio.volume = 0.001;
              const silentPlay = existingAudio.play();
              if (silentPlay) {
                silentPlay.then(() => {
                  existingAudio.pause();
                  existingAudio.currentTime = 0;
                  existingAudio.volume = 1.0;
                  console.log("Audio preplay successful on TV");
                }).catch(e => {
                  console.log("Silent audio preplay failed:", e);
                });
              }
            } catch (e) {
              console.error("Error preloading audio:", e);
            }
          }
          
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
                if (audioRef.current) {
                  // Clear existing sources
                  while (audioRef.current.firstChild) {
                    audioRef.current.removeChild(audioRef.current.firstChild);
                  }
                  
                  // Add Supabase source
                  const supabaseSource = document.createElement('source');
                  supabaseSource.src = data.signedUrl;
                  supabaseSource.type = 'audio/mpeg';
                  audioRef.current.appendChild(supabaseSource);
                  
                  // Add MP3 format for better compatibility
                  const mp3Source = document.createElement('source');
                  mp3Source.src = data.signedUrl;
                  mp3Source.type = 'audio/mp3';
                  audioRef.current.appendChild(mp3Source);
                  
                  console.log("Added Supabase fallback audio source");
                  
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
                  
                  // Preload on TV
                  if (isTV && audioRef.current) {
                    audioRef.current.load();
                  }
                }
              }
            } catch (error) {
              console.error("Error setting up Supabase audio fallback:", error);
            }
          };
          
          existingAudio.addEventListener('error', () => {
            console.log("Local audio file failed, trying Supabase fallback");
            loadSupabaseAudio();
          });
          
          // Initialize with a user interaction to bypass autoplay restrictions
          const unlockAudio = () => {
            // Unlock standard HTML5 Audio
            if (audioRef.current) {
              audioRef.current.volume = 0.001;
              const playPromise = audioRef.current.play();
              if (playPromise !== undefined) {
                playPromise.then(() => {
                  if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                    audioRef.current.volume = isTV ? 1.0 : 0.7;
                    console.log("HTML5 Audio unlocked for future playback");
                  }
                }).catch(e => {
                  console.warn("HTML5 Audio unlock failed:", e);
                });
              }
            }
            
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
              try {
                if (audioRef.current) {
                  audioRef.current.volume = 0.001; // Nearly silent
                  const tvUnlockPromise = audioRef.current.play();
                  if (tvUnlockPromise) {
                    tvUnlockPromise.then(() => {
                      setTimeout(() => {
                        if (audioRef.current) {
                          audioRef.current.pause();
                          audioRef.current.currentTime = 0;
                          console.log("TV audio unlock successful");
                        }
                      }, 100);
                    }).catch(e => {
                      console.log("TV audio unlock failed:", e);
                    });
                  }
                }
              } catch (e) {
                console.error("TV audio unlock error:", e);
              }
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
      // Don't remove the audio element on cleanup, just release our reference
      if (audioRef.current) {
        audioRef.current = null;
      }
      
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

  // Function to play the alert sound using both HTML5 Audio and AudioContext for better compatibility
  const playAlertSound = (prayerName: string) => {
    console.log(`Playing alert for ${prayerName} prayer time (TV mode: ${isTV})`);
    
    // Firestick-specific approach - try to create a new audio element for each play
    if (isTV && navigator.userAgent.toLowerCase().includes('firetv')) {
      try {
        const tempAudio = new Audio("/alert-beep.mp3");
        tempAudio.volume = 1.0;
        const tempPlayPromise = tempAudio.play();
        if (tempPlayPromise) {
          tempPlayPromise.then(() => {
            console.log("Firestick temp audio playback successful");
            // Let it play and clean up after 3 seconds
            setTimeout(() => {
              try {
                tempAudio.pause();
              } catch (e) {
                // Ignore cleanup errors
              }
            }, 3000);
          }).catch(e => {
            console.error("Firestick temp audio failed:", e);
            // Fall through to next approach
          });
          
          // If this worked, return early
          return;
        }
      } catch (e) {
        console.error("Error with Firestick temp audio approach:", e);
        // Continue to next approach
      }
    }
    
    // Try to play using AudioContext first (better for TV devices)
    if (audioContextRef.current && audioBufferRef.current) {
      try {
        // Stop any previous sound
        if (audioSourceRef.current) {
          try {
            audioSourceRef.current.stop();
          } catch (e) {
            // Ignore errors when stopping
          }
        }
        
        // Create a new source node
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBufferRef.current;
        
        // Create a gain node for volume control
        const gainNode = audioContextRef.current.createGain();
        gainNode.gain.value = isTV ? 1.0 : 0.7; // Full volume on TV
        
        // Connect nodes
        source.connect(gainNode);
        gainNode.connect(audioContextRef.current.destination);
        
        // Store reference to stop later
        audioSourceRef.current = source;
        
        // Play the sound
        source.start(0);
        console.log("Playing alert using AudioContext");
        
        // Stop after 3 seconds (longer duration for TV)
        setTimeout(() => {
          try {
            source.stop();
            console.log("Stopped AudioContext alert sound");
          } catch (e) {
            // Already stopped, ignore
          }
        }, isTV ? 3000 : 2000);
        
        // Return early if AudioContext playback succeeds
        return;
      } catch (e) {
        console.error("Error playing with AudioContext, falling back to HTML5 Audio:", e);
      }
    }
    
    // Fallback to HTML5 Audio
    if (!audioRef.current) {
      console.error("Audio reference not available");
      return;
    }
    
    // Stop any other audio that might be playing
    const allAudioElements = document.querySelectorAll('audio');
    allAudioElements.forEach(audio => {
      if (audio.id !== PRAYER_ALERT_AUDIO_ID && !audio.paused) {
        audio.pause();
      }
    });
    
    // Reset to the beginning 
    audioRef.current.currentTime = 0;
    audioRef.current.volume = isTV ? 1.0 : 0.7; // Full volume on TV
    
    // Try multiple approaches for TV platforms
    if (isTV) {
      // For Firestick on Sony TV, try playing multiple times
      let attempts = 0;
      const maxAttempts = 3;
      
      const attemptPlay = () => {
        if (!audioRef.current || attempts >= maxAttempts) return;
        
        attempts++;
        console.log(`TV audio play attempt ${attempts}/${maxAttempts}`);
        
        try {
          // Reload the audio element before playing (helps on some TVs)
          if (audioLoadAttemptsRef.current < 5) {
            audioRef.current.load();
            audioLoadAttemptsRef.current++;
          }
          
          const playPromise = audioRef.current.play();
          if (playPromise) {
            playPromise.then(() => {
              console.log(`TV audio playing (attempt ${attempts})`);
              
              // Set a timeout to stop after 3 seconds
              setTimeout(() => {
                if (audioRef.current) {
                  audioRef.current.pause();
                  audioRef.current.currentTime = 0;
                }
              }, 3000);
            }).catch(err => {
              console.error(`TV audio play error (attempt ${attempts}):`, err);
              
              // Try again with a slight delay
              if (attempts < maxAttempts) {
                setTimeout(attemptPlay, 200);
              }
            });
          }
        } catch (err) {
          console.error(`TV audio exception (attempt ${attempts}):`, err);
          
          // Try again with a slight delay
          if (attempts < maxAttempts) {
            setTimeout(attemptPlay, 200);
          }
        }
      };
      
      // Start the attempt chain
      attemptPlay();
      
      return;
    }
    
    // Play the sound multiple times with increasing volume to ensure it's heard
    const attemptToPlay = (attempt = 1, maxAttempts = 3) => {
      if (!audioRef.current) return;
      
      // Increase volume slightly with each attempt
      audioRef.current.volume = Math.min((isTV ? 0.8 : 0.7) + (attempt * 0.1), 1.0);
      
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Set a timeout to stop the sound after 2-3 seconds
            setTimeout(() => {
              if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
                console.log("Prayer notification beep completed");
              }
            }, isTV ? 3000 : 2000); // Longer duration for TV
          })
          .catch(err => {
            console.error(`Error playing prayer alert sound (attempt ${attempt}):`, err);
            
            // Try again with a delay if we haven't reached max attempts
            if (attempt < maxAttempts) {
              setTimeout(() => {
                attemptToPlay(attempt + 1, maxAttempts);
              }, 500);
            }
          });
      }
    };
    
    // Start playing with attempt 1
    attemptToPlay();
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
      
      // Check each stored jamat time from our daily record
      Object.entries(dailyJamatTimesRef.current).forEach(([prayer, prayerMinutes]) => {
        // Create a unique key for this prayer time
        const timeKey = `${prayer}-${prayerMinutes}-${new Date().toDateString()}`;
        
        // Alert if time matches and we haven't alerted for this time yet today
        if (prayerMinutes === currentMinutes && !checkedTimesRef.current.has(timeKey)) {
          // Mark this time as checked
          checkedTimesRef.current.add(timeKey);
          
          console.log(`⏰ JAMAT TIME ALERT for ${prayer} prayer at ${prayerMinutes} ⏰`);
          
          // Play alert sound and show notification
          playAlertSound(prayer);
        }
      });
    };
    
    // Check immediately and then every 5 seconds (more frequent for reliability)
    checkTimes();
    const interval = setInterval(checkTimes, 5000);
    
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
