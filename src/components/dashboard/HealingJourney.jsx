"use client";
import React, { useEffect, useState } from "react";
import { useStoredAuth } from "@/redux/authStorage";

const TRACKERS = [
  { trackerType: "anxiety", fallbackTitle: "Anxiety Scale", color: "teal" },
  { trackerType: "depression", fallbackTitle: "Depression Scale", color: "blue" },
  { trackerType: "anger", fallbackTitle: "Anger", color: "teal" },
  { trackerType: "social-phobia", fallbackTitle: "Social Phobia", color: "blue" },
  { trackerType: "ocd", fallbackTitle: "OCD", color: "teal" },
  { trackerType: "specific-phobia", fallbackTitle: "Specific Phobia", color: "blue" },
  { trackerType: "pain", fallbackTitle: "Pain", color: "teal" },
  { trackerType: "stress-burnout", fallbackTitle: "Stress & Burnout", color: "blue" },
  { trackerType: "addiction", fallbackTitle: "Addiction", color: "teal" },
  { trackerType: "self-esteem", fallbackTitle: "Self-Esteem", color: "blue" },
  { trackerType: "worry", fallbackTitle: "Worry", color: "teal" },
  { trackerType: "trauma", fallbackTitle: "Trauma", color: "blue" },
];

export default function HealingJourney() {
  const { token } = useStoredAuth();
  const rawBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VITE_BASE_URL || "";
  const baseUrl = rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

  const [tests, setTests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTestData = async () => {
      if (!baseUrl || !token) {
        setIsLoading(false);
        return;
      }

      try {
        let configNames = {};
        const configResponse = await fetch(`${baseUrl}/api/symptom-tracker/configs`, {
          cache: "no-store",
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (configResponse.ok) {
          const configResult = await configResponse.json();
          const configs = Array.isArray(configResult?.data) ? configResult.data : [];
          configs.forEach((c) => {
            configNames[c.trackerType] = c.name;
          });
        }

        const historyResults = await Promise.all(
          TRACKERS.map(async ({ trackerType, fallbackTitle, color }) => {
            const response = await fetch(
              `${baseUrl}/api/symptom-tracker/history?trackerType=${trackerType}&page=1&limit=5`,
              {
                cache: "no-store",
                headers: {
                  'Accept': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
              }
            );

            if (!response.ok) return [];

            const result = await response.json();
            const submissions = Array.isArray(result?.data?.submissions) ? result.data.submissions : [];

            return submissions.map(sub => {
              const dateVal = sub.submittedAt || sub.createdAt;
              const dateObj = new Date(dateVal);
              const formattedDate = !Number.isNaN(dateObj.getTime())
                ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(dateObj)
                : "Unknown Date";

              return {
                id: sub._id || Math.random().toString(),
                dateValue: dateVal,
                date: formattedDate,
                title: configNames[trackerType] || fallbackTitle,
                score: sub.totalScore ?? 0,
                description: `You scored ${sub.totalScore ?? 0} on this assessment.`,
                color,
              };
            });
          })
        );

        const allTests = historyResults.flat().filter(t => t.dateValue);
        allTests.sort((a, b) => new Date(b.dateValue).getTime() - new Date(a.dateValue).getTime());

        setTests(allTests.slice(0, 5));
      } catch (error) {
        console.error("Failed to load test history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTestData();
  }, [baseUrl, token]);

  return (
    <div className="w-full py-6">
      <div className="w-full">
        {/* Card Container */}
        <div className=" backdrop-blur-xl rounded-3xl shadow-xl p-8 lg:p-12 border border-white/50">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl lg:text-4xl font-serif text-[#0F172B] mb-2">
                My Tests
              </h1>
              <p className="text-stone-900 text-base">
                Recent assessment scores and dates
              </p>
            </div>
            <button className="bg-[#F1F5F9] hover:bg-stone-50 text-[#314158] px-6 py-3 rounded-xl font-medium shadow-sm border border-stone-200 transition-colors duration-200 cursor-pointer">
              View All
            </button>
          </div>

          {/* Timeline */}
          <div className="space-y-6">
            {isLoading ? (
              <p className="text-stone-500">Loading your test history...</p>
            ) : tests.length > 0 ? (
              tests.map((test, index) => (
                <div key={test.id} className="flex gap-4">
                  {/* Timeline Dot and Line */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full ${test.color === "teal" ? "bg-teal-600" : "bg-blue-600"
                        } flex-shrink-0 mt-2`}
                    ></div>
                    {index < tests.length - 1 && (
                      <div className="w-0.5 h-full bg-stone-300 mt-2"></div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-8">
                    <p className="text-sm text-[#1E3224] mb-1 font-medium">
                      {test.date}
                    </p>
                    <h3 className="text-xl font-semibold text-[#0F172B] mb-1">
                      {test.title}
                    </h3>
                    <p className="text-stone-900 text-sm">
                      {test.description}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-stone-500">No test history found yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
