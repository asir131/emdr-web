"use client";
import React from "react";
import AssessmentChart from "@/components/dashboard/AssessmentChart";
import SubscriptionAssessmentHistoryChart from "@/components/dashboard/SubscriptionAssessmentHistoryChart";

export default function ResultsPage() {
  return (
    <div className="bg-[#ffffff]/50  rounded-[40px] shadow-2xl p-8 lg:p-12 border border-stone-100  min-h-screen">
      <div className="flex items-center gap-4 mb-2">
        <h1 className="text-3xl font-serif text-block">Progress Over Time</h1>
      </div>

      <div className="flex flex-col gap-10 mt-8">
        <AssessmentChart></AssessmentChart> 
        <SubscriptionAssessmentHistoryChart />
       
      </div>
    </div>
  );
}
