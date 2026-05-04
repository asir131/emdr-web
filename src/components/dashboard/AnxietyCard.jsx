"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStoredAuth } from "@/redux/authStorage";

const JOURNEYS_PER_PAGE = 3;
const DEFAULT_PROGRESS = 0;

const formatJourneyDate = (dateValue) => {
  if (!dateValue) {
    return "Unknown";
  }

  const parsedDate = new Date(dateValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);
};

const formatRelativeTime = (dateValue) => {
  if (!dateValue) {
    return "Unknown";
  }

  const parsedDate = new Date(dateValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Unknown";
  }

  const secondsDiff = Math.round((parsedDate.getTime() - Date.now()) / 1000);
  const absoluteSeconds = Math.abs(secondsDiff);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absoluteSeconds < 60) {
    return formatter.format(secondsDiff, "second");
  }

  const minutesDiff = Math.round(secondsDiff / 60);

  if (Math.abs(minutesDiff) < 60) {
    return formatter.format(minutesDiff, "minute");
  }

  const hoursDiff = Math.round(minutesDiff / 60);

  if (Math.abs(hoursDiff) < 24) {
    return formatter.format(hoursDiff, "hour");
  }

  const daysDiff = Math.round(hoursDiff / 24);

  if (Math.abs(daysDiff) < 30) {
    return formatter.format(daysDiff, "day");
  }

  const monthsDiff = Math.round(daysDiff / 30);

  if (Math.abs(monthsDiff) < 12) {
    return formatter.format(monthsDiff, "month");
  }

  const yearsDiff = Math.round(monthsDiff / 12);
  return formatter.format(yearsDiff, "year");
};

export default function AnxietyCard() {
  const router = useRouter();
  const { token } = useStoredAuth();
  const [journeys, setJourneys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(0);

  const rawBaseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || process.env.VITE_BASE_URL || "";
  const baseUrl = rawBaseUrl.endsWith("/")
    ? rawBaseUrl.slice(0, -1)
    : rawBaseUrl;

  useEffect(() => {
    const fetchJourneys = async () => {
      if (!baseUrl) {
        setError("Journey service is not configured.");
        setIsLoading(false);
        return;
      }

      if (!token) {
        setError("Please sign in again to load your journeys.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError("");

        const response = await fetch(`${baseUrl}/api/journeys`, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const result = await response.json();

        if (!response.ok || !result?.success) {
          throw new Error(result?.message || "Failed to fetch journeys.");
        }

        const rawItems = result?.data || [];

        // Fetch progress for each journey in parallel
        const itemsWithProgress = await Promise.all(
          rawItems.map(async (journey, index) => {
            let progressValue = DEFAULT_PROGRESS;
            let sessionDetail = "0/10";
            let completedSessions = 0;

            try {
              const progressResponse = await fetch(
                `${baseUrl}/api/session-progress/${journey._id}`,
                {
                  cache: "no-store",
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );
              const progressResult = await progressResponse.json();

              if (progressResponse.ok && progressResult?.success) {
                const percentageStr = progressResult.data?.totalCompledSession || "0%";
                progressValue = parseInt(percentageStr.replace("%", ""), 10) || 0;

                const details = progressResult.data?.details;
                if (details) {
                  completedSessions = details.completedSessions || 0;
                  sessionDetail = `${completedSessions}/${details.totalSessions || 10}`;
                }
              }
            } catch (err) {
              console.error(`Error fetching progress for journey ${journey._id}:`, err);
            }

            return {
              id: journey?._id || `journey-${index}`,
              title: journey?.journeyName || `Journey ${index + 1}`,
              description: journey?.description?.trim() || "No description added yet.",
              date: formatJourneyDate(journey?.createdAt),
              lastAccessed: formatRelativeTime(journey?.updatedAt || journey?.createdAt),
              progress: progressValue,
              sessions: sessionDetail,
              completedCount: completedSessions,
              image: journey?.imageUrl || "/homeImage/background.jpg",
            };
          })
        );

        setJourneys(itemsWithProgress);
        setCurrentPage(0);
      } catch (fetchError) {
        console.error("Error fetching journeys:", fetchError);
        setError(fetchError.message || "Unable to load journeys right now.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchJourneys();
  }, [baseUrl, token]);

  const totalPages = Math.ceil(journeys.length / JOURNEYS_PER_PAGE);
  const visibleJourneys = useMemo(() => {
    const startIndex = currentPage * JOURNEYS_PER_PAGE;
    return journeys.slice(startIndex, startIndex + JOURNEYS_PER_PAGE);
  }, [currentPage, journeys]);

  const handleContinue = (journey) => {
    localStorage.setItem("activeJourneyId", journey.id);
    
    const count = journey.completedCount || 0;
    
    // Mapping completedSessions to the NEXT session page
    if (count === 0) {
      router.push(`/dashboard/EMDRCompanion/session?journeyId=${journey.id}&title=${encodeURIComponent(journey.title)}`);
    } else if (count === 1) {
      router.push(`/dashboard/EMDRCompanion/session/next?journeyId=${journey.id}&title=${encodeURIComponent(journey.title)}`);
    } else if (count === 2) {
      router.push(`/dashboard/EMDRCompanion/session/next/calm-space`);
    } else if (count === 3 || count === 4) {
      router.push(`/dashboard/EMDRCompanion`);
    } else {
      router.push(`/dashboard/EMDRCompanion/session/session5`);
    }
  };

  useEffect(() => {
    if (currentPage > 0 && currentPage >= totalPages) {
      setCurrentPage(Math.max(totalPages - 1, 0));
    }
  }, [currentPage, totalPages]);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-stone-100 bg-[#E3E6F0]/10 px-6 py-10 text-center text-stone-700">
        Loading journeys...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-10 text-center text-red-600">
        {error}
      </div>
    );
  }

  if (journeys.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-100 bg-[#E3E6F0]/10 px-6 py-10 text-center text-stone-700">
        No journeys found yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {visibleJourneys.map((journey) => (
        <div
          key={journey.id}
          className="relative flex gap-6 overflow-hidden rounded-2xl border border-stone-100 bg-[#E3E6F0]/10 p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="relative h-[240px] w-[380px] flex-shrink-0 overflow-hidden rounded-xl">
            <img
              src={journey.image}
              alt={journey.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/10"></div>

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative h-20 w-20">
                <svg className="h-full w-full -rotate-90 transform">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="white"
                    strokeWidth="6"
                    fill="transparent"
                    className="opacity-30"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="white"
                    strokeWidth="6"
                    fill="transparent"
                    strokeDasharray={226}
                    strokeDashoffset={226 - (226 * journey.progress) / 100}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                  {journey.progress}%
                </div>
              </div>
            </div>

            <div className="absolute bottom-2 left-2 rounded-md bg-white/90 px-3 py-1 text-xs font-semibold text-stone-700 shadow-sm">
              Sessions <br /> <span className="text-sm">{journey.sessions}</span>
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-center py-2 pr-4">
            <h3 className="mb-2 text-2xl font-serif text-[#0F1912]">
              {journey.title}
            </h3>
            {/* <p className="mb-4 line-clamp-2 text-sm text-stone-600">
              {journey.description}
            </p> */}

            <div className="mb-6 flex flex-wrap items-center gap-6 text-xs text-stone-500">
              <div className="flex items-center gap-1 text-[#0F1912]">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Created {journey.date}
              </div>
              <div className="flex items-center gap-1 text-[#0F1912]">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Last updated {journey.lastAccessed}
              </div>
            </div>

            <div className="mb-1 flex justify-between text-xs text-stone-600">
              <span className="text-[#0F1912]">Overall Progress</span>
              <span className="text-[#0F1912]">{journey.progress}% Complete</span>
            </div>

            <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-[#E0E7E1]">
              <div
                className="h-full rounded-full bg-[#4A7C59] transition-all duration-1000"
                style={{ width: `${journey.progress}%` }}
              ></div>
            </div>

            <button
              type="button"
              onClick={() => handleContinue(journey)}
              className="w-full cursor-pointer rounded-xl bg-[#4A7C59] py-3 text-sm font-medium uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-[#3d6649]"
            >
              Continue Session
            </button>
          </div>
        </div>
      ))}

      {journeys.length > JOURNEYS_PER_PAGE ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-stone-800">
            Showing {currentPage * JOURNEYS_PER_PAGE + 1}-
            {Math.min((currentPage + 1) * JOURNEYS_PER_PAGE, journeys.length)} of{" "}
            {journeys.length} journeys
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(page - 1, 0))}
              disabled={currentPage === 0}
              className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-700 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() =>
                setCurrentPage((page) => Math.min(page + 1, totalPages - 1))
              }
              disabled={currentPage >= totalPages - 1}
              className="rounded-full bg-[#4A7C59] px-4 py-2 text-sm text-white transition-colors hover:bg-[#3d6649] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
