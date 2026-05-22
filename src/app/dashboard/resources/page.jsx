"use client";
import React from "react";
import Link from "next/link";
export default function MyResources() {
  return (
    <div className="min-h-screen relative px-6 py-12">
      <div className="absolute inset-0 bg-white/20 backdrop-blur-sm rounded-2xl"></div>
      <div className="relative ">
        <h1 className="text-4xl font-serif text-[#0F1912] mb-8">
          My Resources
        </h1>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-teal-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 2v20m0 0c-2.761 0-5-2.239-5-5V9h10v8c0 2.761-2.239 5-5 5zm0 0c2.761 0 5-2.239 5-5M7 9a5 5 0 1110 0"
                  />
                </svg>
              </div>
              <button className="w-10 h-10 border border-stone-300 rounded-lg flex items-center justify-center hover:bg-stone-50 transition-colors">
                <svg
                  className="w-5 h-5 text-stone-700"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </div>
            <h3 className="text-xl font-semibold text-[#292524] mb-2">
              Calm Place Exercise
            </h3>
            <p className="text-[#7A7A7A] text-sm leading-relaxed mb-4">
              Access your saved safe place audio visualization.
            </p>
            <Link
              href="/dashboard/resources/story"
              className="text-[#4A7C59] text-sm font-medium hover:underline"
            >
              Listen Now
            </Link>
          </div>
          <Link href="/dashboard/resources/bilateral" className="bg-white/50 backdrop-blur-sm rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 block cursor-pointer group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-stone-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div className="w-10 h-10 border border-stone-300 rounded-lg flex items-center justify-center group-hover:bg-stone-50 transition-colors">
                <svg
                  className="w-5 h-5 text-stone-700"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-[#292524] mb-2">
              Bilateral Settings
            </h3>
            <p className="text-[#7A7A7A] text-sm leading-relaxed mb-4">
              Customize your visual and audio stimulation preferences.
            </p>
            <span className="text-[#4A7C59] text-sm font-medium group-hover:underline">
              Listen Now
            </span>
          </Link>
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <button className="w-10 h-10 border border-stone-300 rounded-lg flex items-center justify-center hover:bg-stone-50 transition-colors">
                <svg
                  className="w-5 h-5 text-stone-700"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </div>
            <h3 className="text-xl font-semibold text-[#292524] mb-2">
              My Story
            </h3>
            <p className="text-[#7A7A7A] text-sm leading-relaxed mb-4">
              Review your saved CBT formulation reflections.
            </p>
            <Link
              href="/dashboard/resources/my-story"
              className="text-[#4A7C59] text-sm font-medium hover:underline"
            >
              View Story
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
