"use client";
import React, { useState, useEffect, useRef, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getBilateralEnvironments } from "@/components/dashboard/bilateral/VisualEnvironmentSelector";
import { getBilateralIcons } from "@/components/dashboard/bilateral/VisualIconSelector";
import { getBilateralSounds } from "@/components/dashboard/bilateral/SoundSelector";
import { useStoredAuth } from "@/redux/authStorage";
import { analyzeAudioUrl } from "@/utils/bilateralAudioAnalysis";
import {
  getRoadmapIntroVideoCompleted,
  markRoadmapIntroVideoCompleted,
} from "@/utils/sessionProgress";
import {
  BILATERAL_INTRO_ROUTE,
  hasWatchedBilateralIntroVideo,
  markBilateralIntroVideoWatched,
} from "@/utils/bilateralIntroVideo";
import {
  DEFAULT_BILATERAL_SELECTIONS,
  withDefaultBilateralOptions,
} from "@/utils/bilateralDefaultOptions";

const SPEED_MS = { slow: 800, medium: 500, fast: 300, faster: 180 };
const TOTAL_SETS = 34;
const ENDPOINT_HITS_PER_SET = 2;
const VIDEO_STIMULUS_SIZE = 220;
const IMAGE_STIMULUS_SIZE = 90;
const EDGE_PADDING = 8;
const ONE_SHOT_HIT_PLAY_MS = 1200;
const DETECTED_HIT_MAX_PLAY_MS = 420;
const UNKNOWN_HIT_PLAY_MS = 320;
const VISUAL_ENDPOINT_SETTLE_MS = 120;
const ENDPOINT_HIT_RATIO = 0.92;
const VALID_DIRECTIONS = ["horizontal", "vertical", "diagonal-up", "diagonal-down"];
const DEBUG_BILATERAL_AUDIO = process.env.NODE_ENV !== "production";
const MOVEMENT_STATES = {
  IDLE: "idle",
  MOVING: "moving",
  ENDPOINT_HIT: "endpoint-hit",
  STOPPED: "stopped",
};
const BLS_ACTIVE_STATES = ["PLAYING", "PHASE2_BLS", "PHASE3_BLS"];
const DIRECTION_OPTIONS = [
  { value: "horizontal", label: "Horizontal" },
  { value: "vertical", label: "Vertical" },
  { value: "diagonal-up", label: "Diagonal Up" },
  { value: "diagonal-down", label: "Diagonal Down" },
];
const DEFAULT_POSITIVE_BELIEF = "I am safe now";
const FIVE_MINUTES_SECONDS = 5 * 60;
const AUTO_SAVE_STORAGE_KEY = "bilateralSessionAutoSave";
const CURRENT_EMDR_SESSION_STORAGE_KEY = "currentEMDRSessionId";
const READY_SCRIPT = "When you are ready...";
const PHASE2_INSTALLATION_SCRIPT =
  "Put the words [POSITIVE BELIEF] together with your original image or what is left of it. Mash it together in your mind and start the bilateral stimulation.";
const POSITIVE_REINFORCEMENT_SCRIPT = "Lovely! Keep going.";
const NEGATIVE_BRANCH_SCRIPT = "OK good, keep going.";
const STUCK_GUIDANCE_SCRIPT =
  "Direction change. You can switch the bilateral stimulation to any of the available directions below: Horizontal, Vertical, Diagonal Up, or Diagonal Down. Choose the direction that feels most comfortable, then continue the session.";
const STUCK_CLICK_SCRIPT = "Ok, go with where you left off.";
const BODY_SCAN_GUIDANCE_SCRIPT =
  "Now I want you to spend a moment with your eyes closed. Look through your body from the top of your head, downwards. If there are any sensations present let me know.";
const SENSATION_PRESENT_GUIDANCE_SCRIPT =
  "OK, look closely at that sensation, as if you have never seen anything like it before. Focus on it and try not to let your mind wander this time. When you have it in mind and are ready press start.";
const MAX_BODY_SENSATION_ADDITIONAL_CYCLES = 4;
const CLIENT_VOICE_PROMPTS = {
  changingConnected: "/voice/is it still changing and connected.wav",
  changing: [
    "/voice/okgood go with that.wav",
    "/voice/go with where you left off.wav",
  ],
  stuck: "/voice/go with where you left off.wav",
  notChanging: "/voice/lets go back to the original image.wav",
  okContinue: "/voice/ok lets continue.wav",
  ready: "/voice/when you are ready.wav",
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

const formatDuration = (totalSeconds) => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

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

const requestNaturalVoiceAudio = async ({
  baseUrl,
  token,
  text,
  cacheNamespace,
}) => {
  if (!baseUrl || !token || !text?.trim()) {
    throw new Error("Natural voice service is not configured.");
  }

  const response = await fetch(`${baseUrl}/api/voice/tts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: text.trim(), cacheNamespace }),
  });
  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success || !result?.data?.audioUrl) {
    const errorCode = result?.error?.code ? ` ${result.error.code}` : "";
    const errorMessage =
      result?.message || result?.error?.message || "Natural voice audio is unavailable.";
    throw new Error(`Voice API ${response.status}${errorCode}: ${errorMessage}`);
  }

  return result.data.audioUrl;
};

const isOldRoadmapSummaryText = (value) => {
  const text = firstText(value);
  return (
    text === "Your roadmap summary is ready." ||
    text.includes("The original memory or image you are working with is:") ||
    text.includes("The freeze frame is:") ||
    text.includes("The negative belief is:")
  );
};

const buildLocalRoadmapSummaryText = (latestSession, summary, beliefPairs) => {
  const startingPoint = firstText(summary.startingPoint, latestSession?.startingPoint).toLowerCase();
  const isAddictionFlow = Boolean(summary.isAddictionFlow || startingPoint.includes("addiction"));
  const responses = Array.isArray(latestSession?.responses) ? latestSession.responses : [];

  if (isAddictionFlow) {
    return [
      firstText(summary.target, responses[1])
        ? `You are gently focusing on ${firstText(summary.target, responses[1])}.`
        : "",
      firstText(responses[2])
        ? `You have described the feeling as ${firstText(responses[2])}.`
        : "",
      firstText(responses[4])
        ? `The thoughts connected with it are ${firstText(responses[4])}.`
        : "",
      firstText(summary.bodyLocation, responses[5])
        ? `You notice it in ${firstText(summary.bodyLocation, responses[5])}.`
        : "",
      firstText(responses[6])
        ? `Hold the image of ${firstText(responses[6])} lightly in mind.`
        : "",
      "There is no need to force anything. When you feel ready, press start and simply notice what comes.",
    ].filter(Boolean).join(" ");
  }

  const targetPrefix = startingPoint.includes("future")
    ? "You are imagining"
    : startingPoint.includes("words")
      ? "You are bringing to mind"
      : startingPoint.includes("difficult emotions")
        ? "You are focusing on"
        : "You are remembering";
  const target = firstText(summary.freezeFrame, summary.target, responses[2], responses[1]);
  const negativeBeliefs = beliefPairs
    .map((pair) => firstText(pair?.negative, pair?.negativeBelief))
    .filter(Boolean);
  const positiveBeliefs = beliefPairs
    .map((pair) => firstText(pair?.positive, pair?.positiveBelief))
    .filter(Boolean);
  const emotions = [
    firstText(summary.primaryEmotion),
    firstText(summary.additionalEmotions),
  ].filter(Boolean);
  const bodyLocation = firstText(summary.bodyLocation);

  return [
    target ? `${targetPrefix} ${target}.` : "",
    emotions.length
      ? `You described feeling ${emotions.join(", ")}, and it makes sense that this experience still feels important.`
      : "",
    bodyLocation ? `You notice some of this in ${bodyLocation}.` : "",
    negativeBeliefs.length
      ? `The difficult thought${negativeBeliefs.length > 1 ? "s" : ""} you noticed ${negativeBeliefs.length > 1 ? "were" : "was"}: ${negativeBeliefs.join(", ")}.`
      : "",
    positiveBeliefs.length
      ? `You are moving towards the belief${positiveBeliefs.length > 1 ? "s" : ""}: ${positiveBeliefs.join(", ")}.`
      : "",
    "You do not need to force anything. When you feel ready, press start and gently notice what comes.",
  ].filter(Boolean).join(" ");
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

  const localRoadmapSummaryText = buildLocalRoadmapSummaryText(latestSession, summary, beliefPairs);
  const storedRoadmapSummaryText = firstText(
    summary.roadmapSummaryText,
    latestSession?.roadmapSummaryText,
    summary.narration
  );
  const hasOldStoredRoadmapSummaryText = isOldRoadmapSummaryText(storedRoadmapSummaryText);
  const roadmapSummaryAudioProvider = firstText(
    summary.roadmapSummaryAudioProvider,
    latestSession?.roadmapSummaryAudioProvider,
    audio.roadmapSummaryAudioProvider
  );
  const shouldUseStoredAudio =
    !hasOldStoredRoadmapSummaryText && roadmapSummaryAudioProvider === "elevenlabs";

  return {
    introAudioUrl: firstText(
      audio.intro,
      audio.introAudioUrl,
      latestSession?.introAudioUrl,
      summary.introAudioUrl
    ),
    roadmapSummaryAudioUrl: shouldUseStoredAudio
      ? firstText(
          audio.roadmapSummary,
          audio.roadmapSummaryAudioUrl,
          audio.summary,
          audio.summaryAudioUrl,
          latestSession?.roadmapSummaryAudioUrl,
          latestSession?.summaryAudioUrl,
          summary.roadmapSummaryAudioUrl,
          summary.summaryAudioUrl,
          summary.audioUrl
        )
      : "",
    roadmapSummaryText: firstText(
      hasOldStoredRoadmapSummaryText || roadmapSummaryAudioProvider !== "elevenlabs"
        ? localRoadmapSummaryText
        : storedRoadmapSummaryText,
      localRoadmapSummaryText
    ),
    roadmapSummaryAudioProvider,
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

const getLatestCalmPlaceWord = async ({ baseUrl, token }) => {
  if (!baseUrl || !token) return "";

  const response = await fetch(`${baseUrl}/api/calm-place`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const result = await response.json();

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || "Failed to fetch calm place.");
  }

  const latestCalmPlace = (result?.data || [])
    .slice()
    .sort(
      (firstItem, secondItem) =>
        new Date(secondItem?.createdAt || 0).getTime() -
        new Date(firstItem?.createdAt || 0).getTime()
    )[0];

  return firstText(
    latestCalmPlace?.pincode,
    latestCalmPlace?.pinCode,
    latestCalmPlace?.word,
    latestCalmPlace?.keyword,
    latestCalmPlace?.describe
  );
};

const buildCalmPlacePrompt = (calmPlaceWord) =>
  firstText(calmPlaceWord)
    ? `Please bring up your pincode, ${firstText(calmPlaceWord)}, and spend a minute finding that nice feeling in the body.`
    : "Please bring up your pincode and spend a minute finding that nice feeling in the body.";

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
  const initialDirection = normalizeDirection(searchParams.get("direction") || "horizontal");

  const [environments, setEnvironments] = useState(() => withDefaultBilateralOptions({}).environments);
  const [icons, setIcons] = useState(() => withDefaultBilateralOptions({}).icons);
  const [sounds, setSounds] = useState(() => withDefaultBilateralOptions({}).sounds);
  const [isLoading, setIsLoading] = useState(true);
  const [instructionAudioMap, setInstructionAudioMap] = useState({});
  
  // State machine: INTRO -> PLAYING -> CHECK_IN -> STUCK -> SUDS -> PHASE2_VOC -> PHASE2_BLS -> PHASE2_NOTICE -> PHASE2_COMPLETE -> PHASE3_BODY_SCAN -> PHASE3_SENSATION -> PHASE3_BLS -> PHASE3_SENSATION_FEEL_NOW -> PHASE3_SENSATION_LEFT -> PHASE3_COMPLETE -> TIMER_CLOSURE_SUDS -> CALM_PLACE -> END
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
    roadmapSummaryAudioProvider: "",
  });
  const [isRoadmapAudioPlaying, setIsRoadmapAudioPlaying] = useState(false);
  const [isRoadmapAudioPaused, setIsRoadmapAudioPaused] = useState(false);
  const [hasRoadmapAudioCompleted, setHasRoadmapAudioCompleted] = useState(false);
  const [calmPlaceWord, setCalmPlaceWord] = useState("");
  
  const [isPaused, setIsPaused] = useState(false);
  const [pausedVisualPos, setPausedVisualPos] = useState(null);
  const [resumeVisualDurationMs, setResumeVisualDurationMs] = useState(null);
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
  const [bodySensationCurrentFeeling, setBodySensationCurrentFeeling] = useState("");
  const [bodySensationAdditionalCycleCount, setBodySensationAdditionalCycleCount] = useState(0);
  const [bodyScanHistory, setBodyScanHistory] = useState([]);
  const [isRight, setIsRight] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [audioProfile, setAudioProfile] = useState(null);
  const [movementDurationMs, setMovementDurationMs] = useState(SPEED_MS.medium);
  const [direction, setDirection] = useState(initialDirection);
  const [stuckOriginalDirection, setStuckOriginalDirection] = useState(initialDirection);
  const [stuckSelectedDirection, setStuckSelectedDirection] = useState("");
  const [isStuckAudioComplete, setIsStuckAudioComplete] = useState(false);
  const [isStuckInstructionPlaying, setIsStuckInstructionPlaying] = useState(false);

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
  const naturalVoiceUrlCacheRef = useRef(new Map());
  const naturalVoiceRequestCacheRef = useRef(new Map());
  const naturalVoicePlaybackRef = useRef(new Map());
  const instructionPlaybackRef = useRef(new Map());
  const audioPoolRef = useRef([]);
  const audioPoolIndexRef = useRef(0);
  const trackAudioRef = useRef(null);

  useEffect(() => {
    const activeJourneyId = localStorage.getItem("activeJourneyId") || "";
    const hasResumeState = Boolean(getSavedSessionSnapshot() || getStoredProcessingSessionId());

    if (!activeJourneyId) {
      return;
    }

    if (hasResumeState) {
      if (token && baseUrl) {
        markRoadmapIntroVideoCompleted({
          baseUrl,
          token,
          journeyId: activeJourneyId,
        });
      }
      return;
    }

    if (hasWatchedBilateralIntroVideo(activeJourneyId)) {
      if (token && baseUrl) {
        markRoadmapIntroVideoCompleted({
          baseUrl,
          token,
          journeyId: activeJourneyId,
        });
      }
      return;
    }

    if (!token || !baseUrl) {
      router.replace(BILATERAL_INTRO_ROUTE);
      return;
    }

    let cancelled = false;
    const checkRoadmapIntro = async () => {
      const completed = await getRoadmapIntroVideoCompleted({
        baseUrl,
        token,
        journeyId: activeJourneyId,
      });

      if (cancelled) return;

      if (completed) {
        markBilateralIntroVideoWatched(activeJourneyId);
        return;
      }

      router.replace(BILATERAL_INTRO_ROUTE);
    };

    checkRoadmapIntro();

    return () => {
      cancelled = true;
    };
  }, [baseUrl, router, token]);
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
  const resumeFromPauseRef = useRef(false);
  const pausedMovementRef = useRef(null);
  const isRightRef = useRef(false);
  const currentSetRef = useRef(1);
  const endpointHitCountRef = useRef(0);
  const isProcessingBodySensationRef = useRef(false);
  const bodySensationAdditionalCycleCountRef = useRef(0);
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

  const envId = searchParams.get("environment") || DEFAULT_BILATERAL_SELECTIONS.environment;
  const iconId = searchParams.get("icon") || DEFAULT_BILATERAL_SELECTIONS.icon;
  const soundId = searchParams.get("sound") || DEFAULT_BILATERAL_SELECTIONS.sound;
  const speed = SPEED_MS[searchParams.get("speed")] ? searchParams.get("speed") : "medium";

  const speedMs = SPEED_MS[speed] || SPEED_MS.medium;
  const introFallbackText =
    "The bilateral stimulation will start now. Your roadmap is ready. When you start, let your mind wander. Your thoughts may go forward or backwards in time.";

  const cancelActiveSessionAudio = () => {
    const activeAudio = sessionInstructionAudioRef.current;
    if (activeAudio) {
      if (typeof activeAudio.cancelSessionPlayback === "function") {
        activeAudio.cancelSessionPlayback();
      } else {
        activeAudio.pause();
        sessionInstructionAudioRef.current = null;
      }
    }
  };

  const stopSessionInstructionAudio = () => {
    cancelActiveSessionAudio();

    setIsRoadmapAudioPlaying(false);
    setIsRoadmapAudioPaused(false);
  };

  const pauseSessionInstructionAudio = () => {
    if (sessionInstructionAudioRef.current) {
      sessionInstructionAudioRef.current.pause();
    }

    setIsRoadmapAudioPlaying(false);
    setIsRoadmapAudioPaused(true);
  };

  const resumeSessionInstructionAudio = () => {
    if (sessionInstructionAudioRef.current?.paused) {
      sessionInstructionAudioRef.current.play().catch((error) => {
        console.warn("Unable to resume roadmap audio.", error);
      });
    }

    setIsRoadmapAudioPaused(false);
    setIsRoadmapAudioPlaying(true);
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
      let isSettled = false;

      const cleanup = () => {
        audio.removeEventListener("ended", handleEnded);
        audio.removeEventListener("error", handleError);
        delete audio.cancelSessionPlayback;
      };
      const handleEnded = () => {
        if (isSettled) return;
        isSettled = true;
        cleanup();
        if (sessionInstructionAudioRef.current === audio) {
          sessionInstructionAudioRef.current = null;
        }
        resolve({ cancelled: false });
      };
      const handleError = () => {
        if (isSettled) return;
        isSettled = true;
        cleanup();
        if (sessionInstructionAudioRef.current === audio) {
          sessionInstructionAudioRef.current = null;
        }
        reject(new Error("Unable to play audio file."));
      };
      audio.cancelSessionPlayback = () => {
        if (isSettled) return;
        isSettled = true;
        cleanup();
        audio.pause();
        if (sessionInstructionAudioRef.current === audio) {
          sessionInstructionAudioRef.current = null;
        }
        resolve({ cancelled: true });
      };

      audio.addEventListener("ended", handleEnded, { once: true });
      audio.addEventListener("error", handleError, { once: true });
      audio.play().catch((error) => {
        if (isSettled) return;
        isSettled = true;
        cleanup();
        if (sessionInstructionAudioRef.current === audio) {
          sessionInstructionAudioRef.current = null;
        }
        reject(error);
      });
    });

  const getNaturalVoiceUrl = async (text, cacheNamespace = "session-prompt") => {
    const cacheKey = `${cacheNamespace}:${text}`;
    const cachedUrl = naturalVoiceUrlCacheRef.current.get(cacheKey);
    if (cachedUrl) return cachedUrl;

    let pendingRequest = naturalVoiceRequestCacheRef.current.get(cacheKey);
    if (!pendingRequest) {
      pendingRequest = requestNaturalVoiceAudio({
        baseUrl,
        token,
        text,
        cacheNamespace,
      });
      naturalVoiceRequestCacheRef.current.set(cacheKey, pendingRequest);
    }

    try {
      const audioUrl = await pendingRequest;
      naturalVoiceUrlCacheRef.current.set(cacheKey, audioUrl);
      return audioUrl;
    } finally {
      naturalVoiceRequestCacheRef.current.delete(cacheKey);
    }
  };

  const playNaturalVoice = async (text, cacheNamespace = "session-prompt") => {
    const playbackKey = `${cacheNamespace}:${text}`;
    const activePlayback = naturalVoicePlaybackRef.current.get(playbackKey);
    if (activePlayback) return activePlayback;

    cancelActiveSessionAudio();

    const playback = (async () => {
      try {
        const audioUrl = await getNaturalVoiceUrl(text, cacheNamespace);
        const playbackResult = await playAudioFile(audioUrl);
        return !playbackResult?.cancelled;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `[ElevenLabs:${cacheNamespace}] Natural voice unavailable; continuing without voice. ${message}`
        );
        return false;
      } finally {
        naturalVoicePlaybackRef.current.delete(playbackKey);
      }
    })();

    naturalVoicePlaybackRef.current.set(playbackKey, playback);
    return playback;
  };

  useEffect(() => {
    if (isLoading || !baseUrl || !token) return;

    const promptsToPrefetch = [];
    const introAudioUrl = roadmapAudioContext.introAudioUrl || instructionAudioMap.intro || "";
    if (!introAudioUrl) {
      promptsToPrefetch.push([introFallbackText, "session-intro"]);
    }
    if (
      !roadmapAudioContext.roadmapSummaryAudioUrl &&
      roadmapAudioContext.roadmapSummaryText
    ) {
      promptsToPrefetch.push([
        roadmapAudioContext.roadmapSummaryText,
        "roadmap-summary",
      ]);
    }

    promptsToPrefetch.forEach(([text, cacheNamespace]) => {
      void getNaturalVoiceUrl(text, cacheNamespace).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[ElevenLabs:${cacheNamespace}] Voice prefetch failed. ${message}`);
      });
    });
  }, [
    baseUrl,
    isLoading,
    instructionAudioMap.intro,
    roadmapAudioContext.introAudioUrl,
    roadmapAudioContext.roadmapSummaryAudioUrl,
    roadmapAudioContext.roadmapSummaryText,
    token,
  ]);

  const waitForSessionInstructionAudioToFinish = async () => {
    const activeAudio = sessionInstructionAudioRef.current;

    if (activeAudio && !activeAudio.paused && !activeAudio.ended) {
      await new Promise((resolve) => {
        const cleanup = () => {
          activeAudio.removeEventListener("ended", handleDone);
          activeAudio.removeEventListener("error", handleDone);
          activeAudio.removeEventListener("pause", handlePause);
        };
        const handleDone = () => {
          cleanup();
          resolve();
        };
        const handlePause = () => {
          if (activeAudio.ended || sessionInstructionAudioRef.current !== activeAudio) {
            handleDone();
          }
        };

        activeAudio.addEventListener("ended", handleDone, { once: true });
        activeAudio.addEventListener("error", handleDone, { once: true });
        activeAudio.addEventListener("pause", handlePause);
      });
    }

  };

  const playIntroAndRoadmapSummary = async () => {
    stopSessionInstructionAudio();
    setIsRoadmapAudioPlaying(true);
    setIsRoadmapAudioPaused(false);
    setHasRoadmapAudioCompleted(false);

    try {
      const introAudioUrl = roadmapAudioContext.introAudioUrl || instructionAudioMap.intro || "";

      if (introAudioUrl) {
        await playAudioFile(introAudioUrl);
      } else {
        await playNaturalVoice(introFallbackText, "session-intro");
      }

      const summaryIncludesReadyScript = /when you are ready/i.test(
        roadmapAudioContext.roadmapSummaryText || ""
      );

      if (roadmapAudioContext.roadmapSummaryAudioUrl) {
        await playAudioFile(roadmapAudioContext.roadmapSummaryAudioUrl);
      } else if (roadmapAudioContext.roadmapSummaryText) {
        await playNaturalVoice(roadmapAudioContext.roadmapSummaryText, "roadmap-summary");
      }
      if (!roadmapAudioContext.roadmapSummaryAudioUrl && !summaryIncludesReadyScript) {
        await playInstructionAudio("ready", READY_SCRIPT);
      }
      setHasRoadmapAudioCompleted(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `Roadmap audio failed; trying ElevenLabs once more without interrupting the session. ${message}`
      );
      const fallbackText = `${introFallbackText} ${roadmapAudioContext.roadmapSummaryText || ""}`.trim();
      await playNaturalVoice(
        /when you are ready/i.test(fallbackText)
          ? fallbackText
          : `${fallbackText} ${READY_SCRIPT}`.trim(),
        "roadmap-summary-fallback"
      );
      setHasRoadmapAudioCompleted(true);
    } finally {
      setIsRoadmapAudioPlaying(false);
      setIsRoadmapAudioPaused(false);
    }
  };

  const runInstructionAudio = async (key, fallbackText) => {
    cancelActiveSessionAudio();
    const audioSources = CLIENT_VOICE_PROMPTS[key] || instructionAudioMap[key];
    const audioUrls = Array.isArray(audioSources)
      ? audioSources.filter(Boolean)
      : audioSources
        ? [audioSources]
        : [];

    if (audioUrls.length > 0) {
      try {
        for (const audioUrl of audioUrls) {
          const playbackResult = await playAudioFile(audioUrl);
          if (playbackResult?.cancelled) return false;
        }
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `Instruction audio "${key}" failed; using ElevenLabs fallback. ${message}`
        );
      }
    }

    return playNaturalVoice(fallbackText, `instruction-${key}`);
  };

  const playInstructionAudio = async (key, fallbackText) => {
    const playbackKey = `${key}:${fallbackText}`;
    const activePlayback = instructionPlaybackRef.current.get(playbackKey);
    if (activePlayback) return activePlayback;

    const playback = runInstructionAudio(key, fallbackText).finally(() => {
      instructionPlaybackRef.current.delete(playbackKey);
    });
    instructionPlaybackRef.current.set(playbackKey, playback);
    return playback;
  };

  const playCalmPlaceInstruction = async () => {
    const fallbackText = buildCalmPlacePrompt(calmPlaceWord);

    if (firstText(calmPlaceWord)) {
      await playNaturalVoice(fallbackText, "calm-place-personalised");
      return;
    }

    await playInstructionAudio("calmPlace", fallbackText);
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
        const defaults = withDefaultBilateralOptions({
          environments: envs,
          icons: icns,
          sounds: snds,
        });
        setEnvironments(defaults.environments);
        setIcons(defaults.icons);
        setSounds(defaults.sounds);
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
    if (!baseUrl || !token) return;

    let cancelled = false;

    const loadCalmPlaceWord = async () => {
      try {
        const latestWord = await getLatestCalmPlaceWord({ baseUrl, token });
        if (!cancelled) {
          setCalmPlaceWord(latestWord);
        }
      } catch (error) {
        console.warn("Unable to load calm place word.", error);
      }
    };

    loadCalmPlaceWord();

    return () => {
      cancelled = true;
    };
  }, [baseUrl, token]);

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
    resumeFromPauseRef.current = false;
    pausedMovementRef.current = null;
    setPausedVisualPos(null);
    setResumeVisualDurationMs(null);
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

  const resumeBlsRound = async (nextState = "PLAYING") => {
    await waitForSessionInstructionAudioToFinish();
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

  const handleResumeSavedSession = async () => {
    stopSessionInstructionAudio();
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
    setDirection(normalizeDirection(snapshot.stimulation?.direction || direction));
    setBodyScanHistory(Array.isArray(snapshot.bodyScanHistory) ? snapshot.bodyScanHistory : []);
    setBodySensationLocation(snapshot.bodySensationDraft?.location || "");
    setBodySensationDescription(snapshot.bodySensationDraft?.description || "");
    setBodySensationCurrentFeeling(snapshot.bodySensationDraft?.currentFeeling || "");
    const savedBodySensationCycleCount = Math.max(
      0,
      Number(snapshot.bodySensationDraft?.additionalCycleCount) || 0
    );
    bodySensationAdditionalCycleCountRef.current = savedBodySensationCycleCount;
    setBodySensationAdditionalCycleCount(savedBodySensationCycleCount);
    isProcessingBodySensationRef.current = Boolean(snapshot.bodySensationDraft?.isProcessing);
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

    const shouldResumeActiveSession = nextState !== "INTRO" && nextState !== "CALM_PLACE";

    setSessionState(shouldResumeActiveSession ? "RESUMING_SAVED_SESSION" : nextState);

    await playNaturalVoice("Your saved session has been restored.", "session-restored");
    await waitForSessionInstructionAudioToFinish();

    if (shouldResumeActiveSession) {
      startSessionTimer(savedRemainingSeconds);
    }

    setSessionState(nextState);
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
    stopSessionInstructionAudio();
    setSessionState("CALM_PLACE");
    playCalmPlaceInstruction();
  };

  const handleEndSafely = () => {
    stopSessionInstructionAudio();
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

  function getRenderedMovementPos(fallbackPos) {
    const element = movingElementRef.current;
    if (!element || typeof window === "undefined") return fallbackPos;

    const transform = window.getComputedStyle(element).transform;
    if (!transform || transform === "none") return fallbackPos;

    try {
      const matrix = new DOMMatrixReadOnly(transform);
      return { x: matrix.m41, y: matrix.m42 };
    } catch {
      const match = transform.match(/matrix(?:3d)?\(([^)]+)\)/);
      if (!match) return fallbackPos;

      const values = match[1].split(",").map((value) => Number(value.trim()));
      if (values.length === 16) {
        return { x: values[12], y: values[13] };
      }
      if (values.length >= 6) {
        return { x: values[4], y: values[5] };
      }
    }

    return fallbackPos;
  }

  function getDistance(firstPos, secondPos) {
    return Math.hypot(firstPos.x - secondPos.x, firstPos.y - secondPos.y);
  }

  function getMovementRemainingMs(currentVisualPos, targetRightSide) {
    if (movementStateRef.current !== MOVEMENT_STATES.MOVING) return 0;

    const startPos = getNextPos(!targetRightSide);
    const targetPos = getNextPos(targetRightSide);
    const totalDistance = getDistance(startPos, targetPos);
    if (!totalDistance) return 0;

    const remainingDistance = getDistance(currentVisualPos, targetPos);
    const remainingRatio = Math.max(0, Math.min(1, remainingDistance / totalDistance));
    return Math.round((effectiveSpeedMsRef.current || movementDurationMs) * remainingRatio);
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
      if (!isPaused) {
        movementStateRef.current = MOVEMENT_STATES.STOPPED;
        movementTargetRightRef.current = null;
      }
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
          setSessionState(
            isProcessingBodySensationRef.current
              ? "PHASE3_SENSATION_FEEL_NOW"
              : "PHASE3_BODY_SCAN"
          );
        } else if (sessionState === "PHASE2_BLS") {
          setSessionState("PHASE2_NOTICE");
          void playNaturalVoice("What do you notice now?", "phase2-notice");
        } else {
          setSessionState("CHECK_IN");
          playInstructionAudio("changingConnected", "Is it changing and still connected?");
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

        const endpointHitDelayMs = Math.max(
          80,
          Math.round(getCurrentSpeedMs() * ENDPOINT_HIT_RATIO)
        );
        const endpointHitTimer = setTimeout(() => {
          movementEndTimeoutsRef.current.delete(endpointHitTimer);
          if (
            cancelled ||
            roundCompleted ||
            isPausedRef.current ||
            loopRunIdRef.current !== loopRunId
          ) {
            return;
          }

          movementStateRef.current = MOVEMENT_STATES.ENDPOINT_HIT;
          finishSideHit(targetRightSide, movementId);
        }, endpointHitDelayMs);

        movementEndTimeoutRef.current = endpointHitTimer;
        movementEndTimeoutsRef.current.add(endpointHitTimer);
      } catch (error) {
        console.warn("Bilateral movement tick failed; continuing heartbeat.", error);
      }
    };

    const resumeSnapshot = resumeFromPauseRef.current ? pausedMovementRef.current : null;
    resumeFromPauseRef.current = false;
    pausedMovementRef.current = null;
    const getTickIntervalMs = () => getCurrentSpeedMs() + VISUAL_ENDPOINT_SETTLE_MS + 120;
    const startMovementTimers = () => {
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
    };
    let timeout = null;
    let resumeEndpointTimer = null;

    if (resumeSnapshot?.wasMoving && resumeSnapshot.remainingMs > 0) {
      const targetRightSide = Boolean(resumeSnapshot.targetRight);
      const movementId = resumeSnapshot.movementId || movementIdRef.current;
      const remainingMs = Math.max(80, resumeSnapshot.remainingMs);

      lastMovementTickAtRef.current = Date.now();
      movementStateRef.current = MOVEMENT_STATES.MOVING;
      movementTargetRightRef.current = targetRightSide;
      isRightRef.current = targetRightSide;
      setMovementDurationMs(remainingMs);
      setIsRight(targetRightSide);

      resumeEndpointTimer = setTimeout(() => {
        movementEndTimeoutsRef.current.delete(resumeEndpointTimer);
        if (
          cancelled ||
          roundCompleted ||
          isPausedRef.current ||
          loopRunIdRef.current !== loopRunId
        ) {
          return;
        }

        movementStateRef.current = MOVEMENT_STATES.ENDPOINT_HIT;
        setResumeVisualDurationMs(null);
        finishSideHit(targetRightSide, movementId);
      }, remainingMs);
      movementEndTimeoutRef.current = resumeEndpointTimer;
      movementEndTimeoutsRef.current.add(resumeEndpointTimer);

      timeout = setTimeout(() => {
        setResumeVisualDurationMs(null);
        startMovementTimers();
      }, remainingMs + VISUAL_ENDPOINT_SETTLE_MS + 120);
    } else {
      timeout = setTimeout(startMovementTimers, 80);
    }
    const playingEndpointKeys = playingEndpointKeysRef.current;

    return () => {
      cancelled = true;
      if (loopRunIdRef.current === loopRunId) {
        loopRunIdRef.current += 1;
      }
      clearInterval(movementIntervalRef.current);
      clearInterval(movementWatchdogRef.current);
      clearTimeout(timeout);
      clearTimeout(resumeEndpointTimer);
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

  const handleStart = async () => {
    if (BLS_ACTIVE_STATES.includes(sessionStateRef.current)) {
      console.warn("Ignored duplicate BLS start while stimulation is active.");
      return;
    }

    if (!hasRoadmapAudioCompleted) {
      await playIntroAndRoadmapSummary();
      return;
    }

    await waitForSessionInstructionAudioToFinish();

    const storedSessionId = getStoredProcessingSessionId();
    if (storedSessionId) {
      setProcessingSessionId(storedSessionId);
    }

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

  const openStuckDirectionModal = () => {
    setIsPaused(true);
    setStuckOriginalDirection(direction);
    setStuckSelectedDirection("");
    setIsStuckAudioComplete(false);
    setIsStuckInstructionPlaying(true);
    setSessionState("STUCK");

    (async () => {
      try {
        stopSessionInstructionAudio();
        await playNaturalVoice(STUCK_GUIDANCE_SCRIPT, "direction-change");
      } finally {
        setIsStuckInstructionPlaying(false);
        setIsStuckAudioComplete(true);
      }
    })();
  };

  const handleStuckDirectionSelect = (nextDirection) => {
    if (nextDirection === stuckOriginalDirection) return;

    setDirection(nextDirection);
    setStuckSelectedDirection(nextDirection);
  };

  const handleContinueFromStuck = async () => {
    if (!stuckSelectedDirection || !isStuckAudioComplete) return;

    await resumeBlsRound("PLAYING");
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
        const completed = await playInstructionAudio("changing", "Ok good, go with that or go with where you left off.");
        if (completed) resumeBlsRound("PLAYING");
      })();
      return;
    }

    if (response === "stuck") {
      (async () => {
        const completed = await playInstructionAudio("stuck", "Ok, go with where you left off.");
        if (completed) resumeBlsRound("PLAYING");
      })();
      return;
    }

    if (response === "not-changing") {
      (async () => {
        const completed = await playInstructionAudio("notChanging", "Ok, let's go back to the original image. Without any tapping or eye movement, just take a moment to notice what you see and feel. Rate your negative emotion on a scale of 0 to 10.");
        if (completed) setSessionState("SUDS");
      })();
    }
  };

  const handleSuds = async (rating) => {
    stopSessionInstructionAudio();
    setLatestSudsRating(rating);

    if (rating > 1) {
      const completed = await playInstructionAudio("okContinue", "Ok, let's continue with what you noticed about your original image.");
      if (completed) await resumeBlsRound("PLAYING");
    } else {
      const completed = await playNaturalVoice(
        "Great job. This part is complete. Let's strengthen the positive belief.",
        "phase1-complete"
      );
      if (!completed) return;
      setActiveBeliefIndex(0);
      setSessionState("PHASE2_VOC");
    }
  };

  const handleVoc = async (rating) => {
    stopSessionInstructionAudio();
    const activeBelief = positiveBeliefs[activeBeliefIndex] || DEFAULT_POSITIVE_BELIEF;

    setVocRatings((currentRatings) => ({
      ...currentRatings,
      [activeBelief]: rating,
    }));

    if (rating >= 6) {
      const nextBeliefIndex = activeBeliefIndex + 1;

      if (nextBeliefIndex < positiveBeliefs.length) {
        const completed = await playNaturalVoice(
          "Good. Let's check in with the next positive belief.",
          "voc-next-belief"
        );
        if (!completed) return;
        setActiveBeliefIndex(nextBeliefIndex);
        setSessionState("PHASE2_VOC");
        return;
      }

      const completed = await playNaturalVoice(
        "Good. Let that settle for a moment.",
        "voc-complete"
      );
      if (!completed) return;
      setSessionState("PHASE2_COMPLETE");
      return;
    }

    const completed = await playNaturalVoice(
      `${POSITIVE_REINFORCEMENT_SCRIPT} ${PHASE2_INSTALLATION_SCRIPT.replace("[POSITIVE BELIEF]", activeBelief)}`,
      "voc-installation"
    );
    if (!completed) return;
    await resumeBlsRound("PHASE2_BLS");
  };

  const handlePhase2Notice = (response) => {
    stopSessionInstructionAudio();
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
      const completed = await playInstructionAudio("negativeBranch", NEGATIVE_BRANCH_SCRIPT);
      if (completed) resumeBlsRound("PLAYING");
    })();
  };

  const handleTimerClosureSuds = (rating) => {
    stopSessionInstructionAudio();
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
    playCalmPlaceInstruction();
  };

  const handleBodyScan = async (status) => {
    stopSessionInstructionAudio();
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
      const completed = await playNaturalVoice(
        "Good. Your body scan is clear. This part is complete.",
        "body-scan-clear"
      );
      if (!completed) return;
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
      const completed = await playNaturalVoice(
        "That's okay. Take a moment to notice your body, then we will use another short round of bilateral stimulation.",
        "body-scan-unsure"
      );
      if (!completed) return;
      await resumeBlsRound("PHASE3_BLS");
      return;
    }

    setBodySensationLocation("");
    setBodySensationDescription("");
    const completed = await playNaturalVoice(
      SENSATION_PRESENT_GUIDANCE_SCRIPT,
      "body-scan-sensation"
    );
    if (!completed) return;
    setSessionState("PHASE3_SENSATION");
  };

  const handleSensationContinue = async () => {
    stopSessionInstructionAudio();
    const location = bodySensationLocation.trim();
    const description = bodySensationDescription.trim();

    isProcessingBodySensationRef.current = true;
    bodySensationAdditionalCycleCountRef.current = 0;
    setBodySensationAdditionalCycleCount(0);
    setBodySensationCurrentFeeling("");
    setBodyScanHistory((currentHistory) => [
      ...currentHistory,
      {
        status: "sensation-present",
        location,
        description,
        createdAt: new Date().toISOString(),
      },
    ]);
    const completed = await playNaturalVoice(
      "Let's process that body sensation with another bilateral stimulation round. Focus your mind on that sensation and try not to let your mind wander.",
      "body-sensation-process"
    );
    if (!completed) return;
    await resumeBlsRound("PHASE3_BLS");
  };

  const handleSensationFeelingContinue = async () => {
    stopSessionInstructionAudio();
    const completed = await playNaturalVoice(
      "Is there anything left in that sensation?",
      "body-sensation-left"
    );
    if (!completed) return;
    setSessionState("PHASE3_SENSATION_LEFT");
  };

  const returnToBodyScanAfterSensation = async () => {
    isProcessingBodySensationRef.current = false;
    bodySensationAdditionalCycleCountRef.current = 0;
    setBodySensationAdditionalCycleCount(0);
    setBodySensationCurrentFeeling("");
    setBodySensationLocation("");
    setBodySensationDescription("");
    setSessionState("PHASE3_BODY_SCAN");
  };

  const handleSensationLeft = async (hasSensationLeft) => {
    stopSessionInstructionAudio();
    if (!hasSensationLeft) {
      await returnToBodyScanAfterSensation();
      return;
    }

    const completedAdditionalCycles = bodySensationAdditionalCycleCountRef.current;

    if (completedAdditionalCycles >= MAX_BODY_SENSATION_ADDITIONAL_CYCLES) {
      await returnToBodyScanAfterSensation();
      return;
    }

    const nextAdditionalCycle = completedAdditionalCycles + 1;
    bodySensationAdditionalCycleCountRef.current = nextAdditionalCycle;
    setBodySensationAdditionalCycleCount(nextAdditionalCycle);
    setBodySensationCurrentFeeling("");
    const completed = await playNaturalVoice(
      "Focus your mind on that sensation and try not to let your mind wander.",
      "body-sensation-additional-round"
    );
    if (!completed) return;
    await resumeBlsRound("PHASE3_BLS");
  };

  const activePositiveBelief = positiveBeliefs[activeBeliefIndex] || DEFAULT_POSITIVE_BELIEF;

  useEffect(() => {
    if (sessionState !== "PHASE2_VOC") return;

    void playNaturalVoice(
      `Now I would like you to again look back at the original image and put it together with "${activePositiveBelief}". How true does this feel in the body? 1 is not true and 7 is true.`,
      "voc-rating"
    );
  }, [activePositiveBelief, sessionState]);

  useEffect(() => {
    if (sessionState !== "PHASE3_BODY_SCAN") return;

    void playNaturalVoice(BODY_SCAN_GUIDANCE_SCRIPT, "body-scan-intro");
  }, [sessionState]);

  useEffect(() => {
    if (sessionState !== "PHASE3_SENSATION_FEEL_NOW") return;

    void playNaturalVoice(
      "How does that sensation feel now?",
      "body-sensation-feel-now"
    );
  }, [sessionState]);

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
        currentFeeling: bodySensationCurrentFeeling,
        additionalCycleCount: bodySensationAdditionalCycleCount,
        isProcessing: isProcessingBodySensationRef.current,
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
    bodySensationAdditionalCycleCount,
    bodySensationCurrentFeeling,
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

  const targetPos = getNextPos(isRight);
  const currentPos = pausedVisualPos || targetPos;
  const movementTransform = getMovementTransform(isRight);
  const isPlainBall = selectedIcon?.id === DEFAULT_BILATERAL_SELECTIONS.icon;
  const isPlainBackground = selectedEnv?.id === DEFAULT_BILATERAL_SELECTIONS.environment;
  const sessionScreenTextStyle = isPlainBackground
    ? { color: "rgba(0,0,0,0.9)" }
    : { textShadow: "0 1px 5px rgba(0,0,0,0.2)" };
  const sessionScreenTitleStyle = isPlainBackground
    ? { color: "rgba(0,0,0,0.95)" }
    : { textShadow: "0 2px 8px rgba(0,0,0,0.2)" };
  const sessionScreenButtonStyle = isPlainBackground
    ? {
        background: "rgba(255,255,255,0.35)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(0,0,0,0.9)",
        color: "rgba(0,0,0,0.95)",
      }
    : {
        background: "rgba(255,255,255,0.25)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.4)",
        color: "rgba(255,255,255,0.95)",
        textShadow: "0 1px 3px rgba(0,0,0,0.2)",
      };
  const stimulusFacingTransform = `rotate(${movementTransform.rotation}deg) scaleX(${movementTransform.scaleX}) translateZ(0)`;
  const activeMovementDurationMs = resumeVisualDurationMs || movementDurationMs;
  const stimulusTransition = pausedVisualPos
    ? "none"
    : `transform ${activeMovementDurationMs}ms linear`;
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
    filter: isPlainBall ? "none" : "drop-shadow(0 18px 18px rgba(0,0,0,0.26))",
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

  const handlePauseToggle = () => {
    if (!BLS_ACTIVE_STATES.includes(sessionStateRef.current)) {
      setIsPaused((paused) => !paused);
      return;
    }

    if (isPausedRef.current) {
      const snapshot = pausedMovementRef.current;
      resumeFromPauseRef.current = Boolean(snapshot?.wasMoving && snapshot.remainingMs > 0);
      setResumeVisualDurationMs(
        snapshot?.wasMoving && snapshot.remainingMs > 0 ? snapshot.remainingMs : null
      );
      setPausedVisualPos(null);
      setIsPaused(false);
      return;
    }

    const targetRightSide =
      movementTargetRightRef.current !== null
        ? movementTargetRightRef.current
        : isRightRef.current;
    const targetPosition = getNextPos(targetRightSide);
    const currentVisualPosition = getRenderedMovementPos(targetPosition);
    const remainingMs = getMovementRemainingMs(currentVisualPosition, targetRightSide);

    pausedMovementRef.current = {
      targetRight: targetRightSide,
      movementId: movementIdRef.current,
      remainingMs,
      wasMoving: movementStateRef.current === MOVEMENT_STATES.MOVING && remainingMs > 0,
    };
    resumeFromPauseRef.current = false;
    setResumeVisualDurationMs(null);
    setPausedVisualPos(currentVisualPosition);
    setIsPaused(true);
  };

  const handleRoadmapAudioToggle = () => {
    if (isRoadmapAudioPaused) {
      resumeSessionInstructionAudio();
      return;
    }

    if (isRoadmapAudioPlaying) {
      pauseSessionInstructionAudio();
      return;
    }

    playIntroAndRoadmapSummary();
  };

  const roadmapAudioButtonLabel = isRoadmapAudioPaused
    ? "Resume Summary"
    : isRoadmapAudioPlaying
      ? "Pause Summary"
      : "Play Summary";

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
              <p><strong>Status:</strong> {pendingResumeSnapshot.sessionState?.replaceAll("_", " ") || "Saved session"}</p>
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

    if (sessionState === "RESUMING_SAVED_SESSION") {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-serif">
          <div className="bg-white rounded-3xl p-8 md:p-12 max-w-xl w-full shadow-2xl text-center">
            <p className="text-sm uppercase tracking-[0.2em] text-[#4A7C59] mb-3">Saved Session</p>
            <h2 className="text-3xl font-serif text-[#0F1912] mb-4">Restoring session</h2>
            <p className="text-gray-700 leading-relaxed">
              Your session will continue after the audio finishes.
            </p>
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
            <h2 className="text-3xl font-serif text-[#0F1912] mb-6">EMDR Processing</h2>

            <div className="mb-8 rounded-2xl border border-[#DDE5DA] bg-[#F7FAF5] p-5 text-left">
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleRoadmapAudioToggle}
                  className="px-5 py-3 rounded-xl bg-[#0F1912] text-white hover:bg-[#1f2d22] transition-all"
                >
                  {roadmapAudioButtonLabel}
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
              disabled={!hasRoadmapAudioCompleted || isRoadmapAudioPlaying || isRoadmapAudioPaused}
              className={`w-full py-4 text-white text-lg rounded-xl transition-all ${
                hasRoadmapAudioCompleted && !isRoadmapAudioPlaying && !isRoadmapAudioPaused
                  ? "bg-[#4A7C59] hover:bg-[#3d6849]"
                  : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              {hasRoadmapAudioCompleted ? "I have the image in mind - Start" : "Play Summary to Continue"}
            </button>
          </div>
        </div>
      );
    }
    
    if (sessionState === "CHECK_IN") {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-serif">
          <div className="bg-white rounded-3xl p-8 md:p-12 max-w-3xl w-full shadow-2xl text-center">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-400 mb-3">Check-In</p>
            <h2 className="text-2xl font-serif text-[#0F1912] mb-3">Is it changing and still connected?</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <button onClick={() => handleCheckIn("changing")} className="py-4 bg-[#4A7C59] text-white rounded-xl hover:bg-[#3d6849] transition-all text-lg whitespace-nowrap">Changing</button>
              <button onClick={() => handleCheckIn("not-changing")} className="py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all text-lg whitespace-nowrap">Not Changing</button>
              <button onClick={() => handleCheckIn("stuck")} className="py-4 border-2 border-amber-300 text-amber-800 rounded-xl hover:bg-amber-50 transition-all text-lg whitespace-nowrap">Stuck</button>
              <button onClick={openStuckDirectionModal} className="py-4 border-2 border-[#4A7C59] text-[#4A7C59] rounded-xl hover:bg-[#F6F7F4] transition-all text-lg whitespace-nowrap">Direction Change</button>
            </div>
          </div>
        </div>
      );
    }

    if (sessionState === "STUCK") {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-serif">
          <div className="bg-white rounded-3xl p-8 md:p-12 max-w-2xl w-full shadow-2xl text-center">
            <h2 className="text-3xl font-serif text-[#0F1912] mb-4">Direction Change</h2>
            <p className="mx-auto mb-8 max-w-xl text-gray-700 leading-relaxed">
              Choose a new direction for the bilateral stimulation.
            </p>

            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {DIRECTION_OPTIONS.map((option) => {
                const isCurrentDirection = option.value === stuckOriginalDirection;
                const isSelected = option.value === stuckSelectedDirection;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleStuckDirectionSelect(option.value)}
                    disabled={isCurrentDirection}
                    className={`rounded-xl border-2 px-4 py-4 text-base transition-all ${
                      isCurrentDirection
                        ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                        : isSelected
                          ? "border-[#4A7C59] bg-[#4A7C59]/10 text-[#355d42]"
                          : "border-gray-300 text-gray-700 hover:border-[#4A7C59] hover:bg-[#F6F7F4]"
                    }`}
                  >
                    <span className="block font-medium">{option.label}</span>
                    {isCurrentDirection && (
                      <span className="mt-1 block text-xs uppercase tracking-[0.14em]">
                        Current
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mb-6 rounded-2xl bg-[#F6F7F4] p-5 text-sm text-gray-600">
              {isStuckInstructionPlaying
                ? "Direction change audio is playing. Choose a new direction, then continue after the audio finishes."
                : "Choose a different direction, then continue the session."}
            </div>

            <button
              type="button"
              onClick={handleContinueFromStuck}
              disabled={!stuckSelectedDirection || !isStuckAudioComplete}
              className={`w-full rounded-xl py-4 text-lg transition-all ${
                stuckSelectedDirection && isStuckAudioComplete
                  ? "bg-[#4A7C59] text-white hover:bg-[#3d6849]"
                  : "cursor-not-allowed bg-gray-300 text-white"
              }`}
            >
              Continue Session
            </button>
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
              <p><strong>0 or 1:</strong> distress is almost gone.</p>
              <p className="mt-2"><strong>2 to 10:</strong> some distress is still present.</p>
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
            <p className="text-sm uppercase tracking-[0.2em] text-gray-400 mb-3">Positive Belief</p>
            <h2 className="text-2xl font-serif text-[#0F1912] mb-4">Strengthen the positive belief</h2>
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
              <p className="mt-2"><strong>2 to 5:</strong> partly true.</p>
              <p className="mt-2"><strong>6 or 7:</strong> feels strong enough for now.</p>
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
            <p className="text-sm uppercase tracking-[0.2em] text-gray-400 mb-3">Positive Belief</p>
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
            <h2 className="text-3xl font-serif text-[#0F1912] mb-6">Positive Belief Strengthened</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              Let the strengthened positive belief settle in your body.
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
            <p className="text-sm uppercase tracking-[0.2em] text-gray-400 mb-3">Body Scan</p>
            <h2 className="text-3xl font-serif text-[#0F1912] mb-4">Body Scan</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              Now spend a moment with your eyes closed. Look through your body from the top of your head, downwards.
              If there are any sensations present, let me know.
            </p>

            <div className="mb-6 grid grid-cols-1 gap-4 text-left md:grid-cols-2">
              <div className="rounded-2xl bg-[#F6F7F4] p-5">
                <p className="mb-2 text-xs uppercase tracking-[0.16em] text-gray-400">Original target</p>
                <p className="text-sm text-gray-700">
                  {targetContext.freezeFrame || targetContext.target || "Use the original image or memory. No new image is needed."}
                </p>
              </div>
              <div className="rounded-2xl bg-[#F6F7F4] p-5">
                <p className="mb-2 text-xs uppercase tracking-[0.16em] text-gray-400">Positive belief</p>
                <p className="text-sm text-gray-700">&quot;{activePositiveBelief}&quot;</p>
              </div>
            </div>

            <p className="mb-8 text-gray-600">
              Are there any sensations present?
            </p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <button onClick={() => handleBodyScan("clear")} className="py-4 bg-[#4A7C59] text-white rounded-xl hover:bg-[#3d6849] transition-all text-lg">Clear / Neutral</button>
              <button onClick={() => handleBodyScan("sensation")} className="py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all text-lg">Sensation Present</button>
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
              <h2 className="text-2xl font-serif text-[#0F1912] mb-4">Focus on the sensation</h2>
              <p className="text-gray-600 mb-8">
                Look closely at that sensation, as if you have never seen anything like it before.
                When you have it in mind and are ready, press start.
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
                Start
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (sessionState === "PHASE3_SENSATION_FEEL_NOW") {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-serif">
          <div className="bg-white rounded-3xl p-8 md:p-12 max-w-xl w-full shadow-2xl">
            <div className="text-center">
              <p className="text-sm uppercase tracking-[0.2em] text-gray-400 mb-3">Body Scan</p>
              <h2 className="text-2xl font-serif text-[#0F1912] mb-4">How does that sensation feel now?</h2>
              <p className="text-gray-600 mb-8">
                Stay with the same sensation you were processing.
              </p>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">What do you notice now?</span>
              <textarea
                value={bodySensationCurrentFeeling}
                onChange={(event) => setBodySensationCurrentFeeling(event.target.value)}
                placeholder="e.g. lighter, smaller, moving, gone, still tight"
                className="h-28 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#4A7C59]"
              />
            </label>

            <button onClick={handleSensationFeelingContinue} className="mt-8 w-full py-3 bg-[#4A7C59] text-white rounded-xl hover:bg-[#3d6849] transition-all">
              Continue
            </button>
          </div>
        </div>
      );
    }

    if (sessionState === "PHASE3_SENSATION_LEFT") {
      const hasReachedSensationCycleLimit =
        bodySensationAdditionalCycleCount >= MAX_BODY_SENSATION_ADDITIONAL_CYCLES;

      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-serif">
          <div className="bg-white rounded-3xl p-8 md:p-12 max-w-xl w-full shadow-2xl text-center">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-400 mb-3">Body Scan</p>
            <h2 className="text-2xl font-serif text-[#0F1912] mb-4">Is there anything left in that sensation?</h2>
            {hasReachedSensationCycleLimit && (
              <p className="mb-6 rounded-2xl bg-[#F6F7F4] p-4 text-sm text-gray-600">
                This sensation has had four additional processing rounds. Continue with the body scan and look for any remaining sensations elsewhere.
              </p>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <button onClick={() => handleSensationLeft(false)} className="py-4 bg-[#4A7C59] text-white rounded-xl hover:bg-[#3d6849] transition-all text-lg">
                No
              </button>
              <button onClick={() => handleSensationLeft(true)} className="py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all text-lg">
                Yes
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
            <h2 className="text-3xl font-serif text-[#0F1912] mb-6">Body Scan Complete</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              Your body scan is clear. Take a moment to notice that sense of calm.
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
              {buildCalmPlacePrompt(calmPlaceWord)}
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
      {BLS_ACTIVE_STATES.includes(sessionState) && selectedIcon?.img && (
        <div
          ref={movingElementRef}
          className="absolute z-30 pointer-events-none"
          style={{
            left: 0,
            top: 0,
            width: stimulusSize,
            height: stimulusSize,
            transform: `translate3d(${currentPos.x}px, ${currentPos.y}px, 0)`,
            transition: stimulusTransition,
            willChange: "transform",
            transformStyle: "preserve-3d",
            contain: "layout paint style",
            filter: isPlainBall ? "none" : "drop-shadow(0 6px 14px rgba(0,0,0,0.18))",
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
                playDurationMs={activeMovementDurationMs}
                style={stimulusVisualStyle}
              />
            </div>
          </div>
        </div>
      )}

      {/* Reflection */}
      {!isPlainBall && BLS_ACTIVE_STATES.includes(sessionState) && selectedIcon?.img && (
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
            transition: stimulusTransition,
            willChange: "transform",
          }}
        >
          <StimulusVisual
            item={selectedIcon}
            ariaHidden
            motionKey={isRight ? 1 : 0}
            playDurationMs={activeMovementDurationMs}
            style={stimulusVisualStyle}
          />
        </div>
      )}

      {/* Timer + counter */}
      {(isTimerRunning || BLS_ACTIVE_STATES.includes(sessionState)) && (
        <div
          className={`absolute top-8 right-9 z-40 pointer-events-none text-right text-sm italic ${isPlainBackground ? "text-black/80" : "text-white/80"}`}
          style={sessionScreenTextStyle}
        >
          {isTimerRunning && <div>Time {formatDuration(remainingSeconds)}</div>}
          {BLS_ACTIVE_STATES.includes(sessionState) && (
            <div>Set {Math.min(currentSet, TOTAL_SETS)} of {TOTAL_SETS}</div>
          )}
        </div>
      )}

      {/* Pause button */}
      {BLS_ACTIVE_STATES.includes(sessionState) && (
        <button
          onClick={handlePauseToggle}
          className="absolute bottom-8 right-9 z-40 px-6 py-3 rounded-full font-serif text-xs cursor-pointer transition-all"
          style={sessionScreenButtonStyle}
        >
          {isPaused ? "resume" : "pause"}
        </button>
      )}

      {/* Exit button */}
      <button
        onClick={() => router.back()}
        className="absolute bottom-8 left-9 z-40 px-6 py-3 rounded-full font-serif text-xs cursor-pointer transition-all"
        style={sessionScreenButtonStyle}
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
