"use client";
import React, { useState, useEffect, useRef, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getBilateralEnvironments } from "@/components/dashboard/bilateral/VisualEnvironmentSelector";
import { getBilateralIcons } from "@/components/dashboard/bilateral/VisualIconSelector";
import { getBilateralSounds } from "@/components/dashboard/bilateral/SoundSelector";
import { useStoredAuth } from "@/redux/authStorage";
import { analyzeAudioUrl } from "@/utils/bilateralAudioAnalysis";

const SPEED_MS = { slow: 2600, medium: 2000, fast: 1500 };
const TOTAL_SETS = 34;
const VIDEO_STIMULUS_SIZE = 220;
const IMAGE_STIMULUS_SIZE = 90;
const EDGE_PADDING = 8;
const ONE_SHOT_HIT_PLAY_MS = 1200;
const DETECTED_HIT_MAX_PLAY_MS = 420;
const UNKNOWN_HIT_PLAY_MS = 320;
const AUDIO_AFTER_HIT_DELAY_MS = 0;
const VALID_DIRECTIONS = ["horizontal", "vertical", "diagonal-up", "diagonal-down"];
const DEBUG_BILATERAL_AUDIO = process.env.NODE_ENV !== "production";
const MOVEMENT_STATES = {
  IDLE: "idle",
  MOVING: "moving",
  ENDPOINT_HIT: "endpoint-hit",
  STOPPED: "stopped",
};

const normalizeDirection = (value) => {
  if (value === "left-right") return "horizontal";
  return VALID_DIRECTIONS.includes(value) ? value : "horizontal";
};

const isUsableProfile = (profile) =>
  profile?.analysisStatus === "success" &&
  ["one-shot", "two-hit-stereo", "stereo-track", "unknown"].includes(profile?.mode);

const usableHits = (profile) =>
  Array.isArray(profile?.hits)
    ? profile.hits
        .filter((hit) => Number.isFinite(Number(hit.timeSec)))
        .sort((a, b) => Number(a.timeSec) - Number(b.timeSec))
    : [];

const normalizeHitSide = (side, fallbackRight) => {
  if (side === "right") return true;
  if (side === "left") return false;
  return fallbackRight;
};

const movementMsForProfile = (speed, fallbackMs, profile) => {
  const beatIntervalMs = Number(profile?.beatIntervalMs);
  if (!Number.isFinite(beatIntervalMs) || beatIntervalMs <= 0) return fallbackMs;
  if (speed === "slow") return Math.round(beatIntervalMs * 1.25);
  if (speed === "fast") return Math.round(beatIntervalMs * 0.75);
  return Math.round(beatIntervalMs);
};

function speak(text) {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }
}

function StimulusVisual({
  item,
  style,
  ariaHidden = false,
  motionKey = 0,
  playDurationMs = 2000,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const pixelRatio =
    typeof window !== "undefined"
      ? Math.min(window.devicePixelRatio || 1, 2)
      : 1;
  const canvasPixelSize = Math.round(VIDEO_STIMULUS_SIZE * pixelRatio);
  const [corsReady, setCorsReady] = useState(false);
  const [canvasFailed, setCanvasFailed] = useState(false);

  // Set crossOrigin BEFORE src so browser loads with proper CORS headers
  useEffect(() => {
    if (item?.mediaType !== "video" || !videoRef.current) return;
    const video = videoRef.current;
    const resetFrame = requestAnimationFrame(() => {
      setCanvasFailed(false);
      setCorsReady(false);
    });
    video.pause();
    video.removeAttribute("src");
    video.crossOrigin = "anonymous";
    video.src = item.img;
    video.loop = false;
    video.load();
    const onCanPlay = () => {
      video.currentTime = 0;
      video.play().catch(() => {});
      setCorsReady(true);
    };
    video.addEventListener("canplay", onCanPlay, { once: true });
    return () => {
      cancelAnimationFrame(resetFrame);
      video.removeEventListener("canplay", onCanPlay);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [item?.img, item?.mediaType]);

  useEffect(() => {
    if (item?.mediaType !== "video" || !videoRef.current) return;

    const video = videoRef.current;
    const restartFrame = requestAnimationFrame(() => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;

      video.loop = false;
      video.playbackRate = 1;

      if (duration > 0 && playDurationMs > 0) {
        video.playbackRate = Math.max(
          0.25,
          Math.min(duration / (playDurationMs / 1000), 1)
        );
      }

      try {
        video.currentTime = 0;
      } catch {}

      video.play().catch(() => {});
    });

    return () => {
      cancelAnimationFrame(restartFrame);
    };
  }, [item?.mediaType, motionKey, playDurationMs]);

  useEffect(() => {
    if (item?.mediaType !== "video" || !videoRef.current) return;

    const video = videoRef.current;
    const handleEnded = () => {
      video.pause();
    };

    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("ended", handleEnded);
    };
  }, [item?.mediaType]);

  // Canvas-based white background removal
  useEffect(() => {
    if (!corsReady || item?.mediaType !== "video" || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    const drawFrame = () => {
      if (!context || video.readyState < 2) {
        animationRef.current = requestAnimationFrame(drawFrame);
        return;
      }

      try {
        const width = canvas.width;
        const height = canvas.height;
        context.clearRect(0, 0, width, height);
        context.drawImage(video, 0, 0, width, height);

        const frame = context.getImageData(0, 0, width, height);
        const pixels = frame.data;
        const samplePoints = [
          0,
          (width - 1) * 4,
          (width * (height - 1)) * 4,
          (width * height - 1) * 4,
        ];
        const backgroundSamples = samplePoints.map((point) => ({
          red: pixels[point],
          green: pixels[point + 1],
          blue: pixels[point + 2],
        }));

        for (let index = 0; index < pixels.length; index += 4) {
          const red = pixels[index];
          const green = pixels[index + 1];
          const blue = pixels[index + 2];
          const max = Math.max(red, green, blue);
          const min = Math.min(red, green, blue);
          const isLightBackground = red > 230 && green > 230 && blue > 230 && max - min < 35;
          const isCornerBackground = backgroundSamples.some((sample) => {
            const distance = Math.hypot(red - sample.red, green - sample.green, blue - sample.blue);
            return distance < 32 && red > 190 && green > 190 && blue > 190;
          });

          if (isLightBackground || isCornerBackground) {
            pixels[index + 3] = 0;
          }
        }

        context.putImageData(frame, 0, 0);
      } catch (error) {
        setCanvasFailed(true);
        return;
      }

      animationRef.current = requestAnimationFrame(drawFrame);
    };

    drawFrame();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [corsReady, item?.img, item?.mediaType]);

  if (!item?.img) return null;

  if (item.mediaType === "video") {
    return (
      <>
        {/* Hidden video used as canvas source */}
        <video
          ref={videoRef}
          muted
          playsInline
          preload="auto"
          aria-hidden
          style={{ display: "none" }}
        />
        {/* Canvas with white-bg removed — primary display */}
        {!canvasFailed && (
          <canvas
            ref={canvasRef}
            width={canvasPixelSize}
            height={canvasPixelSize}
            aria-hidden={ariaHidden}
            aria-label={ariaHidden ? undefined : item.name}
            style={style}
          />
        )}
        {/* Fallback: show video directly, clip to circle to hide white box */}
        {canvasFailed && (
          <video
            key={item.img}
            src={item.img}
            muted
            autoPlay
            playsInline
            preload="auto"
            aria-hidden={ariaHidden}
            style={{
              ...style,
              borderRadius: "50%",
              clipPath: "circle(50%)",
              objectFit: "cover",
            }}
          />
        )}
      </>
    );
  }

  return (
    <img
      src={item.img}
      alt={ariaHidden ? "" : item.name}
      aria-hidden={ariaHidden}
      style={style}
    />
  );
}


function SessionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token } = useStoredAuth();

  const [environments, setEnvironments] = useState([]);
  const [icons, setIcons] = useState([]);
  const [sounds, setSounds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State machine: INTRO -> PLAYING -> CHECK_IN -> SUDS -> CALM_PLACE -> END
  const [sessionState, setSessionState] = useState("INTRO");
  const [duration, setDuration] = useState(60); // 60 or 90 minutes
  
  const [isPaused, setIsPaused] = useState(false);
  const [currentSet, setCurrentSet] = useState(1);
  const [isRight, setIsRight] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [audioProfile, setAudioProfile] = useState(null);
  const [movementDurationMs, setMovementDurationMs] = useState(2000);

  const containerRef = useRef(null);
  const movingElementRef = useRef(null);
  const intervalRef = useRef(null);
  const hitTimeoutRef = useRef(null);
  const audioRef = useRef(null);
  const audioPoolRef = useRef([]);
  const audioPoolIndexRef = useRef(0);
  const trackAudioRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioStopTimersRef = useRef([]);
  const isPausedRef = useRef(false);
  const isRightRef = useRef(false);
  const currentSetRef = useRef(1);
  const movementIdRef = useRef(0);
  const hitIdRef = useRef(0);
  const lastPlayedMovementIdRef = useRef(null);
  const playingHitMovementIdRef = useRef(null);
  const lastPlayedHitIdRef = useRef(null);
  const playingHitIdRef = useRef(null);
  const endpointHitIdsRef = useRef(new Map());
  const playedEndpointKeysRef = useRef(new Set());
  const playingEndpointKeysRef = useRef(new Set());
  const loopRunIdRef = useRef(0);
  const movementStateRef = useRef(MOVEMENT_STATES.IDLE);
  const movementTargetRightRef = useRef(null);
  const audioProfileRef = useRef(null);
  const detectedHitsRef = useRef([]);
  const effectiveSpeedMsRef = useRef(2000);

  const envId = searchParams.get("environment") || "";
  const iconId = searchParams.get("icon") || "";
  const soundId = searchParams.get("sound") || "";
  const speed = SPEED_MS[searchParams.get("speed")] ? searchParams.get("speed") : "medium";
  const direction = normalizeDirection(searchParams.get("direction") || "horizontal");

  const speedMs = SPEED_MS[speed] || 2000;

  useEffect(() => {
    const load = async () => {
      try {
        const [envs, icns, snds] = await Promise.all([
          getBilateralEnvironments(token),
          getBilateralIcons(token),
          getBilateralSounds(token),
        ]);
        setEnvironments(envs);
        setIcons(icns);
        setSounds(snds);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
        // Intro Speech
        speak("The bilateral stimulation will start now. Your roadmap is ready. When you have the image and feeling in mind, press start. When you start, let your mind wander. Your thoughts may go forward or backwards in time.");
      }
    };
    load();
    
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [token]);

  const selectedEnv = environments.find((e) => e.id === envId) || environments[0];
  const selectedIcon = icons.find((i) => i.id === iconId) || icons[0];
  const selectedSound = sounds.find((s) => s.id === soundId) || sounds[0];
  const stimulusSize =
    selectedIcon?.mediaType === "video" ? VIDEO_STIMULUS_SIZE : IMAGE_STIMULUS_SIZE;
  const effectiveSpeedMs = useMemo(
    () => movementMsForProfile(speed, speedMs, audioProfile),
    [audioProfile, speed, speedMs]
  );
  const detectedHits = useMemo(() => {
    if (!isUsableProfile(audioProfile)) return [];

    return usableHits(audioProfile);
  }, [audioProfile]);
  const hasDetectedHitPattern = detectedHits.length > 1;

  useEffect(() => {
    setMovementDurationMs(effectiveSpeedMs);
    effectiveSpeedMsRef.current = effectiveSpeedMs;
  }, [effectiveSpeedMs]);

  useEffect(() => {
    audioProfileRef.current = audioProfile;
    detectedHitsRef.current = detectedHits;
  }, [audioProfile, detectedHits]);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      if (!selectedSound?.url) {
        setAudioProfile(null);
        return;
      }

      if (isUsableProfile(selectedSound.bilateralAudioProfile)) {
        setAudioProfile(selectedSound.bilateralAudioProfile);
        return;
      }

      try {
        const detectedProfile = await analyzeAudioUrl(selectedSound.url);
        if (!cancelled) {
          setAudioProfile(detectedProfile);
        }
      } catch (error) {
        console.warn("Bilateral audio profile missing or analysis failed; using fallback timing.", error);
        if (!cancelled) {
          setAudioProfile({
            mode: "one-shot",
            hits: [],
            analysisStatus: "failed",
            analysisError: error?.message || "Audio analysis failed.",
          });
        }
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [selectedSound]);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      setContainerSize({
        width: rect?.width || window.innerWidth || 0,
        height: rect?.height || window.innerHeight || 0,
      });
    };

    updateSize();

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateSize)
        : null;

    if (observer) {
      observer.observe(containerRef.current);
    } else {
      window.addEventListener("resize", updateSize);
    }

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  // Audio - the moving object owns timing; each endpoint plays only the useful hit window.
  useEffect(() => {
    if (!selectedSound?.url) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioContext = AudioContextClass ? new AudioContextClass() : null;

    const createHitAudio = () => {
      const audio = new Audio();
      audio.crossOrigin = "anonymous";
      audio.src = selectedSound.url;
      audio.loop = false;
      audio.preload = "auto";
      audio.volume = 0.7;

      if (!audioContext?.createMediaElementSource || !audioContext?.createStereoPanner) {
        return { audio, panner: null };
      }

      try {
        const source = audioContext.createMediaElementSource(audio);
        const panner = audioContext.createStereoPanner();
        source.connect(panner).connect(audioContext.destination);
        return { audio, panner };
      } catch {
        return { audio, panner: null };
      }
    };

    const primaryHit = createHitAudio();
    const audioPool = Array.from({ length: 4 }, createHitAudio);
    const trackAudio = new Audio();
    trackAudio.crossOrigin = "anonymous";
    trackAudio.src = selectedSound.url;
    trackAudio.loop = true;
    trackAudio.preload = "auto";
    trackAudio.volume = 0.7;

    audioRef.current = primaryHit;
    audioPoolRef.current = audioPool;
    audioPoolIndexRef.current = 0;
    trackAudioRef.current = trackAudio;
    audioContextRef.current = audioContext;
    primaryHit.audio.load();
    audioPool.forEach((item) => item.audio.load());
    trackAudio.load();

    return () => {
      audioStopTimersRef.current.forEach(clearTimeout);
      audioStopTimersRef.current = [];
      trackAudio.pause();
      trackAudio.currentTime = 0;
      primaryHit.audio.pause();
      primaryHit.audio.currentTime = 0;
      audioPool.forEach((item) => {
        item.audio.pause();
        item.audio.currentTime = 0;
      });
      audioContext?.close?.().catch(() => {});
      audioRef.current = null;
      audioPoolRef.current = [];
      trackAudioRef.current = null;
      audioContextRef.current = null;
    };
  }, [selectedSound]);

  useEffect(() => {
    isPausedRef.current = isPaused;
    if (isPaused) {
      audioStopTimersRef.current.forEach(clearTimeout);
      audioStopTimersRef.current = [];
      playingEndpointKeysRef.current.clear();
      audioPoolRef.current.forEach((item) => {
        item.audio.pause();
      });
      trackAudioRef.current?.pause();
    }
  }, [isPaused]);

  // Movement
  function getMovementBounds() {
    const fallbackWidth = typeof window !== "undefined" ? window.innerWidth : 0;
    const fallbackHeight = typeof window !== "undefined" ? window.innerHeight : 0;
    const width = containerSize.width || fallbackWidth;
    const height = containerSize.height || fallbackHeight;
    const maxX = Math.max(EDGE_PADDING, width - stimulusSize - EDGE_PADDING);
    const maxY = Math.max(EDGE_PADDING, height - stimulusSize - EDGE_PADDING);
    const centerX = Math.max(EDGE_PADDING, (width - stimulusSize) / 2);
    const centerY = Math.max(EDGE_PADDING, (height - stimulusSize) / 2);

    return {
      left: EDGE_PADDING,
      right: maxX,
      top: EDGE_PADDING,
      bottom: maxY,
      centerX,
      centerY,
    };
  }

  function getNextPos(goRight) {
    const bounds = getMovementBounds();

    if (direction === "horizontal") {
      return { x: goRight ? bounds.right : bounds.left, y: bounds.centerY };
    } else if (direction === "vertical") {
      return { x: bounds.centerX, y: goRight ? bounds.bottom : bounds.top };
    } else if (direction === "diagonal-up") {
      return { x: goRight ? bounds.right : bounds.left, y: goRight ? bounds.top : bounds.bottom };
    }

    return { x: goRight ? bounds.right : bounds.left, y: goRight ? bounds.bottom : bounds.top };
  }

  function getMovementTransform(goRight) {
    const iconSearchText = [
      selectedIcon?.name,
      selectedIcon?.url,
      selectedIcon?.img,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const helicopterFlip = iconSearchText.includes("helicopter") ? -1 : 1;
    const assetFacingScale = selectedIcon?.defaultFacing === "left" ? -1 : 1;
    const facingScale = assetFacingScale * helicopterFlip;

    if (direction === "horizontal") {
      return { rotation: 0, scaleX: (goRight ? 1 : -1) * facingScale };
    } else if (direction === "vertical") {
      return { rotation: goRight ? 90 : -90, scaleX: facingScale };
    } else if (direction === "diagonal-up") {
      return { rotation: -45, scaleX: (goRight ? 1 : -1) * facingScale };
    }

    return { rotation: 45, scaleX: (goRight ? 1 : -1) * facingScale };
  }

  useEffect(() => {
    if (isLoading || isPaused || sessionState !== "PLAYING") {
      cancelAnimationFrame(intervalRef.current);
      clearTimeout(hitTimeoutRef.current);
      trackAudioRef.current?.pause();
      playingEndpointKeysRef.current.clear();
      movementStateRef.current = MOVEMENT_STATES.STOPPED;
      movementTargetRightRef.current = null;
      return;
    }

    let cancelled = false;
    const loopRunId = loopRunIdRef.current + 1;
    loopRunIdRef.current = loopRunId;
    movementStateRef.current = MOVEMENT_STATES.IDLE;
    movementTargetRightRef.current = null;
    const getProfile = () => {
      const currentProfile = audioProfileRef.current;
      return isUsableProfile(currentProfile) ? currentProfile : null;
    };
    const getProfileHits = () => detectedHitsRef.current || [];
    const getCurrentSpeedMs = () => effectiveSpeedMsRef.current || speedMs;
    const oneShotPlayMs = Math.max(
      250,
      Math.min(
        ONE_SHOT_HIT_PLAY_MS,
        getProfile()?.durationSec
          ? Math.max(250, getProfile().durationSec * 1000)
          : ONE_SHOT_HIT_PLAY_MS
      )
    );
    const getMatchingHit = (side) => {
      const profile = getProfile();
      const profileHits = getProfileHits();
      if (!profileHits.length) return null;
      if (profile?.mode === "two-hit-stereo" || profile?.mode === "stereo-track") {
        return (
          profileHits.find((hit) => hit.side === side) ||
          profileHits.find((hit) => hit.side === "center") ||
          null
        );
      }

      return profileHits[0] || null;
    };
    const getHitWindowMs = (hit) => {
      const profile = getProfile();
      const profileHits = getProfileHits();
      if (!profile || profile.mode === "unknown") return UNKNOWN_HIT_PLAY_MS;
      if (!hit) {
        return profile.mode === "two-hit-stereo"
          ? DETECTED_HIT_MAX_PLAY_MS
          : Math.min(oneShotPlayMs, DETECTED_HIT_MAX_PLAY_MS);
      }
      const nextHit = profileHits.find(
        (candidate) => Number(candidate.timeSec) > Number(hit.timeSec) + 0.05
      );
      const durationSec = Number(profile.durationSec);
      if (nextHit) {
        const untilNextMs = (Number(nextHit.timeSec) - Number(hit.timeSec)) * 1000;
        return Math.round(
          Math.max(60, Math.min(untilNextMs - 35, DETECTED_HIT_MAX_PLAY_MS))
        );
      }

      const windowSec = Number.isFinite(durationSec)
        ? durationSec - Number(hit.timeSec)
        : oneShotPlayMs / 1000;

      return Math.round(
        Math.max(120, Math.min(windowSec * 1000, DETECTED_HIT_MAX_PLAY_MS))
      );
    };

    const stopContinuousTrack = () => {
      if (!trackAudioRef.current) return;
      trackAudioRef.current.pause();
      try {
        trackAudioRef.current.currentTime = 0;
      } catch {}
    };

    const clearAudioStopTimers = () => {
      audioStopTimersRef.current.forEach(clearTimeout);
      audioStopTimersRef.current = [];
    };

    const stopHitPool = () => {
      clearAudioStopTimers();
      const pool = audioPoolRef.current.length ? audioPoolRef.current : [audioRef.current].filter(Boolean);
      pool.forEach((item) => {
        item.audio.pause();
      });
    };

    const getEndpointKey = (side, movementId) => `${loopRunId}:${movementId}:${side}`;
    const getEndpointHitId = (side, movementId) => {
      const endpointKey = getEndpointKey(side, movementId);
      if (!endpointHitIdsRef.current.has(endpointKey)) {
        hitIdRef.current += 1;
        endpointHitIdsRef.current.set(endpointKey, hitIdRef.current);
      }

      return endpointHitIdsRef.current.get(endpointKey);
    };

    const playContinuousTrack = (side, movementId, hitId) => {
      const profile = getProfile();
      const trackAudio = trackAudioRef.current;
      if (!trackAudio || isPausedRef.current) return;
      const hit = getMatchingHit(side);
      if (trackAudio.paused) {
        try {
          trackAudio.currentTime = Number(hit?.timeSec) || 0;
        } catch {}
        trackAudio.play().catch(() => {});
        if (DEBUG_BILATERAL_AUDIO) {
          console.debug("[bilateral-audio]", {
            movementId,
            hitId,
            endpointSide: side,
            mode: profile?.mode || "fallback",
            offsetSec: Number(hit?.timeSec) || 0,
            timestamp: performance.now(),
          });
        }
      }
    };

    const playHitSound = (side, movementId, hitId, endpointKey) => {
      const profile = getProfile();
      if (isPausedRef.current) return;
      if (!audioRef.current) return;
      if (
        playedEndpointKeysRef.current.has(endpointKey) ||
        playingEndpointKeysRef.current.has(endpointKey) ||
        lastPlayedHitIdRef.current === hitId ||
        playingHitIdRef.current === hitId ||
        lastPlayedMovementIdRef.current === movementId ||
        playingHitMovementIdRef.current === movementId
      ) {
        if (DEBUG_BILATERAL_AUDIO) {
          console.debug("[bilateral-audio:duplicate-blocked]", {
            movementId,
            hitId,
            endpointSide: side,
            mode: profile?.mode || "fallback",
            timestamp: performance.now(),
          });
        }
        return;
      }

      playedEndpointKeysRef.current.add(endpointKey);
      playingEndpointKeysRef.current.add(endpointKey);
      lastPlayedHitIdRef.current = hitId;
      playingHitIdRef.current = hitId;
      lastPlayedMovementIdRef.current = movementId;
      playingHitMovementIdRef.current = movementId;

      if (profile?.mode === "stereo-track") {
        playContinuousTrack(side, movementId, hitId);
        playingEndpointKeysRef.current.delete(endpointKey);
        playingHitIdRef.current = null;
        playingHitMovementIdRef.current = null;
        return;
      }

      stopHitPool();
      const pool = audioPoolRef.current.length ? audioPoolRef.current : [audioRef.current];
      const sidePoolIndex = side === "right" && pool.length > 1 ? 1 : 0;
      const hitSound = pool[sidePoolIndex];
      const pan = side === "right" ? 1 : -1;
      const hit = getMatchingHit(side);
      const hitOffsetSec = Number(hit?.timeSec) || 0;
      const hitWindowMs = getHitWindowMs(hit);
      audioPoolIndexRef.current += 1;

      const trigger = () => {
        if (
          isPausedRef.current ||
          loopRunIdRef.current !== loopRunId ||
          movementIdRef.current !== movementId ||
          lastPlayedHitIdRef.current !== hitId
        ) {
          return;
        }
        hitSound.audio.pause();
        try {
          hitSound.audio.currentTime = hitOffsetSec;
        } catch {}
        hitSound.audio.volume = 0.7;
        hitSound.audio.playbackRate = 1;

        if (hitSound.panner) {
          hitSound.panner.pan.setValueAtTime(
            profile?.mode === "two-hit-stereo" && profile?.preserveOriginalPan !== false
              ? 0
              : pan,
            audioContextRef.current?.currentTime || 0
          );
        }

        const scheduleStop = () => {
          const stopTimer = setTimeout(() => {
            hitSound.audio.pause();
            try {
              hitSound.audio.currentTime = hitOffsetSec;
            } catch {}
            audioStopTimersRef.current = audioStopTimersRef.current.filter(
              (timer) => timer !== stopTimer
            );
            if (playingHitIdRef.current === hitId) {
              playingHitIdRef.current = null;
            }
            playingEndpointKeysRef.current.delete(endpointKey);
            if (playingHitMovementIdRef.current === movementId) {
              playingHitMovementIdRef.current = null;
            }
          }, hitWindowMs);

          audioStopTimersRef.current.push(stopTimer);
        };

        if (DEBUG_BILATERAL_AUDIO) {
          console.debug("[bilateral-audio]", {
            movementId,
            hitId,
            endpointSide: side,
            mode: profile?.mode || "fallback",
            offsetSec: hitOffsetSec,
            windowMs: hitWindowMs,
            timestamp: performance.now(),
          });
        }

        const playPromise = hitSound.audio.play();
        if (playPromise?.then) {
          playPromise.then(scheduleStop).catch(() => {
            if (playingHitIdRef.current === hitId) {
              playingHitIdRef.current = null;
            }
            playingEndpointKeysRef.current.delete(endpointKey);
            if (playingHitMovementIdRef.current === movementId) {
              playingHitMovementIdRef.current = null;
            }
          });
        } else {
          scheduleStop();
        }
      };

      if (audioContextRef.current?.state === "suspended") {
        audioContextRef.current.resume().then(trigger).catch(trigger);
      } else {
        trigger();
      }
    };

    const waitForMovementEnd = () =>
      new Promise((resolve) => {
        const element = movingElementRef.current;
        if (!element) {
          requestAnimationFrame(() => resolve());
          return;
        }

        let resolved = false;
        const finish = () => {
          if (resolved) return;
          resolved = true;
          clearTimeout(hitTimeoutRef.current);
          element.removeEventListener("transitionend", handleTransitionEnd);
          resolve();
        };
        const handleTransitionEnd = (event) => {
          if (event.target === element && event.propertyName === "transform") {
            finish();
          }
        };

        element.addEventListener("transitionend", handleTransitionEnd);
        hitTimeoutRef.current = setTimeout(finish, getCurrentSpeedMs() + 180);
      });

    const delayAfterHit = () =>
      AUDIO_AFTER_HIT_DELAY_MS > 0
        ? new Promise((resolve) => setTimeout(resolve, AUDIO_AFTER_HIT_DELAY_MS))
        : Promise.resolve();

    const initialProfile = getProfile();
    if (!initialProfile) {
      console.warn("Bilateral audio profile missing; using fallback alternating timing.");
    } else if (initialProfile.mode === "unknown") {
      console.warn("Bilateral audio profile is unknown; using safe one-shot endpoint panning.");
    }
    if (initialProfile?.mode !== "stereo-track") stopContinuousTrack();

    const finishSideHit = async (hitRightSide, movementId) => {
      await delayAfterHit();
      if (
        cancelled ||
        isPausedRef.current ||
        loopRunIdRef.current !== loopRunId ||
        movementIdRef.current !== movementId ||
        movementStateRef.current !== MOVEMENT_STATES.ENDPOINT_HIT ||
        movementTargetRightRef.current !== hitRightSide
      ) {
        return;
      }
      const endpointSide = hitRightSide ? "right" : "left";
      const endpointKey = getEndpointKey(endpointSide, movementId);
      const hitId = getEndpointHitId(endpointSide, movementId);
      playHitSound(endpointSide, movementId, hitId, endpointKey);
      const next = currentSetRef.current + 1;
      currentSetRef.current = next;
      setCurrentSet(next);

      if (next > TOTAL_SETS) {
        cancelAnimationFrame(intervalRef.current);
        clearTimeout(hitTimeoutRef.current);
        audioStopTimersRef.current.forEach(clearTimeout);
        audioStopTimersRef.current = [];
        audioPoolRef.current.forEach((item) => {
          item.audio.pause();
        });
        stopContinuousTrack();
        movementStateRef.current = MOVEMENT_STATES.STOPPED;
        movementTargetRightRef.current = null;
        setSessionState("CHECK_IN");
        speak("Is it changing and still connected?");
        return;
      }

      movementStateRef.current = MOVEMENT_STATES.IDLE;
      movementTargetRightRef.current = null;
      intervalRef.current = requestAnimationFrame(doMove);
    };

    const doMove = async () => {
      if (cancelled || isPausedRef.current || loopRunIdRef.current !== loopRunId) return;
      if (movementStateRef.current !== MOVEMENT_STATES.IDLE) {
        if (DEBUG_BILATERAL_AUDIO) {
          console.debug("[bilateral-movement:blocked]", {
            state: movementStateRef.current,
            movementId: movementIdRef.current,
            timestamp: performance.now(),
          });
        }
        return;
      }

      const targetRightSide = !isRightRef.current;
      const movementId = movementIdRef.current + 1;
      movementIdRef.current = movementId;
      movementStateRef.current = MOVEMENT_STATES.MOVING;
      movementTargetRightRef.current = targetRightSide;

      isRightRef.current = targetRightSide;
      clearTimeout(hitTimeoutRef.current);
      setMovementDurationMs(getCurrentSpeedMs());
      setIsRight(targetRightSide);

      await waitForMovementEnd();
      if (
        cancelled ||
        isPausedRef.current ||
        loopRunIdRef.current !== loopRunId ||
        movementIdRef.current !== movementId ||
        movementStateRef.current !== MOVEMENT_STATES.MOVING ||
        movementTargetRightRef.current !== targetRightSide
      ) {
        return;
      }

      movementStateRef.current = MOVEMENT_STATES.ENDPOINT_HIT;
      await finishSideHit(targetRightSide, movementId);
    };

    const timeout = setTimeout(() => {
      doMove();
    }, 100);
    const playingEndpointKeys = playingEndpointKeysRef.current;

    return () => {
      cancelled = true;
      if (loopRunIdRef.current === loopRunId) {
        loopRunIdRef.current += 1;
      }
      clearTimeout(timeout);
      cancelAnimationFrame(intervalRef.current);
      clearTimeout(hitTimeoutRef.current);
      playingEndpointKeys.clear();
      movementStateRef.current = MOVEMENT_STATES.STOPPED;
      movementTargetRightRef.current = null;
    };
  }, [isLoading, isPaused, sessionState, direction, speedMs]);

  const handleStart = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    audioContextRef.current?.resume?.().catch(() => {});
    audioStopTimersRef.current.forEach(clearTimeout);
    audioStopTimersRef.current = [];
    audioPoolRef.current.forEach((item) => {
      item.audio.pause();
      try {
        item.audio.currentTime = detectedHits[0]?.timeSec || 0;
      } catch {}
    });
    if (trackAudioRef.current) {
      trackAudioRef.current.pause();
      try {
        trackAudioRef.current.currentTime = 0;
      } catch {}
    }

    const firstHit = detectedHits[0];
    const firstHitRightSide = normalizeHitSide(firstHit?.side, true);
    const initialRight = hasDetectedHitPattern ? !firstHitRightSide : false;

    currentSetRef.current = 1;
    movementIdRef.current = 0;
    hitIdRef.current = 0;
    lastPlayedMovementIdRef.current = null;
    playingHitMovementIdRef.current = null;
    lastPlayedHitIdRef.current = null;
    playingHitIdRef.current = null;
    endpointHitIdsRef.current.clear();
    playedEndpointKeysRef.current.clear();
    playingEndpointKeysRef.current.clear();
    movementStateRef.current = MOVEMENT_STATES.IDLE;
    movementTargetRightRef.current = null;
    isRightRef.current = initialRight;
    setCurrentSet(1);
    setIsRight(initialRight);
    setMovementDurationMs(effectiveSpeedMs);
    setSessionState("PLAYING");
  };

  const handleCheckIn = (isChanging) => {
    if (isChanging) {
      speak("Ok good, go with that, or go with where you left off.");
      audioStopTimersRef.current.forEach(clearTimeout);
      audioStopTimersRef.current = [];
      audioPoolRef.current.forEach((item) => {
        item.audio.pause();
      });
      trackAudioRef.current?.pause();
      currentSetRef.current = 1;
      movementIdRef.current = 0;
      hitIdRef.current = 0;
      lastPlayedMovementIdRef.current = null;
      playingHitMovementIdRef.current = null;
      lastPlayedHitIdRef.current = null;
      playingHitIdRef.current = null;
      endpointHitIdsRef.current.clear();
      playedEndpointKeysRef.current.clear();
      playingEndpointKeysRef.current.clear();
      movementStateRef.current = MOVEMENT_STATES.IDLE;
      movementTargetRightRef.current = null;
      isRightRef.current = hasDetectedHitPattern
        ? !normalizeHitSide(detectedHits[0]?.side, true)
        : false;
      setCurrentSet(1);
      setIsRight(isRightRef.current);
      setMovementDurationMs(effectiveSpeedMs);
      setSessionState("PLAYING");
    } else {
      speak("Ok, lets go back to the original image. Without any tapping or eye movement, just take a moment to notice what you see and feel. Rate your negative emotion on a scale of 0 to 10.");
      setSessionState("SUDS");
    }
  };

  const handleSuds = (rating) => {
    if (rating > 1) {
      speak("Ok, lets continue with what you noticed about your original image.");
      audioStopTimersRef.current.forEach(clearTimeout);
      audioStopTimersRef.current = [];
      audioPoolRef.current.forEach((item) => {
        item.audio.pause();
      });
      trackAudioRef.current?.pause();
      currentSetRef.current = 1;
      movementIdRef.current = 0;
      hitIdRef.current = 0;
      lastPlayedMovementIdRef.current = null;
      playingHitMovementIdRef.current = null;
      lastPlayedHitIdRef.current = null;
      playingHitIdRef.current = null;
      endpointHitIdsRef.current.clear();
      playedEndpointKeysRef.current.clear();
      playingEndpointKeysRef.current.clear();
      movementStateRef.current = MOVEMENT_STATES.IDLE;
      movementTargetRightRef.current = null;
      isRightRef.current = hasDetectedHitPattern
        ? !normalizeHitSide(detectedHits[0]?.side, true)
        : false;
      setCurrentSet(1);
      setIsRight(isRightRef.current);
      setMovementDurationMs(effectiveSpeedMs);
      setSessionState("PLAYING");
    } else {
      speak("Great job. Let's move to phase 2 of EMDR. Please bring up your pincode and spend a minute finding that nice feeling in your body.");
      setSessionState("CALM_PLACE");
    }
  };

  const currentPos = getNextPos(isRight);
  const movementTransform = getMovementTransform(isRight);
  const stimulusFacingTransform = `rotate(${movementTransform.rotation}deg) scaleX(${movementTransform.scaleX}) translateZ(0)`;
  const depthTilt = isRight ? 1 : -1;
  const stimulusDepthTransform =
    direction === "vertical"
      ? `perspective(700px) rotateX(${depthTilt * 14}deg) translateZ(18px)`
      : direction === "diagonal-up"
        ? `perspective(700px) rotateY(${depthTilt * 10}deg) rotateX(-8deg) translateZ(18px)`
        : direction === "diagonal-down"
          ? `perspective(700px) rotateY(${depthTilt * 10}deg) rotateX(8deg) translateZ(18px)`
          : `perspective(700px) rotateY(${depthTilt * 10}deg) translateZ(18px)`;
  const stimulusDepthStyle = {
    position: "relative",
    width: stimulusSize,
    height: stimulusSize,
    transform: stimulusDepthTransform,
    transformStyle: "preserve-3d",
    transformOrigin: "center",
    transition: "transform 260ms ease, filter 260ms ease",
    filter: "drop-shadow(0 18px 18px rgba(0,0,0,0.26))",
  };
  const stimulusVisualStyle = {
    width: stimulusSize,
    height: stimulusSize,
    borderRadius: 0,
    display: "block",
    imageRendering: "auto",
    objectFit: "contain",
    overflow: "hidden",
    transform: "translateZ(0)",
    backfaceVisibility: "hidden",
    willChange: "transform",
  };

  if (isLoading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center font-serif text-stone-600"
        style={{ background: "linear-gradient(135deg, #f8f5f0, #ebe5dc)" }}>
        Loading your sanctuary...
      </div>
    );
  }

  // ── Modals / Overlays ────────────────────────────────────────────────────
  const renderOverlay = () => {
    if (sessionState === "INTRO") {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-serif">
          <div className="bg-white rounded-3xl p-8 md:p-12 max-w-2xl w-full shadow-2xl text-center">
            <h2 className="text-3xl font-serif text-[#0F1912] mb-6">Phase 1 of EMDR</h2>
            <div className="text-lg text-gray-700 space-y-4 mb-8 text-left bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <p><strong>1.</strong> The bilateral stimulation will start now.</p>
              <p><strong>2.</strong> Your roadmap is ready. When you have the image and feeling in mind, press start.</p>
              <p><strong>3.</strong> When you start, let your mind wander – your thoughts may go forward or backwards in time.</p>
            </div>
            
            <div className="mb-8">
              <p className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">Select Session Duration</p>
              <div className="flex gap-4 justify-center">
                <button onClick={() => setDuration(60)} className={`px-6 py-3 rounded-xl border-2 transition-all ${duration === 60 ? 'border-[#4A7C59] bg-[#4A7C59]/10 text-[#4A7C59]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>1 Hour</button>
                <button onClick={() => setDuration(90)} className={`px-6 py-3 rounded-xl border-2 transition-all ${duration === 90 ? 'border-[#4A7C59] bg-[#4A7C59]/10 text-[#4A7C59]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>1.5 Hours</button>
              </div>
            </div>

            <button onClick={handleStart} className="w-full py-4 bg-[#4A7C59] text-white text-lg rounded-xl hover:bg-[#3d6849] transition-all">
              I have the image in mind – Start
            </button>
          </div>
        </div>
      );
    }
    
    if (sessionState === "CHECK_IN") {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-serif">
          <div className="bg-white rounded-3xl p-8 md:p-12 max-w-md w-full shadow-2xl text-center">
            <h2 className="text-2xl font-serif text-[#0F1912] mb-8">Is it changing and still connected?</h2>
            <div className="flex gap-4 justify-center">
              <button onClick={() => handleCheckIn(true)} className="flex-1 py-4 bg-[#4A7C59] text-white rounded-xl hover:bg-[#3d6849] transition-all text-lg">Yes</button>
              <button onClick={() => handleCheckIn(false)} className="flex-1 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all text-lg">No</button>
            </div>
          </div>
        </div>
      );
    }

    if (sessionState === "SUDS") {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-serif">
          <div className="bg-white rounded-3xl p-8 md:p-12 max-w-2xl w-full shadow-2xl text-center">
            <h2 className="text-2xl font-serif text-[#0F1912] mb-4">Rate your negative emotion</h2>
            <p className="text-gray-600 mb-8">Without any tapping or eye movement, just take a moment to notice what you see and feel. How disturbing is it right now?</p>
            <div className="flex flex-wrap gap-3 justify-center">
              {[0,1,2,3,4,5,6,7,8,9,10].map(val => (
                <button key={val} onClick={() => handleSuds(val)} className="w-12 h-12 rounded-full border-2 border-[#4A7C59] text-[#4A7C59] hover:bg-[#4A7C59] hover:text-white transition-all text-lg font-medium">
                  {val}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-4 text-sm text-gray-500 px-4">
              <span>0 = Neutral</span>
              <span>10 = Extremely</span>
            </div>
          </div>
        </div>
      );
    }

    if (sessionState === "CALM_PLACE") {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-serif">
          <div className="bg-white rounded-3xl p-8 md:p-12 max-w-xl w-full shadow-2xl text-center">
            <h2 className="text-3xl font-serif text-[#0F1912] mb-6">Phase 2: Calm Place</h2>
            <p className="text-xl text-gray-700 mb-8 leading-relaxed">
              Please bring up your pincode and spend a minute finding that nice feeling in the body.
            </p>
            <button onClick={() => setSessionState("END")} className="w-full py-4 bg-[#4A7C59] text-white text-lg rounded-xl hover:bg-[#3d6849] transition-all">
              Continue
            </button>
          </div>
        </div>
      );
    }

    if (sessionState === "END") {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-serif">
          <div className="bg-white rounded-3xl p-8 md:p-12 max-w-xl w-full shadow-2xl text-center">
            <h2 className="text-3xl font-serif text-[#0F1912] mb-6">Session Complete</h2>
            <p className="text-xl text-gray-700 mb-8 leading-relaxed">
              Please wait 4 days to a week before your next session as the processing continues.
            </p>
            <button onClick={() => router.push("/dashboard")} className="w-full py-4 bg-[#4A7C59] text-white text-lg rounded-xl hover:bg-[#3d6849] transition-all">
              Return to Dashboard
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  // ── BLS session screen ───────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden font-serif" style={{ zIndex: 100 }}>
      {renderOverlay()}
      
      {/* Background */}
      <div className="absolute inset-0">
        {selectedEnv?.image ? (
          <img src={selectedEnv.image} alt={selectedEnv.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#c5d5d0] to-[#8ab0a5]" />
        )}
      </div>

      {/* Paper texture overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 500 500' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

      {/* Moving element */}
      {!isPaused && sessionState === "PLAYING" && selectedIcon?.img && (
        <div
          ref={movingElementRef}
          className="absolute z-30 pointer-events-none"
          style={{
            left: 0,
            top: 0,
            width: stimulusSize,
            height: stimulusSize,
            transform: `translate3d(${currentPos.x}px, ${currentPos.y}px, 0)`,
            transition: `transform ${movementDurationMs}ms linear`,
            willChange: "transform",
            transformStyle: "preserve-3d",
            contain: "layout paint style",
            filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.18))",
          }}
        >
          <div
            style={{
              transform: stimulusFacingTransform,
              transformStyle: "preserve-3d",
            }}
          >
            <div style={stimulusDepthStyle}>
              <StimulusVisual
                item={selectedIcon}
                motionKey={isRight ? 1 : 0}
                playDurationMs={movementDurationMs}
                style={stimulusVisualStyle}
              />
            </div>
          </div>
        </div>
      )}

      {/* Reflection */}
      {!isPaused && sessionState === "PLAYING" && selectedIcon?.img && (
        <div
          className="absolute z-10 pointer-events-none"
          style={{
            left: 0,
            bottom: "6%",
            width: stimulusSize,
            height: stimulusSize,
            transform: `translate3d(${currentPos.x}px, 0, 0) scaleY(-0.35) rotate(${movementTransform.rotation}deg) scaleX(${movementTransform.scaleX})`,
            opacity: 0.2,
            filter: "blur(4px)",
            transition: `transform ${movementDurationMs}ms linear`,
            willChange: "transform",
          }}
        >
          <StimulusVisual
            item={selectedIcon}
            ariaHidden
            motionKey={isRight ? 1 : 0}
            playDurationMs={movementDurationMs}
            style={stimulusVisualStyle}
          />
        </div>
      )}

      {/* Header */}
      <div className="absolute top-7 left-9 z-40 pointer-events-none">
        <p className="text-[9px] tracking-[2px] uppercase text-white/80 mb-1" style={{ textShadow: "0 1px 5px rgba(0,0,0,0.2)" }}>
          The UK InKind Psychology Clinic
        </p>
        <h1 className="text-xl font-light italic text-white" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
          {selectedEnv?.name || "Bilateral Stimulation"}
        </h1>
      </div>

      {/* Counter */}
      {sessionState === "PLAYING" && (
        <div className="absolute top-8 right-9 z-40 pointer-events-none text-sm italic text-white/80"
          style={{ textShadow: "0 1px 5px rgba(0,0,0,0.2)" }}>
          Set {Math.min(currentSet, TOTAL_SETS)} of {TOTAL_SETS}
        </div>
      )}

      {/* Pause button */}
      {sessionState === "PLAYING" && (
        <button
          onClick={() => setIsPaused((p) => !p)}
          className="absolute bottom-8 right-9 z-40 px-6 py-3 rounded-full font-serif text-xs cursor-pointer transition-all"
          style={{
            background: "rgba(255,255,255,0.25)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.4)",
            color: "rgba(255,255,255,0.95)",
            textShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}
        >
          {isPaused ? "resume" : "pause"}
        </button>
      )}

      {/* Exit button */}
      <button
        onClick={() => router.back()}
        className="absolute bottom-8 left-9 z-40 px-6 py-3 rounded-full font-serif text-xs cursor-pointer transition-all"
        style={{
          background: "rgba(255,255,255,0.25)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.4)",
          color: "rgba(255,255,255,0.95)",
        }}
      >
        exit
      </button>
    </div>
  );
}

export default function BilateralSessionPage() {
  return (
    <Suspense fallback={
      <div className="w-screen h-screen flex items-center justify-center font-serif text-stone-600"
        style={{ background: "linear-gradient(135deg, #f8f5f0, #ebe5dc)" }}>
        Loading your sanctuary...
      </div>
    }>
      <SessionContent />
    </Suspense>
  );
}
