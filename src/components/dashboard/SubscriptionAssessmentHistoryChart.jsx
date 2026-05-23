"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getStoredTokens, useStoredAuth } from "@/redux/authStorage";

const ASSESSMENTS = [
  {
    endpointType: "phq9",
    title: "PHQ-9 Depression",
    color: "#6B4D5F",
    max: 27,
  },
  {
    endpointType: "gad7",
    title: "GAD-7 Anxiety",
    color: "#4A7373",
    max: 21,
  },
  {
    endpointType: "des11",
    title: "DES-II Dissociation",
    color: "#7D5A3D",
    max: 50,
  },
];

export default function SubscriptionAssessmentHistoryChart() {
  const { token } = useStoredAuth();
  const rawBaseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || process.env.VITE_BASE_URL || "";
  const baseUrl = rawBaseUrl.endsWith("/")
    ? rawBaseUrl.slice(0, -1)
    : rawBaseUrl;
  const [historyByType, setHistoryByType] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchQuestionnaireHistory = async () => {
      if (!baseUrl || !token) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const { token: currentToken } = getStoredTokens();
        const results = await Promise.all(
          ASSESSMENTS.map(async (assessment) => {
            const response = await fetch(
              `${baseUrl}/api/questionnaire/${assessment.endpointType}`,
              {
                cache: "no-store",
                headers: {
                  Accept: "application/json",
                  Authorization: `Bearer ${currentToken || token}`,
                },
              }
            );

            if (!response.ok) {
              return [assessment.endpointType, []];
            }

            const result = await response.json();
            const submissions = Array.isArray(result?.data?.submissions)
              ? result.data.submissions
              : [];

            return [assessment.endpointType, submissions];
          })
        );

        setHistoryByType(Object.fromEntries(results));
      } catch (error) {
        console.error("Failed to load questionnaire history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestionnaireHistory();
  }, [baseUrl, token]);

  const assessments = useMemo(
    () =>
      ASSESSMENTS.map((assessment) => {
        const entries = Array.isArray(historyByType[assessment.endpointType])
          ? historyByType[assessment.endpointType]
          : [];
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const data = days.map((day) => ({
          label: day,
          value: 0,
          band: "Score",
          submittedAt: null,
        }));

        entries.forEach((entry) => {
          const date = new Date(entry.submittedAt);
          if (Number.isNaN(date.getTime())) return;

          const dayIndex = date.getDay();
          const existingDate = data[dayIndex].submittedAt
            ? new Date(data[dayIndex].submittedAt)
            : null;

          if (!existingDate || date > existingDate) {
            data[dayIndex] = {
              label: days[dayIndex],
              value: Number(entry.score ?? 0),
              band: entry.severity || "Score",
              submittedAt: entry.submittedAt,
            };
          }
        });

        return { ...assessment, data };
      }),
    [historyByType]
  );

  const hasAnyResult = assessments.some((assessment) => assessment.data.length > 0);

  if (isLoading) {
    return (
      <div className="rounded-[28px] border border-stone-200/80 bg-[#F8F7F3]/50 p-6 text-sm text-stone-500 shadow-[0_18px_40px_rgba(28,25,23,0.08)] backdrop-blur-md md:p-8">
        Loading subscription assessment history...
      </div>
    );
  }

  if (!hasAnyResult) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
          Initial Questionnaires
        </p>
        <h2 className="font-serif text-2xl text-stone-900">
          Subscription Assessment History
        </h2>
      </div>

      {assessments.map((assessment) => (
        <div
          key={assessment.endpointType}
          className="rounded-[28px] border border-stone-200/80 bg-[#F8F7F3]/50 p-6 shadow-[0_18px_40px_rgba(28,25,23,0.08)] backdrop-blur-md md:p-8"
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <h3 className="font-serif text-[22px] font-normal leading-tight text-stone-900 md:text-[26px]">
              {assessment.title}
            </h3>
            <div className="mt-1 flex items-center gap-2 text-[12px] text-stone-500 md:text-[13px]">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: assessment.color }}
              />
              <span>Saved results</span>
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
                      id={`${assessment.endpointType}SubscriptionFill`}
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
                  <CartesianGrid strokeDasharray="0" stroke="#E7E5E4" vertical horizontal={false} />
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
                    domain={[0, assessment.max]}
                  />
                  <Tooltip
                    formatter={(value, _name, props) => [
                      `${value} / ${assessment.max}`,
                      props?.payload?.band || "Score",
                    ]}
                    contentStyle={{
                      backgroundColor: "#FFF",
                      borderRadius: "12px",
                      border: "1px solid #E7E5E4",
                      fontSize: "13px",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={assessment.color}
                    strokeWidth={2.5}
                    fill={`url(#${assessment.endpointType}SubscriptionFill)`}
                    dot={{
                      r: 4,
                      fill: assessment.color,
                      strokeWidth: 2,
                      stroke: "#fff",
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-[20px] border border-dashed border-stone-200 bg-white/40 text-sm text-stone-500">
                No saved results yet.
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
