"use client";
import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStoredAuth } from "@/redux/authStorage";
import { updateSessionProgress } from "@/utils/sessionProgress";

export default function Session5Page() {
  const router = useRouter();
  const { token } = useStoredAuth();
  const videoRef = useRef(null);
  const maxTimeWatched = useRef(0);
  const [videoCompleted, setVideoCompleted] = useState(false);

  const rawBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VITE_BASE_URL || "";
  const baseUrl = rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      // Update max time watched if current time is greater
      if (videoRef.current.currentTime > maxTimeWatched.current) {
        maxTimeWatched.current = videoRef.current.currentTime;
      }
    }
  };

  const handleSeeking = () => {
    if (videoRef.current) {
      // If user tries to seek forward beyond what they've watched, reset to maxTimeWatched
      if (videoRef.current.currentTime > maxTimeWatched.current) {
        videoRef.current.currentTime = maxTimeWatched.current;
      }
    }
  };

  const handleVideoEnd = () => {
    setVideoCompleted(true);
  };

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl py-4">
      <div className="w-full bg-white/50 rounded-3xl shadow-xl p-6 border border-stone-200">
        <div className="text-center mb-4">
          <h1 className="text-2xl md:text-3xl font-serif text-[#3e4e44] mb-2">
            Session 5: Deep Processing
          </h1>
          <p className="text-stone-600 text-sm">
            Please watch the following video to continue your EMDR journey.
          </p>
        </div>

        {/* Session Video */}
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl mb-6">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            controls
            onTimeUpdate={handleTimeUpdate}
            onSeeking={handleSeeking}
            onEnded={handleVideoEnd}
            src="https://res.cloudinary.com/dbglkfj2z/video/upload/v1777059116/my-emdr/media/media_69c70af6f992b944bccd41a9_1777059075139.mp4"
          />
        </div>

        <div className="flex justify-between items-center bg-[#F6F7F4] p-4 rounded-2xl border border-stone-100">
          <div>
            <h3 className="font-semibold text-stone-800 text-base md:text-lg">
              {videoCompleted
                ? "Congratulations on finishing Session 5!"
                : "Finish the video to unlock the next step"}
            </h3>
            <p className="text-stone-500 text-xs md:text-sm">
              {videoCompleted
                ? "You are making great progress. Continue to your therapy roadmap."
                : "You will be able to continue once the full video has been watched."}
            </p>
          </div>
          <button
            onClick={async () => {
              if (!videoCompleted) {
                return;
              }

              const activeJourneyId = localStorage.getItem("activeJourneyId");
              if (activeJourneyId && token && baseUrl) {
                await updateSessionProgress({
                  baseUrl,
                  token,
                  journeyId: activeJourneyId,
                  compledSession: 5,
                });
              }

              router.push("/dashboard/resources/bilateral");
            }}
            disabled={!videoCompleted}
            className="bg-[#41594d] hover:bg-[#354a3f] disabled:bg-stone-300 disabled:text-stone-500 disabled:shadow-none disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg active:scale-95 text-sm md:text-base"
          >
            Next Session
          </button>
        </div>
      </div>
    </div>
  );
}
