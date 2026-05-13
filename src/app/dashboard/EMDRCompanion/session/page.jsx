"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStoredAuth } from "@/redux/authStorage";
import { updateSessionProgress } from "@/utils/sessionProgress";

const FIXED_SESSION_VIDEO_ID = "69e7c604fd68f032aa7a2c61";
const FIXED_SESSION_VIDEO_CATEGORY = "session-1";

const patchMediaProgress = async ({
  baseUrl,
  token,
  mediaId,
  watchedSeconds,
  totalSeconds,
}) => {
  const response = await fetch(`${baseUrl}/api/progress/media/${mediaId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      watchedSeconds,
      totalSeconds,
    }),
  });

  const result = await response.json();

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || "Failed to save media progress.");
  }

  return result;
};

const formatTime = (timeInSeconds) => {
  if (!Number.isFinite(timeInSeconds) || timeInSeconds < 0) {
    return "00:00";
  }

  const totalSeconds = Math.floor(timeInSeconds);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export default function EMDRSession() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useStoredAuth();
  const [checkedItems, setCheckedItems] = useState({});
  const [videoEnded, setVideoEnded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoSrc, setVideoSrc] = useState("");
  const [isLoadingVideo, setIsLoadingVideo] = useState(true);
  const [videoError, setVideoError] = useState("");
  const videoRef = useRef(null);
  const lastSyncedProgressRef = useRef({
    watchedSeconds: -1,
    totalSeconds: -1,
  });
  const journeyId = searchParams.get("journeyId") || "";
  const journeyTitle = searchParams.get("title") || "";
  const sessionId = searchParams.get("sessionId") || "";
  const rawBaseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || process.env.VITE_BASE_URL || "";
  const baseUrl = rawBaseUrl.endsWith("/")
    ? rawBaseUrl.slice(0, -1)
    : rawBaseUrl;
  const questions = [
    {
      id: 1,
      question: "How did this session make you feel?",
      options: [
        "Calm and relaxed",
        "Slightly uncomfortable",
        "Emotionally triggered",
      ],
    },
    {
      id: 2,
      question: "Were you able to focus on the bilateral stimulation?",
      options: [
        "Yes, throughout the entire session",
        "Partially, I got distracted",
        "No, I found it difficult to focus",
      ],
    },
    {
      id: 3,
      question: "Did any memories or emotions surface during the session?",
      options: [
        "Yes, and I was able to process them",
        "Yes, but I felt overwhelmed",
        "No, nothing came up",
      ],
    },
  ];

  useEffect(() => {
    const activeJourneyId = journeyId || localStorage.getItem("activeJourneyId");
    if (!activeJourneyId) {
      router.replace("/dashboard");
      return;
    }

    const fetchSessionVideo = async () => {
      if (!baseUrl) {
        setVideoError("Video service is not configured.");
        setIsLoadingVideo(false);
        return;
      }

      if (!token) {
        setVideoError("Please sign in again to load the session video.");
        setIsLoadingVideo(false);
        return;
      }

      try {
        setIsLoadingVideo(true);
        setVideoError("");

        const response = await fetch(`${baseUrl}/api/media?page=1&limit=100`, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const result = await response.json();

        if (!response.ok || !result?.success) {
          throw new Error("Failed to fetch session video.");
        }

        const sessionVideo = (result?.data?.media || []).find(
          (item) =>
            item?._id === FIXED_SESSION_VIDEO_ID &&
            item?.mediaType === "video" &&
            item?.status === "active" &&
            item?.categoryId?.categoryName?.trim()?.toLowerCase() ===
              FIXED_SESSION_VIDEO_CATEGORY
        );

        if (!sessionVideo?.url) {
          throw new Error(
            "The fixed session video was not found in the session-1 category."
          );
        }

        setVideoSrc(sessionVideo.url);
      } catch (error) {
        console.error("Error fetching session video:", error);
        setVideoError(
          error?.message || "Unable to load the session video right now."
        );
      } finally {
        setIsLoadingVideo(false);
      }
    };

    fetchSessionVideo();
  }, [baseUrl, token]);

  const handleCheck = (questionId, optionIndex) => {
    setCheckedItems((currentItems) => ({
      ...currentItems,
      [`${questionId}-${optionIndex}`]:
        !currentItems[`${questionId}-${optionIndex}`],
    }));
  };

  const handlePlayPause = async () => {
    if (videoRef.current) {
      if (videoEnded) {
        videoRef.current.currentTime = 0;
        setCurrentTime(0);
        setVideoEnded(false);
      }

      if (isPlaying) {
        videoRef.current.pause();
      } else {
        try {
          await videoRef.current.play();
        } catch (error) {
          console.error("Unable to play video:", error);
        }
      }
    }
  };

  const handleStop = () => {
    if (!videoRef.current) {
      return;
    }

    videoRef.current.pause();
    setIsPlaying(false);
  };

  const handleVideoEnd = () => {
    setVideoEnded(true);
    setIsPlaying(false);
    setCurrentTime(duration);
    syncVideoProgress(duration, duration);
  };

  const syncVideoProgress = useCallback(
    async (watchedSecondsOverride, totalSecondsOverride) => {
      const watchedSeconds = Math.max(
        0,
        Math.floor(
          watchedSecondsOverride ??
            videoRef.current?.currentTime ??
            currentTime
        )
      );
      const resolvedTotalSeconds = Math.max(
        0,
        Math.floor(
          totalSecondsOverride ??
            videoRef.current?.duration ??
            duration
        )
      );

      if (!baseUrl || !token || !videoSrc) {
        return;
      }

      if (
        watchedSeconds === lastSyncedProgressRef.current.watchedSeconds &&
        resolvedTotalSeconds === lastSyncedProgressRef.current.totalSeconds
      ) {
        return;
      }

      try {
        await patchMediaProgress({
          baseUrl,
          token,
          mediaId: FIXED_SESSION_VIDEO_ID,
          watchedSeconds,
          totalSeconds: resolvedTotalSeconds,
        });

        lastSyncedProgressRef.current = {
          watchedSeconds,
          totalSeconds: resolvedTotalSeconds,
        };
      } catch (error) {
        console.error("Error saving session video progress:", error);
      }
    },
    [baseUrl, currentTime, duration, token, videoSrc]
  );

  const remainingTime = Math.max(duration - currentTime, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-300 to-stone-400 flex flex-col items-center justify-center p-6 rounded-2xl">
      <div className="relative w-full max-w-5xl">
        <div className="relative">
          {isLoadingVideo ? (
            <div className="flex min-h-[420px] items-center justify-center rounded-3xl bg-black/20 px-6 text-center text-white shadow-2xl">
              Loading session video...
            </div>
          ) : videoError ? (
            <div className="flex min-h-[420px] items-center justify-center rounded-3xl bg-red-50 px-6 text-center text-red-600 shadow-2xl">
              {videoError}
            </div>
          ) : (
            <video
              ref={videoRef}
              src={videoSrc}
              className="w-full h-auto rounded-3xl shadow-2xl"
              preload="metadata"
              controls
              onEnded={handleVideoEnd}
              onLoadedMetadata={(event) => {
                setDuration(event.currentTarget.duration || 0);
                event.currentTarget.volume = 1.0;
              }}
              onPlay={() => {
                setIsPlaying(true);
                setVideoEnded(false);
              }}
              onPause={() => {
                setIsPlaying(false);
                syncVideoProgress();
              }}
              onTimeUpdate={(event) =>
                setCurrentTime(event.currentTarget.currentTime)
              }
            />
          )}

          {videoEnded && (
            <div className="absolute right-6 top-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 w-80 animate-in fade-in slide-in-from-right-4 duration-500 text-center">
              <h2 className="text-xl font-serif text-stone-900 mb-4">
                Video Completed
              </h2>
              <p className="text-stone-600 mb-6 text-sm">
                You can now proceed to the next step, or replay the video if you need to.
              </p>
              <button
                onClick={async () => {
                  const activeJourneyId = journeyId || localStorage.getItem("activeJourneyId");
                  
                  if (activeJourneyId && token && baseUrl) {
                    await updateSessionProgress({
                      baseUrl,
                      token,
                      journeyId: activeJourneyId,
                      compledSession: 1
                    });
                  }

                  router.push(
                    `/dashboard/EMDRCompanion/session/next?journeyId=${encodeURIComponent(
                      journeyId
                    )}&title=${encodeURIComponent(
                      journeyTitle
                    )}&sessionId=${encodeURIComponent(sessionId)}`
                  );
                }}
                className="w-full bg-[#4A7C59] hover:bg-[#3d6649] text-white py-3 rounded-xl font-medium transition-all shadow-lg active:scale-95"
              >
                Proceed to Next Step
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
