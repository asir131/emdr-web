import React from "react";
import AudioPlayer from "./AudioPlayer";

const PreviewPane = ({ description, backgroundUrl, audioTitle, audioSrc }) => {
  return (
    <div
      className="bg-white/40 backdrop-blur-md rounded-[40px] p-10 shadow-2xl h-full flex flex-col relative overflow-hidden border border-white/40"
      style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.7), rgba(255,255,255,0.7)), url(${
          backgroundUrl ||
          "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&fit=crop"
        })`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="relative z-10 flex flex-col h-full">
        <h2 className="text-2xl font-serif mb-3 text-[#0F1912] tracking-tight">
          Describe this place
        </h2>

        <div className="mb-8">
          <AudioPlayer
            title={audioTitle || "Select a sound"}
            audioSrc={audioSrc}
            isReplaceable={false}
          />
        </div>

        <div className="mt-8 flex justify-end">
          {/* Decorative element or secondary player if needed */}
        </div>
      </div>

      {/* Soft gradient overlay at bottom */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white/30 to-transparent pointer-events-none" />
    </div>
  );
};

export default PreviewPane;
