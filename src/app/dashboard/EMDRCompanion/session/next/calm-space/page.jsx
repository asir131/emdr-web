"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStoredAuth } from "@/redux/authStorage";
import { updateSessionProgress } from "@/utils/sessionProgress";
import VisualSelector from "@/components/dashboard/EMDRCompanion/CalmSpace/VisualSelector";
import PlaceDescription from "@/components/dashboard/EMDRCompanion/CalmSpace/PlaceDescription";
import MoodSetter from "@/components/dashboard/EMDRCompanion/CalmSpace/MoodSetter";
import PreviewPane from "@/components/dashboard/EMDRCompanion/CalmSpace/PreviewPane";

const VISUAL_CATEGORY_NAME = "visual-image";
const FALLBACK_SOUND_EXTENSION = "mp3";

const getBaseUrl = () => {
  const rawBaseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || process.env.VITE_BASE_URL || "";

  return rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl;
};

const inferMimeTypeFromName = (value, fallbackType = "") => {
  const normalizedValue = (value || "").trim().toLowerCase();

  if (normalizedValue.endsWith(".mp3")) {
    return "audio/mpeg";
  }

  if (normalizedValue.endsWith(".wav")) {
    return "audio/wav";
  }

  if (normalizedValue.endsWith(".m4a")) {
    return "audio/mp4";
  }

  if (normalizedValue.endsWith(".aac")) {
    return "audio/aac";
  }

  if (normalizedValue.endsWith(".ogg")) {
    return "audio/ogg";
  }

  if (normalizedValue.endsWith(".jpg") || normalizedValue.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  if (normalizedValue.endsWith(".png")) {
    return "image/png";
  }

  if (normalizedValue.endsWith(".gif")) {
    return "image/gif";
  }

  if (normalizedValue.endsWith(".webp")) {
    return "image/webp";
  }

  return fallbackType;
};

const sanitizeFileName = (value, fallbackName) => {
  const source = (value || fallbackName || "file")
    .replace(/[?#].*$/, "")
    .split("/")
    .pop()
    ?.trim();

  if (!source) {
    return fallbackName;
  }

  return source.replace(/[^\w.-]+/g, "_");
};

const getSelectionValue = ({ selectedItem, label }) => {
  if (!selectedItem) {
    throw new Error(`Please select a ${label}.`);
  }

  if (selectedItem.file instanceof File) {
    return selectedItem.file;
  }

  const remoteUrl = selectedItem.url || selectedItem.image || "";

  if (!remoteUrl) {
    throw new Error(`The selected ${label} is missing a file URL.`);
  }

  return remoteUrl;
};

const getSoundUploadValue = async (selectedSound) => {
  if (!selectedSound) {
    throw new Error("Please select a sound.");
  }

  if (selectedSound.file instanceof File) {
    return selectedSound.file;
  }

  const remoteUrl = selectedSound.url || "";

  if (!remoteUrl) {
    throw new Error("The selected sound is missing a file URL.");
  }

  const response = await fetch(remoteUrl);

  if (!response.ok) {
    throw new Error(
      "Unable to prepare the selected sound for upload. Please try another sound.",
    );
  }

  const blob = await response.blob();
  const blobExtension =
    blob.type?.split("/")?.[1]?.split(";")?.[0]?.trim() || "";
  const rawName = sanitizeFileName(
    selectedSound.fileName || selectedSound.title || remoteUrl,
    `calm-space-sound.${FALLBACK_SOUND_EXTENSION}`,
  );
  const hasExtension = /\.[a-z0-9]+$/i.test(rawName);
  const fileName = hasExtension
    ? rawName
    : `${rawName}.${blobExtension || FALLBACK_SOUND_EXTENSION}`;
  const normalizedMimeType = inferMimeTypeFromName(fileName, blob.type || "");

  return new File([blob], fileName, {
    type: normalizedMimeType || undefined,
  });
};

const getCalmSpaceVisuals = async (token) => {
  const baseUrl = getBaseUrl();

  if (!baseUrl) {
    throw new Error("Image service is not configured.");
  }

  if (!token) {
    throw new Error("Please sign in again to load calm-space visuals.");
  }

  const response = await fetch(`${baseUrl}/api/media?page=1&limit=20`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const result = await response.json();

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || "Failed to fetch calm-space visuals.");
  }

  return (result?.data?.media || [])
    .filter(
      (item) =>
        item?.mediaType === "image" &&
        item?.status === "active" &&
        item?.url &&
        item?.categoryId?.categoryName?.trim()?.toLowerCase() ===
          VISUAL_CATEGORY_NAME,
    )
    .map((item, index) => ({
      id: item?._id,
      image: item?.url,
      alt: item?.originalName || item?.name || `Visual ${index + 1}`,
      fileName: item?.originalName || item?.name || `visual-${index + 1}.jpg`,
      source: "api",
    }));
};

const createCalmSpacePayload = async ({
  description,
  selectedVisual,
  selectedSound,
}) => {
  const payload = new FormData();

  payload.append("describe", description.trim());
  payload.append(
    "image",
    getSelectionValue({
      selectedItem: selectedVisual,
      label: "image",
    }),
  );
  payload.append(
    "sound",
    await getSoundUploadValue(selectedSound),
  );

  return payload;
};

const MeditationSpaceApp = () => {
  const router = useRouter();
  const { token } = useStoredAuth();
  const [selectedVisual, setSelectedVisual] = useState(null);
  const [selectedSound, setSelectedSound] = useState(null);
  const [description, setDescription] = useState("");
  const [visuals, setVisuals] = useState([]);
  const [isLoadingVisuals, setIsLoadingVisuals] = useState(true);
  const [visualError, setVisualError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const uploadedVisualUrlRef = useRef("");
  const uploadedSoundUrlRef = useRef("");

  useEffect(() => {
    uploadedVisualUrlRef.current =
      selectedVisual?.source === "upload" ? selectedVisual.image || "" : "";
  }, [selectedVisual]);

  useEffect(() => {
    uploadedSoundUrlRef.current =
      selectedSound?.source === "upload" ? selectedSound.url || "" : "";
  }, [selectedSound]);

  useEffect(() => {
    return () => {
      if (uploadedVisualUrlRef.current) {
        URL.revokeObjectURL(uploadedVisualUrlRef.current);
      }

      if (uploadedSoundUrlRef.current) {
        URL.revokeObjectURL(uploadedSoundUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const fetchVisuals = async () => {
      try {
        setIsLoadingVisuals(true);
        setVisualError("");

        const items = await getCalmSpaceVisuals(token);
        setVisuals(items);
        setSelectedVisual((currentSelection) => {
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
        console.error("Error fetching calm-space visuals:", error);
        setVisualError(
          error?.message || "Unable to load calm-space visuals right now.",
        );
        setVisuals([]);
        setSelectedVisual(null);
      } finally {
        setIsLoadingVisuals(false);
      }
    };

    fetchVisuals();
  }, [token]);

  const handleSelectVisual = (visual) => {
    if (
      selectedVisual?.source === "upload" &&
      selectedVisual?.image &&
      selectedVisual.image !== visual?.image
    ) {
      URL.revokeObjectURL(selectedVisual.image);
    }

    setSelectedVisual(visual);
    setSaveError("");
  };

  const handleUploadVisual = (file) => {
    if (!file.type.startsWith("image/")) {
      setSaveError("Please select a valid image file.");
      return;
    }

    const imageUrl = URL.createObjectURL(file);

    if (selectedVisual?.source === "upload" && selectedVisual?.image) {
      URL.revokeObjectURL(selectedVisual.image);
    }

    setSelectedVisual({
      id: `upload-image-${Date.now()}`,
      image: imageUrl,
      alt: file.name,
      fileName: file.name,
      file,
      source: "upload",
    });
    setSaveError("");
  };

  const handleSelectSound = (sound) => {
    if (
      selectedSound?.source === "upload" &&
      selectedSound?.url &&
      selectedSound.url !== sound?.url
    ) {
      URL.revokeObjectURL(selectedSound.url);
    }

    setSelectedSound(sound);
    setSaveError("");
  };

  const handleUploadSound = (file) => {
    if (!file.type.startsWith("audio/")) {
      setSaveError("Please select a valid audio file.");
      return;
    }

    const soundUrl = URL.createObjectURL(file);

    if (selectedSound?.source === "upload" && selectedSound?.url) {
      URL.revokeObjectURL(selectedSound.url);
    }

    setSelectedSound({
      id: `upload-sound-${Date.now()}`,
      title: file.name,
      fileName: file.name,
      url: soundUrl,
      file,
      mediaType: "audio",
      categoryName: "Uploaded",
      categorySlug: "uploaded",
      source: "upload",
    });
    setSaveError("");
  };

  const handleSave = async () => {
    const baseUrl = getBaseUrl();

    if (!baseUrl) {
      setSaveError("Calm space service is not configured.");
      return;
    }

    if (!token) {
      setSaveError("Please sign in again to save your calm space.");
      return;
    }

    if (!description.trim()) {
      setSaveError("Please describe your calm space before saving.");
      return;
    }

    try {
      setIsSaving(true);
      setSaveError("");

      const payload = await createCalmSpacePayload({
        description,
        selectedVisual,
        selectedSound,
      });
      const response = await fetch(`${baseUrl}/api/calm-place`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: payload,
      });
      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to save your calm space.");
      }

      if (!result?.data?.soundLink) {
        throw new Error(
          "The sound file was not saved. Please try again or choose a smaller MP3/WAV file.",
        );
      }

      const activeJourneyId = localStorage.getItem("activeJourneyId");
      if (activeJourneyId && token && baseUrl) {
        await updateSessionProgress({
          baseUrl,
          token,
          journeyId: activeJourneyId,
          compledSession: 3,
        });
      }

      router.push("/dashboard/EMDRCompanion");
    } catch (error) {
      console.error("Error saving calm space:", error);
      setSaveError(
        error?.message || "Unable to save your calm space right now.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen relative p-4 md:p-8 font-serif overflow-x-hidden rounded-2xl">
      <div className="absolute inset-0 bg-white/20 backdrop-blur-xl pointer-events-none rounded-2xl" />
      <div className="relative z-10  flex flex-col">
        <div className="rounded-3xl  text-center">
          <h1 className="text-3xl  font-serif text-[#0F1912] mb-2 tracking-tight">
            Create Your Calm Space
          </h1>
          <p className="text-stone-700 text-base lg:text-lg leading-relaxed max-w-2xl mb-2 mx-auto font-sans">
            Customize your personal sanctuary for moments of stress. Choose a
            visual that resonates with you.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          <div className="space-y-3 h-full">
            <VisualSelector
              visuals={visuals}
              isLoading={isLoadingVisuals}
              error={visualError}
              selectedVisualId={selectedVisual?.id}
              uploadedVisual={selectedVisual?.source === "upload" ? selectedVisual : null}
              onSelectVisual={handleSelectVisual}
              onUploadVisual={handleUploadVisual}
            />
            <PlaceDescription
              description={description}
              onDescriptionChange={setDescription}
            />
            <MoodSetter
              selectedSound={selectedSound}
              onSelectSound={handleSelectSound}
              onUploadSound={handleUploadSound}
            />
          </div>
          <div className="h-full min-h-[600px] flex flex-col">
            <PreviewPane
              description={description}
              backgroundUrl={selectedVisual?.image}
              audioTitle={selectedSound?.title}
              audioSrc={selectedSound?.url}
            />
          </div>
        </div>
        {saveError ? (
          <div className="mt-6 rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-600">
            {saveError}
          </div>
        ) : null}
        <div className="mt-12 flex justify-end gap-6 pb-8">
          <button
            onClick={() => router.back()}
            disabled={isSaving}
            className="px-10 py-4 bg-[#4A7C59]/60 hover:bg-white/80 backdrop-blur-md text-[#0F1912] rounded-2xl font-serif text-lg tracking-wide transition-all shadow-lg border border-white/20 active:scale-95"
          >
            Back
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-10 py-4 bg-[#4A7C59] hover:bg-[#3d6649] text-white rounded-2xl font-serif text-xl tracking-wide transition-all shadow-xl shadow-[#4A7C59]/20 active:scale-95"
          >
            {isSaving ? "Saving..." : "Save & Enter Space"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MeditationSpaceApp;
