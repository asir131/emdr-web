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
    <div className="min-h-screen bg-gradient-to-br from-stone-300 to-stone-400 flex items-center justify-center p-3 rounded-2xl">
      <div className="relative w-full ">
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
              onEnded={handleVideoEnd}
              onLoadedMetadata={(event) =>
                setDuration(event.currentTarget.duration || 0)
              }
              onPlay={() => setIsPlaying(true)}
              onPause={() => {
                setIsPlaying(false);
                syncVideoProgress();
              }}
              onTimeUpdate={(event) =>
                setCurrentTime(event.currentTarget.currentTime)
              }
            />
          )}
          {!isLoadingVideo && !videoError && !isPlaying && !videoEnded && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <button
                onClick={handlePlayPause}
                className="w-20 h-20 bg-teal-700/80 hover:bg-teal-700 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110"
              >
                <svg
                  className="w-10 h-10 text-white ml-1"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </div>
          )}
          {!isLoadingVideo && !videoError ? (
            <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-black/55 px-5 py-4 text-white backdrop-blur-md">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handlePlayPause}
                    className="flex min-w-28 items-center justify-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium transition-colors hover:bg-white/25"
                  >
                    {isPlaying ? (
                      <svg
                        className="h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
                      </svg>
                    ) : (
                      <svg
                        className="h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                    {isPlaying ? "Pause" : "Play"}
                  </button>
                  <button
                    type="button"
                    onClick={handleStop}
                    className="flex min-w-28 items-center justify-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium transition-colors hover:bg-white/25"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M6 6h12v12H6z" />
                    </svg>
                    Stop
                  </button>
                </div>
                <div className="text-sm font-medium">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>
              <p className="mt-2 text-xs text-white/80">
                Remaining {formatTime(remainingTime)}
              </p>
            </div>
          ) : null}
          {videoEnded && (
            <div className="absolute right-6 top-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 w-80 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-lg font-serif text-stone-900 mb-6">
                Session Reflection
              </h2>
              <div className="space-y-6 max-h-[500px] overflow-y-auto">
                {questions.map((question) => (
                  <div key={question.id}>
                    <h3 className="font-semibold text-stone-900 mb-3 text-sm">
                      {question.id}. {question.question}
                    </h3>
                    <div className="space-y-2">
                      {question.options.map((option, index) => (
                        <label
                          key={index}
                          className="flex items-start gap-3 cursor-pointer group"
                        >
                          <input
                            type="checkbox"
                            checked={
                              checkedItems[`${question.id}-${index}`] || false
                            }
                            onChange={() => handleCheck(question.id, index)}
                            className="mt-0.5 w-4 h-4 rounded border-2 border-stone-300 text-teal-600 focus:ring-2 focus:ring-teal-500 cursor-pointer"
                          />
                          <span className="text-sm text-stone-700 group-hover:text-stone-900 leading-snug">
                            {option}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
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
                className="w-full mt-6 bg-[#4A7C59] hover:bg-[#3d6649] text-white py-3 rounded-xl font-medium transition-all shadow-lg active:scale-95"
              >
                Next Step
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
