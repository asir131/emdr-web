"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStoredAuth } from "@/redux/authStorage";
import {
  getRoadmapIntroVideoCompleted,
  markRoadmapIntroVideoCompleted,
} from "@/utils/sessionProgress";
import {
  BILATERAL_INTRO_VIDEO_SRC,
  BILATERAL_SETTINGS_ROUTE,
  hasWatchedBilateralIntroVideo,
  markBilateralIntroVideoWatched,
} from "@/utils/bilateralIntroVideo";

export default function BilateralIntroVideoPage() {
  const router = useRouter();
  const { token } = useStoredAuth();
  const videoRef = useRef(null);
  const maxTimeWatched = useRef(0);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [activeJourneyId, setActiveJourneyId] = useState("");
  const rawBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VITE_BASE_URL || "";
  const baseUrl = rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

  useEffect(() => {
    const journeyId = localStorage.getItem("activeJourneyId") || "";
    setActiveJourneyId(journeyId);

    if (hasWatchedBilateralIntroVideo(journeyId)) {
      if (journeyId && token && baseUrl) {
        markRoadmapIntroVideoCompleted({ baseUrl, token, journeyId });
      }
      router.replace(BILATERAL_SETTINGS_ROUTE);
      return;
    }

    if (!journeyId || !token || !baseUrl) return;

    let cancelled = false;
    const checkRoadmapIntroStatus = async () => {
      const completed = await getRoadmapIntroVideoCompleted({
        baseUrl,
        token,
        journeyId,
      });

      if (!cancelled && completed) {
        markBilateralIntroVideoWatched(journeyId);
        router.replace(BILATERAL_SETTINGS_ROUTE);
      }
    };

    checkRoadmapIntroStatus();

    return () => {
      cancelled = true;
    };
  }, [baseUrl, router, token]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    if (videoRef.current.currentTime > maxTimeWatched.current) {
      maxTimeWatched.current = videoRef.current.currentTime;
    }
  };

  const handleSeeking = () => {
    if (!videoRef.current) return;
    if (videoRef.current.currentTime > maxTimeWatched.current) {
      videoRef.current.currentTime = maxTimeWatched.current;
    }
  };

  const continueToBilateralSettings = async () => {
    if (!videoCompleted) return;
    markBilateralIntroVideoWatched(activeJourneyId);
    if (activeJourneyId && token && baseUrl) {
      await markRoadmapIntroVideoCompleted({
        baseUrl,
        token,
        journeyId: activeJourneyId,
      });
    }
    router.push(BILATERAL_SETTINGS_ROUTE);
  };

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl py-4">
      <div className="w-full bg-white/50 rounded-3xl shadow-xl p-6 border border-stone-200">
        <div className="text-center mb-4">
          <h1 className="text-2xl md:text-3xl font-serif text-[#3e4e44] mb-2">
            Your EMDR Session
          </h1>
          <p className="text-stone-600 text-sm">
            Please watch this guidance before choosing your bilateral stimulation settings.
          </p>
        </div>

        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl mb-6">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            controls
            src={BILATERAL_INTRO_VIDEO_SRC}
            onTimeUpdate={handleTimeUpdate}
            onSeeking={handleSeeking}
            onEnded={() => setVideoCompleted(true)}
          />
        </div>

        <div className="flex justify-between items-center bg-[#F6F7F4] p-4 rounded-2xl border border-stone-100">
          <div>
            <h3 className="font-semibold text-stone-800 text-base md:text-lg">
              {videoCompleted
                ? "You can now choose your bilateral settings"
                : "Finish the video to unlock the next step"}
            </h3>
            <p className="text-stone-500 text-xs md:text-sm">
              {videoCompleted
                ? "Continue when you are ready."
                : "The settings page will unlock once the full video has been watched."}
            </p>
          </div>
          <button
            type="button"
            onClick={continueToBilateralSettings}
            disabled={!videoCompleted}
            className="bg-[#41594d] hover:bg-[#354a3f] disabled:bg-stone-300 disabled:text-stone-500 disabled:shadow-none disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg active:scale-95 text-sm md:text-base"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
