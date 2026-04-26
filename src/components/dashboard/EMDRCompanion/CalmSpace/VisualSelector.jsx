import React from "react";
import { Upload } from "lucide-react";
import VisualCard from "./VisualCard";
const VisualSelector = ({
  visuals,
  isLoading = false,
  error = "",
  selectedVisualId,
  onSelectVisual,
}) => {
  return (
    <div className="bg-white/40 backdrop-blur-md rounded-3xl p-3 shadow-xl border border-white/20">
      <h2 className="text-xl font-serif mb-3 text-[#0F1912] tracking-tight">
        Visual
      </h2>
      {isLoading ? (
        <div className="mb-5 rounded-2xl bg-white/70 px-4 py-8 text-center text-stone-700">
          Loading visuals...
        </div>
      ) : error ? (
        <div className="mb-5 rounded-2xl bg-red-50 px-4 py-8 text-center text-red-600">
          {error}
        </div>
      ) : visuals.length === 0 ? (
        <div className="mb-5 rounded-2xl bg-white/70 px-4 py-8 text-center text-stone-700">
          No calm-space images found in the Visual-image category.
        </div>
      ) : (
        <div className="flex flex-wrap gap-5 mb-5">
          {visuals.map((visual) => (
            <VisualCard
              key={visual.id}
              {...visual}
              isActive={selectedVisualId === visual.id}
              onClick={() => onSelectVisual(visual)}
            />
          ))}
        </div>
      )}
      <div className="relative group overflow-hidden rounded-3xl">
        <div
          className="rounded-[40px] p-5 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm transition-all"
          style={{
            border: "2px dashed #1E3224",
            borderStyle: "dashed",
          }}
        >
          <div className="bg-white/60 p-4 rounded-full mb-4 shadow-sm ">
            <Upload className="w-6 h-6 text-[#4A7C59]" />
          </div>

          <p className="text-[#0F1912] font-serif text-lg mb-1">
            Click to upload
          </p>
          <p className="text-stone-500 text-sm font-sans tracking-wide">
            PNG or GIF (max. 5MB)
          </p>
          <input
            type="file"
            className="absolute inset-0 opacity-0 cursor-pointer"
            accept="image/*"
          />
        </div>
      </div>
    </div>
  );
};

export default VisualSelector;
