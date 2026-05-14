"use client";
import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getBilateralEnvironments } from "@/components/dashboard/bilateral/VisualEnvironmentSelector";
import { getBilateralIcons } from "@/components/dashboard/bilateral/VisualIconSelector";
import { getBilateralSounds } from "@/components/dashboard/bilateral/SoundSelector";
import { useStoredAuth } from "@/redux/authStorage";

const SPEED_MS = { slow: 850, medium: 600, fast: 400 };
const TOTAL_SETS = 34;

function SessionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token } = useStoredAuth();

  const [environments, setEnvironments] = useState([]);
  const [icons, setIcons] = useState([]);
  const [sounds, setSounds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSet, setCurrentSet] = useState(1);
  const [isRight, setIsRight] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [q1Answer, setQ1Answer] = useState(null);
  const [q2Answer, setQ2Answer] = useState(null);
  const [showQ2, setShowQ2] = useState(false);

  const intervalRef = useRef(null);
  const audioRef = useRef(null);
  const isPausedRef = useRef(false);
  const posRef = useRef({ left: "15%", top: null });

  const envId = searchParams.get("environment") || "";
  const iconId = searchParams.get("icon") || "";
  const soundId = searchParams.get("sound") || "";
  const speed = searchParams.get("speed") || "medium";
  const direction = searchParams.get("direction") || "horizontal";

  const speedMs = SPEED_MS[speed] || 600;

  useEffect(() => {
    const load = async () => {
      try {
        const [envs, icns, snds] = await Promise.all([
          getBilateralEnvironments(token),
          getBilateralIcons(token),
          getBilateralSounds(token),
        ]);
        setEnvironments(envs);
        setIcons(icns);
        setSounds(snds);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [token]);

  const selectedEnv = environments.find((e) => e.id === envId) || environments[0];
  const selectedIcon = icons.find((i) => i.id === iconId) || icons[0];
  const selectedSound = sounds.find((s) => s.id === soundId) || sounds[0];

  // Audio
  useEffect(() => {
    if (!selectedSound?.url) return;
    const audio = new Audio(selectedSound.url);
    audioRef.current = audio;
    audio.loop = true;
    audio.volume = 0.7;
    if (!isPausedRef.current) audio.play().catch(() => {});
    return () => { audio.pause(); audio.currentTime = 0; audioRef.current = null; };
  }, [selectedSound]);

  useEffect(() => {
    isPausedRef.current = isPaused;
    if (!audioRef.current) return;
    if (isPaused) audioRef.current.pause();
    else audioRef.current.play().catch(() => {});
  }, [isPaused]);

  // Movement
  function getNextPos(goRight) {
    if (direction === "horizontal") {
      return { left: goRight ? "85%" : "15%", top: "40%" };
    } else if (direction === "vertical") {
      return { left: "50%", top: goRight ? "70%" : "15%" };
    } else if (direction === "diagonal-up") {
      return { left: goRight ? "85%" : "15%", top: goRight ? "15%" : "55%" };
    } else {
      return { left: goRight ? "85%" : "15%", top: goRight ? "55%" : "15%" };
    }
  }

  useEffect(() => {
    if (isLoading || isPaused || isComplete) {
      clearInterval(intervalRef.current);
      return;
    }

    // Set initial position
    const initPos = getNextPos(false);
    posRef.current = initPos;

    intervalRef.current = setInterval(() => {
      setIsRight((prev) => {
        const next = !prev;
        posRef.current = getNextPos(next);
        return next;
      });
      setCurrentSet((prev) => {
        const next = prev + 1;
        if (next > TOTAL_SETS) {
          clearInterval(intervalRef.current);
          setIsComplete(true);
        }
        return next;
      });
    }, speedMs);

    return () => clearInterval(intervalRef.current);
  }, [isLoading, isPaused, isComplete, speedMs, direction]);

  const currentPos = getNextPos(isRight);

  const handleQ1 = (ans) => {
    setQ1Answer(ans);
    setTimeout(() => setShowQ2(true), 300);
  };

  const handleQ2 = (ans) => {
    setQ2Answer(ans);
    setTimeout(() => {
      if (q1Answer === "yes" && ans === "yes") {
        // Restart session
        setIsComplete(false);
        setCurrentSet(1);
        setIsRight(false);
        setQ1Answer(null);
        setQ2Answer(null);
        setShowQ2(false);
      } else {
        router.back();
      }
    }, 500);
  };

  if (isLoading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center font-serif text-stone-600"
        style={{ background: "linear-gradient(135deg, #f8f5f0, #ebe5dc)" }}>
        Loading your sanctuary...
      </div>
    );
  }

  // ── Completion screen ────────────────────────────────────────────────────
  if (isComplete) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center font-serif z-50"
        style={{ background: "linear-gradient(135deg, #f8f5f0 0%, #e8efe8 100%)" }}>
        <p className="text-xl italic text-[#5a5550] mb-12 text-center leading-relaxed">
          Take a gentle breath.<br />Notice what you experienced.
        </p>

        {/* Q1 */}
        <div className="bg-white rounded-2xl px-12 py-8 shadow-lg text-center mb-5 w-full max-w-md">
          <p className="text-base italic text-[#5a5550] mb-6">Is it changing?</p>
          <div className="flex gap-4 justify-center">
            {["Yes", "No"].map((a) => (
              <button key={a} onClick={() => handleQ1(a.toLowerCase())}
                className={`px-10 py-3 rounded-full border-2 font-serif text-sm transition-all ${
                  q1Answer === a.toLowerCase()
                    ? "border-[#7a9a6a] bg-gradient-to-br from-[#7a9a6a]/18 to-[#6a8a5a]/22 text-[#5a6a50]"
                    : "border-stone-200 text-[#6a655d] hover:border-stone-300 hover:bg-stone-50"
                }`}>
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Q2 */}
        {showQ2 && (
          <div className="bg-white rounded-2xl px-12 py-8 shadow-lg text-center w-full max-w-md">
            <p className="text-base italic text-[#5a5550] mb-6">Is it still connected to your original image?</p>
            <div className="flex gap-4 justify-center">
              {["Yes", "No"].map((a) => (
                <button key={a} onClick={() => handleQ2(a.toLowerCase())}
                  className={`px-10 py-3 rounded-full border-2 font-serif text-sm transition-all ${
                    q2Answer === a.toLowerCase()
                      ? "border-[#7a9a6a] bg-gradient-to-br from-[#7a9a6a]/18 to-[#6a8a5a]/22 text-[#5a6a50]"
                      : "border-stone-200 text-[#6a655d] hover:border-stone-300 hover:bg-stone-50"
                  }`}>
                  {a}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── BLS session screen ───────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 overflow-hidden font-serif" style={{ zIndex: 100 }}>
      {/* Background */}
      <div className="absolute inset-0">
        {selectedEnv?.image ? (
          <img src={selectedEnv.image} alt={selectedEnv.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#c5d5d0] to-[#8ab0a5]" />
        )}
      </div>

      {/* Paper texture overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 500 500' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

      {/* Moving element — API icon image */}
      {!isPaused && selectedIcon?.img && (
        <div
          className="absolute z-30 pointer-events-none"
          style={{
            left: currentPos.left,
            top: currentPos.top || "40%",
            transform: "translateX(-50%) translateY(-50%)",
            transition: `left ${speedMs}ms cubic-bezier(0.4,0,0.2,1), top ${speedMs}ms cubic-bezier(0.4,0,0.2,1)`,
            filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.15))",
          }}
        >
          <img
            src={selectedIcon.img}
            alt={selectedIcon.name}
            style={{ width: 80, height: 80, objectFit: "contain" }}
          />
        </div>
      )}

      {/* Reflection */}
      {!isPaused && selectedIcon?.img && (
        <div
          className="absolute z-10 pointer-events-none"
          style={{
            left: currentPos.left,
            bottom: "6%",
            transform: "translateX(-50%) scaleY(-0.35)",
            opacity: 0.2,
            filter: "blur(4px)",
            transition: `left ${speedMs}ms cubic-bezier(0.4,0,0.2,1)`,
          }}
        >
          <img
            src={selectedIcon.img}
            alt=""
            style={{ width: 80, height: 80, objectFit: "contain" }}
          />
        </div>
      )}

      {/* Header */}
      <div className="absolute top-7 left-9 z-60 pointer-events-none">
        <p className="text-[9px] tracking-[2px] uppercase text-white/80 mb-1" style={{ textShadow: "0 1px 5px rgba(0,0,0,0.2)" }}>
          The UK InKind Psychology Clinic
        </p>
        <h1 className="text-xl font-light italic text-white" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
          {selectedEnv?.name || "Bilateral Stimulation"}
        </h1>
      </div>

      {/* Counter */}
      <div className="absolute top-8 right-9 z-60 pointer-events-none text-sm italic text-white/80"
        style={{ textShadow: "0 1px 5px rgba(0,0,0,0.2)" }}>
        {Math.min(currentSet, TOTAL_SETS)} of {TOTAL_SETS}
      </div>

      {/* Pause button */}
      <button
        onClick={() => setIsPaused((p) => !p)}
        className="absolute bottom-8 right-9 z-60 px-6 py-3 rounded-full font-serif text-xs cursor-pointer transition-all"
        style={{
          background: "rgba(255,255,255,0.25)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.4)",
          color: "rgba(255,255,255,0.95)",
          textShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      >
        {isPaused ? "resume" : "pause"}
      </button>

      {/* Exit button */}
      <button
        onClick={() => router.back()}
        className="absolute bottom-8 left-9 z-60 px-6 py-3 rounded-full font-serif text-xs cursor-pointer transition-all"
        style={{
          background: "rgba(255,255,255,0.25)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.4)",
          color: "rgba(255,255,255,0.95)",
        }}
      >
        exit
      </button>
    </div>
  );
}

export default function BilateralSessionPage() {
  return (
    <Suspense fallback={
      <div className="w-screen h-screen flex items-center justify-center font-serif text-stone-600"
        style={{ background: "linear-gradient(135deg, #f8f5f0, #ebe5dc)" }}>
        Loading your sanctuary...
      </div>
    }>
      <SessionContent />
    </Suspense>
  );
}
