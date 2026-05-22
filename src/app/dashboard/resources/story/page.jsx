"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useStoredAuth } from "@/redux/authStorage";
import { ChevronLeft, ChevronRight } from "lucide-react";

const getBaseUrl = () => {
  const rawBaseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || process.env.VITE_BASE_URL || "";

  return rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl;
};

const getCalmPlaces = async (token) => {
  const baseUrl = getBaseUrl();

  if (!baseUrl) {
    throw new Error("Calm place service is not configured.");
  }

  if (!token) {
    throw new Error("Please sign in again to load calm place entries.");
  }

  const response = await fetch(`${baseUrl}/api/calm-place`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const result = await response.json();

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || "Failed to fetch calm place entries.");
  }

  return (result?.data || [])
    .slice()
    .sort(
      (firstItem, secondItem) =>
        new Date(secondItem?.createdAt || 0).getTime() -
        new Date(firstItem?.createdAt || 0).getTime(),
    )
    .map((item, index) => ({
      id: item?._id,
      title: `Calm Place ${index + 1}`,
      type: item?.soundLink ? "Audio" : "Image",
      image: item?.image || "",
      soundLink: item?.soundLink || "",
      description: item?.describe || "",
    }));
};

const ItemIcon = ({ type }) => {
  if (type === "Audio") {
    return (
      <svg
        className="h-5 w-5 text-[#355A43]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
        />
      </svg>
    );
  }

  return (
    <svg
      className="h-5 w-5 text-[#355A43]"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
};

export default function StoryPage() {
  const { token, hasHydrated } = useStoredAuth();
  const [calmPlaceItems, setCalmPlaceItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!token) {
      setCalmPlaceItems([]);
      setError("Please sign in again to load calm place exercises.");
      setIsLoading(false);
      return;
    }

    const fetchCalmPlaces = async () => {
      try {
        setIsLoading(true);
        setError("");

        const items = await getCalmPlaces(token);
        setCalmPlaceItems(items);
      } catch (fetchError) {
        console.error("Error fetching calm place entries:", fetchError);
        setError(
          fetchError?.message || "Unable to load calm place exercises right now.",
        );
        setCalmPlaceItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCalmPlaces();
  }, [hasHydrated, token]);

  // Pagination logic
  const totalPages = Math.ceil(calmPlaceItems.length / itemsPerPage);
  const paginatedItems = calmPlaceItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <div className="min-h-screen rounded-2xl bg-white/30 p-1">
      <section className="relative overflow-hidden rounded-2xl border border-[#cfd4ca] bg-white/50 backdrop-blur-md p-4 shadow-[0_18px_45px_rgba(41,37,36,0.14)] md:p-6">
        <div className="absolute inset-0 bg-gradient-to-b from-[#d9d3c2]/35 via-transparent to-[#e7e0d2]/20" />
        <div className="relative z-10">
          <h1 className="font-serif text-2xl text-[#2f3027] md:text-3xl">
            Calm Place Exercise
          </h1>

          {isLoading ? (
            <div className="mt-4 rounded-2xl bg-white/50  backdrop-blur-mdpx-5 py-8 text-center text-stone-700">
              Loading calm place exercises...
            </div>
          ) : error ? (
            <div className="mt-4 rounded-2xl bg-red-50 px-5 py-8 text-center text-red-600">
              {error}
            </div>
          ) : calmPlaceItems.length === 0 ? (
            <div className="mt-4 rounded-2xl bg-white/80 px-5 py-8 text-center text-stone-700">
              No calm place entries found yet.
            </div>
          ) : (
            <>
              <div className="mt-4 space-y-3">
                {paginatedItems.map((item) => (
                  <Link
                    key={item.id}
                    href={`/dashboard/resources/story/${item.id}`}
                    className="flex w-full items-center justify-between rounded-2xl border border-[#bfc8bb] bg-white/30 backdrop-blur-md px-5 py-4 text-left shadow-[0_8px_18px_rgba(53,90,67,0.12)] transition-all hover:bg-white/30"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#9fbaa4]">
                        <ItemIcon type={item.type} />
                      </div>
                      <span className="truncate font-serif text-lg text-[#2d2a26]">
                        {item.title}
                      </span>
                    </div>
                    <span className="ml-4 shrink-0 text-sm text-[#3e3a36]">
                      {item.type}
                    </span>
                  </Link>
                ))}
              </div>

              {/* Pagination UI */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#bfc8bb] bg-white/80 text-[#355A43] shadow-sm transition-all hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`h-10 min-w-[40px] rounded-xl border px-3 text-sm font-medium transition-all shadow-sm ${currentPage === page
                            ? "border-[#4A7C59] bg-[#4A7C59] text-white"
                            : "border-[#bfc8bb] bg-white/80 text-[#3e3a36] hover:bg-white"
                            }`}
                        >
                          {page}
                        </button>
                      ),
                    )}
                  </div>

                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#bfc8bb] bg-white/80 text-[#355A43] shadow-sm transition-all hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
