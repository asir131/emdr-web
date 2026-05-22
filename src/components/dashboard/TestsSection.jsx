import Link from "next/link";
import React from "react";

export default function TestsSection() {
  return (
    <div className="w-full py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        {/* My Tests Card */}
        <div className="bg-white/30 rounded-3xl shadow-lg overflow-hidden">
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

          {/* Card Content */}
          <div className="p-8 text-center">
            <h2 className="text-3xl font-serif text-stone-900 mb-4">
              My Tests
            </h2>
            <p className="text-stone-800 text-[18px] leading-relaxed mb-8">
              Take new assessments or retake standard questionnaires
            </p>
            <Link href="/dashboard/assessments/activity">
              <button className="w-full text-[18px] bg-[#4A7C59] hover:bg-[#4a6a4c] text-white font-normal py-4 rounded-xl transition-colors duration-200 cursor-pointer">
                View Assessments
              </button>
            </Link>
          </div>
        </div>

        {/* My Results Card */}
        <div className="bg-white/30 rounded-3xl shadow-lg overflow-hidden">
          {/* Header Image with Ocean/Sky */}
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
              My Results
            </h2>
            <p className="text-stone-800 text-[18px] leading-relaxed mb-8">
              Visualise your healing journey with graphs and historical data
              trends.
            </p>
            <Link href="/dashboard/results">
              <button className="w-full text-[18px] bg-[#4A7C59] hover:bg-[#4a6a4c] text-white font-normal py-4 rounded-xl transition-colors duration-200 cursor-pointer">
                View Assessments
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
