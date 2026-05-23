"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { useStoredAuth } from "@/redux/authStorage";

const TRACKERS = [
  {
    trackerType: "anxiety",
    fallbackTitle: "Anxiety Scale",
    color: "#4A7373",
    fillId: "anxietyFill",
  },
  {
    trackerType: "depression",
    fallbackTitle: "Depression Scale",
    color: "#6B4D5F",
    fillId: "depressionFill",
  },
  {
    trackerType: "anger",
    fallbackTitle: "Anger",
    color: "#A8553D",
    fillId: "angerFill",
  },
  {
    trackerType: "social-phobia",
    fallbackTitle: "Social Phobia",
    color: "#5C5E8B",
    fillId: "socialPhobiaFill",
  },
  {
    trackerType: "ocd",
    fallbackTitle: "OCD",
    color: "#6B7F5F",
    fillId: "ocdFill",
  },
  {
    trackerType: "specific-phobia",
    fallbackTitle: "Specific Phobia",
    color: "#7D5A3D",
    fillId: "specificPhobiaFill",
  },
  {
    trackerType: "pain",
    fallbackTitle: "Pain",
    color: "#9B5D52",
    fillId: "painFill",
  },
  {
    trackerType: "stress-burnout",
    fallbackTitle: "Stress & Burnout",
    color: "#A07238",
    fillId: "stressFill",
  },
  {
    trackerType: "addiction",
    fallbackTitle: "Addiction",
    color: "#5C4438",
    fillId: "addictionFill",
  },
  {
    trackerType: "self-esteem",
    fallbackTitle: "Self-Esteem",
    color: "#A38442",
    fillId: "selfEsteemFill",
  },
  {
    trackerType: "worry",
    fallbackTitle: "Worry",
    color: "#4F627A",
    fillId: "worryFill",
  },
  {
    trackerType: "trauma",
    fallbackTitle: "Trauma",
    color: "#3F3F47",
    fillId: "traumaFill",
  },
];

const formatDateLabel = (dateValue, index) => {
  if (!dateValue) {
    return `Entry ${index + 1}`;
  }

  const parsedDate = new Date(dateValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return `Entry ${index + 1}`;
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric"
  }).format(parsedDate);
};

export default function AssessmentChart() {
  const { token } = useStoredAuth();
  const rawBaseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || process.env.VITE_BASE_URL || "";
  const baseUrl = rawBaseUrl.endsWith("/")
    ? rawBaseUrl.slice(0, -1)
    : rawBaseUrl;
  const [chartsByType, setChartsByType] = useState(() =>
    Object.fromEntries(
      TRACKERS.map(({ trackerType, fallbackTitle }) => [
        trackerType,
        { title: fallbackTitle, data: [] },
      ])
    )
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchChartData = async () => {
      if (!baseUrl) {
        setIsLoading(false);
        return;
      }

      try {
        const nextCharts = Object.fromEntries(
          TRACKERS.map(({ trackerType, fallbackTitle }) => [
            trackerType,
            { title: fallbackTitle, data: [] },
          ])
        );

        const configResponse = await fetch(`${baseUrl}/api/symptom-tracker/configs`, {
          cache: "no-store",
          headers: {
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
        });

        if (configResponse.ok) {
          const configResult = await configResponse.json();
          const configs = Array.isArray(configResult?.data) ? configResult.data : [];

          configs.forEach((config) => {
            if (!nextCharts[config?.trackerType]) {
              return;
            }

            nextCharts[config.trackerType].title =
              config?.name || nextCharts[config.trackerType].title;
          });
        }

        if (token) {
          const historyResults = await Promise.all(
            TRACKERS.map(async ({ trackerType }) => {
              const response = await fetch(
                `${baseUrl}/api/symptom-tracker/history?trackerType=${trackerType}&page=1&limit=7`,
                {
                  cache: "no-store",
                  headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`,
                  },
                }
              );

              if (!response.ok) {
                return { trackerType, submissions: [] };
              }

              const result = await response.json();

              return {
                trackerType,
                submissions: Array.isArray(result?.data?.submissions)
                  ? result.data.submissions
                  : [],
              };
            })
          );

          historyResults.forEach(({ trackerType, submissions }) => {
            if (!nextCharts[trackerType]) return;

            const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            const dayData = days.map(day => ({
              label: day,
              value: 0,
              submittedAt: null,
            }));

            // Map submissions to the correct weekday slot
            // We'll take the most recent submission for each day of the current week (or last 7 days)
            submissions.forEach(submission => {
              const date = new Date(submission?.submittedAt || submission?.createdAt);
              if (Number.isNaN(date.getTime())) return;

              const dayIndex = date.getDay();
              const existingDate = dayData[dayIndex].submittedAt
                ? new Date(dayData[dayIndex].submittedAt)
                : null;

              if (!existingDate || date > existingDate) {
                dayData[dayIndex] = {
                  label: days[dayIndex],
                  value: submission?.totalScore ?? 0,
                  submittedAt: submission?.submittedAt || submission?.createdAt,
                };
              }
            });

            nextCharts[trackerType].data = dayData;
          });
        }

        setChartsByType(nextCharts);
      } catch (error) {
        console.error("Failed to load tracker chart data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChartData();
  }, [baseUrl, token]);

  const assessments = useMemo(
    () =>
      TRACKERS.map((tracker) => ({
        ...tracker,
        title:
          chartsByType[tracker.trackerType]?.title || tracker.fallbackTitle,
        data: chartsByType[tracker.trackerType]?.data || [],
      })),
    [chartsByType]
  );

  return (
    <div className="mt-2">
      {isLoading ? (
        <div className="mb-4 text-sm text-stone-500">Loading your result history...</div>
      ) : null}

      <div className="space-y-6">
        {assessments.map((assessment) => (
          <div
            key={assessment.trackerType}
            className="rounded-[28px] border border-stone-200/80 bg-[#F8F7F3]/50 backdrop-blur-md  p-6 shadow-[0_18px_40px_rgba(28,25,23,0.08)] md:p-8"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="font-serif text-[22px] font-normal leading-tight text-stone-900 md:text-[26px]">
                {assessment.title}
              </h2>
              <div className="mt-1 flex items-center gap-2 text-[12px] text-stone-500 md:text-[13px]">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: assessment.color }}
                ></div>
                <span>Last 7 entries</span>
              </div>
            </div>

            <div className="h-[180px] md:h-[210px]">
              {assessment.data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={assessment.data}
                    margin={{ top: 10, right: 8, left: -18, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id={assessment.fillId}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={assessment.color}
                          stopOpacity={0.22}
                        />
                        <stop
                          offset="95%"
                          stopColor={assessment.color}
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="0"
                      stroke="#E7E5E4"
                      vertical={true}
                      horizontal={false}
                    />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      dy={12}
                      tick={{ fill: assessment.color, fontSize: 12, fontWeight: "500" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      dx={-6}
                      tick={{ fill: "#A8A29E", fontSize: 11 }}
                      domain={[0, 40]}
                      ticks={[0, 10, 20, 30, 40]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFF",
                        borderRadius: "12px",
                        border: "1px solid #E7E5E4",
                        fontSize: "13px",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
                      }}
                      labelStyle={{ fontWeight: "600", marginBottom: "4px" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={assessment.color}
                      strokeWidth={2.5}
                      fill={`url(#${assessment.fillId})`}
                      connectNulls={true}
                      dot={{
                        r: 4,
                        fill: assessment.color,
                        strokeWidth: 2,
                        stroke: "#fff"
                      }}
                      activeDot={{
                        r: 6,
                        fill: assessment.color,
                        strokeWidth: 2,
                        stroke: "#fff"
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-[20px] border border-dashed border-stone-200 bg-white/40 text-sm text-stone-500">
                  No results yet for this assessment.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
