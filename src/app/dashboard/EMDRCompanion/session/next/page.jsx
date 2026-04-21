"use client";
import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function CBTFormulation() {
  const router = useRouter();
  const [activeModal, setActiveModal] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [selectedBeliefs, setSelectedBeliefs] = useState([]);
  const currentNodeRef = useRef(null);
  const reactSectionRef = useRef(null);
  const consequencesRef = useRef(null);
  const superpowersRef = useRef(null);

  const timelineNodes = [
    {
      id: "beginning",
      section: "The Beginning",
      title: "When I Was Little",
      subtitle: "Early memories & experiences",
      modalContent: {
        title: "When I was little (Childhood)",
        description:
          "This may or may not be relevant to what you would like to work on so skip it if not.",
        question:
          "Float back in time and see if you remember feeling this way (from your situation) as a child or any other time?",
        bullets: [
          "Were there specific events or patterns in your family?",
          "What messages did you receive about yourself growing up?",
        ],
        example:
          '"My parents were very critical" or "I had to be perfect to get attention" or "I learned to stay quiet to avoid conflict"',
        type: "textarea",
      },
    },
    {
      id: "learned",
      section: "What I Learned",
      title: "Deep-Down Beliefs",
      subtitle: "What I believe about myself",
      modalContent: {
        title: "Deep-Down Beliefs",
        description:
          "These are deep beliefs about yourself that might have been activated or try to think carefully about these and see if they match the current situation you chose.",
        question:
          "Here is a generic list to choose from - you can choose more than one:",
        type: "checkbox",
        options: [
          "I don't deserve love",
          "I am a bad person",
          "I am terrible",
          "I am worthless/inadequate",
          "I am shameful",
          "I am not lovable",
          "I am not good enough",
          "I deserve only bad things",
        ],
      },
    },
    {
      id: "rules",
      section: "My Survival Guide",
      title: "The Rules",
      subtitle: "How I must be to feel safe",
      modalContent: {
        title: "The Rules",
        description:
          "These are the rules or assumptions you live by to try and keep yourself safe.",
        question: "What rules do you follow to protect yourself?",
        bullets: [
          "If I... then I'll be safe/loved/accepted",
          "I must always...",
          "I should never...",
        ],
        example: '"I must be perfect" or "I should never show weakness"',
        type: "textarea",
      },
    },
    {
      id: "trigger",
      section: "Life Happens",
      title: "The Trigger",
      subtitle: "What happened recently",
      modalContent: {
        title: "Life Happens (The Trigger)",
        description:
          "This is the recent situation or event that activated your beliefs and rules.",
        question: "What happened that brought up these feelings?",
        bullets: ["Describe the situation", "When did it happen?"],
        example: '"My boss criticized my work" or "My friend didn\'t respond"',
        type: "textarea",
      },
    },
  ];

  const reactNodes = [
    {
      id: "thoughts",
      title: "Thoughts",
      subtitle: "In my head",
      modalContent: {
        title: "Thoughts (In my head)",
        description: "What thoughts go through your mind?",
        question: "What do you think when this happens?",
        example: '"I\'m going to fail" or "Nobody likes me"',
        type: "textarea",
      },
    },
    {
      id: "feelings",
      title: "Feelings",
      subtitle: "In my body",
      modalContent: {
        title: "Feelings (In my body)",
        description: "What emotions and physical sensations do you experience?",
        question: "How do you feel?",
        example: '"Anxious, heart racing" or "Sad, heavy chest"',
        type: "textarea",
      },
    },
    {
      id: "behaviors",
      title: "Behaviors",
      subtitle: "What I did",
      modalContent: {
        title: "Behaviors (What I did)",
        description: "What actions did you take?",
        question: "What did you do in response?",
        example: '"Avoided the situation" or "Lashed out at someone"',
        type: "textarea",
      },
    },
    {
      id: "consequences",
      title: "The Consequences",
      subtitle: "Results of my actions",
      modalContent: {
        title: "Deep-Down Beliefs",
        description:
          "These are deep beliefs about yourself that might have been activated or try to think carefully about these and see if they match the current situation you chose.",
        question:
          "Here is a generic list to choose from - you can choose more than one:",
        type: "checkbox",
        options: [
          "I don't deserve love",
          "I am a bad person",
          "I am terrible",
          "I am worthless/inadequate",
          "I am shameful",
          "I am not lovable",
          "I am not good enough",
          "I deserve only bad things",
        ],
      },
    },
    {
      id: "superpowers",
      title: "Your Superpowers",
      subtitle: "Strengths & Resilience",
      modalContent: {
        title: "Your Superpowers",
        description:
          "What strengths did you use or can you use in this situation?",
        question: "What makes you resilient?",
        example: '"I am self-aware" or "I am brave enough to seek help"',
        type: "textarea",
      },
    },
  ];

  const getCurrentNodeIndex = () => {
    return timelineNodes.findIndex((node) => !answers[node.id]?.completed);
  };

  const getCurrentReactNodeIndex = () => {
    return reactNodes.findIndex((node) => !answers[node.id]?.completed);
  };

  const allTimelineComplete = timelineNodes.every(
    (node) => answers[node.id]?.completed
  );
  const allReactComplete = reactNodes.every(
    (node) => answers[node.id]?.completed
  );
  const allCompleted = allTimelineComplete && allReactComplete;

  const handleOpenModal = (nodeId) => {
    setActiveModal(nodeId);
    setCurrentAnswer(answers[nodeId]?.text || "");
    setSelectedBeliefs(answers[nodeId]?.beliefs || []);
  };

  const handleSave = () => {
    const allNodes = [...timelineNodes, ...reactNodes];
    const node = allNodes.find((n) => n.id === activeModal);

    if (node && node.modalContent) {
      if (node.modalContent.type === "checkbox") {
        setAnswers({
          ...answers,
          [activeModal]: { beliefs: selectedBeliefs, completed: true },
        });
      } else {
        setAnswers({
          ...answers,
          [activeModal]: { text: currentAnswer, completed: true },
        });
      }
    }
    setActiveModal(null);
    setCurrentAnswer("");
    setSelectedBeliefs([]);

    // Scroll to current node after save
    setTimeout(() => {
      if (currentNodeRef.current) {
        currentNodeRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 100);
  };

  const handleSkip = () => {
    setActiveModal(null);
    setCurrentAnswer("");
    setSelectedBeliefs([]);
  };

  const toggleBelief = (belief) => {
    setSelectedBeliefs((prev) =>
      prev.includes(belief)
        ? prev.filter((b) => b !== belief)
        : [...prev, belief]
    );
  };

  const currentNodeIndex = getCurrentNodeIndex();
  const currentReactNodeIndex = getCurrentReactNodeIndex();
  const showReactSection = allTimelineComplete;

  useEffect(() => {
    if (showReactSection && reactSectionRef.current) {
      reactSectionRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
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

  return (
    <div className="min-h-screen relativebg-white/40 ">

      <div className="relative z-10 min-h-screen overflow-y-auto bg-white/40 rounded-2xl">

        <div className="sticky top-0  backdrop-blur-sm pt-8 pb-4 px-8 z-20">
          <h1 className="text-2xl font-serif text-stone-900">
            My CBT Formulation
          </h1>
        </div>
        <div className="px-8 py-16 max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            {timelineNodes.map((node, index) => {
              const isCurrent = index === currentNodeIndex;

              if (!isCurrent || allTimelineComplete) return null;

              return (
                <motion.div
                  key={node.id}
                  initial={{ opacity: 0, y: 100 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -100 }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                  className="relative mb-6"
                >
                  <div className="text-center mb-4 mt-6">
                    <h2 className="font-serif text-[#0F1912] text-xl">
                      {node.section}
                    </h2>
                  </div>
                  <div className="flex justify-center">
                    <button
                      onClick={() => handleOpenModal(node.id)}
                      className="relative hover:scale-105 transition-all duration-300"
                    >
                      <div className="rounded-3xl border-4 py-1 px-10 border-[#4A7C59] text-center shadow-2xl transition-all duration-500 bg-white backdrop-blur-sm px-16 py-8 text-[#0F1912] text-xl">
                        <h3 className="font-serif text-stone-900 text-3xl mb-2">
                          {node.title}
                        </h3>
                        <p className="text-stone-600 italic text-lg">
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
            <div ref={reactSectionRef} className="mt-16 pb-16 min-h-screen">
              <div className="flex justify-center mb-8">
                <div className="w-0.5 h-20 bg-[#4A7C59]"></div>
              </div>
              <div className="text-center mt-50 mb-22">
                <h2 className="text-3xl font-serif text-stone-900">
                  How I React
                </h2>
              </div>
              <div className="relative w-full max-w-2xl mx-auto  min-h-screen rounded-2xl px-10 py-10 mt-10 mb-20">
                <svg
                  className="absolute inset-0  w-full h-full pointer-events-none z-0"
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
                    {/* Path 1: Thoughts (Top Center) -> Feelings (Bottom Left) */}
                    {/* Approx Coords: T(50, 20) -> F(20, 80) */}
                    {answers.thoughts?.completed && (
                      <motion.path
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

                    {/* Path 2: Feelings (Bottom Left) -> Behaviors (Bottom Right) */}
                    {/* Approx Coords: F(20, 80) -> B(80, 80) */}
                    {answers.feelings?.completed && (
                      <motion.path
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

                    {/* Path 3: Behaviors (Bottom Right) -> Thoughts (Top Center) */}
                    {/* Approx Coords: B(80, 80) -> T(50, 20) */}
                    {answers.feelings?.completed && (
                      <motion.path
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

                {/* Nodes Container */}

                {/* Thoughts: Top Center */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[90%] md:w-auto flex justify-center z-20 ">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-[280px]"
                  >
                    <button
                      onClick={() => handleOpenModal("thoughts")}
                      className="hover:scale-105 transition-all duration-300 relative z-10 w-full"
                    >
                      <motion.div
                        layout
                        className={`rounded-3xl p-5 border-4 border-[#4A7C59] flex flex-col items-center justify-center text-center shadow-xl transition-all duration-500 aspect-[3/2] w-full ${answers.thoughts?.completed ? "bg-white" : "bg-white"
                          }`}
                      >
                        <h3 className="font-serif text-stone-900 text-2xl md:text-3xl mb-1 md:mb-2">
                          Thoughts
                        </h3>
                        <p className="text-stone-600 italic text-sm md:text-lg">
                          In my head
                        </p>
                      </motion.div>
                    </button>
                  </motion.div>
                </div>

                {/* Feelings: Bottom Left */}
                <div className="absolute bottom-2left-0 w-[45%] flex justify-start pl-4 z-20 px-30 py-20">
                  <AnimatePresence>
                    {answers.thoughts?.completed && (
                      <motion.div
                        initial={{ opacity: 0, x: -20, y: 20 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        exit={{ opacity: 0, x: -20, y: 20 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                        className="w-full max-w-[280px]"
                      >
                        <button
                          onClick={() => handleOpenModal("feelings")}
                          className="hover:scale-105 transition-all duration-300 relative z-10 w-full"
                        >
                          <div
                            className={`rounded-3xl py-10 px-3 border-4 border-[#4A7C59] flex flex-col items-center justify-center text-center shadow-xl transition-all duration-500 aspect-[3/2] w-full ${answers.feelings?.completed
                              ? "bg-white"
                              : "bg-white"
                              }`}
                          >
                            <h3 className="font-serif text-stone-900 text-2xl md:text-3xl mb-1 md:mb-2">
                              Feelings
                            </h3>
                            <p className="text-stone-600 italic text-sm md:text-lg">
                              In my body
                            </p>
                          </div>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Behaviors: Bottom Right */}
                <div className="absolute left-[45%] justify-end pr-10 z-30 px-40 py-20">
                  <AnimatePresence>
                    {answers.feelings?.completed && (
                      <motion.div
                        initial={{ opacity: 0, x: 20, y: 20 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        exit={{ opacity: 0, x: 20, y: 20 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                        className="w-full max-w-[280px]"
                      >
                        <button
                          onClick={() => handleOpenModal("behaviors")}
                          className="hover:scale-105 transition-all duration-300 relative z-10 w-full"
                        >
                          <div
                            className={`rounded-3xl py-10 px-3 border-4 border-[#4A7C59]
              flex flex-col items-center justify-center text-center
              shadow-xl transition-all duration-500
              aspect-[3/2] w-full
              ${answers.behaviors?.completed ? "bg-white" : "bg-white"}
            `}
                          >
                            <h3 className="font-serif text-stone-900 text-2xl md:text-3xl mb-1 md:mb-2">
                              Behaviors
                            </h3>
                            <p className="text-stone-600 italic text-sm md:text-lg">
                              What I did
                            </p>
                          </div>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Final Sections: Consequences & Superpowers */}
              {answers.behaviors?.completed && (
                <div
                  ref={consequencesRef}
                  className="min-h-screen py-20 px-8 flex flex-col items-center justify-center"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="w-full max-w-lg"
                  >
                    <button
                      onClick={() => handleOpenModal("consequences")}
                      className="w-full relative hover:scale-[1.05] transition-all duration-300"
                    >
                      <div
                        className={`rounded-3xl border-4  border-[#4A7C59] p-5 text-center shadow-2xl transition-all duration-500 ${answers.consequences?.completed
                          ? "bg-[#f4f4f4]"
                          : "bg-white"
                          }`}
                      >
                        <h3 className="font-serif text-4xl text-[#0F1912] mb-4">
                          The Consequences
                        </h3>
                        <p className="text-stone-600 italic text-xl">
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
                  className="min-h-screen py-20 px-8 flex flex-col items-center justify-center"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="w-full max-w-lg"
                  >
                    <button
                      onClick={() => handleOpenModal("superpowers")}
                      className="w-full relative hover:scale-[1.05] transition-all duration-300"
                    >
                      <div
                        className={`rounded-3xl border-4 border-[#4A7C59] p-5 text-center shadow-2xl transition-all duration-500 ${answers.superpowers?.completed
                          ? "bg-[#f5f5f2]"
                          : "bg-white/90 backdrop-blur-md"
                          }`}
                      >
                        <h3 className="font-serif text-4xl text-[#0F1912] mb-4">
                          Your Superpowers
                        </h3>
                        <p className="text-stone-600 italic text-xl">
                          Strengths & Resilience
                        </p>
                      </div>
                    </button>
                  </motion.div>

                  {allCompleted && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="mt-20"
                    >
                      <button
                        onClick={() =>
                          router.push(
                            "/dashboard/EMDRCompanion/session/next/calm-space"
                          )
                        }
                        className="bg-[#4A7C59] hover:bg-[#3d6649] text-white px-4 py-6 rounded-2xl font-serif text-2xl transition-all shadow-2xl active:scale-95 flex items-center gap-3"
                      >
                        Complete Journey
                      </button>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between p-6 border-b border-stone-200">
              <h2 className="text-2xl font-serif text-stone-900">
                Your Journey Guide
              </h2>
              <button
                onClick={handleSkip}
                className="text-stone-400 hover:text-stone-600"
              >
                <svg
                  className="w-6 h-6"
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

            <div className="p-6 space-y-4">
              {(() => {
                const allNodes = [...timelineNodes, ...reactNodes];
                const node = allNodes.find((n) => n.id === activeModal);
                const content = node?.modalContent;

                if (!content) return null;

                return (
                  <>
                    <h3 className="text-xl font-semibold text-stone-900">
                      {content.title}
                    </h3>
                    <p className="text-sm text-stone-600 italic">
                      {content.description}
                    </p>
                    <p className="text-sm text-stone-700">{content.question}</p>

                    {content.bullets && (
                      <ul className="space-y-2 text-sm text-stone-800">
                        {content.bullets.map((bullet, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-stone-900 mt-1">•</span>
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {content.example && (
                      <div className="bg-stone-50 rounded-lg p-4">
                        <p className="text-sm text-stone-700">
                          <span className="font-medium">Example:</span>{" "}
                          {content.example}
                        </p>
                      </div>
                    )}

                    {content.type === "textarea" ? (
                      <textarea
                        value={currentAnswer}
                        onChange={(e) => setCurrentAnswer(e.target.value)}
                        placeholder="Write your answer here..."
                        className="w-full h-32 px-4 py-3 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7C59] resize-none text-sm"
                      />
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {content.options.map((option, idx) => (
                          <label
                            key={idx}
                            className="flex items-start gap-3 cursor-pointer group p-2 hover:bg-stone-50 rounded-lg"
                          >
                            <input
                              type="checkbox"
                              checked={selectedBeliefs.includes(option)}
                              onChange={() => toggleBelief(option)}
                              className="mt-0.5 w-4 h-4 rounded border-2 border-stone-300 text-[#4A7C59] focus:ring-2 focus:ring-[#4A7C59]"
                            />
                            <span className="text-sm text-stone-700">
                              {option}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="flex gap-3 p-6 border-t border-stone-200">
              <button
                onClick={handleSave}
                disabled={(() => {
                  const allNodes = [...timelineNodes, ...reactNodes];
                  const node = allNodes.find((n) => n.id === activeModal);
                  return node?.modalContent?.type === "textarea"
                    ? !currentAnswer.trim()
                    : selectedBeliefs.length === 0;
                })()}
                className="flex-1 bg-[#4A7C59] hover:bg-[#3d6649] text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:bg-stone-300 disabled:cursor-not-allowed"
              >
                Save & Continue
              </button>
              <button
                onClick={handleSkip}
                className="px-6 py-3 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg font-medium"
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
