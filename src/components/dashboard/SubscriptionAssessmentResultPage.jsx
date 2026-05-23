"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getStoredTokens, useStoredAuth } from "@/redux/authStorage";

const commonOptions = [
  { label: "Not at all", value: 0 },
  { label: "Several days", value: 1 },
  { label: "More than half the days", value: 2 },
  { label: "Nearly every day", value: 3 },
];

const ASSESSMENTS = {
  depression: {
    title: "Depression",
    label: "PHQ-9",
    endpointType: "phq9",
    max: 27,
    color: "#6B4D5F",
    instruction: "Over the last 2 weeks, how often have you been bothered by any of the following problems?",
    options: commonOptions,
    questions: [
      "Little interest or pleasure in doing things",
      "Feeling down, depressed, or hopeless",
      "Trouble falling or staying asleep, or sleeping too much",
      "Feeling tired or having little energy",
      "Poor appetite or overeating",
      "Feeling bad about yourself, or that you are a failure or have let yourself or your family down",
      "Trouble concentrating on things, such as reading the newspaper or watching television",
      "Moving or speaking so slowly that other people could have noticed, or being so fidgety or restless that you have been moving around a lot more than usual",
      "Thoughts that you would be better off dead or of hurting yourself in some way",
    ],
    getBand: (score) => {
      if (score <= 4) return "Minimal";
      if (score <= 9) return "Mild";
      if (score <= 14) return "Moderate";
      if (score <= 19) return "Moderately severe";
      return "Severe";
    },
  },
  anxiety: {
    title: "Anxiety",
    label: "GAD-7",
    endpointType: "gad7",
    max: 21,
    color: "#4A7373",
    instruction: "Over the last 2 weeks, how often have you been bothered by the following problems?",
    options: commonOptions,
    questions: [
      "Feeling nervous, anxious or on edge",
      "Not being able to stop or control worrying",
      "Worrying too much about different things",
      "Trouble relaxing",
      "Being so restless that it is hard to sit still",
      "Becoming easily annoyed or irritable",
      "Feeling afraid as if something awful might happen",
    ],
    getBand: (score) => {
      if (score <= 4) return "Minimal";
      if (score <= 9) return "Mild";
      if (score <= 14) return "Moderate";
      return "Severe";
    },
  },
  dissociation: {
    title: "Dissociation",
    label: "DES-II",
    endpointType: "des11",
    max: 50,
    color: "#7D5A3D",
    instruction: "Please indicate what percentage of the time each experience happens to you when you are not under the influence of alcohol or drugs.",
    questions: [
      "Driving or riding somewhere and suddenly realizing you do not remember what happened during part of the trip.",
      "Listening to someone talk and suddenly realizing you did not hear part or all of what was said.",
      "Finding yourself in a place and having no idea how you got there.",
      "Feeling that other people, objects, or the world around you are not real.",
      "Feeling that your body does not seem to belong to you.",
      "Hearing voices inside your head that tell you to do things or comment on what you are doing.",
      "Looking in a mirror and not recognizing yourself.",
      "Feeling as if you are looking at the world through a fog so people and objects appear far away or unclear.",
    ],
    getBand: (score) => {
      if (score < 10) return "Low";
      if (score < 30) return "Moderate";
      return "High";
    },
  },
};

export const subscriptionAssessmentCards = Object.entries(ASSESSMENTS).map(
  ([slug, item]) => ({
    slug,
    title: item.title,
    label: item.label,
    color: item.color,
    href: `/dashboard/assessments/activity/subscription/${slug}`,
  })
);

export default function SubscriptionAssessmentResultPage({ type }) {
  const { token } = useStoredAuth();
  const config = ASSESSMENTS[type] || ASSESSMENTS.depression;
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const resultRef = useRef(null);
  const rawBaseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || process.env.VITE_BASE_URL || "";
  const baseUrl = rawBaseUrl.endsWith("/")
    ? rawBaseUrl.slice(0, -1)
    : rawBaseUrl;

  const answeredCount = Object.keys(answers).length;
  const isComplete = answeredCount === config.questions.length;

  const chartData = useMemo(() => {
    if (!result) return [];

    return result.itemScores.map((item, index) => ({
      label: `Q${index + 1}`,
      value: item,
    }));
  }, [result]);

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");
    setIsSubmitting(true);

    const itemScores = config.questions.map((_, index) => Number(answers[index] ?? 0));
    const apiAnswers =
      type === "dissociation"
        ? itemScores.map((value) => value / 2)
        : itemScores;

    try {
      if (!baseUrl || !token) {
        throw new Error("Please sign in again before saving this result.");
      }

      const { token: currentToken } = getStoredTokens();
      const response = await fetch(
        `${baseUrl}/api/questionnaire/${config.endpointType}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${currentToken || token}`,
          },
          body: JSON.stringify({ answers: apiAnswers }),
        }
      );
      const apiResult = await response.json();

      if (!response.ok || !apiResult?.success || !apiResult?.data) {
        throw new Error(apiResult?.message || "Failed to save questionnaire result.");
      }

      const score = Number(apiResult.data.score ?? 0);
      const nextResult = {
        id: apiResult.data.id,
        total: score,
        band: apiResult.data.severity || config.getBand(score),
        itemScores: type === "dissociation" ? apiAnswers : itemScores,
        submittedAt: apiResult.data.submittedAt,
      };

      setResult(nextResult);
    } catch (error) {
      console.error("Failed to submit questionnaire:", error);
      setSubmitError(error.message || "Could not save this result.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setAnswers({});
    setResult(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-full w-full min-w-0 rounded-3xl border border-white/20 bg-white/50 p-8 shadow-2xl lg:p-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            Subscription Assessment
          </p>
          <h1 className="font-serif text-4xl text-[#1A1814]">
            {config.label} {config.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
            {config.instruction}
          </p>
        </div>
        <Link
          href="/dashboard/assessments/activity"
          className="rounded-2xl border border-stone-200 bg-white/70 px-5 py-3 text-sm font-medium text-stone-700 transition hover:bg-white"
        >
          Back to activity
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {config.questions.map((question, index) => {
          const currentValue = answers[index] ?? 0;

          return (
            <div
              key={question}
              className="rounded-2xl border border-stone-200/70 bg-[#F8F7F3]/70 p-5"
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                Question {index + 1} of {config.questions.length}
              </p>
              <h2 className="mb-5 font-serif text-xl leading-snug text-stone-900">
                {question}
              </h2>

              {type === "dissociation" ? (
                <div>
                  <div className="mb-3 flex items-center justify-between text-sm text-stone-500">
                    <span>Never</span>
                    <span className="font-semibold text-stone-900">{currentValue}%</span>
                    <span>Always</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={currentValue}
                    onChange={(event) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [index]: Number(event.target.value),
                      }))
                    }
                    className="w-full cursor-pointer accent-[#7D5A3D]"
                  />
                </div>
              ) : (
                <div className="grid gap-2 md:grid-cols-4">
                  {config.options.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setAnswers((prev) => ({
                          ...prev,
                          [index]: option.value,
                        }))
                      }
                      className={`cursor-pointer rounded-xl border px-3 py-3 text-center transition ${
                        answers[index] === option.value
                          ? "border-transparent text-white"
                          : "border-stone-200 bg-white/60 text-stone-600 hover:bg-white"
                      }`}
                      style={{
                        backgroundColor:
                          answers[index] === option.value ? config.color : undefined,
                      }}
                    >
                      <span className="block text-lg font-semibold">{option.value}</span>
                      <span className="text-xs">{option.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="text-center">
          <p className="mb-4 text-sm text-stone-500">
            <span className="font-semibold text-stone-900">{answeredCount}</span> of{" "}
            {config.questions.length} answered
          </p>
          {submitError ? (
            <p className="mb-4 text-sm text-red-600">{submitError}</p>
          ) : null}
          <button
            type="submit"
            disabled={!isComplete || isSubmitting}
            className="rounded-2xl bg-[#1A1814] px-10 py-4 text-sm font-semibold uppercase tracking-[0.08em] text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isSubmitting ? "Saving..." : "Calculate score"}
          </button>
        </div>
      </form>

      {result ? (
        <section
          ref={resultRef}
          className="mt-10 rounded-3xl border border-stone-200/70 bg-white/65 p-6 shadow-lg lg:p-8"
        >
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                Your result
              </p>
              <h2 className="font-serif text-3xl text-stone-900">{result.band}</h2>
            </div>
            <div className="text-right">
              <span className="text-5xl font-semibold text-[#1A1814]">
                {result.total}
                {type === "dissociation" ? "%" : ""}
              </span>
              <span className="ml-2 text-stone-500">/ {config.max}</span>
            </div>
          </div>

          <div className="h-[300px] rounded-2xl bg-[#F8F7F3]/80 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 12, right: 10, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="#E7E5E4" vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#57534E", fontSize: 12, fontWeight: 600 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#A8A29E", fontSize: 11 }}
                  domain={[0, type === "dissociation" ? 50 : 3]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFF",
                    borderRadius: "12px",
                    border: "1px solid #E7E5E4",
                    fontSize: "13px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
                  }}
                />
                <Bar dataKey="value" radius={[8, 8, 3, 3]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.label} fill={config.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-xl border border-stone-200 bg-white/70 px-5 py-3 text-sm font-medium text-stone-700 transition hover:bg-white"
            >
              Take again
            </button>
            <Link
              href="/dashboard/results"
              className="rounded-xl bg-[#1A1814] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#2D2A26]"
            >
              Back to My Results
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
