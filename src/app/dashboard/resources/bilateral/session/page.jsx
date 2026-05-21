"use client";
import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getBilateralEnvironments } from "@/components/dashboard/bilateral/VisualEnvironmentSelector";
import { getBilateralIcons } from "@/components/dashboard/bilateral/VisualIconSelector";
import { getBilateralSounds } from "@/components/dashboard/bilateral/SoundSelector";
import { useStoredAuth } from "@/redux/authStorage";

const SPEED_MS = { slow: 600, medium: 400, fast: 250 };
const TOTAL_SETS = 34;

function speak(text) {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }
}

function SessionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token } = useStoredAuth();

  const [environments, setEnvironments] = useState([]);
  const [icons, setIcons] = useState([]);
  const [sounds, setSounds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State machine: INTRO -> PLAYING -> CHECK_IN -> SUDS -> CALM_PLACE -> END
  const [sessionState, setSessionState] = useState("INTRO");
  const [duration, setDuration] = useState(60); // 60 or 90 minutes
  
  const [isPaused, setIsPaused] = useState(false);
  const [currentSet, setCurrentSet] = useState(1);
  const [isRight, setIsRight] = useState(false);

  const intervalRef = useRef(null);
  const audioRef = useRef(null);
  const isPausedRef = useRef(false);
  const posRef = useRef({ left: "15%", top: null });

  const envId = searchParams.get("environment") || "";
  const iconId = searchParams.get("icon") || "";
  const soundId = searchParams.get("sound") || "";
  const speed = searchParams.get("speed") || "medium";
  const direction = searchParams.get("direction") || "horizontal";

  const speedMs = SPEED_MS[speed] || 400;

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
        // Intro Speech
        speak("The bilateral stimulation will start now. Your roadmap is ready. When you have the image and feeling in mind, press start. When you start, let your mind wander. Your thoughts may go forward or backwards in time.");
      }
    };
    load();
    
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [token]);

  const selectedEnv = environments.find((e) => e.id === envId) || environments[0];
  const selectedIcon = icons.find((i) => i.id === iconId) || icons[0];
  const selectedSound = sounds.find((s) => s.id === soundId) || sounds[0];

  // Audio - Load as sound effect (no loop)
  useEffect(() => {
    if (!selectedSound?.url) return;
    const audio = new Audio(selectedSound.url);
    audioRef.current = audio;
    audio.loop = false;
    audio.volume = 0.7;
    return () => { audio.pause(); audio.currentTime = 0; audioRef.current = null; };
  }, [selectedSound]);

  useEffect(() => {
    isPausedRef.current = isPaused;
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
    if (isLoading || isPaused || sessionState !== "PLAYING") {
      clearInterval(intervalRef.current);
      return;
    }

    const playSound = () => {
      if (audioRef.current && !isPausedRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    };

    const doMove = (isInitial = false) => {
      if (!isInitial) {
        playSound();
      }
      setIsRight((prev) => {
        const next = !prev;
        posRef.current = getNextPos(next);
        return next;
      });
      setCurrentSet((prev) => {
        const next = prev + 1;
        if (next > TOTAL_SETS) {
          clearInterval(intervalRef.current);
          setSessionState("CHECK_IN");
          speak("Is it changing and still connected?");
        }
        return next;
      });
    };

    const timeout = setTimeout(() => {
      doMove(true);
      intervalRef.current = setInterval(() => doMove(false), speedMs);
    }, 100);

    return () => {
      clearTimeout(timeout);
      clearInterval(intervalRef.current);
    };
  }, [isLoading, isPaused, sessionState, speedMs, direction]);

  const handleStart = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    setCurrentSet(1);
    setIsRight(false);
    setSessionState("PLAYING");
  };

  const handleCheckIn = (isChanging) => {
    if (isChanging) {
      speak("Ok good, go with that, or go with where you left off.");
      setCurrentSet(1);
      setIsRight(false);
      setSessionState("PLAYING");
    } else {
      speak("Ok, lets go back to the original image. Without any tapping or eye movement, just take a moment to notice what you see and feel. Rate your negative emotion on a scale of 0 to 10.");
      setSessionState("SUDS");
    }
  };

  const handleSuds = (rating) => {
    if (rating > 1) {
      speak("Ok, lets continue with what you noticed about your original image.");
      setCurrentSet(1);
      setIsRight(false);
      setSessionState("PLAYING");
    } else {
      speak("Great job. Let's move to phase 2 of EMDR. Please bring up your pincode and spend a minute finding that nice feeling in your body.");
      setSessionState("CALM_PLACE");
    }
  };

  const currentPos = getNextPos(isRight);

  if (isLoading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center font-serif text-stone-600"
        style={{ background: "linear-gradient(135deg, #f8f5f0, #ebe5dc)" }}>
        Loading your sanctuary...
      </div>
    );
  }

  // ── Modals / Overlays ────────────────────────────────────────────────────
  const renderOverlay = () => {
    if (sessionState === "INTRO") {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-serif">
          <div className="bg-white rounded-3xl p-8 md:p-12 max-w-2xl w-full shadow-2xl text-center">
            <h2 className="text-3xl font-serif text-[#0F1912] mb-6">Phase 1 of EMDR</h2>
            <div className="text-lg text-gray-700 space-y-4 mb-8 text-left bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <p><strong>1.</strong> The bilateral stimulation will start now.</p>
              <p><strong>2.</strong> Your roadmap is ready. When you have the image and feeling in mind, press start.</p>
              <p><strong>3.</strong> When you start, let your mind wander – your thoughts may go forward or backwards in time.</p>
            </div>
            
            <div className="mb-8">
              <p className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">Select Session Duration</p>
              <div className="flex gap-4 justify-center">
                <button onClick={() => setDuration(60)} className={`px-6 py-3 rounded-xl border-2 transition-all ${duration === 60 ? 'border-[#4A7C59] bg-[#4A7C59]/10 text-[#4A7C59]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>1 Hour</button>
                <button onClick={() => setDuration(90)} className={`px-6 py-3 rounded-xl border-2 transition-all ${duration === 90 ? 'border-[#4A7C59] bg-[#4A7C59]/10 text-[#4A7C59]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>1.5 Hours</button>
              </div>
            </div>

            <button onClick={handleStart} className="w-full py-4 bg-[#4A7C59] text-white text-lg rounded-xl hover:bg-[#3d6849] transition-all">
              I have the image in mind – Start
            </button>
          </div>
        </div>
      );
    }
    
    if (sessionState === "CHECK_IN") {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-serif">
          <div className="bg-white rounded-3xl p-8 md:p-12 max-w-md w-full shadow-2xl text-center">
            <h2 className="text-2xl font-serif text-[#0F1912] mb-8">Is it changing and still connected?</h2>
            <div className="flex gap-4 justify-center">
              <button onClick={() => handleCheckIn(true)} className="flex-1 py-4 bg-[#4A7C59] text-white rounded-xl hover:bg-[#3d6849] transition-all text-lg">Yes</button>
              <button onClick={() => handleCheckIn(false)} className="flex-1 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all text-lg">No</button>
            </div>
          </div>
        </div>
      );
    }

    if (sessionState === "SUDS") {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-serif">
          <div className="bg-white rounded-3xl p-8 md:p-12 max-w-2xl w-full shadow-2xl text-center">
            <h2 className="text-2xl font-serif text-[#0F1912] mb-4">Rate your negative emotion</h2>
            <p className="text-gray-600 mb-8">Without any tapping or eye movement, just take a moment to notice what you see and feel. How disturbing is it right now?</p>
            <div className="flex flex-wrap gap-3 justify-center">
              {[0,1,2,3,4,5,6,7,8,9,10].map(val => (
                <button key={val} onClick={() => handleSuds(val)} className="w-12 h-12 rounded-full border-2 border-[#4A7C59] text-[#4A7C59] hover:bg-[#4A7C59] hover:text-white transition-all text-lg font-medium">
                  {val}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-4 text-sm text-gray-500 px-4">
              <span>0 = Neutral</span>
              <span>10 = Extremely</span>
            </div>
          </div>
        </div>
      );
    }

    if (sessionState === "CALM_PLACE") {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-serif">
          <div className="bg-white rounded-3xl p-8 md:p-12 max-w-xl w-full shadow-2xl text-center">
            <h2 className="text-3xl font-serif text-[#0F1912] mb-6">Phase 2: Calm Place</h2>
            <p className="text-xl text-gray-700 mb-8 leading-relaxed">
              Please bring up your pincode and spend a minute finding that nice feeling in the body.
            </p>
            <button onClick={() => setSessionState("END")} className="w-full py-4 bg-[#4A7C59] text-white text-lg rounded-xl hover:bg-[#3d6849] transition-all">
              Continue
            </button>
          </div>
        </div>
      );
    }

    if (sessionState === "END") {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-serif">
          <div className="bg-white rounded-3xl p-8 md:p-12 max-w-xl w-full shadow-2xl text-center">
            <h2 className="text-3xl font-serif text-[#0F1912] mb-6">Session Complete</h2>
            <p className="text-xl text-gray-700 mb-8 leading-relaxed">
              Please wait 4 days to a week before your next session as the processing continues.
            </p>
            <button onClick={() => router.push("/dashboard")} className="w-full py-4 bg-[#4A7C59] text-white text-lg rounded-xl hover:bg-[#3d6849] transition-all">
              Return to Dashboard
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  // ── BLS session screen ───────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 overflow-hidden font-serif" style={{ zIndex: 100 }}>
      {renderOverlay()}
      
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

      {/* Moving element */}
      {!isPaused && sessionState === "PLAYING" && selectedIcon?.img && (
        <div
          className="absolute z-30 pointer-events-none"
          style={{
            left: currentPos.left,
            top: currentPos.top || "40%",
            transform: "translateX(-50%) translateY(-50%)",
            transition: `left ${speedMs}ms linear, top ${speedMs}ms linear`,
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
      {!isPaused && sessionState === "PLAYING" && selectedIcon?.img && (
        <div
          className="absolute z-10 pointer-events-none"
          style={{
            left: currentPos.left,
            bottom: "6%",
            transform: "translateX(-50%) scaleY(-0.35)",
            opacity: 0.2,
            filter: "blur(4px)",
            transition: `left ${speedMs}ms linear`,
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
      <div className="absolute top-7 left-9 z-40 pointer-events-none">
        <p className="text-[9px] tracking-[2px] uppercase text-white/80 mb-1" style={{ textShadow: "0 1px 5px rgba(0,0,0,0.2)" }}>
          The UK InKind Psychology Clinic
        </p>
        <h1 className="text-xl font-light italic text-white" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
          {selectedEnv?.name || "Bilateral Stimulation"}
        </h1>
      </div>

      {/* Counter */}
      {sessionState === "PLAYING" && (
        <div className="absolute top-8 right-9 z-40 pointer-events-none text-sm italic text-white/80"
          style={{ textShadow: "0 1px 5px rgba(0,0,0,0.2)" }}>
          Set {Math.min(currentSet, TOTAL_SETS)} of {TOTAL_SETS}
        </div>
      )}

      {/* Pause button */}
      {sessionState === "PLAYING" && (
        <button
          onClick={() => setIsPaused((p) => !p)}
          className="absolute bottom-8 right-9 z-40 px-6 py-3 rounded-full font-serif text-xs cursor-pointer transition-all"
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
      )}

      {/* Exit button */}
      <button
        onClick={() => router.back()}
        className="absolute bottom-8 left-9 z-40 px-6 py-3 rounded-full font-serif text-xs cursor-pointer transition-all"
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
