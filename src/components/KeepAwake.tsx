import { useEffect, useRef, useState } from "react";
import { useTVDisplay } from "@/hooks/useTVDisplay";
import { AUDIO_EVENTS } from "@/utils/audioState";

// Detect Firestick/Fire TV specifically by user agent
const isFireStick = (): boolean => {
  const ua = navigator.userAgent.toLowerCase();
  return (
    ua.includes("silk") ||
    ua.includes("firetv") ||
    ua.includes("fire tv") ||
    ua.includes("aftb") ||
    ua.includes("aftt") ||
    ua.includes("afts") ||
    ua.includes("aftmm") ||
    ua.includes("aftka") ||
    ua.includes("afta") ||
    ua.includes("afteu") ||
    ua.includes("aftdct") ||
    ua.includes("aftrs") ||
    ua.includes("kindle")
  );
};

const KeepAwake = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isTV = useTVDisplay();
  const [keepAwakeActive, setKeepAwakeActive] = useState(false);
  const [isAlertPlaying, setIsAlertPlaying] = useState(false);
  const IS_FIRESTICK = isFireStick();

  // ─────────────────────────────────────────────────────────────────
  // Listen for Jamat Alerts — Pause KeepAwake Media to Prevent Conflicts
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onAlertStart = () => {
      console.log("[KeepAwake] Alert started — pausing media keep-alive");
      setIsAlertPlaying(true);
    };
    const onAlertEnd = () => {
      console.log("[KeepAwake] Alert ended — resuming media keep-alive");
      setIsAlertPlaying(false);
    };

    document.addEventListener(AUDIO_EVENTS.ALERT_STARTED, onAlertStart);
    document.addEventListener(AUDIO_EVENTS.ALERT_ENDED, onAlertEnd);

    return () => {
      document.removeEventListener(AUDIO_EVENTS.ALERT_STARTED, onAlertStart);
      document.removeEventListener(AUDIO_EVENTS.ALERT_ENDED, onAlertEnd);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // METHOD 1 (FIRESTICK BEST): Looping silent video element
  // Fire OS treats a playing video as "active content" and won't sleep.
  // This is the single most effective method for Firestick/Silk browser.
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isTV) return;

    console.log("[KeepAwake] Initializing silent video loop (Firestick primary)");

    const video = videoRef.current;
    if (!video) return;

    if (isAlertPlaying) {
      if (!video.paused) {
        video.pause();
        setKeepAwakeActive(false);
      }
      return; // Wait for alert to finish
    }

    // Build a 1-second transparent video via MediaSource or a data URI canvas stream
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 2;
      canvas.height = 2;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Draw a nearly-invisible pixel so the stream isn't empty
        ctx.fillStyle = "rgba(0,0,0,0.01)";
        ctx.fillRect(0, 0, 2, 2);
      }

      // captureStream is supported on Silk/Chromium-based browsers
      if (typeof (canvas as any).captureStream === "function") {
        const stream = (canvas as any).captureStream(1); // 1 fps is enough
        video.srcObject = stream;
        video.muted = true;
        video.loop = true;
        video.playsInline = true;

        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              // Only log once to avoid terminal spam
              if (!keepAwakeActive) console.log("[KeepAwake] Silent video playing — Firestick stay-awake active");
              setKeepAwakeActive(true);
            })
            .catch((e) => {
              console.warn("[KeepAwake] Silent video play failed:", e);
            });
        }
      } else {
        console.warn("[KeepAwake] captureStream not supported, skipping video method");
      }
    } catch (e) {
      console.error("[KeepAwake] Video method error:", e);
    }

    return () => {
      if (video) {
        video.pause();
        video.srcObject = null;
      }
      setKeepAwakeActive(false);
    };
  }, [isTV, isAlertPlaying]);

  // ─────────────────────────────────────────────────────────────────
  // METHOD 2: Canvas animation — forces GPU/screen refresh every frame
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isTV || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 4;
    canvas.height = 4;

    let frameCount = 0;
    let rafId: number;

    const animate = () => {
      frameCount++;
      const a = frameCount % 2 === 0 ? "rgba(0,0,0,0.005)" : "rgba(0,0,0,0.006)";
      const b = frameCount % 2 === 0 ? "rgba(0,0,0,0.006)" : "rgba(0,0,0,0.005)";
      ctx.fillStyle = a;
      ctx.fillRect(0, 0, 2, 2);
      ctx.fillRect(2, 2, 2, 2);
      ctx.fillStyle = b;
      ctx.fillRect(2, 0, 2, 2);
      ctx.fillRect(0, 2, 2, 2);
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    console.log("[KeepAwake] Canvas animation started");

    return () => cancelAnimationFrame(rafId);
  }, [isTV]);

  // ─────────────────────────────────────────────────────────────────
  // METHOD 3: Wake Lock API (works on modern Chromium, not Silk <91)
  // Aggressively re-requests lock when released or page becomes visible
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isTV) return;
    if (IS_FIRESTICK) {
      console.log("[KeepAwake] Skipping Wake Lock on Firestick (not supported by Silk)");
      // Still try — newer Silk versions may support it
    }

    let wakeLock: any = null;

    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await (navigator as any).wakeLock.request("screen");
          console.log("[KeepAwake] Wake Lock acquired");
          wakeLock.addEventListener("release", () => {
            console.log("[KeepAwake] Wake Lock released — re-requesting in 500ms");
            setTimeout(requestWakeLock, 500);
          });
        }
      } catch (e) {
        // Not supported or denied — silent fail, other methods cover this
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") requestWakeLock();
    };

    document.addEventListener("visibilitychange", onVisible);
    requestWakeLock();

    // Keep trying every 30s in case it drops without firing the release event
    const interval = setInterval(() => {
      if (!wakeLock || wakeLock.released) requestWakeLock();
    }, 30000);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
      if (wakeLock && !wakeLock.released) {
        wakeLock.release().catch(() => { });
      }
    };
  }, [isTV, IS_FIRESTICK]);

  // ─────────────────────────────────────────────────────────────────
  // METHOD 4 (FIRESTICK KEY): Simulated pointer/touch events
  // Firestick treats touch/pointer events as "user activity" and resets
  // the sleep timer. We dispatch synthetic events every 30 seconds.
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isTV) return;

    console.log("[KeepAwake] Starting synthetic interaction events");

    const simulateActivity = () => {
      try {
        // Dispatch a PointerEvent at a fixed off-screen position
        const pointerEvent = new PointerEvent("pointermove", {
          bubbles: true,
          cancelable: true,
          clientX: 1,
          clientY: 1,
        });
        document.dispatchEvent(pointerEvent);

        // Also dispatch a mousemove for older Silk compatibility
        const mouseEvent = new MouseEvent("mousemove", {
          bubbles: true,
          cancelable: true,
          clientX: 1,
          clientY: 1,
        });
        document.dispatchEvent(mouseEvent);

        // Touch event — Firestick remote can trigger touch APIs
        try {
          const touchEvent = new TouchEvent("touchstart", {
            bubbles: true,
            cancelable: true,
          });
          document.dispatchEvent(touchEvent);
          const touchEndEvent = new TouchEvent("touchend", {
            bubbles: true,
            cancelable: true,
          });
          document.dispatchEvent(touchEndEvent);
        } catch {
          // TouchEvent constructor not available on all platforms
        }

        // Keyboard event - useful for remote controls
        try {
          const keydownEvent = new KeyboardEvent("keydown", {
            key: "Shift",
            code: "ShiftLeft",
            keyCode: 16,
            which: 16,
            bubbles: true,
            cancelable: true
          });
          document.dispatchEvent(keydownEvent);
        } catch (e) { }

        if (Math.random() < 0.1) {
          console.log("[KeepAwake] Synthetic interaction dispatched at", new Date().toISOString());
        }
      } catch (e) {
        // Silent
      }
    };

    // Very frequent — every 8 seconds for Firestick
    const interval = setInterval(simulateActivity, IS_FIRESTICK ? 8000 : 30000);
    simulateActivity(); // Run immediately

    return () => clearInterval(interval);
  }, [isTV, IS_FIRESTICK]);

  // ─────────────────────────────────────────────────────────────────
  // METHOD 5: DOM repaint cycle + title ping
  // Forces the browser to recalculate layout and report activity
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isTV) return;

    const interval = setInterval(() => {
      // Flicker body opacity barely — undetectable to human eye
      document.body.style.opacity = "0.9999";
      setTimeout(() => { document.body.style.opacity = "1"; }, 50);

      // Title flicker (some TV browsers track title changes as activity)
      const title = document.title;
      document.title = title + "\u200B"; // zero-width space — invisible
      setTimeout(() => { document.title = title; }, 100);

      // Force layout calculation
      void document.body.getBoundingClientRect();
    }, IS_FIRESTICK ? 5000 : 20000);

    return () => clearInterval(interval);
  }, [isTV, IS_FIRESTICK]);

  // ─────────────────────────────────────────────────────────────────
  // METHOD 6: CSS animation — invisible elements cycling opacity
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isTV) return;

    const style = document.createElement("style");
    style.textContent = `
      @keyframes keepAwakeAnimation {
        0%   { opacity: 0.9980; }
        25%  { opacity: 0.9985; }
        50%  { opacity: 0.9990; }
        75%  { opacity: 0.9995; }
        100% { opacity: 0.9980; }
      }
      .keep-awake-el {
        position: fixed;
        width: 1px;
        height: 1px;
        bottom: 0;
        right: 0;
        opacity: 0.002;
        z-index: -1;
        animation: keepAwakeAnimation ${IS_FIRESTICK ? "2s" : "3s"} infinite;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);

    const els: HTMLElement[] = [];
    for (let i = 0; i < 3; i++) {
      const el = document.createElement("div");
      el.className = "keep-awake-el";
      el.style.right = `${i}px`;
      document.body.appendChild(el);
      els.push(el);
    }

    return () => {
      document.head.removeChild(style);
      els.forEach((el) => document.body.removeChild(el));
    };
  }, [isTV, IS_FIRESTICK]);

  // ─────────────────────────────────────────────────────────────────
  // METHOD 7: Network ping — prevents network idle sleep on Firestick
  // Firestick can drop network and enter deep sleep if no traffic flows
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isTV) return;

    const interval = setInterval(() => {
      fetch(window.location.href, {
        method: "HEAD",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      }).catch(() => { });
    }, IS_FIRESTICK ? 15000 : 120000); // Every 15s on Firestick, 2 min elsewhere

    return () => clearInterval(interval);
  }, [isTV, IS_FIRESTICK]);

  // ─────────────────────────────────────────────────────────────────
  // METHOD 8 (FIRESTICK ONLY): Window focus cycling
  // Silk browser responds to focus events as "user returned" signals
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isTV || !IS_FIRESTICK) return;

    console.log("[KeepAwake] Firestick focus cycling active");

    const interval = setInterval(() => {
      window.dispatchEvent(new Event("focus"));
      setTimeout(() => window.dispatchEvent(new Event("blur")), 50);
      setTimeout(() => window.dispatchEvent(new Event("focus")), 100);
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [isTV, IS_FIRESTICK]);

  // ─────────────────────────────────────────────────────────────────
  // METHOD 10 (FIRESTICK AGGRESSIVE): Silent audio oscillator
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isTV || !IS_FIRESTICK) return;

    console.log("[KeepAwake] Initializing silent audio oscillator");

    let audioCtx: AudioContext | null = null;
    let oscillator: OscillatorNode | null = null;
    let gainNode: GainNode | null = null;

    // Use a ref so the interval respects the latest state
    const isAlertPlayingRef = useRef(isAlertPlaying);
    isAlertPlayingRef.current = isAlertPlaying;

    const initAudio = () => {
      // Don't interrupt if an alert is currently playing
      if (isAlertPlayingRef.current) return;

      try {
        if (!audioCtx) {
          audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume();
        }

        if (oscillator) {
          try { oscillator.stop(); oscillator.disconnect(); } catch (e) { }
        }

        gainNode = audioCtx.createGain();
        gainNode.gain.value = 0.001; // nearly silent

        oscillator = audioCtx.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.value = 1;

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();

        setTimeout(() => {
          if (oscillator) {
            try {
              oscillator.stop();
              oscillator.disconnect();
              oscillator = null;
            } catch (e) { }
          }
        }, 100);
      } catch (e) { }
    };

    initAudio();
    const interval = setInterval(initAudio, 10000); // Every 10 seconds

    // Also try to resume context on any interaction (bypasses autoplay policies)
    const resumeAudio = () => {
      if (isAlertPlayingRef.current) return;
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    };
    document.addEventListener('click', resumeAudio);
    document.addEventListener('touchstart', resumeAudio);

    return () => {
      clearInterval(interval);
      document.removeEventListener('click', resumeAudio);
      document.removeEventListener('touchstart', resumeAudio);
      if (oscillator) {
        try { oscillator.stop(); oscillator.disconnect(); } catch (e) { }
      }
      if (audioCtx) {
        try { audioCtx.close(); } catch (e) { }
      }
    };
  }, [isTV, IS_FIRESTICK]);

  // ─────────────────────────────────────────────────────────────────
  // METHOD 9 (FIRESTICK ONLY): Periodic page reload guard
  // If the Silk browser goes to home screen, on return it will reload.
  // We store a heartbeat in sessionStorage and log if we "woke up" late.
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isTV || !IS_FIRESTICK) return;

    const HEARTBEAT_KEY = "keepawake_heartbeat";
    const EXPECTED_INTERVAL = 10000; // 10 seconds

    const lastBeat = sessionStorage.getItem(HEARTBEAT_KEY);
    if (lastBeat) {
      const gap = Date.now() - parseInt(lastBeat, 10);
      if (gap > EXPECTED_INTERVAL * 3) {
        console.warn(`[KeepAwake] Long gap detected: ${Math.round(gap / 1000)}s — device may have slept`);
      }
    }

    const interval = setInterval(() => {
      sessionStorage.setItem(HEARTBEAT_KEY, Date.now().toString());
    }, EXPECTED_INTERVAL);

    return () => clearInterval(interval);
  }, [isTV, IS_FIRESTICK]);

  // Only render on TV displays
  if (!isTV) return null;

  return (
    <>
      {/* Hidden video — primary Firestick keep-awake */}
      <video
        ref={videoRef}
        muted
        playsInline
        loop
        style={{
          position: "fixed",
          right: 0,
          bottom: 0,
          width: "1px",
          height: "1px",
          opacity: 0.001,
          pointerEvents: "none",
          zIndex: -1,
        }}
      />

      {/* Hidden canvas — GPU activity */}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          right: 2,
          bottom: 2,
          width: "2px",
          height: "2px",
          opacity: 0.005,
          pointerEvents: "none",
          zIndex: -1,
        }}
      />

      {/* Dev-mode status badge */}
      {process.env.NODE_ENV === "development" && (
        <div
          style={{
            position: "fixed",
            bottom: 5,
            right: 5,
            background: keepAwakeActive ? "rgba(0,200,0,0.25)" : "rgba(255,0,0,0.25)",
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "10px",
            color: keepAwakeActive ? "darkgreen" : "darkred",
            zIndex: 9999,
            fontFamily: "monospace",
          }}
        >
          {IS_FIRESTICK ? "🔥 Firestick" : "📺 TV"} — Keep Awake:{" "}
          {keepAwakeActive ? "✅ Active" : "⏳ Starting"}
        </div>
      )}
    </>
  );
};

export default KeepAwake;
