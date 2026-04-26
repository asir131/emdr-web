"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStoredAuth } from "@/redux/authStorage";
import VisualSelector from "@/components/dashboard/EMDRCompanion/CalmSpace/VisualSelector";
import PlaceDescription from "@/components/dashboard/EMDRCompanion/CalmSpace/PlaceDescription";
import MoodSetter from "@/components/dashboard/EMDRCompanion/CalmSpace/MoodSetter";
import PreviewPane from "@/components/dashboard/EMDRCompanion/CalmSpace/PreviewPane";

const VISUAL_CATEGORY_NAME = "visual-image";

const getCalmSpaceVisuals = async (token) => {
  const rawBaseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || process.env.VITE_BASE_URL || "";
  const baseUrl = rawBaseUrl.endsWith("/")
    ? rawBaseUrl.slice(0, -1)
    : rawBaseUrl;

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
    }));
};

const MeditationSpaceApp = () => {
  const router = useRouter();
  const { token } = useStoredAuth();
  const [selectedVisual, setSelectedVisual] = useState(null);
  const [description, setDescription] = useState("");
  const [visuals, setVisuals] = useState([]);
  const [isLoadingVisuals, setIsLoadingVisuals] = useState(true);
  const [visualError, setVisualError] = useState("");

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
              onSelectVisual={setSelectedVisual}
            />
            <PlaceDescription
              description={description}
              onDescriptionChange={setDescription}
            />
            <MoodSetter />
          </div>
          <div className="h-full min-h-[600px] flex flex-col">
            <PreviewPane
              description={description}
              backgroundUrl={selectedVisual?.image}
            />
          </div>
        </div>
        <div className="mt-12 flex justify-end gap-6 pb-8">
          <button
            onClick={() => router.back()}
            className="px-10 py-4 bg-[#4A7C59]/60 hover:bg-white/80 backdrop-blur-md text-[#0F1912] rounded-2xl font-serif text-lg tracking-wide transition-all shadow-lg border border-white/20 active:scale-95"
          >
            Back
          </button>
          <button
            onClick={() => router.push("/dashboard/EMDRCompanion")}
            className="px-10 py-4 bg-[#4A7C59] hover:bg-[#3d6649] text-white rounded-2xl font-serif text-xl tracking-wide transition-all shadow-xl shadow-[#4A7C59]/20 active:scale-95"
          >
            Save & Enter Space
          </button>
        </div>
      </div>
    </div>
  );
};

export default MeditationSpaceApp;
