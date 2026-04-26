import React from "react";
import AudioPlayer from "./AudioPlayer";

const VISUAL_SOUNDS_CATEGORY_NAME = "visual-sounds";

const MoodSelector = ({
  isOpen,
  onClose,
  sounds,
  isLoading,
  error,
  selectedSoundId,
  onSelectSound,
}) => {
  const handleSelect = (sound) => {
    onSelectSound(sound);
    onClose();
  };
  const filteredSounds = sounds.filter(
    (sound) => {
      const normalizedCategoryName =
        sound?.categoryName?.trim()?.toLowerCase() || "";
      const normalizedCategorySlug =
        sound?.categorySlug?.trim()?.toLowerCase() || "";
      const normalizedMediaType = sound?.mediaType?.trim()?.toLowerCase() || "";

      const isVisualSoundCategory =
        normalizedCategoryName === VISUAL_SOUNDS_CATEGORY_NAME ||
        normalizedCategorySlug === VISUAL_SOUNDS_CATEGORY_NAME;

      return isVisualSoundCategory && normalizedMediaType === "audio";
    }
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 ">
      <div className="absolute inset-0 bg-black/60 " onClick={onClose} />

      <div className="bg-white/60 rounded-[40px] p-8 shadow-2xl relative w-full max-w-2xl max-h-[80vh] overflow-y-auto z-10 border border-white/20">
        <div className="flex justify-between items-center mb-6 ">
          <div>
            <h2 className="text-2xl font-serif text-white tracking-tight">
              Select Mood
            </h2>
            <p className="mt-1 text-sm text-white/80 font-sans">
              Visual-sounds category-r audio item-gula ekhane dekhacche.
              Jekono ekta select korte parben.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white text-3xl hover:scale-110 transition-transform p-2"
          >
            x
          </button>
        </div>

        {isLoading ? (
          <div className="rounded-2xl bg-white/70 px-4 py-8 text-center text-stone-700">
            Loading sounds...
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 px-4 py-8 text-center text-red-600">
            {error}
          </div>
        ) : filteredSounds.length === 0 ? (
          <div className="rounded-2xl bg-white/70 px-4 py-8 text-center text-stone-700">
            No Visual-sounds audio found.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSounds.map((sound) => (
              <div
                key={sound.id}
                className={`w-full rounded-2xl overflow-hidden shadow-lg transition-all text-left ${
                  selectedSoundId === sound.id
                    ? "ring-2 ring-[#4A7C59] bg-white/90"
                    : "bg-white/60 hover:bg-white/80"
                }`}
              >
                <div className="flex items-center gap-4 p-3">
                  <div className="flex-1 min-w-0">
                    <AudioPlayer
                      title={sound.title}
                      audioSrc={sound.url}
                      isReplaceable={false}
                      isCompact={true}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelect(sound)}
                    className={`shrink-0 rounded-xl px-4 py-2 text-sm font-serif transition-colors ${
                      selectedSoundId === sound.id
                        ? "bg-[#4A7C59] text-white"
                        : "bg-white text-[#0F1912] hover:bg-[#4A7C59] hover:text-white"
                    }`}
                  >
                    {selectedSoundId === sound.id ? "Selected" : "Select"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MoodSelector;
