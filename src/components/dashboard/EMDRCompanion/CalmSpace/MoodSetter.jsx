import React, { useEffect, useEffectEvent, useState } from "react";
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
      (item) => {
        const normalizedCategoryName =
          item?.categoryId?.categoryName?.trim()?.toLowerCase() || "";
        const normalizedMediaType = item?.mediaType?.trim()?.toLowerCase() || "";
        const isVisualSoundCategory =
          normalizedCategoryName === MOOD_SOUND_CATEGORY_NAME;

        return (
          item?.status === "active" &&
          item?.url &&
          isVisualSoundCategory &&
          normalizedMediaType === "audio"
        );
      }
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

const MoodSetter = ({
  selectedSound,
  onSelectSound,
  onUploadSound,
}) => {
  const { token } = useStoredAuth();
  const [showSelector, setShowSelector] = useState(false);
  const [sounds, setSounds] = useState([]);
  const [isLoadingSounds, setIsLoadingSounds] = useState(true);
  const [soundError, setSoundError] = useState("");
  const syncSelectedSound = useEffectEvent((items) => {
    if (!items.length || selectedSound?.source === "upload") {
      return;
    }

    if (!selectedSound?.id) {
      onSelectSound(items[0]);
      return;
    }

    const matchedSound = items.find((item) => item.id === selectedSound.id);

    if (!matchedSound) {
      onSelectSound(items[0]);
    }
  });

  useEffect(() => {
    const fetchSounds = async () => {
      try {
        setIsLoadingSounds(true);
        setSoundError("");

        const items = await getMoodSounds(token);
        setSounds(items);
        syncSelectedSound(items);
      } catch (error) {
        console.error("Error fetching calm-space sounds:", error);
        setSoundError(error?.message || "Unable to load sounds right now.");
        setSounds([]);
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

  const handleUploadChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (onUploadSound) {
      onUploadSound(file);
    }

    event.target.value = "";
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
          <div className="space-y-3">
            <AudioPlayer
              key={selectedSound.id}
              title={selectedSound.title}
              audioSrc={selectedSound.url}
              isReplaceable={true}
              onReplace={handleOpenSelector}
            />
          </div>
        ) : (
          <div className="rounded-2xl bg-white/70 px-4 py-8 text-center text-stone-700">
            No Visual-sounds audio found.
          </div>
        )}
        {!isLoadingSounds ? (
          <label className="mt-3 flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-[#1E3224]/30 bg-white/60 px-4 py-3 text-sm font-medium text-[#0F1912] transition-colors hover:bg-white/80">
            Upload custom sound
            <input
              type="file"
              accept="audio/*"
              onChange={handleUploadChange}
              className="hidden"
            />
          </label>
        ) : null}
      </div>
      <MoodSelector
        isOpen={showSelector}
        sounds={sounds}
        isLoading={isLoadingSounds}
        error={soundError}
        selectedSoundId={selectedSound?.id}
        onSelectSound={onSelectSound}
        onClose={handleCloseSelector}
      />
    </>
  );
};

export default MoodSetter;
