"use client";
import React, { useRef } from "react";
import { useRouter } from "next/navigation";

export default function Session5Page() {
  const router = useRouter();
  const videoRef = useRef(null);
  const maxTimeWatched = useRef(0);

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
    router.push("/dashboard/resources/bilateral");
  };

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl py-4">
      <div className="w-full bg-white rounded-3xl shadow-xl p-6 border border-stone-200">
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
              Congratulations on finishing Session 5!
            </h3>
            <p className="text-stone-500 text-xs md:text-sm">
              You are making great progress. Continue to your therapy roadmap.
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard/resources/bilateral")}
            className="bg-[#41594d] hover:bg-[#354a3f] text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg active:scale-95 text-sm md:text-base"
          >
            Next Session
          </button>
        </div>
      </div>
    </div>
  );
}
