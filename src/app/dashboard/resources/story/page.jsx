"use client";
import React from "react";
import Image from "next/image";

const calmPlaceItems = [
  {
    id: "thanking-mind-1",
    title: "Thanking the Mind",
    type: "Video",
    tone: "play",
  },
  {
    id: "thanking-mind-2",
    title: "Thanking the Mind",
    type: "Video",
    tone: "play",
  },
  {
    id: "leaves-stream",
    title: "Leaves on a Stream",
    type: "Audio",
    tone: "music",
  },
];

const ItemIcon = ({ tone }) => {
  if (tone === "music") {
    return (
      <svg
        className="h-5 w-5 text-[#355A43]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
        />
      </svg>
    );
  }

  return (
    <svg
      className="h-5 w-5 text-[#355A43]"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
};

export default function StoryPage() {
  return (
    <div className="min-h-screen rounded-2xl bg-[#ede7dc]/50  p-1">
      <section
       
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#d9d3c2]/35 via-transparent to-[#e7e0d2]/20" />
        <div className="relative z-10">
          <h1 className="font-serif text-2xl text-[#2f3027] md:text-3xl">
            Calm Place Exercise
          </h1>

          <div className="mt-4 space-y-3">
            {calmPlaceItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className="flex w-full items-center justify-between rounded-2xl border border-[#bfc8bb] bg-white/90 px-5 py-4 text-left shadow-[0_8px_18px_rgba(53,90,67,0.12)] transition-all hover:bg-white"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#9fbaa4]">
                    <ItemIcon tone={item.tone} />
                  </div>
                  <span className="truncate font-serif text-lg text-[#2d2a26]">
                    {item.title}
                  </span>
                </div>
                <span className="ml-4 shrink-0 text-sm text-[#3e3a36]">
                  {item.type}
                </span>
              </button>
            ))}
          </div>

        
        </div>
      </section>
    </div>
  );
}
