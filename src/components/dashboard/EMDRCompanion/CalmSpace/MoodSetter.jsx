import React, { useEffect, useState } from "react";
import { useStoredAuth } from "@/redux/authStorage";
import AudioPlayer from "./AudioPlayer";
import MoodSelector from "./MoodSelector";

const MOOD_SOUND_CATEGORY_NAME = "visual-sounds";
const MEDIA_PAGE_SIZE = 20;

const getMoodSounds = async (token) => {
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
    const response = await fetch(
      `${baseUrl}/api/media?page=${currentPage}&limit=${MEDIA_PAGE_SIZE}`,
      {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const result = await response.json();

    if (!response.ok || !result?.success) {
      throw new Error(result?.message || "Failed to fetch mood sounds.");
    }

    const pageMedia = result?.data?.media || [];
    allMedia.push(...pageMedia);

    const totalPages = Number(result?.data?.pagination?.totalPages || 0);
    const hasNextPageFromMeta =
      totalPages > 0 ? currentPage < totalPages : null;

    if (hasNextPageFromMeta === null) {
      hasMore = pageMedia.length === MEDIA_PAGE_SIZE;
    } else {
      hasMore = hasNextPageFromMeta;
    }

    currentPage += 1;
  }

  return allMedia
    .filter(
      (item) =>
        item?.mediaType === "audio" &&
        item?.status === "active" &&
        item?.url &&
        item?.categoryId?.categoryName?.trim()?.toLowerCase() ===
          MOOD_SOUND_CATEGORY_NAME
    )
    .map((item, index) => ({
      id: item?._id,
      title: item?.originalName || item?.name || `Sound ${index + 1}`,
      url: item?.url,
      mediaType: item?.mediaType || "",
      categoryName: item?.categoryId?.categoryName || "",
      categorySlug: item?.categoryId?.slug || "",
    }));
};

const MoodSetter = () => {
  const { token } = useStoredAuth();
  const [showSelector, setShowSelector] = useState(false);
  const [sounds, setSounds] = useState([]);
  const [selectedSound, setSelectedSound] = useState(null);
  const [isLoadingSounds, setIsLoadingSounds] = useState(true);
  const [soundError, setSoundError] = useState("");

  useEffect(() => {
    const fetchSounds = async () => {
      try {
        setIsLoadingSounds(true);
        setSoundError("");

        const items = await getMoodSounds(token);
        setSounds(items);
        setSelectedSound((currentSelection) => {
          if (!items.length) {
            return null;
          }

          if (!currentSelection?.id) {
            return items[0];
          }

          return (
            items.find((item) => item.id === currentSelection.id) || items[0]
          );
        });
      } catch (error) {
        console.error("Error fetching calm-space sounds:", error);
        setSoundError(error?.message || "Unable to load sounds right now.");
        setSounds([]);
        setSelectedSound(null);
      } finally {
        setIsLoadingSounds(false);
      }
    };

    fetchSounds();
  }, [token]);

  const handleOpenSelector = () => {
    setShowSelector(true);
  };

  const handleCloseSelector = () => {
    setShowSelector(false);
  };

  return (
    <>
      <div className="bg-white/40 backdrop-blur-md rounded-3xl p-3 shadow-xl border border-white/20">
        <h2 className="text-xl font-serif mb-3 text-[#0F1912] tracking-tight">
          Set the mood
        </h2>
        {isLoadingSounds ? (
          <div className="rounded-2xl bg-white/70 px-4 py-8 text-center text-stone-700">
            Loading sounds...
          </div>
        ) : soundError ? (
          <div className="rounded-2xl bg-red-50 px-4 py-8 text-center text-red-600">
            {soundError}
          </div>
        ) : selectedSound ? (
          <AudioPlayer
            key={selectedSound.id}
            title={selectedSound.title}
            audioSrc={selectedSound.url}
            isReplaceable={true}
            onReplace={handleOpenSelector}
          />
        ) : (
          <div className="rounded-2xl bg-white/70 px-4 py-8 text-center text-stone-700">
            No Visual-sounds audio found.
          </div>
        )}
      </div>
      <MoodSelector
        isOpen={showSelector}
        sounds={sounds}
        isLoading={isLoadingSounds}
        error={soundError}
        selectedSoundId={selectedSound?.id}
        onSelectSound={setSelectedSound}
        onClose={handleCloseSelector}
      />
    </>
  );
};

export default MoodSetter;
