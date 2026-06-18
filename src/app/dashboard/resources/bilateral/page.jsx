"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getBilateralEnvironments } from "@/components/dashboard/bilateral/VisualEnvironmentSelector";
import { getBilateralIcons } from "@/components/dashboard/bilateral/VisualIconSelector";
import { getBilateralSounds } from "@/components/dashboard/bilateral/SoundSelector";
import { Save, Play, MoveHorizontal, MoveVertical, MoveUpRight, MoveDownRight, Music, Check } from "lucide-react";
import { useStoredAuth } from "@/redux/authStorage";
import { updateSessionProgress, checkSessionAccess } from "@/utils/sessionProgress";
import {
  BILATERAL_INTRO_ROUTE,
  hasWatchedBilateralIntroVideo,
} from "@/utils/bilateralIntroVideo";
import {
  DEFAULT_BILATERAL_SELECTIONS,
  withDefaultBilateralOptions,
} from "@/utils/bilateralDefaultOptions";

const postBilateralSettings = async ({ baseUrl, token, payload }) => {
  const response = await fetch(`${baseUrl}/api/bilateral/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok || !result?.success) throw new Error(result?.message || "Failed to save bilateral settings.");
  return result;
};

const speeds = [
  { id: "slow", name: "Slow", desc: "2600ms", icon: "🐢" },
  { id: "medium", name: "Medium", desc: "2000ms", icon: "🍃" },
  { id: "fast", name: "Fast", desc: "1500ms", icon: "⚡" },
  { id: "faster", name: "Faster", desc: "900ms", icon: "⚡⚡" },
];

const directions = [
  { id: "horizontal", name: "Horizontal", Icon: MoveHorizontal },
  { id: "vertical", name: "Vertical", Icon: MoveVertical },
  { id: "diagonal-up", name: "Diagonal Up", Icon: MoveUpRight },
  { id: "diagonal-down", name: "Diagonal Down", Icon: MoveDownRight },
];

// Reusable section heading
const SectionHeading = ({ children }) => (
  <h2 className="text-sm font-semibold uppercase tracking-widest text-[#0F1912] mb-5 flex items-center gap-2">
    <span className="w-4 h-px bg-stone-400 inline-block" />
    {children}
  </h2>
);

export default function BilateralSettingsPage() {
  const router = useRouter();
  const { token } = useStoredAuth();
  const [selections, setSelections] = useState(DEFAULT_BILATERAL_SELECTIONS);
  const [environments, setEnvironments] = useState(() => withDefaultBilateralOptions({}).environments);
  const [icons, setIcons] = useState(() => withDefaultBilateralOptions({}).icons);
  const [sounds, setSounds] = useState(() => withDefaultBilateralOptions({}).sounds);
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);
  const [settingsError, setSettingsError] = useState("");
  const [saveState, setSaveState] = useState("idle");
  const lastSavedSignatureRef = useRef("");

  const rawBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VITE_BASE_URL || "";
  const baseUrl = rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

  const updateSelection = (key, value) => setSelections((prev) => ({ ...prev, [key]: value }));

  const audioRef = useRef(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const handleSoundClick = (id, url) => {
    updateSelection("sound", id);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (url) {
      const audio = new Audio(url);
      audio.volume = 0.5;
      audio.play().catch(e => console.log("Audio play failed:", e));
      audioRef.current = audio;
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!token) {
        const defaults = withDefaultBilateralOptions({});
        setEnvironments(defaults.environments);
        setIcons(defaults.icons);
        setSounds(defaults.sounds);
        setIsLoadingMedia(false);
        return;
      }
      try {
        setIsLoadingMedia(true);
        const [envs, icns, snds] = await Promise.all([
          getBilateralEnvironments(token),
          getBilateralIcons(token),
          getBilateralSounds(token),
        ]);
        const defaults = withDefaultBilateralOptions({
          environments: envs,
          icons: icns,
          sounds: snds,
        });
        setEnvironments(defaults.environments);
        setIcons(defaults.icons);
        setSounds(defaults.sounds);
        setSelections((prev) => ({
          ...prev,
          environment: prev.environment || DEFAULT_BILATERAL_SELECTIONS.environment,
          icon: prev.icon || DEFAULT_BILATERAL_SELECTIONS.icon,
          sound: prev.sound || DEFAULT_BILATERAL_SELECTIONS.sound,
        }));
      } catch (error) {
        setSettingsError(error.message || "Unable to load bilateral settings right now.");
      } finally {
        setIsLoadingMedia(false);
      }
    };
    load();
  }, [token]);

  useEffect(() => {
    const activeJourneyId = localStorage.getItem("activeJourneyId") || "";
    if (!hasWatchedBilateralIntroVideo(activeJourneyId)) {
      router.replace(BILATERAL_INTRO_ROUTE);
    }
  }, [router]);

  useEffect(() => {
    if (!token || !baseUrl) return;
    const check = async () => {
      const activeJourneyId = localStorage.getItem("activeJourneyId");
      if (activeJourneyId) {
        const access = await checkSessionAccess({ baseUrl, token, journeyId: activeJourneyId, requiredSession: 6 });
        if (!access.allowed && access.redirectTo) router.replace(access.redirectTo);
      }
    };
    check();
  }, [token, baseUrl, router]);

  const selectedEnvironment = environments.find((i) => i.id === selections.environment);
  const selectedIcon = icons.find((i) => i.id === selections.icon);
  const selectedSound = sounds.find((i) => i.id === selections.sound);

  const currentPayload = selectedEnvironment?.image && selectedIcon?.img && selectedSound?.url
    ? { environmentId: selectedEnvironment.image, iconUrl: selectedIcon.img, soundId: selectedSound.url, direction: selections.direction, speed: selections.speed }
    : null;
  const currentPayloadSignature = currentPayload ? JSON.stringify(currentPayload) : "";

  const saveSettings = async ({ force = false } = {}) => {
    if (!currentPayload || !baseUrl || !token) return false;
    if (!force && currentPayloadSignature === lastSavedSignatureRef.current) return true;
    try {
      setSaveState("saving");
      await postBilateralSettings({ baseUrl, token, payload: currentPayload });
      lastSavedSignatureRef.current = currentPayloadSignature;
      setSaveState("saved");
      return true;
    } catch (error) {
      setSettingsError(error.message || "Unable to save bilateral settings right now.");
      setSaveState("error");
      return false;
    }
  };

  const handleBeginSession = async () => {
    if (!selections.environment || !selections.icon || !selections.sound) return;
    const activeJourneyId = localStorage.getItem("activeJourneyId");
    if (activeJourneyId && token && baseUrl) {
      try {
        await Promise.all([6, 7, 8, 9, 10].map((n) => updateSessionProgress({ baseUrl, token, journeyId: activeJourneyId, compledSession: n })));
      } catch (e) { console.error(e); }
    }
    const params = new URLSearchParams(selections);
    router.push(`/dashboard/resources/bilateral/session?${params.toString()}`);
  };

  return (
    <div className="min-h-screen relative font-serif">
      <div className="absolute inset-0 bg-white/10 backdrop-blur-sm pointer-events-none rounded-2xl" />
      <div className="relative z-10 py-8 px-4 w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-xs tracking-[3px] uppercase text-stone-500 mb-2">The UK InKind Psychology Clinic</p>
          <h1 className="text-4xl font-serif mb-2 italic text-[#0F1912]">
            Bilateral Stimulation
          </h1>
          <p className="text-base text-[#7A7A7A] italic">Customise your calming experience</p>
        </div>

        <div className="space-y-5">
          {/* Scene — full width */}
          <div className="bg-white/65 backdrop-blur-md rounded-2xl p-6 shadow-md border border-white/60">
            <SectionHeading>Scene</SectionHeading>
            {isLoadingMedia ? (
              <div className="py-8 text-center text-stone-500">Loading scenes...</div>
            ) : environments.length === 0 ? (
                <div className="py-8 text-center text-stone-500">No scenes found.</div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {environments.map((env) => (
                  <div
                    key={env.id}
                    onClick={() => updateSelection("environment", env.id)}
                    className={`relative aspect-[16/11] rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${selections.environment === env.id
                      ? "ring-2 ring-[#7a9a6a] shadow-md"
                      : "opacity-80 hover:opacity-100"
                      }`}
                  >
                    <img src={env.image} alt={env.name} className="w-full h-full object-cover" />
                    {env.isBuiltIn && (
                      <div className="absolute inset-x-0 bottom-0 bg-white/90 px-2 py-1 text-center text-xs font-medium text-stone-800">
                        {env.name}
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 py-2 px-1 bg-gradient-to-t from-black/60 to-transparent text-center">
                      {/* <span className="text-white text-xs italic">{env.name}</span> */}
                    </div>
                    {selections.environment === env.id && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-[#7a9a6a] rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Visual + Sound */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Visual (Icons) */}
            <div className="bg-white/65 backdrop-blur-md rounded-2xl p-5 shadow-md border border-white/60">
              <SectionHeading>Visual</SectionHeading>
              {isLoadingMedia ? (
                <div className="py-8 text-center text-stone-500">Loading visuals...</div>
              ) : icons.length === 0 ? (
                <div className="py-8 text-center text-stone-500">No visuals found.</div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                  {icons.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => updateSelection("icon", item.id)}
                      className={`relative aspect-square rounded-xl cursor-pointer overflow-hidden shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${selections.icon === item.id
                        ? "border-2 border-[#7a9a6a] bg-gradient-to-br from-[#7a9a6a]/12 to-[#6a8a5a]/18"
                        : "border-2 border-white/90 bg-white/85 hover:bg-white"
                        }`}
                    >
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
                        <img src={item.img} alt={item.name} className="h-full w-full object-contain p-3" />
                      )}
                      <div className="absolute inset-x-1.5 bottom-1.5 rounded-lg bg-white/92 px-2 py-1.5 text-center shadow-sm backdrop-blur-sm">
                        <span className="block truncate text-xs font-medium leading-tight text-stone-800">{item.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sound */}
            <div className="bg-white/65 backdrop-blur-md rounded-2xl p-5 shadow-md border border-white/60">
              <SectionHeading>Sound</SectionHeading>
              {isLoadingMedia ? (
                <div className="py-8 text-center text-stone-500">Loading sounds...</div>
              ) : sounds.length === 0 ? (
                <div className="py-8 text-center text-stone-500">No sounds found.</div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                  {sounds.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSoundClick(item.id, item.url)}
                      className={`min-w-0 rounded-xl cursor-pointer p-2.5 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${selections.sound === item.id
                        ? "border-2 border-[#7a9a6a] bg-gradient-to-br from-[#7a9a6a]/12 to-[#6a8a5a]/18"
                        : "border-2 border-white/90 bg-white/85 hover:bg-white"
                        }`}
                    >
                      <img src={item.image} alt={item.name} className="mx-auto h-14 w-14 rounded-lg object-cover shadow-sm" onError={(e) => { e.target.src = `https://picsum.photos/seed/soundfb${item.id}/150/150`; }} />
                      <div className="mt-2 min-w-0">
                        <span className="block truncate text-xs font-medium leading-tight text-stone-800">
                          {item.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Speed + Direction — separate cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Speed */}
            <div className="bg-white/65 backdrop-blur-md rounded-2xl p-5 shadow-md border border-white/60">
              <SectionHeading>Speed</SectionHeading>
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {speeds.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => updateSelection("speed", item.id)}
                    className={`min-w-0 rounded-xl cursor-pointer text-center py-4 px-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${selections.speed === item.id
                      ? "border-2 border-[#7a9a6a] bg-gradient-to-br from-[#7a9a6a]/15 to-[#6a8a5a]/22 shadow-sm"
                      : "border-2 border-stone-200/80 bg-white/75 hover:bg-white/95"
                      }`}
                  >
                    <div className="text-2xl mb-2 leading-none">{item.icon}</div>
                    <div className={`text-sm italic mb-1 ${selections.speed === item.id ? "text-[#5a7a4a] font-semibold" : "text-stone-600"}`}>{item.name}</div>
                    <div className="text-xs text-stone-400">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Direction */}
            <div className="bg-white/65 backdrop-blur-md rounded-2xl p-5 shadow-md border border-white/60">
              <SectionHeading>Direction</SectionHeading>
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {directions.map(({ id, name, Icon }) => (
                  <div
                    key={id}
                    onClick={() => updateSelection("direction", id)}
                    className={`min-w-0 rounded-xl cursor-pointer text-center py-4 px-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${selections.direction === id
                      ? "border-2 border-[#7a9a6a] bg-gradient-to-br from-[#7a9a6a]/15 to-[#6a8a5a]/22 shadow-sm"
                      : "border-2 border-stone-200/80 bg-white/75 hover:bg-white/95"
                      }`}
                  >
                    <Icon className={`w-7 h-7 mx-auto mb-2 ${selections.direction === id ? "text-[#7a9a6a]" : "text-stone-400"}`} />
                    <div className={`text-xs italic leading-tight ${selections.direction === id ? "text-[#5a7a4a] font-semibold" : "text-stone-600"}`}>{name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col items-center gap-3 pt-2 pb-8">
            <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-5">
              <button
                type="button"
                onClick={() => saveSettings({ force: true })}
                disabled={!currentPayload || saveState === "saving"}
                className="flex items-center justify-center gap-2 px-8 py-3.5 bg-white/70 border-2 border-stone-300/80 rounded-full font-serif text-sm text-stone-600 hover:bg-white/90 hover:border-stone-400 transition-all shadow-sm hover:-translate-y-0.5 hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                {saveState === "saving" ? "Saving..." : "Save Settings"}
              </button>

              {saveState === "saved" && (
                <span className="text-[#7a9a6a] text-sm italic">✓ Saved</span>
              )}

              <button
                onClick={handleBeginSession}
                disabled={!selections.environment || !selections.icon || !selections.sound}
                className="flex items-center justify-center gap-2 px-14 py-4 rounded-full font-serif text-base text-white transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #7a9a6a 0%, #6a8a5a 100%)', boxShadow: '0 5px 25px rgba(106,138,90,0.35)' }}
              >
                <Play size={18} fill="currentColor" />
                Begin Session
              </button>
            </div>

            <p className="text-sm text-stone-800 italic">34 full sets · approximately 3 minutes</p>

            {settingsError && (
              <p className="text-sm text-red-600">{settingsError}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
