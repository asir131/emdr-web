import React, { useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

const AudioPlayer = ({
  title,
  durationInSeconds,
  audioSrc,
  isReplaceable,
  onReplace,
  isCompact,
}) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [resolvedDuration, setResolvedDuration] = useState(
    durationInSeconds || 0
  );
  const displayedDuration = resolvedDuration || durationInSeconds || 0;

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return "0:00";
    }

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePlayPause = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const audio = audioRef.current;

    if (!audio || !audioSrc) {
      return;
    }

    if (isPlaying) {
      audio.pause();
      return;
    }

    try {
      if (audio.ended) {
        audio.currentTime = 0;
        setCurrentTime(0);
        setProgress(0);
      }

      await audio.play();
    } catch (error) {
      console.error("Unable to play audio:", error);
    }
  };

  const handleReplace = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (onReplace) {
      onReplace();
    }
  };

  return (
    <div
      className={`flex items-center gap-6 rounded-2xl p-5 ${
        isCompact
          ? "bg-[#999999]/50"
          : "bg-white/40 backdrop-blur-md shadow-sm border border-white/30"
      } group transition-all`}
    >
      <button
        onClick={handlePlayPause}
        disabled={!audioSrc}
        className="w-14 h-14 bg-[#4A7C59] hover:bg-[#3d6649] rounded-full flex items-center justify-center transition-all duration-300 shadow-lg active:scale-90 flex-shrink-0 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPlaying ? (
          <Pause className="w-12 h-6 text-white" fill="currentColor" />
        ) : (
          <Play className="w-12 h-6 text-white ml-0.5" fill="currentColor" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-end mb-1">
          <p
            className={`font-serif text-[#0F1912] truncate ${
              isCompact ? "text-sm" : "text-base"
            }`}
          >
            {title}
          </p>
        </div>
        <div className="relative h-2.5 bg-green-200/30 rounded-full overflow-hidden group-hover:h-3 transition-all">
          <div
            className="absolute h-full bg-[#4A7C59] transition-all duration-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] font-sans text-[#1E3224] font-medium opacity-80">
            {formatTime(currentTime)}
          </span>
          <span className="text-[10px] font-sans text-[#1E3224] font-medium opacity-80">
            {formatTime(displayedDuration)}
          </span>
        </div>
      </div>
      {isReplaceable && (
        <button
          onClick={handleReplace}
          className="px-5 py-2.5 bg-[#4A7C59] hover:bg-[#3d6649] text-white rounded-xl text-sm font-serif transition-colors shadow-md active:scale-95"
        >
          Replace
        </button>
      )}
      <audio
        ref={audioRef}
        src={audioSrc}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setProgress(100);
          setCurrentTime(displayedDuration);
        }}
        onTimeUpdate={(event) => {
          const nextCurrentTime = event.currentTarget.currentTime || 0;
          const nextDuration =
            event.currentTarget.duration || displayedDuration || 0;

          setCurrentTime(nextCurrentTime);
          setProgress(
            nextDuration > 0 ? (nextCurrentTime / nextDuration) * 100 : 0
          );
        }}
        onLoadedMetadata={(event) => {
          const nextDuration =
            event.currentTarget.duration || durationInSeconds || 0;

          setResolvedDuration(nextDuration);
        }}
      />
    </div>
  );
};

export default AudioPlayer;
