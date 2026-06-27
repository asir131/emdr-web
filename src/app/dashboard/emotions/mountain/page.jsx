"use client";

import React from "react";
import { Video } from "lucide-react";
import { motion } from "framer-motion";

const MOUNTAIN_VIDEO_SRC =
  "https://res.cloudinary.com/dbglkfj2z/video/upload/v1777834560/my-emdr/media/media_69c709d3cb049607feb74d9e_1777834486531.mp4";

export default function MountainPage() {
  return (
    <div className="min-h-screen p-4">
      <div className="flex items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#292524] font-serif">
            Mountain
          </h1>
          <p className="text-[#383634] text-sm">
            A visual grounding exercise to help when emotions feel overwhelming.
          </p>
        </div>
      </div>

      <div className="bg-white/50 backdrop-blur-md rounded-[40px] border border-white/50 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.05)] p-6 md:p-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="group bg-white/40 rounded-[32px] overflow-hidden border border-white/50 shadow-soft hover:shadow-xl transition-all duration-500"
        >
          <div className="aspect-video relative bg-black/5">
            <video
              src={MOUNTAIN_VIDEO_SRC}
              className="w-full h-full object-cover"
              controls
              playsInline
            />
          </div>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-[#E8F3EA] rounded-lg">
                <Video size={14} className="text-[#5a7c5a]" />
              </div>
              <h3 className="text-xl font-semibold text-[#292524]">
                Mountain
              </h3>
            </div>
            <p className="text-[#78716C] text-sm">
              Visual grounding exercise for emotional regulation.
            </p>
          </div>
        </motion.div>
      </div>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap");

        .font-serif {
          font-family: "Playfair Display", serif;
        }
      `}</style>
    </div>
  );
}
