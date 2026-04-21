"use client";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useStoredAuth } from "@/redux/authStorage";

export default function CreateJourney() {
  const router = useRouter();
  const { token } = useStoredAuth();
  const [journeyName, setJourneyName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [images, setImages] = useState([]);
  const [isLoadingImages, setIsLoadingImages] = useState(true);
  const [imageError, setImageError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSavingJourney, setIsSavingJourney] = useState(false);

  const rawBaseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || process.env.VITE_BASE_URL || "";
  const baseUrl = rawBaseUrl.endsWith("/")
    ? rawBaseUrl.slice(0, -1)
    : rawBaseUrl;

  useEffect(() => {
    const fetchJourneyImages = async () => {
      if (!baseUrl) {
        setImageError("Image service is not configured.");
        setIsLoadingImages(false);
        return;
      }

      if (!token) {
        setImageError("Please sign in again to load journey images.");
        setIsLoadingImages(false);
        return;
      }

      try {
        setIsLoadingImages(true);
        setImageError("");

        const response = await fetch(`${baseUrl}/api/media?page=1&limit=20`, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const result = await response.json();

        if (!response.ok || !result?.success) {
          throw new Error("Failed to fetch journey images.");
        }

        const filteredImages = (result?.data?.media || [])
          .filter(
            (item) =>
              item?.mediaType === "image" &&
              item?.categoryId?.categoryName?.trim()?.toLowerCase() ===
                "create your journey img"
          )
          .map((item, index) => ({
            id: item?._id,
            name: item?.name || `Journey Image ${index + 1}`,
            theme: item?.categoryId?.slug || "create-your-journey-img",
            src: item?.url,
          }));

        setImages(filteredImages);
        setSelectedImage(filteredImages[0]?.id || null);
      } catch (error) {
        console.error("Error fetching journey images:", error);
        setImageError("Unable to load journey images right now.");
      } finally {
        setIsLoadingImages(false);
      }
    };

    fetchJourneyImages();
  }, [baseUrl, token]);

  const handleSaveJourney = async () => {
    const trimmedJourneyName = journeyName.trim();
    const trimmedDescription = description.trim();
    const selectedImageItem = images.find((image) => image.id === selectedImage);

    setSaveError("");

    if (!baseUrl) {
      setSaveError("Journey service is not configured.");
      return;
    }

    if (!token) {
      setSaveError("Please sign in again to save your journey.");
      return;
    }

    if (!trimmedJourneyName) {
      setSaveError("Please enter your journey name.");
      return;
    }

    if (!selectedImageItem?.src) {
      setSaveError("Please choose a journey image.");
      return;
    }

    try {
      setIsSavingJourney(true);

      const response = await fetch(`${baseUrl}/api/journeys`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          journeyName: trimmedJourneyName,
          description: trimmedDescription,
          imageUrl: selectedImageItem.src,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to create journey.");
      }

      router.push("/dashboard/EMDRCompanion");
    } catch (error) {
      console.error("Error creating journey:", error);
      setSaveError(error?.message || "Unable to save your journey right now.");
    } finally {
      setIsSavingJourney(false);
    }
  };

  return (
    <div className="flex items-center justify-center">
      <div className="w-full">
        <div className="bg-[#9a9898] backdrop-blur-xl rounded-3xl shadow-2xl p-5 lg:p-10 border border-white/20">
          <div className="text-center">
            <h1 className="text-4xl font-serif text-[#0F1912] ">
              Create Your Journey
            </h1>
            <p className="text-[#000000] text-base">
              Give your healing journey a name and choose a visual theme.
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-[#0F1912] text-sm mb-2">
                Journey Name
              </label>
              <input
                type="text"
                value={journeyName}
                onChange={(e) => setJourneyName(e.target.value)}
                placeholder="e.g., Anxiety Management Journey"
                className="w-full px-3 py-2 rounded-xl bg-white text-[#7A7A7A] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[#0F1912] text-sm mb-2">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='e.g., Working through social anxiety and building confidence"'
                className="w-full px-3 py-2 rounded-xl bg-white text-[#7A7A7A] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[#0F1912] text-sm mb-4">
                Choose Your Journey Image
              </label>
              {isLoadingImages ? (
                <div className="rounded-xl bg-white/60 px-4 py-6 text-center text-[#0F1912]">
                  Loading journey images...
                </div>
              ) : imageError ? (
                <div className="rounded-xl bg-red-50 px-4 py-6 text-center text-red-600">
                  {imageError}
                </div>
              ) : images.length === 0 ? (
                <div className="rounded-xl bg-white/60 px-4 py-6 text-center text-[#0F1912]">
                  No journey images found in the selected category.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5 xl:gap-8">
                  {images.map((image) => (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => setSelectedImage(image.id)}
                      className={`h-48 rounded-xl bg-white overflow-hidden hover:scale-105 transition-transform duration-200 relative ${
                        selectedImage === image.id
                          ? "ring-4 ring-emerald-600"
                          : ""
                      }`}
                    >
                      <img
                        src={image.src}
                        alt={image.name}
                        className="w-full h-full object-cover"
                      />
                      {selectedImage === image.id && (
                        <div className="absolute top-2 right-2 w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center">
                          <svg
                            className="w-4 h-4 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {saveError ? (
            <div className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {saveError}
            </div>
          ) : null}

          <div className="flex justify-end mt-10  ">
            <button
              type="button"
              onClick={handleSaveJourney}
              disabled={isSavingJourney}
              className="bg-[#4A7C59] hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium transition-colors duration-200 shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSavingJourney ? "Saving..." : "Save & Enter Space"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
