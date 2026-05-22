"use client";
import React from "react";
import TestsSection from "@/components/dashboard/TestsSection";
import HealingJourney from "@/components/dashboard/HealingJourney";

export default function ProgressPage() {
  return (
    <div className="space-y-3 backdrop-blur-sm  p-8 rounded-2xl shadow-sm border border-white/20  ">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-serif text-[#000000] font-medium">
          My Progress
        </h1>
      </div>
      <TestsSection />
      <HealingJourney />
    </div>
  );
}
