"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Play, Pause, Music, Video, Layers, Pencil } from "lucide-react";
import { motion } from "framer-motion";

export default function EmotionsLanding() {
  const audioRef = useRef(null);
  const [activeAudioId, setActiveAudioId] = useState(null);

  const tools = [
    {
      id: "audio",
      type: "Audio",
      title: "Spiral Technique",
      description:
        "A grounding technique to help when emotions feel overwhelming.",
      icon: <Music className="w-3.5 h-3.5" />,
      audioSrc: "/voice/Spiral Technique.mp4",
    },
    {
      id: "video",
      type: "Video",
      title: "Thunder and Lightning",
      description:
        "A grounding technique to help when emotions feel overwhelming.",
      icon: <Video className="w-3.5 h-3.5" />,
      link: "/dashboard/emotions/thunder-lightning",
    },
    {
      id: "mountain",
      type: "Video",
      title: "Mountain",
      description:
        "A visual grounding exercise to help when emotions feel overwhelming.",
      icon: <Video className="w-3.5 h-3.5" />,
      link: "/dashboard/emotions/mountain",
    },
    {
      id: "emdr",
      type: "EMDER",
      title: "EMDR 2.0",
      description:
        "A grounding technique to help when emotions feel overwhelming.",
      icon: <Layers className="w-3.5 h-3.5" />,
      link: "/dashboard/emotions/emdr",
    },
    {
      id: "drawing",
      type: "Drawing",
      title: "Emotion Drawing exercise",
      description:
        "A grounding technique to help when emotions feel overwhelming.",
      icon: <Pencil className="w-3.5 h-3.5" />,
      link: "/dashboard/emotions/body-map",
    },
  ];

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleAudioToggle = async (tool) => {
    if (!tool.audioSrc) {
      return;
    }

    if (audioRef.current && activeAudioId === tool.id) {
      audioRef.current.pause();
      audioRef.current = null;
      setActiveAudioId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(tool.audioSrc);
    audioRef.current = audio;
    setActiveAudioId(tool.id);

    audio.onended = () => {
      setActiveAudioId(null);
      audioRef.current = null;
    };

    try {
      await audio.play();
    } catch (error) {
      console.error("Unable to play emotions audio:", error);
      setActiveAudioId(null);
      audioRef.current = null;
    }
  };

  return (
    <div className="  p-4">
      {/* Container Frame */}
      <div className=" bg-white/30 rounded-[40px] border border-white/50  p-2">
        {/* Centered Title */}
        <div className="py-10 text-center">
          <h1 className="text-[28px] text-[#000000]">Emotions</h1>
        </div>

        {/* Inner Content Section */}
        <div className="bg-white/20 rounded-[32px] border border-stone-100/30 p-5 md:p-8 space-y-4">
          {tools.map((tool, index) => (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              {tool.audioSrc ? (
                <button
                  type="button"
                  onClick={() => handleAudioToggle(tool)}
                  className="group w-full bg-white/30 backdrop-blur-md rounded-[24px] border border-stone-100 p-6 md:p-8 flex items-center justify-between transition-all duration-500 hover:shadow-lg hover:border-stone-200 cursor-pointer overflow-hidden relative text-left"
                >
                  <div className="flex-1 relative z-10">
                    {/* Tool Badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#E8F3EA]/30 backdrop-blur-md text-[#5a7c5a] mb-5 border border-[#5a7c5a]/10">
                      <div className="opacity-70">{tool.icon}</div>
                      <span className="text-[12px] font-medium tracking-tight whitespace-nowrap leading-none">
                        {tool.type}
                      </span>
                    </div>
                    {/* Content */}
                    <h3 className="text-xl font-semibold text-[#292524] mb-3 ">
                      {tool.title}
                    </h3>
                    <p className="text-[#78716C] text-[14px] ">
                      {tool.description}
                    </p>
                    {activeAudioId === tool.id ? (
                      <p className="mt-3 text-sm font-medium text-[#4A7C59]">
                        Now playing...
                      </p>
                    ) : null}
                  </div>

                  {/* Right Play Action */}
                  <div className="ml-6 relative z-10 flex items-center justify-center">
                    <div className="w-10 h-10 flex items-center justify-center text-stone-300 group-hover:text-stone-900 transition-all duration-500 group-hover:scale-125">
                      {activeAudioId === tool.id ? (
                        <Pause
                          size={16}
                          fill="none"
                          className="opacity-100 text-[#4A7C59]"
                        />
                      ) : (
                        <Play
                          size={16}
                          fill="none"
                          className="opacity-40 group-hover:opacity-100"
                        />
                      )}
                    </div>
                  </div>

                  {/* Hover Decoration */}
                  <div className="absolute inset-x-0 bottom-0 h-[2px] bg-stone-900/5 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-700" />
                </button>
              ) : (
                <Link href={tool.link}>
                  <div className="group bg-white/50 backdrop-blur-md rounded-[24px] border border-stone-100 p-6 md:p-8 flex items-center justify-between transition-all duration-500 hover:shadow-lg hover:border-stone-200 cursor-pointer overflow-hidden relative">
                    <div className="flex-1 relative z-10">
                      {/* Tool Badge */}
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#E8F3EA] text-[#5a7c5a] mb-5 border border-[#5a7c5a]/10">
                        <div className="opacity-70">{tool.icon}</div>
                        <span className="text-[12px] font-medium tracking-tight whitespace-nowrap leading-none">
                          {tool.type}
                        </span>
                      </div>
                      {/* Content */}
                      <h3 className="text-xl font-semibold text-[#292524] mb-3 ">
                        {tool.title}
                      </h3>
                      <p className="text-[#78716C] text-[14px] ">
                        {tool.description}
                      </p>
                    </div>

                    {/* Right Play Action */}
                    <div className="ml-6 relative z-10 flex items-center justify-center">
                      <div className="w-10 h-10 flex items-center justify-center text-stone-300 group-hover:text-stone-900 transition-all duration-500 group-hover:scale-125">
                        <Play
                          size={16}
                          fill="none"
                          className="opacity-40 group-hover:opacity-100"
                        />
                      </div>
                    </div>

                    {/* Hover Decoration */}
                    <div className="absolute inset-x-0 bottom-0 h-[2px] bg-stone-900/5 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-700" />
                  </div>
                </Link>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap");

        .font-serif {
          font-family: "Playfair Display", serif;
        }

        h1,
        h2,
        .italic {
          font-family: "Playfair Display", serif;
        }
      `}</style>
    </div>
  );
}
