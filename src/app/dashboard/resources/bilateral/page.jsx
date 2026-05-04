"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import VisualEnvironmentSelector from "@/components/dashboard/bilateral/VisualEnvironmentSelector";
import { getBilateralEnvironments } from "@/components/dashboard/bilateral/VisualEnvironmentSelector";
import VisualIconSelector from "@/components/dashboard/bilateral/VisualIconSelector";
import { getBilateralIcons } from "@/components/dashboard/bilateral/VisualIconSelector";
import SoundSelector from "@/components/dashboard/bilateral/SoundSelector";
import { getBilateralSounds } from "@/components/dashboard/bilateral/SoundSelector";
import BilateralSpeedSelector from "@/components/dashboard/bilateral/BilateralSpeedSelector";
import BilateralDirectionSelector from "@/components/dashboard/bilateral/BilateralDirectionSelector";
import { Save, Play } from "lucide-react";
import { useStoredAuth } from "@/redux/authStorage";
import { updateSessionProgress } from "@/utils/sessionProgress";

const postBilateralSettings = async ({ baseUrl, token, payload }) => {
  const response = await fetch(`${baseUrl}/api/bilateral/settings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json();

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || "Failed to save bilateral settings.");
  }

  return result;
};

export default function BilateralSettingsPage() {
  const router = useRouter();
  const { token } = useStoredAuth();
  const [selections, setSelections] = useState({
    environment: "",
    icon: "",
    sound: "",
    speed: "medium",
    direction: "horizontal",
  });
  const [environments, setEnvironments] = useState([]);
  const [icons, setIcons] = useState([]);
  const [sounds, setSounds] = useState([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);
  const [settingsError, setSettingsError] = useState("");
  const [saveState, setSaveState] = useState("idle");
  const lastSavedSignatureRef = useRef("");

  const rawBaseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || process.env.VITE_BASE_URL || "";
  const baseUrl = rawBaseUrl.endsWith("/")
    ? rawBaseUrl.slice(0, -1)
    : rawBaseUrl;

  const updateSelection = (key, value) => {
    setSelections((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    const loadMediaOptions = async () => {
      if (!token) {
        setIsLoadingMedia(false);
        return;
      }

      try {
        setIsLoadingMedia(true);
        setSettingsError("");

        const [environmentItems, iconItems, soundItems] = await Promise.all([
          getBilateralEnvironments(token),
          getBilateralIcons(token),
          getBilateralSounds(token),
        ]);

        setEnvironments(environmentItems);
        setIcons(iconItems);
        setSounds(soundItems);
      } catch (error) {
        console.error("Error loading bilateral settings options:", error);
        setSettingsError(
          error.message || "Unable to load bilateral settings right now."
        );
      } finally {
        setIsLoadingMedia(false);
      }
    };

    loadMediaOptions();
  }, [token]);

  const selectedEnvironment = environments.find(
    (item) => item.id === selections.environment
  );
  const selectedIcon = icons.find((item) => item.id === selections.icon);
  const selectedSound = sounds.find((item) => item.id === selections.sound);

  const currentPayload =
    selectedEnvironment?.image && selectedIcon?.img && selectedSound?.url
      ? {
          environmentId: selectedEnvironment.image,
          iconUrl: selectedIcon.img,
          soundId: selectedSound.url,
          direction: selections.direction,
          speed: selections.speed,
        }
      : null;
  const currentPayloadSignature = currentPayload
    ? JSON.stringify(currentPayload)
    : "";

  const saveSettings = async ({ force = false } = {}) => {
    if (!currentPayload) {
      return false;
    }

    if (!baseUrl) {
      setSettingsError("Settings service is not configured.");
      setSaveState("error");
      return false;
    }

    if (!token) {
      setSettingsError("Please sign in again to save your settings.");
      setSaveState("error");
      return false;
    }

    const payloadSignature = currentPayloadSignature;

    if (!force && payloadSignature === lastSavedSignatureRef.current) {
      return true;
    }

    try {
      setSaveState("saving");
      setSettingsError("");

      await postBilateralSettings({
        baseUrl,
        token,
        payload: currentPayload,
      });

      lastSavedSignatureRef.current = payloadSignature;
      setSaveState("saved");
      return true;
    } catch (error) {
      console.error("Error saving bilateral settings:", error);
      setSettingsError(
        error.message || "Unable to save bilateral settings right now."
      );
      setSaveState("error");
      return false;
    }
  };

  useEffect(() => {
    if (!currentPayloadSignature || isLoadingMedia) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      if (currentPayloadSignature === lastSavedSignatureRef.current) {
        return;
      }

      const payload = JSON.parse(currentPayloadSignature);

      postBilateralSettings({
        baseUrl,
        token,
        payload,
      })
        .then(() => {
          lastSavedSignatureRef.current = currentPayloadSignature;
          setSaveState("saved");
          setSettingsError("");
        })
        .catch((error) => {
          console.error("Error saving bilateral settings:", error);
          setSettingsError(
            error.message || "Unable to save bilateral settings right now."
          );
          setSaveState("error");
        });
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [baseUrl, currentPayloadSignature, isLoadingMedia, token]);

  const handleBeginSession = async () => {
    if (!selections.environment || !selections.icon || !selections.sound) {
      return;
    }

    const activeJourneyId = localStorage.getItem("activeJourneyId");
    if (activeJourneyId && token && baseUrl) {
      // Update sessions 6, 7, 8, 9, and 10 together as requested
      const sessionsToUpdate = [6, 7, 8, 9, 10];
      try {
        await Promise.all(
          sessionsToUpdate.map((num) =>
            updateSessionProgress({
              baseUrl,
              token,
              journeyId: activeJourneyId,
              compledSession: num,
            })
          )
        );
      } catch (error) {
        console.error("Error updating bulk session progress:", error);
      }
    }

    const params = new URLSearchParams(selections);
    router.push(`/dashboard/resources/bilateral/session?${params.toString()}`);
  };

  const handleSaveSettings = async () => {
    await saveSettings({ force: true });
  };

  return (
    <div className="min-h-screen relative bg-fixed bg-center">
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-sm pointer-events-none rounded-2xl"></div>

      <div className="relative z-10 py-12 px-6">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-serif text-[#0F1912] mb-3">
            Bilateral Stimulation
          </h1>
          <p className="text-stone-700 font-serif opacity-80 italic">
            Customise your calming experience
          </p>
        </div>

        <div className="space-y-6">
          {/* Top Row: Environment Selector */}
          <VisualEnvironmentSelector
            selectedId={selections.environment}
            onSelect={(id) => updateSelection("environment", id)}
          />

          {/* Middle Row: Icons and Sounds */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <VisualIconSelector
              selectedId={selections.icon}
              onSelect={(id) => updateSelection("icon", id)}
            />
            <SoundSelector
              selectedId={selections.sound}
              onSelect={(id) => updateSelection("sound", id)}
            />
          </div>

          {/* Bottom Row: Speed and Direction */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BilateralSpeedSelector
              selectedId={selections.speed}
              onSelect={(id) => updateSelection("speed", id)}
            />
            <BilateralDirectionSelector
              selectedId={selections.direction}
              onSelect={(id) => updateSelection("direction", id)}
            />
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="mt-12 flex justify-end gap-4">
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={!currentPayload || saveState === "saving"}
            className="flex items-center gap-2 px-8 py-3 bg-white/80 backdrop-blur-md border border-stone-300 rounded-xl font-medium text-stone-700 hover:bg-white transition-all shadow-sm active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={18} />
            {saveState === "saving" ? "Saving..." : "Save Settings"}
          </button>
          <button
            onClick={handleBeginSession}
            disabled={!selections.environment || !selections.icon || !selections.sound}
            className="flex items-center gap-2 px-8 py-3 bg-[#4A7C59] text-white rounded-xl font-medium hover:bg-[#3d6649] transition-all shadow-lg active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Play size={18} fill="currentColor" />
            Begin Session
          </button>
        </div>
        {settingsError ? (
          <p className="mt-4 text-right text-sm text-red-600">{settingsError}</p>
        ) : saveState === "saved" ? (
          <p className="mt-4 text-right text-sm text-emerald-700">
            Settings saved successfully.
          </p>
        ) : null}
      </div>
    </div>
  );
}
