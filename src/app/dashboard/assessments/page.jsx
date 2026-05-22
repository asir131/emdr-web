"use client";
import Link from "next/link";
import React, { useState } from "react";

export default function AssessmentsPage() {
  const [showIntroModal, setShowIntroModal] = useState(false);

  return (
    <div className="bg-white/20 min-h-screen backdrop-blur-xl rounded-3xl shadow-2xl p-8 lg:p-12 border border-white/20 w-full">
      <div className="w-full h-full">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-serif text-[#0F1912] mb-3">
            Create Your Roadmap
          </h1>
          <p className="text-[#000000] text-base text-[16px]">
            Before we start processing, we need to identify what we&apos;re
            working on. Choose how you&apos;d like to do this.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          {/* My Tests Card */}
          <div className="bg-white/30 backdrop-blur-md rounded-3xl shadow-lg overflow-hidden">
            {/* Header Image with Clock */}
            <div className="h-48 relative overflow-hidden">
              <img
                src="/homeImage/watch.jpg"
                alt="Vintage clock"
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-purple-100/60 to-pink-100/60"></div>

              {/* Checklist Icon in Circle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center z-10">
                <svg
                  className="w-10 h-10 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
            </div>
            <div className="p-8 text-center">
              <h2 className="text-3xl font-serif text-stone-900 mb-4">
                Chat to virtual assistant Sigmund
              </h2>
              <p className="text-[#7A7A7A] text-[18px] leading-relaxed mb-8">
                Get personalised guidance and prepare for your EMDR sessions with our intelligent virtual assistant.
              </p>
              <button
                onClick={() => setShowIntroModal(true)}
                className="w-full text-[18px] bg-[#4A7C59] hover:bg-[#4a6a4c] text-white font-normal py-4 rounded-xl transition-colors duration-200 cursor-pointer">
                Start now
              </button>
            </div>
          </div>
          <div className="bg-white/30 backdrop-blur-md rounded-3xl shadow-lg overflow-hidden">
            <div className="h-48 relative overflow-hidden">
              <img
                src="/homeImage/image2.png"
                alt="Ocean sunset"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-amber-100/30 to-blue-100/30"></div>

              {/* Chart Icon in Circle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center z-10">
                <svg
                  className="w-10 h-10 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
            </div>

            {/* Card Content */}
            <div className="p-8 text-center">
              <h2 className="text-3xl font-serif text-stone-900 mb-4">
                Book Consultation
              </h2>
              <p className="text-[#7A7A7A] text-[18px] leading-relaxed mb-8">
                Speak directly with a qualified EMDR therapist to discuss your progress and get professional support.
              </p>
              <button className="w-full text-[18px] bg-[#4A7C59] hover:bg-[#4a6a4c] text-white font-normal py-4 rounded-xl transition-colors duration-200 cursor-pointer">
                Book now
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Intro Text Modal */}
      {showIntroModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center   p-4">
          <div className="bg-white/70 backdrop-blur-md rounded-3xl shadow-2xl p-8 max-w-lg w-full relative animate-in fade-in zoom-in duration-300">
            <button
              onClick={() => setShowIntroModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#4A7C59]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <h2 className="text-2xl font-serif text-stone-900 mb-4">Welcome to Your EMDR Session</h2>
              <p className="text-stone-600 text-base leading-relaxed mb-8">
                Before we begin the processing phase, please take a moment to watch the introductory video on the next screen. It will guide you through what to expect, how to prepare your safe space, and how to effectively use the bilateral stimulation tools.
              </p>
              <Link href="/dashboard/EMDRCompanion/session">
                <button className="w-full bg-[#4A7C59] hover:bg-[#3d6649] text-white py-3.5 rounded-xl font-medium transition-colors shadow-lg flex items-center justify-center gap-2">
                  Watch Video to Start
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
