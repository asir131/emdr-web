"use client";
import React, { useEffect, useState } from "react";
import { useStoredAuth } from "@/redux/authStorage";

const TOPON_VISUAL_CATEGORY_NAME = "topon vai";
const TOPON_VISUAL_CATEGORY_SLUG = "topon-vai";

const getPageMedia = (media) => {
  if (Array.isArray(media)) return media;
  if (media && typeof media === "object") {
    return [
      ...(media.images || []),
      ...(media.videos || []),
      ...(media.musics || []),
      ...(media.others || []),
    ];
  }

  return [];
};

export const getBilateralIcons = async (token) => {
  const rawBaseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || process.env.VITE_BASE_URL || "";
  const baseUrl = rawBaseUrl.endsWith("/")
    ? rawBaseUrl.slice(0, -1)
    : rawBaseUrl;

  if (!baseUrl) {
    throw new Error("Media service is not configured.");
  }

  if (!token) {
    throw new Error("Please sign in again to load visuals.");
  }

  const allMedia = [];
  let currentPage = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(`${baseUrl}/api/media?page=${currentPage}&limit=20`, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const result = await response.json();

    if (!response.ok || !result?.success) {
      throw new Error("Failed to fetch visuals.");
    }

    const pageMedia = getPageMedia(result?.data?.media);
    allMedia.push(...pageMedia);

    const totalPages = Number(result?.data?.pagination?.totalPages || 0);
    const hasNextPage = Boolean(result?.data?.pagination?.hasNextPage);
    hasMore = totalPages > 0 ? currentPage < totalPages : hasNextPage;

    currentPage += 1;
  }

  return allMedia
    .filter(
      (item) =>
        item?.mediaType === "video" &&
        item?.status === "active" &&
        (item?.categoryId?.categoryName?.trim()?.toLowerCase() ===
          TOPON_VISUAL_CATEGORY_NAME ||
          item?.categoryId?.slug === TOPON_VISUAL_CATEGORY_SLUG)
    )
    .map((item, index) => ({
      id: item?._id,
      name: item?.name || `Visual ${index + 1}`,
      img: item?.videoProfile?.url || item?.url,
      mediaType: item?.mediaType,
      poster: item?.imageProfile?.url || null,
      defaultFacing: item?.defaultFacing === "left" ? "left" : "right",
    }));
};

export default function VisualIconSelector({ selectedId, onSelect }) {
  const { token } = useStoredAuth();
  const [icons, setIcons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchIcons = async () => {
      try {
        setIsLoading(true);
        setError("");

        const items = await getBilateralIcons(token);
        setIcons(items);
      } catch (fetchError) {
        console.error("Error fetching bilateral icons:", fetchError);
        setError(fetchError.message || "Unable to load visuals.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchIcons();
  }, [token]);

  useEffect(() => {
    if (!selectedId && icons[0]?.id) {
      onSelect(icons[0].id);
    }
  }, [icons, onSelect, selectedId]);

  return (
    <div className="bg-white/40 backdrop-blur-md rounded-3xl p-4 sm:p-6 border border-white/20">
      <h3 className="text-lg sm:text-xl font-serif text-[#0F1912] mb-4">
        Visual
      </h3>

      {isLoading ? (
        <div className="rounded-2xl bg-white/70 px-4 py-8 text-center text-stone-700">
          Loading visuals...
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-red-50 px-4 py-8 text-center text-red-600">
          {error}
        </div>
      ) : icons.length === 0 ? (
        <div className="rounded-2xl bg-white/70 px-4 py-8 text-center text-stone-700">
          No visuals found.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
          {icons.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl p-4 transition-all ${
                selectedId === item.id
                  ? "border-2 border-dashed border-blue-400 bg-white shadow-md"
                  : "bg-white/60 hover:bg-white/80"
              }`}
            >
              <div className="mb-2 flex h-12 w-full items-center justify-center overflow-hidden rounded-xl bg-stone-100">
                {item.mediaType === "video" ? (
                  <video
                    src={item.img}
                    poster={item.poster || undefined}
                    muted
                    autoPlay
                    loop
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src={item.img}
                    alt={item.name}
                    className="h-full w-full object-contain"
                  />
                )}
              </div>

              <span className="max-w-full truncate text-sm font-bold text-stone-900">
                {item.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
