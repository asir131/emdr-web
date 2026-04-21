"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Brain, Pause, Play, Lock, LockOpen, Music, X, Video } from "lucide-react";
import { useStoredAuth } from "@/redux/authStorage";

const THANKING_MIND_AUDIO_STORAGE_KEY = "thoughts-counting-audio-complete";
const THANKING_MIND_VIDEO_STORAGE_KEY = "thoughts-thanking-mind-watched-videos";
const MINDFULNESS_VIDEO_STORAGE_KEY = "thoughts-mindfulness-watched-videos";

const readStoredBoolean = (storageKey) => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(storageKey) === "true";
};

const readStoredArray = (storageKey) => {
  if (typeof window === "undefined") {
    return [];
  }

  return JSON.parse(window.localStorage.getItem(storageKey) || "[]");
};

const getThoughtsUserKey = ({ user, token }) =>
  user?._id || user?.id || user?.email || user?.name || token || "guest";

const buildThoughtsStorageKey = (baseKey, userKey) => `${baseKey}:${userKey}`;

const formatTime = (timeInSeconds) => {
  if (!Number.isFinite(timeInSeconds) || timeInSeconds < 0) {
    return "00:00";
  }

  const totalSeconds = Math.floor(timeInSeconds);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const getVideoState = (videos, watchedIds, videoId) => {
  const videoIndex = videos.findIndex((video) => video.id === videoId);

  if (videoIndex === -1) {
    return "locked";
  }

  if (watchedIds.includes(videoId)) {
    return "completed";
  }

  if (videoIndex === 0) {
    return "active";
  }

  return watchedIds.includes(videos[videoIndex - 1].id) ? "active" : "locked";
};

const getNextVideoId = (videos, currentVideoId) => {
  const currentIndex = videos.findIndex((video) => video.id === currentVideoId);

  if (currentIndex === -1 || currentIndex >= videos.length - 1) {
    return null;
  }

  return videos[currentIndex + 1].id;
};

const getActiveVideoId = (videos, watchedIds, selectedVideoId) => {
  if (getVideoState(videos, watchedIds, selectedVideoId) !== "locked") {
    return selectedVideoId;
  }

  return (
    videos.find((video) => getVideoState(videos, watchedIds, video.id) === "active")?.id ||
    videos[0]?.id ||
    null
  );
};

const thankingMindVideos = [
  {
    id: "monster",
    title: "Monster",
    src: "https://res.cloudinary.com/dbglkfj2z/video/upload/v1776791734/my-emdr/media/media_69c70af6f992b944bccd41a9_1776791676326.mov",
  },
  {
    id: "pop-up-ads",
    title: "Pop Up Ads",
    src: "https://res.cloudinary.com/dbglkfj2z/video/upload/v1776791935/my-emdr/media/media_69c70af6f992b944bccd41a9_1776791915398.mp4",
  },
  {
    id: "riptide",
    title: "Riptide",
    src: "https://res.cloudinary.com/dbglkfj2z/video/upload/v1776792355/my-emdr/media/media_69c70af6f992b944bccd41a9_1776792303312.mov",
  },
  {
    id: "gps-mind",
    title: "The GPS Mind - Try This!",
    src: "https://res.cloudinary.com/dbglkfj2z/video/upload/v1776792471/my-emdr/media/media_69c70af6f992b944bccd41a9_1776792426860.mov",
  },
  {
    id: "museum-security-guard",
    title: "The Museum Security Guard",
    src: "https://res.cloudinary.com/dbglkfj2z/video/upload/v1776792563/my-emdr/media/media_69c70af6f992b944bccd41a9_1776792509804.mov",
  },
];

const mindfulnessVideos = [
  {
    id: "brain",
    title: "Brain",
    src: "https://res.cloudinary.com/dbglkfj2z/video/upload/v1776801087/my-emdr/media/media_69c70af6f992b944bccd41a9_1776801065133.mp4",
  },
  {
    id: "brain-down",
    title: "Brain Down",
    src: "https://res.cloudinary.com/dbglkfj2z/video/upload/v1776801133/my-emdr/media/media_69c70af6f992b944bccd41a9_1776801117511.mp4",
  },
];

const thoughtsData = [
  {
    id: 1,
    type: "main",
    title: "Observing Your Mind",
    description:
      "Our thoughts can feel very real and powerful, but learning to observe them with some distance can be transformative. These exercises are designed to help you develop a new relationship with your thoughts.",
    icon: <Brain className="w-8 h-8 text-[#4A90E2]" />,
  },
  {
    id: 2,
    type: "audio",
    tag: "Audio",
    title: "Counting Thoughts",
    description: "A guided practice in observing and counting your thoughts.",
    icon: <Music className="w-4 h-4" />,
    status: "active",
    audioSrc: "/when you are ready (1).wav",
  },
  {
    id: 3,
    type: "coming-soon",
    tag: "Coming Soon",
    title: "Thanking the Mind",
    description:
      "Practice acknowledging thoughts without getting caught up in them.",
    status: "locked",
  },

  
  {
    id: 4,
    type: "coming-soon",
    tag: "Coming Soon",
    title: "Mindfulness",
    description:
      "A mindfulness meditation to cultivate present-moment awareness.",
    status: "locked",
  },
];

export default function ThoughtsPage() {
  const { user, token } = useStoredAuth();
  const audioRef = useRef(null);
  const modalVideoRef = useRef(null);
  const [activeAudioId, setActiveAudioId] = useState(null);
  const [progressByUser, setProgressByUser] = useState({});
  const [activeVideoModal, setActiveVideoModal] = useState(null);
  const [selectedThankingMindVideoId, setSelectedThankingMindVideoId] = useState(
    thankingMindVideos[0].id
  );
  const [selectedMindfulnessVideoId, setSelectedMindfulnessVideoId] = useState(
    mindfulnessVideos[0].id
  );
  const [isModalVideoPlaying, setIsModalVideoPlaying] = useState(false);
  const [modalVideoCurrentTime, setModalVideoCurrentTime] = useState(0);
  const [modalVideoDuration, setModalVideoDuration] = useState(0);
  const [lastAllowedVideoTime, setLastAllowedVideoTime] = useState(0);

  const thoughtsUserKey = getThoughtsUserKey({ user, token });
  const audioStorageKey = buildThoughtsStorageKey(
    THANKING_MIND_AUDIO_STORAGE_KEY,
    thoughtsUserKey
  );
  const thankingMindStorageKey = buildThoughtsStorageKey(
    THANKING_MIND_VIDEO_STORAGE_KEY,
    thoughtsUserKey
  );
  const mindfulnessStorageKey = buildThoughtsStorageKey(
    MINDFULNESS_VIDEO_STORAGE_KEY,
    thoughtsUserKey
  );

  const currentUserProgress = progressByUser[thoughtsUserKey] || {
    isThankingMindUnlocked: readStoredBoolean(audioStorageKey),
    watchedVideoIds: readStoredArray(thankingMindStorageKey),
    watchedMindfulnessVideoIds: readStoredArray(mindfulnessStorageKey),
  };

  const { isThankingMindUnlocked, watchedVideoIds, watchedMindfulnessVideoIds } =
    currentUserProgress;

  const isCountingThoughtsCompleted = isThankingMindUnlocked;
  const isMindfulnessUnlocked = watchedVideoIds.length === thankingMindVideos.length;
  const isMindfulnessCompleted =
    watchedMindfulnessVideoIds.length === mindfulnessVideos.length;

  const activeThankingMindVideoId = getActiveVideoId(
    thankingMindVideos,
    watchedVideoIds,
    selectedThankingMindVideoId
  );
  const activeMindfulnessVideoId = getActiveVideoId(
    mindfulnessVideos,
    watchedMindfulnessVideoIds,
    selectedMindfulnessVideoId
  );

  useEffect(() => {
    const currentAudio = audioRef.current;
    const currentModalVideo = modalVideoRef.current;

    return () => {
      if (currentAudio) {
        currentAudio.pause();
      }

      if (currentModalVideo) {
        currentModalVideo.pause();
      }
    };
  }, []);

  const resetModalVideoState = () => {
    setIsModalVideoPlaying(false);
    setModalVideoCurrentTime(0);
    setModalVideoDuration(0);
    setLastAllowedVideoTime(0);
  };

  const updateCurrentUserProgress = (updater) => {
    setProgressByUser((currentProgressByUser) => {
      const baseProgress = currentProgressByUser[thoughtsUserKey] || currentUserProgress;
      const nextProgress =
        typeof updater === "function" ? updater(baseProgress) : updater;

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          audioStorageKey,
          nextProgress.isThankingMindUnlocked ? "true" : "false"
        );
        window.localStorage.setItem(
          thankingMindStorageKey,
          JSON.stringify(nextProgress.watchedVideoIds)
        );
        window.localStorage.setItem(
          mindfulnessStorageKey,
          JSON.stringify(nextProgress.watchedMindfulnessVideoIds)
        );
      }

      return {
        ...currentProgressByUser,
        [thoughtsUserKey]: nextProgress,
      };
    });
  };

  const thoughtsItems = thoughtsData.map((item) => {
    if (item.id === 2) {
      return {
        ...item,
        tag: isCountingThoughtsCompleted ? "Completed" : item.tag,
        status: "active",
        state: isCountingThoughtsCompleted ? "completed" : "active",
      };
    }

    if (item.id === 3) {
      return {
        ...item,
        tag: isMindfulnessUnlocked
          ? "Completed"
          : isThankingMindUnlocked
            ? "Video Series"
            : item.tag,
        status: isThankingMindUnlocked ? "active" : "locked",
        state: isMindfulnessUnlocked
          ? "completed"
          : isThankingMindUnlocked
            ? "active"
            : "locked",
      };
    }

    if (item.id === 4) {
      return {
        ...item,
        tag: isMindfulnessCompleted
          ? "Completed"
          : isMindfulnessUnlocked
            ? "Video Series"
            : item.tag,
        status: isMindfulnessUnlocked ? "active" : "locked",
        state: isMindfulnessCompleted
          ? "completed"
          : isMindfulnessUnlocked
            ? "active"
            : "locked",
      };
    }

    return {
      ...item,
      state: "active",
    };
  });

  const selectedVideo =
    activeVideoModal === "mindfulness"
      ? mindfulnessVideos.find((video) => video.id === activeMindfulnessVideoId) ||
        mindfulnessVideos[0]
      : thankingMindVideos.find((video) => video.id === activeThankingMindVideoId) ||
        thankingMindVideos[0];

  const currentModalVideos =
    activeVideoModal === "mindfulness" ? mindfulnessVideos : thankingMindVideos;
  const currentWatchedVideoIds =
    activeVideoModal === "mindfulness" ? watchedMindfulnessVideoIds : watchedVideoIds;
  const currentProgressTotal =
    activeVideoModal === "mindfulness"
      ? mindfulnessVideos.length
      : thankingMindVideos.length;

  const handleAudioToggle = async (item) => {
    if (item.status !== "active" || !item.audioSrc) {
      return;
    }

    if (audioRef.current && activeAudioId === item.id) {
      audioRef.current.pause();
      setActiveAudioId(null);
      return;
    }

    if (audioRef.current && audioRef.current.src.endsWith(item.audioSrc)) {
      try {
        await audioRef.current.play();
        setActiveAudioId(item.id);
      } catch (error) {
        console.error("Unable to resume thoughts audio:", error);
        setActiveAudioId(null);
      }
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(item.audioSrc);
    audioRef.current = audio;
    setActiveAudioId(item.id);

    audio.onended = () => {
      setActiveAudioId(null);
      audioRef.current = null;
      updateCurrentUserProgress((currentProgress) => ({
        ...currentProgress,
        isThankingMindUnlocked: true,
      }));
    };

    try {
      await audio.play();
    } catch (error) {
      console.error("Unable to play thoughts audio:", error);
      setActiveAudioId(null);
      audioRef.current = null;
    }
  };

  const handleVideoWatched = () => {
    if (!selectedVideo) {
      return;
    }

    if (activeVideoModal === "mindfulness") {
      updateCurrentUserProgress((currentProgress) => {
        if (currentProgress.watchedMindfulnessVideoIds.includes(selectedVideo.id)) {
          return currentProgress;
        }

        return {
          ...currentProgress,
          watchedMindfulnessVideoIds: [
            ...currentProgress.watchedMindfulnessVideoIds,
            selectedVideo.id,
          ],
        };
      });

      const nextVideoId = getNextVideoId(mindfulnessVideos, selectedVideo.id);
      if (nextVideoId) {
        resetModalVideoState();
        setSelectedMindfulnessVideoId(nextVideoId);
      }
      return;
    }

    updateCurrentUserProgress((currentProgress) => {
      if (currentProgress.watchedVideoIds.includes(selectedVideo.id)) {
        return currentProgress;
      }

      return {
        ...currentProgress,
        watchedVideoIds: [...currentProgress.watchedVideoIds, selectedVideo.id],
      };
    });

    const nextVideoId = getNextVideoId(thankingMindVideos, selectedVideo.id);
    if (nextVideoId) {
      resetModalVideoState();
      setSelectedThankingMindVideoId(nextVideoId);
    }
  };

  const handleModalVideoToggle = async () => {
    if (!modalVideoRef.current) {
      return;
    }

    if (isModalVideoPlaying) {
      modalVideoRef.current.pause();
      return;
    }

    try {
      await modalVideoRef.current.play();
    } catch (error) {
      console.error("Unable to play thoughts video:", error);
    }
  };

  const handleItemClick = (item) => {
    if (item.id === 2) {
      handleAudioToggle(item);
      return;
    }

    if (item.id === 3 && item.status === "active") {
      resetModalVideoState();
      setActiveVideoModal("thanking");
      setSelectedThankingMindVideoId(
        getActiveVideoId(thankingMindVideos, watchedVideoIds, selectedThankingMindVideoId)
      );
    }

    if (item.id === 4 && item.status === "active") {
      resetModalVideoState();
      setActiveVideoModal("mindfulness");
      setSelectedMindfulnessVideoId(
        getActiveVideoId(
          mindfulnessVideos,
          watchedMindfulnessVideoIds,
          selectedMindfulnessVideoId
        )
      );
    }
  };

  return (
    <div className="rounded-3xl border border-white/20 bg-[#FFF8F066]/50 px-6 py-12 shadow-2xl">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 text-center text-5xl font-serif text-[#1F2937]"
      >
        Thoughts
      </motion.h1>

      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-start gap-8 rounded-[28px] border border-white/60 bg-[#F0F7FF]/90 p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-md"
        >
          <div className="flex-shrink-0">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
              <Brain className="h-8 w-8 text-[#4A90E2]" strokeWidth={1.5} />
            </div>
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-[#1E3A8A]">
              Observing Your Mind
            </h2>
            <p className="text-lg font-medium leading-relaxed text-[#3B82F6] opacity-90">
              Our thoughts can feel very real and powerful, but learning to
              observe them with some distance can be transformative. These
              exercises are designed to help you develop a new relationship with
              your thoughts.
            </p>
          </div>
        </motion.div>

        {thoughtsItems
          .filter((item) => item.type !== "main")
          .map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleItemClick(item)}
              className={`group flex items-start gap-8 rounded-[28px] border border-white/60 bg-white/80 p-8 shadow-[0_8px_30px_rgba(0,0,0,0.03)] backdrop-blur-md ${
                item.status === "active" ? "cursor-pointer hover:border-[#D8E9DD]" : ""
              }`}
            >
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F3F4F6] text-lg font-bold text-[#9CA3AF]">
                  {item.id}
                </div>
              </div>

              <div className="flex-grow space-y-3">
                {item.tag && (
                  <div className="flex">
                    <span
                      className={`inline-flex items-center gap-2 rounded-md px-3 py-1 text-[13px] font-bold tracking-tight ${
                        item.tag === "Audio" || item.tag === "Video Series"
                          ? "bg-[#D1FAE5] text-[#065F46]"
                          : item.tag === "Completed"
                            ? "bg-[#E0F2FE] text-[#0C4A6E]"
                            : "bg-[#F3F4F6] text-[#9CA3AF]"
                      }`}
                    >
                      {item.tag === "Audio" && <Music className="h-3.5 w-3.5" />}
                      {item.tag === "Video Series" && <Video className="h-3.5 w-3.5" />}
                      {item.tag === "Completed" && <LockOpen className="h-3.5 w-3.5" />}
                      {item.tag}
                    </span>
                  </div>
                )}
                <h3
                  className={`text-2xl font-bold ${
                    item.state === "locked" ? "text-[#9CA3AF]" : "text-[#1F2937]"
                  }`}
                >
                  {item.title}
                </h3>
                <p
                  className={`text-lg ${
                    item.state === "locked" ? "text-[#9CA3AF]" : "text-[#4B5563]"
                  }`}
                >
                  {item.description}
                </p>
                {item.id === 2 && item.status === "active" && activeAudioId === item.id && (
                  <p className="text-sm font-medium text-[#4A7C59]">Now playing...</p>
                )}
                {item.id === 2 && item.state === "completed" && activeAudioId !== item.id && (
                  <p className="text-sm font-medium text-[#4A7C59]">
                    Completed. The next step is now unlocked.
                  </p>
                )}
                {item.id === 3 && item.status === "active" && (
                  <p className="text-sm font-medium text-[#4A7C59]">
                    {item.state === "completed"
                      ? "Completed. The next step is now unlocked."
                      : `${watchedVideoIds.length}/${thankingMindVideos.length} videos watched`}
                  </p>
                )}
                {item.id === 4 && item.status === "active" && (
                  <p className="text-sm font-medium text-[#4A7C59]">
                    {item.state === "completed"
                      ? "Completed."
                      : `${watchedMindfulnessVideoIds.length}/${mindfulnessVideos.length} videos watched`}
                  </p>
                )}
              </div>

              <div className="flex-shrink-0 pt-2 opacity-60">
                {item.id === 2 && item.status === "active" ? (
                  activeAudioId === item.id ? (
                    <Pause className="h-8 w-8 text-[#4A7C59] transition-transform hover:scale-110" />
                  ) : (
                    <Play
                      className={`h-8 w-8 transition-transform hover:scale-110 ${
                        item.state === "completed" ? "text-[#4A7C59]" : "text-[#9CA3AF]"
                      }`}
                    />
                  )
                ) : item.id === 3 && item.status === "active" ? (
                  item.state === "completed" ? (
                    <LockOpen className="h-8 w-8 text-[#4A7C59]" />
                  ) : (
                    <Video className="h-8 w-8 text-[#4A7C59]" />
                  )
                ) : item.id === 4 && item.status === "active" ? (
                  item.state === "completed" ? (
                    <LockOpen className="h-8 w-8 text-[#4A7C59]" />
                  ) : (
                    <Video className="h-8 w-8 text-[#4A7C59]" />
                  )
                ) : (
                  <Lock className="h-8 w-8 text-[#9CA3AF]" />
                )}
              </div>
            </motion.div>
          ))}
      </div>

      {activeVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F1912]/55 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-6xl rounded-[32px] border border-white/20 bg-[#F8F5EE]/95 p-6 shadow-[0_30px_100px_rgba(15,25,18,0.2)] md:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.24em] text-[#4A7C59]">
                  {activeVideoModal === "mindfulness" ? "Mindfulness" : "Thanking the Mind"}
                </p>
                <h2 className="text-3xl font-serif text-[#1F2937]">
                  Video Practice Library
                </h2>
                <p className="mt-2 text-sm text-[#5F6B63]">
                  Watch each video in order. Finishing one unlocks the next.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (modalVideoRef.current) {
                    modalVideoRef.current.pause();
                  }
                  resetModalVideoState();
                  setActiveVideoModal(null);
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#4A7C59] shadow-sm transition-transform hover:scale-105"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-5 rounded-2xl bg-[#EDF5EF] px-4 py-3 text-sm font-medium text-[#355743]">
              Progress {currentWatchedVideoIds.length}/{currentProgressTotal} videos completed
            </div>

            <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="space-y-3">
                {currentModalVideos.map((video, index) => {
                  const isWatched = currentWatchedVideoIds.includes(video.id);
                  const videoState = getVideoState(
                    currentModalVideos,
                    currentWatchedVideoIds,
                    video.id
                  );
                  const isLocked = videoState === "locked";
                  const isSelected =
                    activeVideoModal === "mindfulness"
                      ? activeMindfulnessVideoId === video.id
                      : activeThankingMindVideoId === video.id;

                  return (
                    <button
                      key={video.id}
                      type="button"
                      disabled={isLocked}
                      onClick={() => {
                        resetModalVideoState();

                        if (activeVideoModal === "mindfulness") {
                          setSelectedMindfulnessVideoId(video.id);
                          return;
                        }

                        setSelectedThankingMindVideoId(video.id);
                      }}
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition-all ${
                        isLocked
                          ? "cursor-not-allowed border-white/60 bg-white/45 opacity-70"
                          : isSelected
                            ? "border-[#4A7C59] bg-white shadow-md"
                            : "border-white/70 bg-white/70 hover:border-[#C9DCCF]"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7B8B80]">
                          Video {index + 1}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            isLocked
                              ? "bg-[#F3F4F6] text-[#9CA3AF]"
                              : isWatched
                                ? "bg-[#D1FAE5] text-[#065F46]"
                                : "bg-[#F3F4F6] text-[#7C7C7C]"
                          }`}
                        >
                          {isLocked ? "Locked" : isWatched ? "Watched" : "Open"}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-[#1F2937]">
                        {video.title}
                      </h3>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-[28px] border border-white/50 bg-white/80 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.05)] md:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7B8B80]">
                      Now Viewing
                    </p>
                    <h3 className="mt-1 text-2xl font-serif text-[#1F2937]">
                      {selectedVideo.title}
                    </h3>
                  </div>
                  {currentWatchedVideoIds.includes(selectedVideo.id) && (
                    <span className="rounded-full bg-[#D1FAE5] px-3 py-1 text-xs font-semibold text-[#065F46]">
                      Completed
                    </span>
                  )}
                </div>

                <div className="overflow-hidden rounded-[24px] bg-[#DCE7DF]">
                  <video
                    key={selectedVideo.id}
                    ref={modalVideoRef}
                    src={selectedVideo.src}
                    controls
                    playsInline
                    onEnded={handleVideoWatched}
                    onLoadedMetadata={(event) => {
                      setModalVideoDuration(event.currentTarget.duration || 0);
                      setModalVideoCurrentTime(0);
                      setLastAllowedVideoTime(0);
                    }}
                    onPlay={() => setIsModalVideoPlaying(true)}
                    onPause={() => setIsModalVideoPlaying(false)}
                    onTimeUpdate={(event) => {
                      const nextTime = event.currentTarget.currentTime;
                      setModalVideoCurrentTime(nextTime);
                      setLastAllowedVideoTime((currentTime) =>
                        nextTime > currentTime ? nextTime : currentTime
                      );
                    }}
                    onSeeking={(event) => {
                      const attemptedTime = event.currentTarget.currentTime;
                      if (attemptedTime > lastAllowedVideoTime + 0.35) {
                        event.currentTarget.currentTime = lastAllowedVideoTime;
                      }
                    }}
                    className="aspect-video w-full bg-black object-cover"
                  />
                </div>

                {/* <div className="mt-4 rounded-2xl bg-[#EEF3EE] px-4 py-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={handleModalVideoToggle}
                      className="flex min-w-28 items-center justify-center gap-2 rounded-full bg-[#4A7C59] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#3d6649]"
                    >
                      {isModalVideoPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      {isModalVideoPlaying ? "Pause" : "Play"}
                    </button>
                    <p className="text-sm font-medium text-[#355743]">
                      {formatTime(modalVideoCurrentTime)} / {formatTime(modalVideoDuration)}
                    </p>
                  </div>
                  <p className="mt-2 text-xs text-[#6B7E71]">
                    Seek disabled. Drag করে সামনে বা পিছনে নেওয়া যাবে না।
                  </p>
                </div> */}

                <p className="mt-3 text-sm text-[#5F6B63]">
                  Watch the full video to mark it complete. The next video unlocks after this one finishes.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
