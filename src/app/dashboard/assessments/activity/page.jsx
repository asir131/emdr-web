"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function RecentActivityPage() {
  const [anxietyConfig, setAnxietyConfig] = useState(null);
  const rawBaseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || process.env.VITE_BASE_URL || "";
  const baseUrl = rawBaseUrl.endsWith("/")
    ? rawBaseUrl.slice(0, -1)
    : rawBaseUrl;

  useEffect(() => {
    const fetchAnxietyConfig = async () => {
      if (!baseUrl) {
        return;
      }

      try {
        const response = await fetch(
          `${baseUrl}/api/symptom-tracker/configs/anxiety`,
          {
            cache: "no-store",
          }
        );
        const result = await response.json();

        if (response.ok && result?.success && result?.data) {
          setAnxietyConfig(result.data);
        }
      } catch (error) {
        console.error("Failed to load anxiety config:", error);
      }
    };

    fetchAnxietyConfig();
  }, [baseUrl]);

  const activities = useMemo(() => [
    {
      id: 1,
      title: anxietyConfig?.name ? `${anxietyConfig.name} Scale` : "Anxiety Scale ",
      phase: "Phase-2 (12)",
      date: "Oct 24, 2025",
      href: "/dashboard/assessments/activity/anxiety",
      image: "/activity/Social anxiety (1).jpg",
    },
    {
      id: 2,
      title: "Depression Scale ",
      phase: "Phase-1 (15)",
      date: "Oct 20, 2025",
      href: "/dashboard/assessments/activity/depression",
      image: "/activity/selfesteem (1).jpg",
    },
    {
      id: 3,
      title: "Anger",
      phase: "Phase-1 (22)",
      date: "Oct 15, 2025",
      href: "/dashboard/assessments/activity/pcl-5-ptsd-checklist-session-3",
      image: "/activity/anger.jpg",
    },
    {
      id: 4,
      title: "Social Phobia",
      phase: "Phase-1 (22)",
      date: "Oct 15, 2025",
      href: "/dashboard/assessments/activity/pcl-5-ptsd-checklist-session-4",
      image: "/activity/Social anxiety.jpg",
    },
    {
      id: 5,
      title: "OCD",
      phase: "Phase-1 (22)",
      date: "Oct 15, 2025",
      href: "/dashboard/assessments/activity/pcl-5-ptsd-checklist-session-5",
      image: "/activity/ocd.jpg",
    },
    {
      id: 6,
      title: "Specific Phobia",
      phase: "Phase-1 (22)",
      date: "Oct 15, 2025",
      href: "/dashboard/assessments/activity/pcl-5-ptsd-checklist-session-6",
      image: "/activity/Phobia questionnaire.jpg",
    },
    {
      id: 6,
      title: "Pain",
      phase: "Phase-1 (22)",
      date: "Oct 15, 2025",
      href: "/dashboard/assessments/activity/pcl-5-ptsd-checklist-session-7",
      image: "/activity/stress.jpg",
    },
    {
      id: 6,
      title: "Stress & Burnout",
      phase: "Phase-1 (22)",
      date: "Oct 15, 2025",
      href: "/dashboard/assessments/activity/pcl-5-ptsd-checklist-session-8",
      image: "/activity/burnout.jpg",
    },
    {
      id: 6,
      title: "Addiction",
      phase: "Phase-1 (22)",
      date: "Oct 15, 2025",
      href: "/dashboard/assessments/activity/pcl-5-ptsd-checklist-session-9",
      image: "/activity/ocd (1).jpg",
    },
    {
      id: 6,
      title: "Self-Esteem",
      phase: "Phase-1 (22)",
      date: "Oct 15, 2025",
      href: "/dashboard/assessments/activity/pcl-5-ptsd-checklist-session-10",
      image: "/activity/selfesteem.jpg",
    },
    {
      id: 6,
      title: "Worry",
      phase: "Phase-1 (22)",
      date: "Oct 15, 2025",
      href: "/dashboard/assessments/activity/pcl-5-ptsd-checklist-session-11",
      image: "/activity/worry.jpg",
    },
    {
      id: 6,
      title: "Trauma",
      phase: "Phase-1 (22)",
      date: "Oct 15, 2025",
      href: "/dashboard/assessments/activity/pcl-5-ptsd-checklist-session-12",
      image: "/activity/trauma.jpg",
    },
  ], [anxietyConfig]);

  return (
    <div className="bg-[#ffffff]/50  rounded-3xl shadow-2xl p-8 lg:p-12 border border-white/20 min-h-screen">
      <div className="flex items-center gap-4 mb-10">
        <h1 className="text-4xl font-serif text-block">Recent Activity</h1>
      </div>

      <div className="space-y-4">
        {activities.map((activity, index) => {
          const sharedProps = {
            className:
              "bg-[#E3E6F0]/30 backdrop-blur-md border border-transparent text-[#1A1814] visited:text-[#1A1814] rounded-2xl p-6 flex items-center justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:bg-[#DCE1EE] hover:border-[#C8D0E4] hover:text-[#1A1814] active:translate-y-0 active:bg-[#D4D9E8] active:border-[#BEC8DE] active:text-[#1A1814] transition-all duration-200 cursor-pointer group no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7BED4]",
          };

          const content = (
            <>
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 overflow-hidden rounded-full bg-[#DBE5DE] flex-shrink-0 transition-colors duration-200 group-hover:bg-[#D4DDD6] group-active:bg-[#CCD6CF]">
                  <Image
                    src={activity.image || "/12seson.jpg"}
                    alt={activity.title}
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="mb-1 text-[18px] font-medium text-stone-900 transition-colors duration-200 group-hover:text-[#1A1814] group-active:text-[#111827]">
                    {activity.title}
                  </h3>
                  <p className="text-sm text-[#7A7A7A] transition-colors duration-200 group-hover:text-[#5F676F] group-active:text-[#55606A]">
                    {activity.date}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                {/* <span className="text-[16px] font-semibold text-[#4A7C59] bg-[#4A7C59]/10 px-4 py-2 rounded-full">
                  {activity.phase}
                </span> */}
                <svg
                  className="h-6 w-6 text-stone-400 transition-colors duration-200 group-hover:text-[#4F5A67] group-active:text-[#44505C]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </>
          );

          if (activity.href) {
            return (
              <Link
                key={`${activity.id}-${index}`}
                href={activity.href}
                {...sharedProps}
              >
                {content}
              </Link>
            );
          }

          return (
            <div key={`${activity.id}-${index}`} {...sharedProps}>
              {content}
            </div>
          );
        })}
      </div>

      <div className="mt-12 flex justify-center">
        <Link
          href="/dashboard/results"
          className="flex items-center gap-3 bg-[#1A1814] hover:bg-[#2D2A26] text-[#F5F1EA] px-8 py-4 rounded-2xl font-medium transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
        >
          <div className="bg-white/10 p-2 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <div className="text-left">
            <div className="text-[12px] opacity-80 leading-none mb-1">Want to see more?</div>
            <div className="text-[16px]">View Your Progress Charts</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
