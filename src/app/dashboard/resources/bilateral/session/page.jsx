"use client";
import React, { useState, useEffect, useRef, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getBilateralEnvironments } from "@/components/dashboard/bilateral/VisualEnvironmentSelector";
import { getBilateralIcons } from "@/components/dashboard/bilateral/VisualIconSelector";
import { getBilateralSounds } from "@/components/dashboard/bilateral/SoundSelector";
import { useStoredAuth } from "@/redux/authStorage";
import { analyzeAudioUrl } from "@/utils/bilateralAudioAnalysis";

const SPEED_MS = { slow: 800, medium: 500, fast: 300 };
const TOTAL_SETS = 34;
const ENDPOINT_HITS_PER_SET = 2;
const VIDEO_STIMULUS_SIZE = 220;
const IMAGE_STIMULUS_SIZE = 90;
const EDGE_PADDING = 8;
const ONE_SHOT_HIT_PLAY_MS = 1200;
const DETECTED_HIT_MAX_PLAY_MS = 420;
const UNKNOWN_HIT_PLAY_MS = 320;
const AUDIO_AFTER_HIT_DELAY_MS = 0;
const VISUAL_ENDPOINT_SETTLE_MS = 120;
const VALID_DIRECTIONS = ["horizontal", "vertical", "diagonal-up", "diagonal-down"];
const DEBUG_BILATERAL_AUDIO = process.env.NODE_ENV !== "production";
const MOVEMENT_STATES = {
  IDLE: "idle",
  MOVING: "moving",
  ENDPOINT_HIT: "endpoint-hit",
  STOPPED: "stopped",
};
const BLS_ACTIVE_STATES = ["PLAYING", "PHASE2_BLS", "PHASE3_BLS"];
const DEFAULT_POSITIVE_BELIEF = "I am safe now";
const FIVE_MINUTES_SECONDS = 5 * 60;
const AUTO_SAVE_STORAGE_KEY = "bilateralSessionAutoSave";
const CURRENT_EMDR_SESSION_STORAGE_KEY = "currentEMDRSessionId";
const READY_SCRIPT = "When you are ready...";
const PHASE2_INSTALLATION_SCRIPT =
  "Put the words [POSITIVE BELIEF] together with your original image or what is left of it. Mash it together in your mind and start the bilateral stimulation.";
const POSITIVE_REINFORCEMENT_SCRIPT = "Lovely! Keep going.";
const NEGATIVE_BRANCH_SCRIPT = "OK good, keep going.";

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

const formatDuration = (totalSeconds) => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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

function speakAsync(text) {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis || !text) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.onend = resolve;
    utterance.onerror = resolve;
    window.speechSynthesis.speak(utterance);
  });
}

const readStoredEmdrSession = () => {
  if (typeof window === "undefined") return null;

  try {
    return JSON.parse(localStorage.getItem("lastEMDRSession") || "null");
  } catch {
    return null;
  }
};

const firstText = (...values) => {
  const match = values.find((value) => typeof value === "string" && value.trim());
  return match ? match.trim() : "";
};

const getStoredRoadmapAudioContext = () => {
  const latestSession = readStoredEmdrSession();
  const summary = latestSession?.summary || {};
  const audio = latestSession?.audio || latestSession?.audioFiles || {};
  const beliefPairs = Array.isArray(summary.beliefPairs)
    ? summary.beliefPairs
    : Array.isArray(latestSession?.beliefPairs)
      ? latestSession.beliefPairs
      : [];
  const primaryBeliefPair = beliefPairs[0] || {};

  const positiveBeliefs = beliefPairs
    .map((pair) => pair?.positive || pair?.positiveBelief || "")
    .filter(Boolean);

  const narrationParts = [
    "Your roadmap summary is ready.",
    firstText(summary.startingPoint, latestSession?.startingPoint)
      ? `Starting point: ${firstText(summary.startingPoint, latestSession?.startingPoint)}.`
      : "",
    firstText(summary.target, latestSession?.responses?.[1])
      ? `Original memory or image: ${firstText(summary.target, latestSession?.responses?.[1])}.`
      : "",
    firstText(summary.freezeFrame, latestSession?.responses?.[2])
      ? `Freeze frame: ${firstText(summary.freezeFrame, latestSession?.responses?.[2])}.`
      : "",
    firstText(primaryBeliefPair?.negative, primaryBeliefPair?.negativeBelief)
      ? `Negative belief: ${firstText(primaryBeliefPair?.negative, primaryBeliefPair?.negativeBelief)}.`
      : "",
    positiveBeliefs.length
      ? `Positive belief${positiveBeliefs.length > 1 ? "s" : ""}: ${positiveBeliefs.join(". ")}.`
      : "",
    firstText(summary.sudRating)
      ? `Current SUDS rating: ${firstText(summary.sudRating)} out of 10.`
      : "",
    READY_SCRIPT,
  ].filter(Boolean);

  return {
    introAudioUrl: firstText(
      audio.intro,
      audio.introAudioUrl,
      latestSession?.introAudioUrl,
      summary.introAudioUrl
    ),
    roadmapSummaryAudioUrl: firstText(
      audio.roadmapSummary,
      audio.roadmapSummaryAudioUrl,
      audio.summary,
      audio.summaryAudioUrl,
      latestSession?.roadmapSummaryAudioUrl,
      latestSession?.summaryAudioUrl,
      summary.roadmapSummaryAudioUrl,
      summary.summaryAudioUrl,
      summary.audioUrl
    ),
    roadmapSummaryText: firstText(
      latestSession?.roadmapSummaryText,
      summary.roadmapSummaryText,
      summary.narration,
      narrationParts.join(" ")
    ),
  };
};

const getStoredPositiveBeliefs = () => {
  if (typeof window === "undefined") return [DEFAULT_POSITIVE_BELIEF];

  try {
    const latestSession = readStoredEmdrSession();
    const beliefs = (latestSession?.beliefPairs || [])
      .map((pair) => pair?.positive || pair?.positiveBelief || "")
      .filter(Boolean);

    return beliefs.length ? [...new Set(beliefs)] : [DEFAULT_POSITIVE_BELIEF];
  } catch {
    return [DEFAULT_POSITIVE_BELIEF];
  }
};

const getStoredTarget = () => {
  if (typeof window === "undefined") {
    return { target: "", freezeFrame: "" };
  }

  try {
    const latestSession = readStoredEmdrSession();

    return {
      target: latestSession?.summary?.target || latestSession?.responses?.[1] || "",
      freezeFrame: latestSession?.summary?.freezeFrame || latestSession?.responses?.[2] || "",
    };
  } catch {
    return { target: "", freezeFrame: "" };
  }
};

const saveSessionSnapshot = (snapshot) => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(AUTO_SAVE_STORAGE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.warn("Unable to auto-save bilateral session state.", error);
  }
};

const getSavedSessionSnapshot = () => {
  if (typeof window === "undefined") return null;

  try {
    const snapshot = JSON.parse(localStorage.getItem(AUTO_SAVE_STORAGE_KEY) || "null");
    if (!snapshot || snapshot.status !== "in_progress") return null;
    return snapshot;
  } catch {
    return null;
  }
};

const clearSavedSessionSnapshot = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTO_SAVE_STORAGE_KEY);
};

const getBaseUrl = () => {
  const rawBaseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || process.env.VITE_BASE_URL || "";

  return rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl;
};

const getStoredProcessingSessionId = () => {
  if (typeof window === "undefined") return "";

  try {
    const currentSessionId = localStorage.getItem(CURRENT_EMDR_SESSION_STORAGE_KEY);
    if (currentSessionId) return currentSessionId;

    const latestSession = readStoredEmdrSession();
    return latestSession?.sessionId || "";
  } catch {
    return "";
  }
};

const processingStateRequest = async ({ baseUrl, token, sessionId, method = "GET", processingState }) => {
  const response = await fetch(`${baseUrl}/api/emdr-session/${sessionId}/processing-state`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(method === "PATCH" ? { "Content-Type": "application/json" } : {}),
    },
    ...(method === "PATCH" ? { body: JSON.stringify({ processingState }) } : {}),
  });
  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || "Failed to sync session processing state.");
  }

  return result.data;
};

const processingResultRequest = async ({ baseUrl, token, sessionId, processingResult }) => {
  const response = await fetch(`${baseUrl}/api/emdr-session/${sessionId}/processing-result`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ processingResult }),
  });
  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || "Failed to save session result.");
  }

  return result.data;
};

const getBilateralInstructionAudioMap = async ({ baseUrl, token }) => {
  if (!baseUrl || !token) return {};

  const response = await fetch(`${baseUrl}/api/bilateral/config`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || "Failed to load instruction audio.");
  }

  return result?.data?.instructionAudio || {};
};

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
  const baseUrl = useMemo(() => getBaseUrl(), []);

  const [environments, setEnvironments] = useState([]);
  const [icons, setIcons] = useState([]);
  const [sounds, setSounds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [instructionAudioMap, setInstructionAudioMap] = useState({});
  
  // State machine: INTRO -> PLAYING -> CHECK_IN -> STUCK -> SUDS -> PHASE2_VOC -> PHASE2_BLS -> PHASE2_NOTICE -> PHASE2_COMPLETE -> PHASE3_BODY_SCAN -> PHASE3_SENSATION -> PHASE3_BLS -> PHASE3_COMPLETE -> TIMER_CLOSURE_SUDS -> CALM_PLACE -> END
  const [sessionState, setSessionState] = useState("INTRO");
  const [duration, setDuration] = useState(60); // 60 or 90 minutes
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [showTimerWarning, setShowTimerWarning] = useState(false);
  const [pendingResumeSnapshot, setPendingResumeSnapshot] = useState(null);
  const [processingSessionId, setProcessingSessionId] = useState("");
  const [roadmapAudioContext, setRoadmapAudioContext] = useState({
    introAudioUrl: "",
    roadmapSummaryAudioUrl: "",
    roadmapSummaryText: "",
  });
  const [isRoadmapAudioPlaying, setIsRoadmapAudioPlaying] = useState(false);
  const [hasRoadmapAudioCompleted, setHasRoadmapAudioCompleted] = useState(false);
  
  const [isPaused, setIsPaused] = useState(false);
  const [currentSet, setCurrentSet] = useState(1);
  const [latestSudsRating, setLatestSudsRating] = useState(null);
  const [timerClosureSudsRating, setTimerClosureSudsRating] = useState(null);
  const [latestCheckInResponse, setLatestCheckInResponse] = useState("");
  const [checkInHistory, setCheckInHistory] = useState([]);
  const [positiveBeliefs, setPositiveBeliefs] = useState([DEFAULT_POSITIVE_BELIEF]);
  const [activeBeliefIndex, setActiveBeliefIndex] = useState(0);
  const [vocRatings, setVocRatings] = useState({});
  const [targetContext, setTargetContext] = useState({ target: "", freezeFrame: "" });
  const [bodySensationLocation, setBodySensationLocation] = useState("");
  const [bodySensationDescription, setBodySensationDescription] = useState("");
  const [bodyScanHistory, setBodyScanHistory] = useState([]);
  const [isRight, setIsRight] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [audioProfile, setAudioProfile] = useState(null);
  const [movementDurationMs, setMovementDurationMs] = useState(SPEED_MS.medium);

  const containerRef = useRef(null);
  const movingElementRef = useRef(null);
  const movementIntervalRef = useRef(null);
  const movementEndTimeoutRef = useRef(null);
  const nextMoveTimeoutRef = useRef(null);
  const movementEndTimeoutsRef = useRef(new Set());
  const movementWatchdogRef = useRef(null);
  const lastMovementTickAtRef = useRef(0);
  const audioRef = useRef(null);
  const sessionInstructionAudioRef = useRef(null);
  const audioPoolRef = useRef([]);
  const audioPoolIndexRef = useRef(0);
  const trackAudioRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioStopTimersRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const timerEndAtRef = useRef(null);
  const timerWarningShownRef = useRef(false);
  const timerPausedBlsRef = useRef(false);
  const sessionStateRef = useRef("INTRO");
  const latestAutoSaveRef = useRef(null);
  const backendSaveTimerRef = useRef(null);
  const latestBackendSnapshotRawRef = useRef("");
  const finalResultSavedRef = useRef(false);
  const isPausedRef = useRef(false);
  const isRightRef = useRef(false);
  const currentSetRef = useRef(1);
  const endpointHitCountRef = useRef(0);
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
  const effectiveSpeedMsRef = useRef(SPEED_MS.medium);

  const envId = searchParams.get("environment") || "";
  const iconId = searchParams.get("icon") || "";
  const soundId = searchParams.get("sound") || "";
  const speed = SPEED_MS[searchParams.get("speed")] ? searchParams.get("speed") : "medium";
  const direction = normalizeDirection(searchParams.get("direction") || "horizontal");

  const speedMs = SPEED_MS[speed] || SPEED_MS.medium;
  const introFallbackText =
    "The bilateral stimulation will start now. Your roadmap is ready. When you start, let your mind wander. Your thoughts may go forward or backwards in time.";

  const stopSessionInstructionAudio = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    if (sessionInstructionAudioRef.current) {
      sessionInstructionAudioRef.current.pause();
      sessionInstructionAudioRef.current = null;
    }

    setIsRoadmapAudioPlaying(false);
  };

  const playAudioFile = (audioUrl) =>
    new Promise((resolve, reject) => {
      if (!audioUrl || typeof window === "undefined") {
        reject(new Error("No audio file URL available."));
        return;
      }

      const audio = new Audio(audioUrl);
      sessionInstructionAudioRef.current = audio;
      audio.preload = "auto";

      const cleanup = () => {
        audio.removeEventListener("ended", handleEnded);
        audio.removeEventListener("error", handleError);
      };
      const handleEnded = () => {
        cleanup();
        if (sessionInstructionAudioRef.current === audio) {
          sessionInstructionAudioRef.current = null;
        }
        resolve();
      };
      const handleError = () => {
        cleanup();
        if (sessionInstructionAudioRef.current === audio) {
          sessionInstructionAudioRef.current = null;
        }
        reject(new Error("Unable to play audio file."));
      };

      audio.addEventListener("ended", handleEnded, { once: true });
      audio.addEventListener("error", handleError, { once: true });
      audio.play().catch((error) => {
        cleanup();
        if (sessionInstructionAudioRef.current === audio) {
          sessionInstructionAudioRef.current = null;
        }
        reject(error);
      });
    });

  const playIntroAndRoadmapSummary = async () => {
    stopSessionInstructionAudio();
    setIsRoadmapAudioPlaying(true);

    try {
      const introAudioUrl = roadmapAudioContext.introAudioUrl || instructionAudioMap.intro || "";

      if (introAudioUrl) {
        await playAudioFile(introAudioUrl);
      } else {
        await speakAsync(introFallbackText);
      }

      const summaryIncludesReadyScript = /when you are ready/i.test(
        roadmapAudioContext.roadmapSummaryText || ""
      );

      if (roadmapAudioContext.roadmapSummaryAudioUrl) {
        await playAudioFile(roadmapAudioContext.roadmapSummaryAudioUrl);
      } else if (roadmapAudioContext.roadmapSummaryText) {
        await speakAsync(roadmapAudioContext.roadmapSummaryText);
      }
      if (!roadmapAudioContext.roadmapSummaryAudioUrl && !summaryIncludesReadyScript) {
        await speakAsync(READY_SCRIPT);
      }
      setHasRoadmapAudioCompleted(true);
    } catch (error) {
      console.warn("Using browser voice fallback for roadmap audio.", error);
      const fallbackText = `${introFallbackText} ${roadmapAudioContext.roadmapSummaryText || ""}`.trim();
      await speakAsync(
        /when you are ready/i.test(fallbackText)
          ? fallbackText
          : `${fallbackText} ${READY_SCRIPT}`.trim()
      );
      setHasRoadmapAudioCompleted(true);
    } finally {
      setIsRoadmapAudioPlaying(false);
    }
  };

  const playInstructionAudio = async (key, fallbackText) => {
    const audioUrl = instructionAudioMap[key];

    if (audioUrl) {
      try {
        stopSessionInstructionAudio();
        await playAudioFile(audioUrl);
        return;
      } catch (error) {
        console.warn(`Instruction audio "${key}" failed; using browser voice fallback.`, error);
      }
    }

    await speakAsync(fallbackText);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [envs, icns, snds, instructionAudio] = await Promise.all([
          getBilateralEnvironments(token),
          getBilateralIcons(token),
          getBilateralSounds(token),
          getBilateralInstructionAudioMap({ baseUrl, token }).catch((error) => {
            console.warn("Unable to load static instruction audio map.", error);
            return {};
          }),
        ]);
        setEnvironments(envs);
        setIcons(icns);
        setSounds(snds);
        setInstructionAudioMap(instructionAudio);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
    
    return () => {
      stopSessionInstructionAudio();
    };
  }, [baseUrl, token]);

  useEffect(() => {
    setPositiveBeliefs(getStoredPositiveBeliefs());
    setTargetContext(getStoredTarget());
    setRoadmapAudioContext(getStoredRoadmapAudioContext());
    setProcessingSessionId(getStoredProcessingSessionId());

    const savedSnapshot = getSavedSessionSnapshot();
    if (savedSnapshot) {
      setPendingResumeSnapshot(savedSnapshot);
    }
  }, []);

  useEffect(() => {
    if (!baseUrl || !token || !processingSessionId) return;

    let cancelled = false;

    const loadBackendSnapshot = async () => {
      try {
        const backendSnapshot = await processingStateRequest({
          baseUrl,
          token,
          sessionId: processingSessionId,
        });

        if (
          !cancelled &&
          backendSnapshot?.status === "in_progress" &&
          !BLS_ACTIVE_STATES.includes(sessionStateRef.current)
        ) {
          setPendingResumeSnapshot(backendSnapshot);
          saveSessionSnapshot(backendSnapshot);
        }
      } catch (error) {
        console.warn("Unable to load backend processing state; using local fallback.", error);
      }
    };

    loadBackendSnapshot();

    return () => {
      cancelled = true;
    };
  }, [baseUrl, processingSessionId, token]);

  const selectedEnv = environments.find((e) => e.id === envId) || environments[0];
  const selectedIcon = icons.find((i) => i.id === iconId) || icons[0];
  const selectedSound = sounds.find((s) => s.id === soundId) || sounds[0];
  const stimulusSize =
    selectedIcon?.mediaType === "video" ? VIDEO_STIMULUS_SIZE : IMAGE_STIMULUS_SIZE;
  const effectiveSpeedMs = speedMs;
  const detectedHits = useMemo(() => {
    if (!isUsableProfile(audioProfile)) return [];

    return usableHits(audioProfile);
  }, [audioProfile]);
  const hasDetectedHitPattern = detectedHits.length > 1;

  const resetBlsRound = ({ force = false } = {}) => {
    if (!force && BLS_ACTIVE_STATES.includes(sessionStateRef.current)) {
      console.warn("Ignored BLS reset while stimulation is active.");
      return false;
    }

    isPausedRef.current = false;
    setIsPaused(false);
    audioStopTimersRef.current.forEach(clearTimeout);
    audioStopTimersRef.current = [];
    clearInterval(movementIntervalRef.current);
    clearInterval(movementWatchdogRef.current);
    clearTimeout(movementEndTimeoutRef.current);
    clearTimeout(nextMoveTimeoutRef.current);
    movementEndTimeoutsRef.current.forEach(clearTimeout);
    movementEndTimeoutsRef.current.clear();
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
    currentSetRef.current = 1;
    endpointHitCountRef.current = 0;
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
    return true;
  };

  const resumeBlsRound = (nextState = "PLAYING") => {
    if (!resetBlsRound()) return;
    audioContextRef.current?.resume?.().catch(() => {});
    setSessionState(nextState);
  };

  const endSessionForTimer = () => {
    clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = null;
    timerEndAtRef.current = null;
    timerWarningShownRef.current = false;
    timerPausedBlsRef.current = false;
    setIsTimerRunning(false);
    setRemainingSeconds(0);
    setShowTimerWarning(false);
    setIsPaused(false);
    resetBlsRound({ force: true });
    playInstructionAudio("endSession", "Your session time is ending now. Let's return to calm place and close safely.");
    setSessionState("CALM_PLACE");
  };

  const beginFiveMinuteClosure = async () => {
    timerWarningShownRef.current = true;
    timerPausedBlsRef.current = BLS_ACTIVE_STATES.includes(sessionStateRef.current);
    if (timerPausedBlsRef.current) {
      setIsPaused(true);
    }
    setShowTimerWarning(true);
    setSessionState("TIMER_CLOSURE_SUDS");
    await playInstructionAudio(
      "endSession",
      "Your session time is ending now. Let's return to the original image and save the current emotion rating before Calm Place."
    );
  };

  const startSessionTimer = (secondsOverride) => {
    const totalSeconds = Math.max(
      1,
      Math.floor(secondsOverride || duration * 60)
    );
    const endAt = Date.now() + totalSeconds * 1000;

    clearInterval(timerIntervalRef.current);
    timerEndAtRef.current = endAt;
    timerWarningShownRef.current = false;
    timerPausedBlsRef.current = false;
    setRemainingSeconds(totalSeconds);
    setIsTimerRunning(true);
    setShowTimerWarning(false);

    timerIntervalRef.current = setInterval(() => {
      const nextRemainingSeconds = Math.max(
        0,
        Math.ceil((timerEndAtRef.current - Date.now()) / 1000)
      );

      setRemainingSeconds(nextRemainingSeconds);

      if (
        nextRemainingSeconds <= FIVE_MINUTES_SECONDS &&
        nextRemainingSeconds > 0 &&
        !timerWarningShownRef.current
      ) {
        beginFiveMinuteClosure();
      }

      if (nextRemainingSeconds <= 0) {
        endSessionForTimer();
      }
    }, 1000);
  };

  const dismissTimerWarning = () => {
    setShowTimerWarning(false);
    if (timerPausedBlsRef.current && BLS_ACTIVE_STATES.includes(sessionStateRef.current)) {
      setIsPaused(false);
    }
    timerPausedBlsRef.current = false;
  };

  const handleResumeSavedSession = () => {
    const snapshot = pendingResumeSnapshot;
    if (!snapshot) return;

    clearInterval(timerIntervalRef.current);
    resetBlsRound({ force: true });

    const savedCurrentSet = Math.max(1, Number(snapshot.currentSet) || 1);
    const savedEndpointHitCount = Math.max(0, Number(snapshot.endpointHitCount) || 0);
    const savedRemainingSeconds = Math.max(
      1,
      Math.floor(Number(snapshot.remainingSeconds) || duration * 60)
    );

    currentSetRef.current = savedCurrentSet;
    endpointHitCountRef.current = savedEndpointHitCount;
    setCurrentSet(savedCurrentSet);
    setDuration(Number(snapshot.durationMinutes) || duration);
    setRemainingSeconds(savedRemainingSeconds);
    setLatestSudsRating(
      Number.isFinite(Number(snapshot.latestSudsRating))
        ? Number(snapshot.latestSudsRating)
        : null
    );
    setLatestCheckInResponse(snapshot.latestCheckInResponse || "");
    setCheckInHistory(Array.isArray(snapshot.checkInHistory) ? snapshot.checkInHistory : []);
    setPositiveBeliefs(
      Array.isArray(snapshot.positiveBeliefs) && snapshot.positiveBeliefs.length
        ? snapshot.positiveBeliefs
        : [DEFAULT_POSITIVE_BELIEF]
    );
    setActiveBeliefIndex(Number(snapshot.activeBeliefIndex) || 0);
    setVocRatings(snapshot.vocRatings || {});
    setTargetContext(snapshot.targetContext || getStoredTarget());
    setRoadmapAudioContext(snapshot.roadmapAudioContext || getStoredRoadmapAudioContext());
    setHasRoadmapAudioCompleted(Boolean(snapshot.hasRoadmapAudioCompleted));
    setBodyScanHistory(Array.isArray(snapshot.bodyScanHistory) ? snapshot.bodyScanHistory : []);
    setBodySensationLocation(snapshot.bodySensationDraft?.location || "");
    setBodySensationDescription(snapshot.bodySensationDraft?.description || "");
    setTimerClosureSudsRating(
      Number.isFinite(Number(snapshot.timerClosureSudsRating))
        ? Number(snapshot.timerClosureSudsRating)
        : null
    );
    setShowTimerWarning(false);
    setPendingResumeSnapshot(null);
    setIsPaused(false);
    finalResultSavedRef.current = false;

    const nextState =
      snapshot.sessionState && snapshot.sessionState !== "END"
        ? snapshot.sessionState
        : "INTRO";

    setSessionState(nextState);

    if (nextState !== "INTRO" && nextState !== "CALM_PLACE") {
      startSessionTimer(savedRemainingSeconds);
    }

    speak("Your saved session has been restored.");
  };

  const handleStartNewSession = async () => {
    stopSessionInstructionAudio();

    if (baseUrl && token && processingSessionId) {
      try {
        await processingStateRequest({
          baseUrl,
          token,
          sessionId: processingSessionId,
          method: "DELETE",
        });
      } catch (error) {
        console.warn("Unable to clear backend processing state.", error);
      }
    }

    clearSavedSessionSnapshot();
    latestAutoSaveRef.current = null;
    latestBackendSnapshotRawRef.current = "";
    finalResultSavedRef.current = false;
    setPendingResumeSnapshot(null);
    setHasRoadmapAudioCompleted(false);
    setTimerClosureSudsRating(null);
  };

  const handleGoToCalmPlace = () => {
    setSessionState("CALM_PLACE");
    playInstructionAudio(
      "calmPlace",
      "Please bring up your pincode and spend a minute finding that nice feeling in the body."
    );
  };

  const handleEndSafely = () => {
    playInstructionAudio(
      "endSession",
      "Let's end safely now. Return to the room, notice where you are, and use Calm Place if you need it."
    );
    setSessionState("END");
  };

  useEffect(() => {
    sessionStateRef.current = sessionState;

    if (sessionState === "CALM_PLACE" || sessionState === "END") {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
      timerEndAtRef.current = null;
      setIsTimerRunning(false);
      setShowTimerWarning(false);
    }
  }, [sessionState]);

  useEffect(() => {
    return () => {
      clearInterval(timerIntervalRef.current);
      clearTimeout(backendSaveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const savePausedSnapshot = () => {
      const snapshot = latestAutoSaveRef.current;
      if (!snapshot || snapshot.status !== "in_progress") return;

      const nextRemainingSeconds = timerEndAtRef.current
        ? Math.max(0, Math.ceil((timerEndAtRef.current - Date.now()) / 1000))
        : snapshot.remainingSeconds;

      saveSessionSnapshot({
        ...snapshot,
        savedAt: new Date().toISOString(),
        isTimerRunning: false,
        remainingSeconds: nextRemainingSeconds,
        timerEndAt: null,
        pausedBecauseUserLeft: true,
      });
    };

    window.addEventListener("pagehide", savePausedSnapshot);
    window.addEventListener("beforeunload", savePausedSnapshot);

    return () => {
      window.removeEventListener("pagehide", savePausedSnapshot);
      window.removeEventListener("beforeunload", savePausedSnapshot);
    };
  }, []);

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
    if (isLoading || isPaused || !BLS_ACTIVE_STATES.includes(sessionState)) {
      clearInterval(movementIntervalRef.current);
      clearInterval(movementWatchdogRef.current);
      clearTimeout(movementEndTimeoutRef.current);
      clearTimeout(nextMoveTimeoutRef.current);
      movementEndTimeoutsRef.current.forEach(clearTimeout);
      movementEndTimeoutsRef.current.clear();
      trackAudioRef.current?.pause();
      playingEndpointKeysRef.current.clear();
      movementStateRef.current = MOVEMENT_STATES.STOPPED;
      movementTargetRightRef.current = null;
      return;
    }

    let cancelled = false;
    let roundCompleted = false;
    const loopRunId = loopRunIdRef.current + 1;
    loopRunIdRef.current = loopRunId;
    const movementEndTimeouts = movementEndTimeoutsRef.current;
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

    const clearActiveHitPlaybackState = () => {
      playingEndpointKeysRef.current.clear();
      playingHitIdRef.current = null;
      playingHitMovementIdRef.current = null;
    };

    const stopHitPool = () => {
      clearAudioStopTimers();
      const pool = audioPoolRef.current.length ? audioPoolRef.current : [audioRef.current].filter(Boolean);
      pool.forEach((item) => {
        item.audio.pause();
      });
      clearActiveHitPlaybackState();
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

      if (profile?.mode === "stereo-track") {
        playedEndpointKeysRef.current.add(endpointKey);
        playingEndpointKeysRef.current.add(endpointKey);
        lastPlayedHitIdRef.current = hitId;
        playingHitIdRef.current = hitId;
        lastPlayedMovementIdRef.current = movementId;
        playingHitMovementIdRef.current = movementId;
        playContinuousTrack(side, movementId, hitId);
        playingEndpointKeysRef.current.delete(endpointKey);
        playingHitIdRef.current = null;
        playingHitMovementIdRef.current = null;
        return;
      }

      stopHitPool();
      playedEndpointKeysRef.current.add(endpointKey);
      playingEndpointKeysRef.current.add(endpointKey);
      lastPlayedHitIdRef.current = hitId;
      playingHitIdRef.current = hitId;
      lastPlayedMovementIdRef.current = movementId;
      playingHitMovementIdRef.current = movementId;

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

    const initialProfile = getProfile();
    if (!initialProfile) {
      console.warn("Bilateral audio profile missing; using fallback alternating timing.");
    } else if (initialProfile.mode === "unknown") {
      console.warn("Bilateral audio profile is unknown; using safe one-shot endpoint panning.");
    }
    if (initialProfile?.mode !== "stereo-track") stopContinuousTrack();

    const finishSideHit = (hitRightSide, movementId) => {
      if (
        cancelled ||
        roundCompleted ||
        isPausedRef.current ||
        loopRunIdRef.current !== loopRunId
      ) {
        return false;
      }
      const endpointSide = hitRightSide ? "right" : "left";
      const endpointKey = getEndpointKey(endpointSide, movementId);
      const hitId = getEndpointHitId(endpointSide, movementId);
      try {
        playHitSound(endpointSide, movementId, hitId, endpointKey);
      } catch (error) {
        console.warn("Bilateral hit audio failed; continuing movement.", error);
      }
      endpointHitCountRef.current += 1;
      const completedSets = Math.floor(
        endpointHitCountRef.current / ENDPOINT_HITS_PER_SET
      );
      const nextSet = Math.min(completedSets + 1, TOTAL_SETS);
      currentSetRef.current = nextSet;
      setCurrentSet(nextSet);

      if (completedSets >= TOTAL_SETS) {
        roundCompleted = true;
        clearInterval(movementIntervalRef.current);
        clearInterval(movementWatchdogRef.current);
        clearTimeout(movementEndTimeoutRef.current);
        clearTimeout(nextMoveTimeoutRef.current);
        movementEndTimeoutsRef.current.forEach(clearTimeout);
        movementEndTimeoutsRef.current.clear();
        audioStopTimersRef.current.forEach(clearTimeout);
        audioStopTimersRef.current = [];
        audioPoolRef.current.forEach((item) => {
          item.audio.pause();
        });
        stopContinuousTrack();
        movementStateRef.current = MOVEMENT_STATES.STOPPED;
        movementTargetRightRef.current = null;
        if (sessionState === "PHASE3_BLS") {
          setSessionState("PHASE3_BODY_SCAN");
          speak("Now scan your body again from head to toe and notice whether anything remains.");
        } else if (sessionState === "PHASE2_BLS") {
          setSessionState("PHASE2_NOTICE");
          speak("What do you notice now?");
        } else {
          setSessionState("CHECK_IN");
          speak("Is it changing and still connected?");
        }
        return true;
      }

      movementStateRef.current = MOVEMENT_STATES.IDLE;
      movementTargetRightRef.current = null;
      return false;
    };

    const doMove = () => {
      try {
        if (
          cancelled ||
          roundCompleted ||
          isPausedRef.current ||
          loopRunIdRef.current !== loopRunId
        ) {
          return;
        }

        lastMovementTickAtRef.current = Date.now();
        const targetRightSide = !isRightRef.current;
        const movementId = movementIdRef.current + 1;
        movementIdRef.current = movementId;
        movementStateRef.current = MOVEMENT_STATES.MOVING;
        movementTargetRightRef.current = targetRightSide;

        isRightRef.current = targetRightSide;
        setMovementDurationMs(getCurrentSpeedMs());
        setIsRight(targetRightSide);

        movementStateRef.current = MOVEMENT_STATES.ENDPOINT_HIT;
        finishSideHit(targetRightSide, movementId);
      } catch (error) {
        console.warn("Bilateral movement tick failed; continuing heartbeat.", error);
      }
    };

    const startDelayMs = 80;
    const getTickIntervalMs = () => getCurrentSpeedMs() + VISUAL_ENDPOINT_SETTLE_MS + 120;
    const timeout = setTimeout(() => {
      doMove();
      movementIntervalRef.current = setInterval(doMove, getTickIntervalMs());
      movementWatchdogRef.current = setInterval(() => {
        if (
          cancelled ||
          roundCompleted ||
          isPausedRef.current ||
          loopRunIdRef.current !== loopRunId
        ) {
          return;
        }

        const staleForMs = Date.now() - lastMovementTickAtRef.current;
        if (staleForMs > getTickIntervalMs() * 2) {
          clearInterval(movementIntervalRef.current);
          doMove();
          movementIntervalRef.current = setInterval(doMove, getTickIntervalMs());
        }
      }, 1000);
    }, startDelayMs);
    const playingEndpointKeys = playingEndpointKeysRef.current;

    return () => {
      cancelled = true;
      if (loopRunIdRef.current === loopRunId) {
        loopRunIdRef.current += 1;
      }
      clearInterval(movementIntervalRef.current);
      clearInterval(movementWatchdogRef.current);
      clearTimeout(timeout);
      clearTimeout(movementEndTimeoutRef.current);
      movementEndTimeoutRef.current = null;
      clearTimeout(nextMoveTimeoutRef.current);
      nextMoveTimeoutRef.current = null;
      movementEndTimeouts.forEach(clearTimeout);
      movementEndTimeouts.clear();
      playingEndpointKeys.clear();
      movementStateRef.current = MOVEMENT_STATES.STOPPED;
      movementTargetRightRef.current = null;
    };
  }, [isLoading, isPaused, sessionState, direction, speedMs]);

  const handleStart = () => {
    if (BLS_ACTIVE_STATES.includes(sessionStateRef.current)) {
      console.warn("Ignored duplicate BLS start while stimulation is active.");
      return;
    }

    const storedSessionId = getStoredProcessingSessionId();
    if (storedSessionId) {
      setProcessingSessionId(storedSessionId);
    }

    stopSessionInstructionAudio();
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
    endpointHitCountRef.current = 0;
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
    startSessionTimer();
    setSessionState("PLAYING");
  };

  const handleCheckIn = (response) => {
    const entry = {
      response,
      phase: "phase1",
      set: currentSetRef.current,
      createdAt: new Date().toISOString(),
    };

    setLatestCheckInResponse(response);
    setCheckInHistory((currentHistory) => [...currentHistory, entry]);

    if (response === "changing") {
      (async () => {
        await playInstructionAudio("changing", "Ok good, go with that or go with where you left off.");
        resumeBlsRound("PLAYING");
      })();
      return;
    }

    if (response === "stuck") {
      setSessionState("STUCK");
      (async () => {
        await playInstructionAudio("stuck", "It sounds like you may feel stuck. Take a breath, notice the room around you, and keep going with the processing.");
        resumeBlsRound("PLAYING");
      })();
      return;
    }

    if (response === "not-changing") {
      playInstructionAudio("notChanging", "Ok, let's go back to the original image. Without any tapping or eye movement, just take a moment to notice what you see and feel. Rate your negative emotion on a scale of 0 to 10.");
      setSessionState("SUDS");
    }
  };

  const handleSuds = (rating) => {
    setLatestSudsRating(rating);

    if (rating > 1) {
      speak("Ok, let's continue with what you noticed about your original image.");
      resumeBlsRound("PLAYING");
    } else {
      speak("Great job. Phase one is complete. Let's move to phase two and strengthen the positive belief.");
      setActiveBeliefIndex(0);
      setSessionState("PHASE2_VOC");
    }
  };

  const handleVoc = (rating) => {
    const activeBelief = positiveBeliefs[activeBeliefIndex] || DEFAULT_POSITIVE_BELIEF;

    setVocRatings((currentRatings) => ({
      ...currentRatings,
      [activeBelief]: rating,
    }));

    if (rating >= 6) {
      const nextBeliefIndex = activeBeliefIndex + 1;

      if (nextBeliefIndex < positiveBeliefs.length) {
        speak("This belief is installed. Let's move to the next positive belief.");
        setActiveBeliefIndex(nextBeliefIndex);
        setSessionState("PHASE2_VOC");
        return;
      }

      speak("All positive beliefs are now installed. Phase two is complete.");
      setSessionState("PHASE2_COMPLETE");
      return;
    }

    speak(`${POSITIVE_REINFORCEMENT_SCRIPT} ${PHASE2_INSTALLATION_SCRIPT.replace("[POSITIVE BELIEF]", activeBelief)}`);
    resumeBlsRound("PHASE2_BLS");
  };

  const handlePhase2Notice = (response) => {
    const activeBelief = positiveBeliefs[activeBeliefIndex] || DEFAULT_POSITIVE_BELIEF;
    const entry = {
      response,
      phase: "phase2",
      activePositiveBelief: activeBelief,
      set: currentSetRef.current,
      createdAt: new Date().toISOString(),
    };

    setCheckInHistory((currentHistory) => [...currentHistory, entry]);

    if (response === "positive") {
      setSessionState("PHASE2_VOC");
      return;
    }

    (async () => {
      await playInstructionAudio("negativeBranch", NEGATIVE_BRANCH_SCRIPT);
      resumeBlsRound("PLAYING");
    })();
  };

  const handleTimerClosureSuds = (rating) => {
    setLatestSudsRating(rating);
    setTimerClosureSudsRating(rating);
    setCheckInHistory((currentHistory) => [
      ...currentHistory,
      {
        response: "timer-closure-suds",
        phase: "closure",
        sudsRating: rating,
        createdAt: new Date().toISOString(),
      },
    ]);
    setShowTimerWarning(false);
    timerPausedBlsRef.current = false;
    setIsPaused(false);
    setSessionState("CALM_PLACE");
    playInstructionAudio(
      "calmPlace",
      "Please bring up your pincode and spend a minute finding that nice feeling in the body."
    );
  };

  const handleBodyScan = (status) => {
    if (status === "clear") {
      setBodyScanHistory((currentHistory) => [
        ...currentHistory,
        {
          status: "clear",
          location: "",
          description: "",
          createdAt: new Date().toISOString(),
        },
      ]);
      speak("Good. Your body scan is clear. Phase three is complete.");
      setSessionState("PHASE3_COMPLETE");
      return;
    }

    if (status === "unsure") {
      setBodyScanHistory((currentHistory) => [
        ...currentHistory,
        {
          status: "unsure",
          location: "",
          description: "",
          createdAt: new Date().toISOString(),
        },
      ]);
      speak("That's okay. Take a moment to notice your body, then we will use another short round of bilateral stimulation.");
      resumeBlsRound("PHASE3_BLS");
      return;
    }

    setBodySensationLocation("");
    setBodySensationDescription("");
    speak("Notice where you feel that sensation, and describe it briefly.");
    setSessionState("PHASE3_SENSATION");
  };

  const handleSensationContinue = () => {
    const location = bodySensationLocation.trim();
    const description = bodySensationDescription.trim();

    setBodyScanHistory((currentHistory) => [
      ...currentHistory,
      {
        status: "sensation-present",
        location,
        description,
        createdAt: new Date().toISOString(),
      },
    ]);
    speak("Let's process that body sensation with another bilateral stimulation round.");
    resumeBlsRound("PHASE3_BLS");
  };

  const activePositiveBelief = positiveBeliefs[activeBeliefIndex] || DEFAULT_POSITIVE_BELIEF;

  useEffect(() => {
    if (sessionState === "INTRO" && !isTimerRunning && latestSudsRating === null) {
      return;
    }

    const snapshot = {
      version: 1,
      savedAt: new Date().toISOString(),
      status: sessionState === "END" ? "completed" : "in_progress",
      sessionState,
      currentSet,
      endpointHitCount: endpointHitCountRef.current,
      durationMinutes: duration,
      isTimerRunning,
      remainingSeconds,
      timerEndAt: timerEndAtRef.current,
      latestSudsRating,
      latestCheckInResponse,
      checkInHistory,
      positiveBeliefs,
      activeBeliefIndex,
      activePositiveBelief,
      vocRatings,
      targetContext,
      roadmapAudioContext,
      hasRoadmapAudioCompleted,
      timerClosureSudsRating,
      bodyScanHistory,
      bodySensationDraft: {
        location: bodySensationLocation,
        description: bodySensationDescription,
      },
      stimulation: {
        direction,
        speed,
        environment: envId,
        icon: iconId,
        sound: soundId,
      },
    };

    latestAutoSaveRef.current = snapshot;
    saveSessionSnapshot(snapshot);

    if (baseUrl && token && processingSessionId) {
      const snapshotRaw = JSON.stringify(snapshot);
      if (
        snapshotRaw !== latestBackendSnapshotRawRef.current &&
        !backendSaveTimerRef.current
      ) {
        backendSaveTimerRef.current = window.setTimeout(async () => {
          backendSaveTimerRef.current = null;
          const latestSnapshot = latestAutoSaveRef.current;
          if (!latestSnapshot) return;

          try {
            await processingStateRequest({
              baseUrl,
              token,
              sessionId: processingSessionId,
              method: "PATCH",
              processingState: latestSnapshot,
            });
            latestBackendSnapshotRawRef.current = JSON.stringify(latestSnapshot);
          } catch (error) {
            console.warn("Unable to sync backend processing state.", error);
          }
        }, 1500);
      }
    }
  }, [
    activeBeliefIndex,
    activePositiveBelief,
    baseUrl,
    bodyScanHistory,
    bodySensationDescription,
    bodySensationLocation,
    checkInHistory,
    currentSet,
    direction,
    duration,
    envId,
    iconId,
    isTimerRunning,
    hasRoadmapAudioCompleted,
    latestCheckInResponse,
    latestSudsRating,
    positiveBeliefs,
    processingSessionId,
    remainingSeconds,
    roadmapAudioContext,
    sessionState,
    soundId,
    speed,
    targetContext,
    timerClosureSudsRating,
    token,
    vocRatings,
  ]);

  useEffect(() => {
    if (
      sessionState !== "END" ||
      finalResultSavedRef.current ||
      !baseUrl ||
      !token ||
      !processingSessionId
    ) {
      return;
    }

    const saveFinalResult = async () => {
      const snapshot = latestAutoSaveRef.current;
      if (!snapshot) return;

      finalResultSavedRef.current = true;

      const processingResult = {
        version: 1,
        completedAt: new Date().toISOString(),
        finalSudsRating: latestSudsRating,
        timerClosureSudsRating,
        finalVocRatings: vocRatings,
        completedPositiveBeliefs: positiveBeliefs.filter((belief) => vocRatings[belief] >= 6),
        activePositiveBelief,
        bodyScanHistory,
        checkInHistory,
        stimulationHistory: {
          totalConfiguredSets: TOTAL_SETS,
          lastCurrentSet: currentSet,
          endpointHitCount: endpointHitCountRef.current,
          direction,
          speed,
          environment: envId,
          icon: iconId,
          sound: soundId,
        },
        targetContext,
        roadmapAudioContext,
        finalSnapshot: snapshot,
      };

      try {
        await processingResultRequest({
          baseUrl,
          token,
          sessionId: processingSessionId,
          processingResult,
        });
        clearSavedSessionSnapshot();
        latestBackendSnapshotRawRef.current = "";
      } catch (error) {
        finalResultSavedRef.current = false;
        console.warn("Unable to save final EMDR processing result.", error);
      }
    };

    saveFinalResult();
  }, [
    activePositiveBelief,
    baseUrl,
    bodyScanHistory,
    checkInHistory,
    currentSet,
    direction,
    envId,
    iconId,
    latestSudsRating,
    positiveBeliefs,
    processingSessionId,
    roadmapAudioContext,
    sessionState,
    soundId,
    speed,
    targetContext,
    timerClosureSudsRating,
    token,
    vocRatings,
  ]);

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
    if (pendingResumeSnapshot) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-serif">
          <div className="bg-white rounded-3xl p-8 md:p-12 max-w-xl w-full shadow-2xl text-center">
            <p className="text-sm uppercase tracking-[0.2em] text-[#4A7C59] mb-3">Saved Session</p>
            <h2 className="text-3xl font-serif text-[#0F1912] mb-4">Resume previous session?</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              You have a saved EMDR session. The timer was paused when you left, so it will continue from the saved remaining time.
            </p>
            <div className="mb-8 rounded-2xl bg-[#F6F7F4] p-5 text-left text-sm text-gray-700">
              <p><strong>Phase:</strong> {pendingResumeSnapshot.sessionState?.replaceAll("_", " ") || "Saved session"}</p>
              <p className="mt-2"><strong>Time remaining:</strong> {formatDuration(pendingResumeSnapshot.remainingSeconds || 0)}</p>
              {pendingResumeSnapshot.latestSudsRating !== null && pendingResumeSnapshot.latestSudsRating !== undefined && (
                <p className="mt-2"><strong>Last SUDS:</strong> {pendingResumeSnapshot.latestSudsRating}/10</p>
              )}
              {pendingResumeSnapshot.activePositiveBelief && (
                <p className="mt-2"><strong>Positive belief:</strong> {pendingResumeSnapshot.activePositiveBelief}</p>
              )}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={handleResumeSavedSession} className="flex-1 py-4 bg-[#4A7C59] text-white text-lg rounded-xl hover:bg-[#3d6849] transition-all">
                Resume
              </button>
              <button onClick={handleStartNewSession} className="flex-1 py-4 border-2 border-gray-300 text-gray-700 text-lg rounded-xl hover:bg-gray-50 transition-all">
                Start New
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (sessionState === "TIMER_CLOSURE_SUDS") {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-serif">
          <div className="bg-white rounded-3xl p-8 md:p-12 max-w-2xl w-full shadow-2xl text-center">
            <p className="text-sm uppercase tracking-[0.2em] text-amber-500 mb-3">Session Timer</p>
            <h2 className="text-3xl font-serif text-[#0F1912] mb-4">5 minutes remaining</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              Return to the original image and notice the current emotion number. This will be saved for your next session continuation.
            </p>
            <div className="mb-6 rounded-2xl bg-[#F6F7F4] p-5 text-left">
              <p className="mb-2 text-xs uppercase tracking-[0.16em] text-gray-400">Original image</p>
              <p className="text-sm text-gray-700">
                {targetContext.freezeFrame || targetContext.target || "Return to the original image from the roadmap."}
              </p>
            </div>
            <div className="mb-8 rounded-2xl bg-[#F6F7F4] p-4 text-left text-sm text-gray-700">
              <p><strong>0 or 1:</strong> distress is almost gone.</p>
              <p className="mt-2"><strong>2 to 10:</strong> some distress remains and this score will be saved for next time.</p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              {[0,1,2,3,4,5,6,7,8,9,10].map((val) => (
                <button key={val} onClick={() => handleTimerClosureSuds(val)} className="w-12 h-12 rounded-full border-2 border-[#4A7C59] text-[#4A7C59] hover:bg-[#4A7C59] hover:text-white transition-all text-lg font-medium">
                  {val}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (sessionState === "INTRO") {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-serif">
          <div className="bg-white rounded-3xl p-8 md:p-12 max-w-2xl w-full shadow-2xl text-center">
            <h2 className="text-3xl font-serif text-[#0F1912] mb-6">Phase 1 of EMDR</h2>
            <div className="text-lg text-gray-700 space-y-4 mb-8 text-left bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <p><strong>1.</strong> You can play the intro and roadmap summary audio if you want.</p>
              <p><strong>2.</strong> When you are ready, start bilateral stimulation.</p>
            </div>
            
            <div className="mb-8 rounded-2xl border border-[#DDE5DA] bg-[#F7FAF5] p-5 text-left">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-[#4A7C59] uppercase tracking-wider">Roadmap Audio</p>
                  <p className="text-gray-700 mt-1">
                    {roadmapAudioContext.roadmapSummaryAudioUrl
                      ? "Generated roadmap summary audio is ready."
                      : "Generated roadmap summary will use browser voice until an audio file is saved."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={isRoadmapAudioPlaying ? stopSessionInstructionAudio : playIntroAndRoadmapSummary}
                  className="px-5 py-3 rounded-xl bg-[#0F1912] text-white hover:bg-[#1f2d22] transition-all"
                >
                  {isRoadmapAudioPlaying ? "Stop Audio" : "Play Summary"}
                </button>
              </div>
            </div>

            <div className="mb-8">
              <p className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">Select Session Duration</p>
              <div className="flex gap-4 justify-center">
                <button onClick={() => setDuration(60)} className={`px-6 py-3 rounded-xl border-2 transition-all ${duration === 60 ? 'border-[#4A7C59] bg-[#4A7C59]/10 text-[#4A7C59]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>1 Hour</button>
                <button onClick={() => setDuration(90)} className={`px-6 py-3 rounded-xl border-2 transition-all ${duration === 90 ? 'border-[#4A7C59] bg-[#4A7C59]/10 text-[#4A7C59]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>1.5 Hours</button>
              </div>
            </div>

            <button
              onClick={handleStart}
              className="w-full py-4 text-white text-lg rounded-xl bg-[#4A7C59] hover:bg-[#3d6849] transition-all"
            >
              I have the image in mind - Start
            </button>
          </div>
        </div>
      );
    }
    
    if (sessionState === "CHECK_IN") {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-serif">
          <div className="bg-white rounded-3xl p-8 md:p-12 max-w-2xl w-full shadow-2xl text-center">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-400 mb-3">Check-In</p>
            <h2 className="text-2xl font-serif text-[#0F1912] mb-3">Is it changing and still connected?</h2>
            <p className="text-gray-600 mb-8">Choose the closest answer. SUDS rating appears only if it is not changing.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button onClick={() => handleCheckIn("changing")} className="py-4 bg-[#4A7C59] text-white rounded-xl hover:bg-[#3d6849] transition-all text-lg">Changing</button>
              <button onClick={() => handleCheckIn("not-changing")} className="py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all text-lg">Not Changing</button>
              <button onClick={() => handleCheckIn("stuck")} className="py-4 border-2 border-amber-300 text-amber-800 rounded-xl hover:bg-amber-50 transition-all text-lg">Stuck</button>
            </div>
          </div>
        </div>
      );
    }

    if (sessionState === "STUCK") {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-serif">
          <div className="bg-white rounded-3xl p-8 md:p-12 max-w-xl w-full shadow-2xl text-center">
            <h2 className="text-2xl font-serif text-[#0F1912] mb-4">Stuck moment</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Listen to the stuck instructions. This popup will close and bilateral stimulation will continue automatically.
            </p>
            <div className="rounded-2xl bg-[#F6F7F4] p-5 text-sm text-gray-600">
              Processing will resume after the instruction audio finishes.
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
            <p className="text-gray-600 mb-4">Without any tapping or eye movement, just take a moment to notice what you see and feel. How disturbing is it right now?</p>
            <div className="mb-8 rounded-2xl bg-[#F6F7F4] p-4 text-left text-sm text-gray-700">
              <p><strong>0 or 1:</strong> distress is almost gone, so this phase will finish and you will move to Phase 2.</p>
              <p className="mt-2"><strong>2 to 10:</strong> some distress is still present, so another 34-set stimulation round will start.</p>
            </div>
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

    if (sessionState === "PHASE2_VOC") {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-serif">
          <div className="bg-white rounded-3xl p-8 md:p-12 max-w-2xl w-full shadow-2xl text-center">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-400 mb-3">Phase 2</p>
            <h2 className="text-2xl font-serif text-[#0F1912] mb-4">Positive belief installation</h2>
            <div className="mb-6 rounded-2xl bg-[#F6F7F4] p-5 text-left">
              <p className="text-sm text-gray-500 mb-2">
                Belief {activeBeliefIndex + 1} of {positiveBeliefs.length}
              </p>
              <p className="text-xl text-[#0F1912]">&quot;{activePositiveBelief}&quot;</p>
            </div>
            <p className="text-gray-600 mb-4">
              How true does this positive belief feel right now?
            </p>
            <div className="mb-8 rounded-2xl bg-white border border-gray-100 p-4 text-left text-sm text-gray-700">
              <p><strong>1:</strong> does not feel true yet.</p>
              <p className="mt-2"><strong>2 to 5:</strong> partly true, so another 34-set installation round will start.</p>
              <p className="mt-2"><strong>6 or 7:</strong> belief installed, so the next belief or Phase 3 will load.</p>
              <p className="mt-2">
                {PHASE2_INSTALLATION_SCRIPT.replace("[POSITIVE BELIEF]", activePositiveBelief)}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              {[1,2,3,4,5,6,7].map((val) => (
                <button key={val} onClick={() => handleVoc(val)} className="w-12 h-12 rounded-full border-2 border-[#4A7C59] text-[#4A7C59] hover:bg-[#4A7C59] hover:text-white transition-all text-lg font-medium">
                  {val}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-4 text-sm text-gray-500 px-4">
              <span>1 = Not true</span>
              <span>7 = Completely true</span>
            </div>
          </div>
        </div>
      );
    }

    if (sessionState === "PHASE2_NOTICE") {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-serif">
          <div className="bg-white rounded-3xl p-8 md:p-12 max-w-xl w-full shadow-2xl text-center">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-400 mb-3">Phase 2</p>
            <h2 className="text-2xl font-serif text-[#0F1912] mb-4">What do you notice now?</h2>
            <p className="text-gray-600 mb-8">Is it positive or negative?</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <button onClick={() => handlePhase2Notice("positive")} className="py-4 bg-[#4A7C59] text-white rounded-xl hover:bg-[#3d6849] transition-all text-lg">Positive</button>
              <button onClick={() => handlePhase2Notice("negative")} className="py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all text-lg">Negative</button>
            </div>
          </div>
        </div>
      );
    }

    if (sessionState === "PHASE2_COMPLETE") {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-serif">
          <div className="bg-white rounded-3xl p-8 md:p-12 max-w-xl w-full shadow-2xl text-center">
            <h2 className="text-3xl font-serif text-[#0F1912] mb-6">Phase 2 Complete</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              All positive beliefs reached 6 or 7 out of 7. The next step is the body scan phase.
            </p>
            <div className="mb-8 rounded-2xl bg-[#F6F7F4] p-4 text-left text-sm text-gray-700">
              {positiveBeliefs.map((belief) => (
                <p key={belief} className="mb-2 last:mb-0">
                  <strong>{belief}:</strong> {vocRatings[belief] || 7}/7
                </p>
              ))}
            </div>
            <button onClick={() => setSessionState("PHASE3_BODY_SCAN")} className="w-full py-4 bg-[#4A7C59] text-white text-lg rounded-xl hover:bg-[#3d6849] transition-all">
              Continue to Body Scan
            </button>
          </div>
        </div>
      );
    }

    if (sessionState === "PHASE3_BODY_SCAN") {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-serif">
          <div className="bg-white rounded-3xl p-8 md:p-12 max-w-3xl w-full shadow-2xl text-center">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-400 mb-3">Phase 3</p>
            <h2 className="text-3xl font-serif text-[#0F1912] mb-4">Body Scan</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              Bring up the original image or memory you worked on, together with the positive belief. Then scan your body from head to toe.
            </p>

            <div className="mb-6 grid grid-cols-1 gap-4 text-left md:grid-cols-2">
              <div className="rounded-2xl bg-[#F6F7F4] p-5">
                <p className="mb-2 text-xs uppercase tracking-[0.16em] text-gray-400">Original target</p>
                <p className="text-sm text-gray-700">
                  {targetContext.freezeFrame || targetContext.target || "Use the original image or memory from Phase 1. No new image is needed."}
                </p>
              </div>
              <div className="rounded-2xl bg-[#F6F7F4] p-5">
                <p className="mb-2 text-xs uppercase tracking-[0.16em] text-gray-400">Positive belief</p>
                <p className="text-sm text-gray-700">&quot;{activePositiveBelief}&quot;</p>
              </div>
            </div>

            <p className="mb-8 text-gray-600">
              Do you notice any remaining tension, pressure, pain, heaviness, tightness, or unusual sensation?
            </p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <button onClick={() => handleBodyScan("clear")} className="py-4 bg-[#4A7C59] text-white rounded-xl hover:bg-[#3d6849] transition-all text-lg">Clear / Neutral</button>
              <button onClick={() => handleBodyScan("sensation")} className="py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all text-lg">Sensation Present</button>
              <button onClick={() => handleBodyScan("unsure")} className="py-4 border-2 border-amber-300 text-amber-800 rounded-xl hover:bg-amber-50 transition-all text-lg">Unsure</button>
            </div>
          </div>
        </div>
      );
    }

    if (sessionState === "PHASE3_SENSATION") {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-serif">
          <div className="bg-white rounded-3xl p-8 md:p-12 max-w-xl w-full shadow-2xl">
            <div className="text-center">
              <p className="text-sm uppercase tracking-[0.2em] text-gray-400 mb-3">Body Scan</p>
              <h2 className="text-2xl font-serif text-[#0F1912] mb-4">Describe the sensation</h2>
              <p className="text-gray-600 mb-8">
                This is only to help focus the next stimulation round. A short answer is enough.
              </p>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Where do you notice it?</span>
                <input
                  value={bodySensationLocation}
                  onChange={(event) => setBodySensationLocation(event.target.value)}
                  placeholder="e.g. chest, throat, stomach, shoulders"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#4A7C59]"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">What does it feel like?</span>
                <textarea
                  value={bodySensationDescription}
                  onChange={(event) => setBodySensationDescription(event.target.value)}
                  placeholder="e.g. tight, heavy, warm, numb, pressure"
                  className="h-28 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#4A7C59]"
                />
              </label>
            </div>

            <div className="mt-8 flex gap-3">
              <button onClick={() => setSessionState("PHASE3_BODY_SCAN")} className="flex-1 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all">
                Back
              </button>
              <button onClick={handleSensationContinue} className="flex-1 py-3 bg-[#4A7C59] text-white rounded-xl hover:bg-[#3d6849] transition-all">
                Continue BLS
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (sessionState === "PHASE3_COMPLETE") {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-serif">
          <div className="bg-white rounded-3xl p-8 md:p-12 max-w-xl w-full shadow-2xl text-center">
            <h2 className="text-3xl font-serif text-[#0F1912] mb-6">Phase 3 Complete</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              Your body scan is clear. We will finish with Calm Place to close the session safely.
            </p>
            {bodyScanHistory.length > 0 && (
              <div className="mb-8 max-h-44 overflow-y-auto rounded-2xl bg-[#F6F7F4] p-4 text-left text-sm text-gray-700">
                {bodyScanHistory.map((item, index) => (
                  <p key={`${item.createdAt}-${index}`} className="mb-2 last:mb-0">
                    <strong>{index + 1}. {item.status.replace("-", " ")}:</strong>{" "}
                    {[item.location, item.description].filter(Boolean).join(" - ") || "No remaining sensation"}
                  </p>
                ))}
              </div>
            )}
            <button onClick={handleGoToCalmPlace} className="w-full py-4 bg-[#4A7C59] text-white text-lg rounded-xl hover:bg-[#3d6849] transition-all">
              Continue to Calm Place
            </button>
          </div>
        </div>
      );
    }

    if (sessionState === "CALM_PLACE") {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-serif">
          <div className="bg-white rounded-3xl p-8 md:p-12 max-w-xl w-full shadow-2xl text-center">
            <h2 className="text-3xl font-serif text-[#0F1912] mb-6">Calm Place</h2>
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
      {!isPaused && BLS_ACTIVE_STATES.includes(sessionState) && selectedIcon?.img && (
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
      {!isPaused && BLS_ACTIVE_STATES.includes(sessionState) && selectedIcon?.img && (
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

      {/* Timer + counter */}
      {(isTimerRunning || BLS_ACTIVE_STATES.includes(sessionState)) && (
        <div className="absolute top-8 right-9 z-40 pointer-events-none text-right text-sm italic text-white/80"
          style={{ textShadow: "0 1px 5px rgba(0,0,0,0.2)" }}>
          {isTimerRunning && <div>Time {formatDuration(remainingSeconds)}</div>}
          {BLS_ACTIVE_STATES.includes(sessionState) && (
            <div>Set {Math.min(currentSet, TOTAL_SETS)} of {TOTAL_SETS}</div>
          )}
        </div>
      )}

      {/* Pause button */}
      {BLS_ACTIVE_STATES.includes(sessionState) && (
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
