"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useStoredAuth } from "@/redux/authStorage";
import { updateSessionProgress, checkSessionAccess } from "@/utils/sessionProgress";
import {
  buildCbtFormulationNodes,
  buildAnswersFromCbtFormulationEntry,
  flattenCbtFormulationNodes,
} from "@/utils/cbtFormulationConfig";

const getBaseUrl = () => {
  const rawBaseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || process.env.VITE_BASE_URL || "";

  return rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl;
};

const fetchCbtFormulationOptions = async ({ baseUrl, token }) => {
  const response = await fetch(`${baseUrl}/api/cbt-formulation/options`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const result = await response.json();

  if (!response.ok || !result?.success) {
    throw new Error(
      result?.message || "Failed to fetch CBT formulation options.",
    );
  }

  return {
    negativeBeliefs: result?.data?.negativeBeliefs || [],
    emotions: result?.data?.emotions || [],
    consequenceOptions: result?.data?.consequenceOptions || [],
  };
};

const postCbtFormulation = async ({ baseUrl, token, payload }) => {
  const response = await fetch(`${baseUrl}/api/cbt-formulation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json();

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || "Failed to save CBT formulation.");
  }

  return result;
};

const fetchCbtFormulations = async ({ baseUrl, token }) => {
  const response = await fetch(`${baseUrl}/api/cbt-formulation`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const result = await response.json();

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || "Failed to fetch CBT formulations.");
  }

  return (result?.data || [])
    .slice()
    .sort(
      (firstItem, secondItem) =>
        new Date(secondItem?.createdAt || 0).getTime() -
        new Date(firstItem?.createdAt || 0).getTime(),
    );
};

const patchCbtFormulation = async ({ baseUrl, token, formulationId, payload }) => {
  const response = await fetch(
    `${baseUrl}/api/cbt-formulation/${formulationId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
  );
  const result = await response.json();

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || "Failed to update CBT formulation.");
  }

  return result;
};

const buildEditableAnswers = (entry) => {
  const savedAnswers = buildAnswersFromCbtFormulationEntry(entry);

  return Object.fromEntries(
    Object.entries(savedAnswers).map(([key, value]) => [
      key,
      {
        ...value,
        completed: false,
      },
    ]),
  );
};

export default function CBTFormulation() {
  const router = useRouter();
  const { token, hasHydrated } = useStoredAuth();
  const currentNodeRef = useRef(null);
  const reactSectionRef = useRef(null);
  const consequencesRef = useRef(null);
  const superpowersRef = useRef(null);

  const [activeModal, setActiveModal] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [selectedBeliefs, setSelectedBeliefs] = useState([]);
  const [otherAnswer, setOtherAnswer] = useState("");
  const [cbtOptions, setCbtOptions] = useState({
    negativeBeliefs: [],
    emotions: [],
    consequenceOptions: [],
  });
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [currentFormulationId, setCurrentFormulationId] = useState(null);

  const baseUrl = getBaseUrl();

  const formulationNodes = buildCbtFormulationNodes(cbtOptions);

  const timelineNodes = formulationNodes.timeline;
  const reactNodes = formulationNodes.react;

  const getNodeById = (nodeId) =>
    flattenCbtFormulationNodes(formulationNodes).find(
      (node) => node.id === nodeId,
    );

  const getCurrentNodeIndex = () =>
    timelineNodes.findIndex((node) => !answers[node.id]?.completed);

  const allTimelineComplete = timelineNodes.every(
    (node) => answers[node.id]?.completed,
  );
  const allReactComplete = reactNodes.every(
    (node) => answers[node.id]?.completed,
  );
  const allCompleted = allTimelineComplete && allReactComplete;
  const currentNodeIndex = getCurrentNodeIndex();
  const showReactSection = allTimelineComplete;

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!baseUrl) {
      setOptionsError("CBT formulation service is not configured.");
      setIsLoadingOptions(false);
      return;
    }

    if (!token) {
      setOptionsError("Please sign in again to load CBT formulation options.");
      setIsLoadingOptions(false);
      return;
    }

    const loadOptions = async () => {
      try {
        setIsLoadingOptions(true);
        setOptionsError("");

        // Security Check: User must have completed Session 1 to access Session 2
        const activeJourneyId = localStorage.getItem("activeJourneyId");
        if (activeJourneyId) {
          const access = await checkSessionAccess({
            baseUrl,
            token,
            journeyId: activeJourneyId,
            requiredSession: 2,
          });

          if (!access.allowed && access.redirectTo) {
            router.replace(access.redirectTo);
            return;
          }
        }

        const nextOptions = await fetchCbtFormulationOptions({
          baseUrl,
          token,
        });

        setCbtOptions(nextOptions);
      } catch (error) {
        console.error("Error loading CBT formulation options:", error);
        setOptionsError(
          error?.message || "Unable to load CBT formulation options right now.",
        );
      } finally {
        setIsLoadingOptions(false);
      }
    };

    loadOptions();
  }, [baseUrl, hasHydrated, token]);

  useEffect(() => {
    if (!hasHydrated || !baseUrl || !token) {
      return;
    }

    const loadExistingFormulation = async () => {
      try {
        const formulations = await fetchCbtFormulations({
          baseUrl,
          token,
        });
        const latestFormulation = formulations[0];

        if (!latestFormulation) {
          setCurrentFormulationId(null);
          setAnswers({});
          return;
        }

        setCurrentFormulationId(latestFormulation._id || null);
        setAnswers(buildEditableAnswers(latestFormulation));
      } catch (error) {
        console.error("Error loading existing CBT formulation:", error);
      }
    };

    loadExistingFormulation();
  }, [baseUrl, hasHydrated, token]);

  useEffect(() => {
    if (showReactSection && reactSectionRef.current) {
      const timeoutId = window.setTimeout(() => {
        reactSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 180);

      return () => window.clearTimeout(timeoutId);
    }
  }, [showReactSection]);

  useEffect(() => {
    if (answers.behaviors?.completed && consequencesRef.current) {
      consequencesRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [answers.behaviors?.completed]);

  useEffect(() => {
    if (answers.consequences?.completed && superpowersRef.current) {
      superpowersRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [answers.consequences?.completed]);

  const handleOpenModal = (nodeId) => {
    const savedAnswer = answers[nodeId] || {};

    setActiveModal(nodeId);
    setCurrentAnswer(savedAnswer.text || "");
    setSelectedBeliefs(savedAnswer.beliefs || []);
    setOtherAnswer(savedAnswer.other || "");
    setSubmitError("");
  };

  const resetModalState = () => {
    setActiveModal(null);
    setCurrentAnswer("");
    setSelectedBeliefs([]);
    setOtherAnswer("");
  };

  const handleSave = () => {
    const savedNodeId = activeModal;
    const node = getNodeById(activeModal);

    if (!node?.modalContent) {
      resetModalState();
      return;
    }

    if (node.modalContent.type === "checkbox") {
      setAnswers((prev) => ({
        ...prev,
        [activeModal]: {
          beliefs: selectedBeliefs,
          other: node.modalContent.allowOther ? otherAnswer : "",
          completed: true,
        },
      }));
    } else {
      setAnswers((prev) => ({
        ...prev,
        [activeModal]: { text: currentAnswer, completed: true },
      }));
    }

    resetModalState();

    if (savedNodeId === "trigger") {
      return;
    }

    window.setTimeout(() => {
      if (currentNodeRef.current) {
        currentNodeRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 100);
  };

  const handleSkip = () => {
    const skippedNodeId = activeModal;

    setAnswers((prev) => ({
      ...prev,
      [skippedNodeId]: { ...prev[skippedNodeId], completed: true },
    }));

    resetModalState();

    if (skippedNodeId === "trigger") {
      return;
    }

    window.setTimeout(() => {
      if (currentNodeRef.current) {
        currentNodeRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 100);
  };

  const toggleBelief = (belief) => {
    setSelectedBeliefs((prev) =>
      prev.includes(belief)
        ? prev.filter((item) => item !== belief)
        : [...prev, belief],
    );
  };

  const handleCompleteJourney = async () => {
    if (!baseUrl) {
      setSubmitError("CBT formulation service is not configured.");
      return;
    }

    if (!token) {
      setSubmitError("Please sign in again to save your CBT formulation.");
      return;
    }

    const payload = {
      childhood: answers.beginning?.text?.trim() || "",
      deepBeliefs: answers.learned?.beliefs || [],
      rules: answers.rules?.text?.trim() || "",
      triggers: answers.trigger?.text?.trim() || "",
      recentHappening: answers.trigger?.text?.trim() || "",
      thoughts: answers.thoughts?.text?.trim() || "",
      feelings: answers.feelings?.beliefs || [],
      behaviors: answers.behaviors?.text?.trim() || "",
      consequences: answers.consequences?.beliefs || [],
      consequencesOther: answers.consequences?.other?.trim() || "",
      superpowers: answers.superpowers?.text?.trim() || "",
    };

    try {
      setIsSubmitting(true);
      setSubmitError("");

      const result = await postCbtFormulation({
        baseUrl,
        token,
        payload,
      });

      setCurrentFormulationId(result?.data?._id || currentFormulationId);

      const activeJourneyId = localStorage.getItem("activeJourneyId");
      if (activeJourneyId && token && baseUrl) {
        await updateSessionProgress({
          baseUrl,
          token,
          journeyId: activeJourneyId,
          compledSession: 2,
        });
      }

      router.push("/dashboard/EMDRCompanion/session/next/calm-space");
    } catch (error) {
      console.error("Error saving CBT formulation:", error);
      setSubmitError(
        error?.message || "Unable to save your CBT formulation right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeNode = getNodeById(activeModal);
  const activeContent = activeNode?.modalContent;
  const isSaveDisabled =
    activeContent?.type === "textarea"
      ? !currentAnswer.trim()
      : selectedBeliefs.length === 0;

  return (
    <div className="min-h-screen bg-white/40 rounded-2xl">
      <div className="relative z-10 min-h-screen overflow-y-auto rounded-2xl ">
        <div className="sticky top-0 z-20 px-8 pb-4 pt-8 backdrop-blur-sm">
          <h1 className="text-2xl font-serif text-stone-900">
            My CBT Formulation
          </h1>
        </div>

        <div className="mx-auto max-w-5xl px-8 py-16">
          <AnimatePresence>
            {currentNodeIndex === 0 && !allTimelineComplete && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50, height: 0, overflow: "hidden", marginBottom: 0 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
                className="mb-10 bg-white/70 backdrop-blur-md p-8 rounded-3xl shadow-sm border border-white/50"
              >
                <h2 className="text-2xl font-serif text-[#0F1912] mb-4">Before we begin</h2>
                <p className="text-stone-700 text-[16px] leading-relaxed mb-4">
                  Before the processing work begins, we'd like to build up a picture of you; where you've come from, how you tend to think and feel, and what life has been like up until now.
                </p>
                <p className="text-stone-700 text-[16px] leading-relaxed mb-4">
                  This is called a formulation. Think of it as a map that helps make sense of why certain experiences affect you the way they do and that this is connected to the research. You'll be asked about things like early memories, beliefs you hold about yourself, and how you tend to respond when things get difficult.
                </p>
                <p className="text-stone-700 text-[16px] leading-relaxed">
                  Take your time with it, and don't worry about getting it "right." Honest and approximate is more useful than precise and uncomfortable. The information you fill in here will be used throughout the programme to tailor the work to you. We will start with the here and now.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {optionsError ? (
            <div className="mb-8 rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-600">
              {optionsError}
            </div>
          ) : null}

          <AnimatePresence mode="wait">
            {timelineNodes.map((node, index) => {
              const isCurrent = index === currentNodeIndex;

              if (!isCurrent || allTimelineComplete) {
                return null;
              }

              return (
                <motion.div
                  key={node.id}
                  ref={isCurrent ? currentNodeRef : null}
                  initial={{ opacity: 0, y: 100 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -100 }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                  className="relative mb-6"
                >
                  <div className="mb-4 mt-6 text-center">
                    <h2 className="text-xl font-serif text-[#0F1912]">
                      {node.section}
                    </h2>
                  </div>

                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleOpenModal(node.id)}
                      className="relative transition-all duration-300 hover:scale-105"
                    >
                      <div className="rounded-3xl border-4 border-[#4A7C59] bg-white px-16 py-8 text-center text-xl text-[#0F1912] shadow-2xl transition-all duration-500 backdrop-blur-sm">
                        <h3 className="mb-2 text-3xl font-serif text-stone-900">
                          {node.title}
                        </h3>
                        <p className="text-lg italic text-stone-600">
                          {node.subtitle}
                        </p>
                      </div>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {showReactSection && (
            <motion.div
              ref={reactSectionRef}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, ease: "easeOut" }}
              className="mt-16 min-h-screen pb-16"
            >
              <div className="mb-8 flex justify-center">
                <div className="h-20 w-0.5 bg-[#4A7C59]" />
              </div>

              <div className="mb-20 text-center">
                <h2 className="text-3xl font-serif text-stone-900">
                  How I React
                </h2>
              </div>

              <div className="relative mx-auto mb-16 mt-8 min-h-[620px] w-full max-w-2xl rounded-2xl px-6 py-8 md:min-h-[700px] md:px-10 md:py-10">
                <svg
                  className="pointer-events-none absolute inset-0 z-0 h-full w-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <marker
                      id="arrowhead-responsive"
                      markerWidth="4"
                      markerHeight="2.5"
                      refX="2"
                      refY="1.25"
                      orient="auto"
                    >
                      <polygon points="0 0, 4 1.25, 0 2.5" fill="#4A7C59" />
                    </marker>
                  </defs>

                  <AnimatePresence>
                    {answers.thoughts?.completed && (
                      <motion.path
                        key="path-thoughts"
                        d="M50 20 Q42 38 24 72"
                        vectorEffect="non-scaling-stroke"
                        fill="transparent"
                        stroke="#4A7C59"
                        strokeWidth="3"
                        markerEnd="url(#arrowhead-responsive)"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 1, ease: "easeInOut" }}
                      />
                    )}

                    {answers.feelings?.completed && (
                      <motion.path
                        key="path-feelings"
                        d="M24 72 Q50 88 76 72"
                        vectorEffect="non-scaling-stroke"
                        fill="transparent"
                        stroke="#4A7C59"
                        strokeWidth="3"
                        markerEnd="url(#arrowhead-responsive)"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 1, ease: "easeInOut" }}
                      />
                    )}

                    {answers.behaviors?.completed && (
                      <motion.path
                        key="path-behaviors"
                        d="M76 72 Q58 38 50 20"
                        vectorEffect="non-scaling-stroke"
                        fill="transparent"
                        stroke="#4A7C59"
                        strokeWidth="3"
                        markerEnd="url(#arrowhead-responsive)"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{
                          duration: 1,
                          ease: "easeInOut",
                          delay: 0.5,
                        }}
                      />
                    )}
                  </AnimatePresence>
                </svg>

                <div className="absolute left-1/2 top-0 z-20 flex w-[90%] -translate-x-1/2 justify-center md:w-auto">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.75, ease: "easeOut" }}
                    className="w-full max-w-[280px]"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenModal("thoughts")}
                      className="relative z-10 w-full transition-all duration-300 hover:scale-105"
                    >
                      <motion.div
                        layout
                        className="flex aspect-[3/2] w-full flex-col items-center justify-center rounded-3xl border-4 border-[#4A7C59] bg-white p-5 text-center shadow-xl transition-all duration-500"
                      >
                        <h3 className="mb-1 text-2xl font-serif text-stone-900 md:mb-2 md:text-3xl">
                          Thoughts
                        </h3>
                        <p className="text-sm italic text-stone-600 md:text-lg">
                          In my head
                        </p>
                      </motion.div>
                    </button>
                  </motion.div>
                </div>

                <div className="absolute bottom-24 left-0 z-20 flex w-[45%] justify-start pl-2 md:pl-4">
                  <AnimatePresence>
                    {answers.thoughts?.completed && (
                      <motion.div
                        key="feelings-trigger"
                        initial={{ opacity: 0, x: -12, y: 10 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        exit={{ opacity: 0, x: -12, y: 10 }}
                        transition={{
                          duration: 0.75,
                          delay: 0.4,
                          ease: "easeOut",
                        }}
                        className="w-full max-w-[280px]"
                      >
                        <button
                          type="button"
                          onClick={() => handleOpenModal("feelings")}
                          className="relative z-10 w-full transition-all duration-300 hover:scale-105"
                        >
                          <div className="flex aspect-[3/2] w-full flex-col items-center justify-center rounded-3xl border-4 border-[#4A7C59] bg-white px-3 py-10 text-center shadow-xl transition-all duration-500">
                            <h3 className="mb-1 text-2xl font-serif text-stone-900 md:mb-2 md:text-3xl">
                              Feelings
                            </h3>
                            <p className="text-sm italic text-stone-600 md:text-lg">
                              In my body
                            </p>
                          </div>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="absolute bottom-24 right-0 z-30 flex w-[45%] justify-end pr-2 md:pr-4">
                  <AnimatePresence>
                    {answers.feelings?.completed && (
                      <motion.div
                        key="behaviors-trigger"
                        initial={{ opacity: 0, x: 12, y: 10 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        exit={{ opacity: 0, x: 12, y: 10 }}
                        transition={{
                          duration: 0.75,
                          delay: 0.4,
                          ease: "easeOut",
                        }}
                        className="w-full max-w-[280px]"
                      >
                        <button
                          type="button"
                          onClick={() => handleOpenModal("behaviors")}
                          className="relative z-10 w-full transition-all duration-300 hover:scale-105"
                        >
                          <div className="flex aspect-[3/2] w-full flex-col items-center justify-center rounded-3xl border-4 border-[#4A7C59] bg-white px-3 py-10 text-center shadow-xl transition-all duration-500">
                            <h3 className="mb-1 text-2xl font-serif text-stone-900 md:mb-2 md:text-3xl">
                              Behaviors
                            </h3>
                            <p className="text-sm italic text-stone-600 md:text-lg">
                              What I did
                            </p>
                          </div>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {answers.behaviors?.completed && (
                <div
                  ref={consequencesRef}
                  className="flex min-h-screen flex-col items-center justify-center px-8 py-20"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="w-full max-w-lg"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenModal("consequences")}
                      className="relative w-full transition-all duration-300 hover:scale-[1.05]"
                    >
                      <div
                        className={`rounded-3xl border-4 border-[#4A7C59] p-5 text-center shadow-2xl transition-all duration-500 ${answers.consequences?.completed
                          ? "bg-[#f4f4f4]"
                          : "bg-white"
                          }`}
                      >
                        <h3 className="mb-4 text-4xl font-serif text-[#0F1912]">
                          The Consequences
                        </h3>
                        <p className="text-xl italic text-stone-600">
                          Results of my actions
                        </p>
                      </div>
                    </button>
                  </motion.div>
                </div>
              )}

              {answers.consequences?.completed && (
                <div
                  ref={superpowersRef}
                  className="flex min-h-screen flex-col items-center justify-center px-8 py-20"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="w-full max-w-lg"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenModal("superpowers")}
                      className="relative w-full transition-all duration-300 hover:scale-[1.05]"
                    >
                      <div
                        className={`rounded-3xl border-4 border-[#4A7C59] p-5 text-center shadow-2xl transition-all duration-500 ${answers.superpowers?.completed
                          ? "bg-[#f5f5f2]"
                          : "bg-white/90 backdrop-blur-md"
                          }`}
                      >
                        <h3 className="mb-4 text-4xl font-serif text-[#0F1912]">
                          Your Superpowers
                        </h3>
                        <p className="text-xl italic text-stone-600">
                          Strengths & Resilience
                        </p>
                      </div>
                    </button>
                  </motion.div>

                  {submitError ? (
                    <div className="mt-8 w-full max-w-lg rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-600">
                      {submitError}
                    </div>
                  ) : null}

                  {allCompleted && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="mt-20"
                    >
                      <button
                        type="button"
                        onClick={handleCompleteJourney}
                        disabled={isSubmitting}
                        className="flex items-center gap-3 rounded-2xl bg-[#4A7C59] px-4 py-6 font-serif text-2xl text-white shadow-2xl transition-all hover:bg-[#3d6649] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSubmitting ? "Saving..." : "Complete Journey"}
                      </button>
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-stone-200 p-6">
              <h2 className="text-2xl font-serif text-stone-900">
                Your Journey Guide
              </h2>
              <button
                type="button"
                onClick={handleSkip}
                className="text-stone-400 hover:text-stone-600"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4 p-6">
              {activeContent ? (
                <>
                  <h3 className="text-xl font-semibold text-stone-900">
                    {activeContent.title}
                  </h3>
                  <p className="text-sm italic text-stone-600">
                    {activeContent.description}
                  </p>
                  <p className="text-sm text-stone-700">
                    {activeContent.question}
                  </p>

                  {activeContent.bullets && (
                    <ul className="space-y-2 text-sm text-stone-800">
                      {activeContent.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-2">
                          <span className="mt-1 text-stone-900">-</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {activeContent.example && (
                    <div className="rounded-lg bg-stone-50 p-4">
                      <p className="text-sm text-stone-700">
                        <span className="font-medium">Example:</span>{" "}
                        {activeContent.example}
                      </p>
                    </div>
                  )}

                  {activeContent.type === "textarea" ? (
                    <textarea
                      value={currentAnswer}
                      onChange={(event) => setCurrentAnswer(event.target.value)}
                      placeholder="Write your answer here..."
                      className="h-32 w-full resize-none rounded-lg border border-stone-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A7C59]"
                    />
                  ) : isLoadingOptions ? (
                    <div className="rounded-lg bg-stone-50 p-4 text-sm text-stone-600">
                      Loading options...
                    </div>
                  ) : activeContent.options?.length ? (
                    <div className="space-y-4">
                      <div className="max-h-60 space-y-2 overflow-y-auto">
                        {activeContent.options.map((option) => (
                          <label
                            key={option}
                            className="group flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-stone-50"
                          >
                            <input
                              type="checkbox"
                              checked={selectedBeliefs.includes(option)}
                              onChange={() => toggleBelief(option)}
                              className="mt-0.5 h-4 w-4 rounded border-2 border-stone-300 text-[#4A7C59] focus:ring-2 focus:ring-[#4A7C59]"
                            />
                            <span className="text-sm text-stone-700">
                              {option}
                            </span>
                          </label>
                        ))}
                      </div>

                      {activeContent.allowOther && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-stone-700">
                            {activeContent.otherLabel}
                          </label>
                          <textarea
                            value={otherAnswer}
                            onChange={(event) =>
                              setOtherAnswer(event.target.value)
                            }
                            placeholder={activeContent.otherPlaceholder}
                            className="h-24 w-full resize-none rounded-lg border border-stone-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A7C59]"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
                      No options are available right now. Please try again in a
                      moment.
                    </div>
                  )}
                </>
              ) : null}
            </div>

            <div className="flex gap-3 border-t border-stone-200 p-6">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaveDisabled || isLoadingOptions}
                className="flex-1 rounded-lg bg-[#4A7C59] px-6 py-3 font-medium text-white transition-colors hover:bg-[#3d6649] disabled:cursor-not-allowed disabled:bg-stone-300"
              >
                Save & Continue
              </button>
              <button
                type="button"
                onClick={handleSkip}
                className="rounded-lg bg-stone-200 px-6 py-3 font-medium text-stone-700 hover:bg-stone-300"
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
