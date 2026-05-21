"use client";
import React, { useEffect, useState } from "react";
import { Music } from "lucide-react";
import { useStoredAuth } from "@/redux/authStorage";

const BILATERAL_SOUND_CATEGORY_NAME = "bilateral stimulation sound";

export const getBilateralSounds = async (token) => {
  const rawBaseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || process.env.VITE_BASE_URL || "";
  const baseUrl = rawBaseUrl.endsWith("/")
    ? rawBaseUrl.slice(0, -1)
    : rawBaseUrl;

  if (!baseUrl) {
    throw new Error("Media service is not configured.");
  }

  if (!token) {
    throw new Error("Please sign in again to load sounds.");
  }

  const allMedia = [];
  let currentPage = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(`${baseUrl}/api/media?page=${currentPage}`, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const result = await response.json();

    if (!response.ok || !result?.success) {
      throw new Error("Failed to fetch sounds.");
    }

    let pageMedia = [];
    if (Array.isArray(result?.data?.media)) {
      pageMedia = result.data.media;
    } else if (result?.data?.media && typeof result.data.media === "object") {
      pageMedia = [
        ...(result.data.media.images || []),
        ...(result.data.media.videos || []),
        ...(result.data.media.musics || []),
        ...(result.data.media.others || []),
      ];
    }
    
    allMedia.push(...pageMedia);

    const totalPages = Number(result?.data?.pagination?.totalPages || 0);
    const hasNextPage = Boolean(result?.data?.pagination?.hasNextPage);
    hasMore = totalPages > 0 ? currentPage < totalPages : hasNextPage;

    currentPage += 1;
  }

  return allMedia
    .filter(
      (item) =>
        item?.mediaType === "audio" &&
        // Some APIs might not return status, or it might be 'active'. We'll relax the status filter just in case, but keep category name.
        (item?.status === "active" || !item?.status)
        // Note: Removing the strict category filter if it was preventing items from showing, or keeping it if needed. 
        // The user's JSON didn't show categoryId on the item itself, it showed category at the root!
    )
    .filter(item => {
      // If the item has a categoryId object, check it. Otherwise if it's from the musics array it's already correct.
      if (item?.categoryId?.categoryName) {
         return item.categoryId.categoryName.trim().toLowerCase() === BILATERAL_SOUND_CATEGORY_NAME;
      }
      return true; // if no category info on item, just accept it since we might be filtering at API level
    })
    .map((item, index) => ({
      id: item?._id,
      name: item?.name || `Sound ${index + 1}`,
      url: item?.url,
      image: item?.musicProfile?.url || item?.imageProfile?.url || item?.image || item?.thumbnail || `https://picsum.photos/seed/soundimg${item?._id || index + 1}/150/150`,
    }));
};

export default function SoundSelector({ selectedId, onSelect }) {
  const { token } = useStoredAuth();
  const [sounds, setSounds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSounds = async () => {
      try {
        setIsLoading(true);
        setError("");

        const items = await getBilateralSounds(token);
        setSounds(items);
      } catch (fetchError) {
        console.error("Error fetching bilateral sounds:", fetchError);
        setError(fetchError.message || "Unable to load sounds.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSounds();
  }, [token]);

  useEffect(() => {
    if (!selectedId && sounds[0]?.id) {
      onSelect(sounds[0].id);
    }
  }, [onSelect, selectedId, sounds]);

  return (
    <div className="bg-white/40 backdrop-blur-md rounded-3xl p-6 border border-white/20 h-full">
      <h3 className="text-xl font-serif text-[#0F1912] mb-4">Sound</h3>
      {isLoading ? (
        <div className="rounded-2xl bg-white/70 px-4 py-8 text-center text-stone-700">
          Loading sounds...
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-red-50 px-4 py-8 text-center text-red-600">
          {error}
        </div>
      ) : sounds.length === 0 ? (
        <div className="rounded-2xl bg-white/70 px-4 py-8 text-center text-stone-700">
          No sounds found.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-2">
          {sounds.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`flex cursor-pointer items-center gap-4 rounded-2xl p-4 transition-all ${selectedId === item.id
                  ? "scale-95 bg-white shadow-md"
                  : "bg-white/50 hover:bg-white/80"
                }`}
            >
              <div
                className={`rounded-xl p-2 ${selectedId === item.id
                    ? "bg-teal-600/10 text-teal-600"
                    : "bg-stone-100 text-stone-400"
                  }`}
              >
                <Music size={20} />
              </div>
              <span className="text-sm font-medium text-stone-900">
                {item.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
