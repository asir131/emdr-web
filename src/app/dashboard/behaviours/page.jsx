"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

const INITIAL_HIERARCHY = [
  {
    step: "Say hello to a cashier at the shop",
    originalSuds: 3,
    currentSuds: null,
    status: "not-started",
    attempts: 0,
    mastered: false,
    plannedDay: "", 
  },
  {
    step: "Make small talk with a colleague at the coffee machine",
    originalSuds: 5,
    currentSuds: null,
    status: "not-started",
    attempts: 0,
    mastered: false,
    plannedDay: "",
  },
  {
    step: "Attend a small team meeting and contribute one comment",
    originalSuds: 7,
    currentSuds: null,
    status: "not-started",
    attempts: 0,
    mastered: false,
    plannedDay: "",
  },
  {
    step: "Join a social lunch with colleagues",
    originalSuds: 8,
    currentSuds: null,
    status: "not-started",
    attempts: 0,
    mastered: false,
    plannedDay: "",
  },
  {
    step: "Attend a networking event for 30 minutes",
    originalSuds: 10,
    currentSuds: null,
    status: "not-started",
    attempts: 0,
    mastered: false,
    plannedDay: "",
  },
];

const STATUS_LABELS = {
  completed: "completed",
  "in-progress": "in progress",
  "not-started": "not started",
};

const INITIAL_RESPONSE_OPTIONS = [
  { id: "good", label: "I've made some progress" },
  { id: "challenging", label: "It's been challenging" },
  { id: "mixed", label: "Mixed - some good, some difficult" },
  { id: "unable", label: "I wasn't able to practice" },
];

const STEP_STATUS_OPTIONS = [
  { id: "completed", label: "Yes, I practiced it" },
  { id: "in-progress", label: "I tried but couldn't complete it" },
  { id: "not-started", label: "I haven't tried this yet" },
];

const DAY_OPTIONS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Weekend",
  "Multiple",
];

const PROBLEM_OPTIONS = [
  { id: "anticipation", label: "The anticipation beforehand" },
  { id: "during", label: "The moment during the exposure" },
  { id: "physical", label: "Physical anxiety symptoms" },
  { id: "thoughts", label: "Negative thoughts/predictions" },
  { id: "other", label: "Something else" },
];

const schedulingChoices = [
  { id: "detailed", label: "Yes, help me create a detailed schedule" },
  { id: "general", label: "Just give me general guidance" },
  { id: "skip", label: "I'll manage it myself" },
];

const buildMessage = (sender, type, payload = {}) => ({
  id: `${Date.now()}-${Math.random()}`,
  sender,
  type,
  ...payload,
});

const getResponseText = (choice) => {
  switch (choice) {
    case "good":
      return "That's wonderful to hear. Every step forward, no matter how small, is meaningful progress. Let's look at what you've accomplished.";
    case "challenging":
      return "Thank you for your honesty. Exposure work can be difficult, and acknowledging the challenge is important. Let's explore what's been happening.";
    case "mixed":
      return "That's very normal and expected. Exposure therapy often has ups and downs. Let's review both the successes and the challenges.";
    default:
      return "That's completely okay. Sometimes life gets in the way, or we're not ready yet. There's no judgment here. Let's talk about what happened and how we can adjust.";
  }
};

const getProblemStrategy = (problemType) => {
  switch (problemType) {
    case "anticipation":
      return {
        title: "Strategies for anticipation anxiety",
        items: [
          "Schedule exposure for morning, so there is less time to worry.",
          "Use the 5-minute rule and commit only to starting.",
          "Practice quickly after deciding instead of waiting.",
          "Remind yourself that anticipation is often worse than reality.",
        ],
      };
    case "during":
      return {
        title: "Strategies for the moment of exposure",
        items: [
          "Start with an even shorter version of the exposure.",
          "Use slow breathing while you stay in the situation.",
          "Rate your SUDS every 30 seconds and notice changes.",
          "Focus on staying present instead of escaping mentally.",
        ],
      };
    case "physical":
      return {
        title: "Strategies for physical anxiety symptoms",
        items: [
          "Practice box breathing before and during exposure.",
          "Normalize symptoms by reminding yourself this is adrenaline.",
          "Try gentle movement before the exposure.",
          "Use muscle relaxation afterwards to reset.",
        ],
      };
    case "thoughts":
      return {
        title: "Strategies for negative predictions",
        items: [
          "Write down what you fear will happen.",
          "Compare feared outcomes with what actually happened.",
          "Use coping statements like 'I can handle this.'",
          "Focus on facts, not feelings alone.",
        ],
      };
    default:
      return {
        title: "General strategies",
        items: [
          "Make the step slightly easier for the next attempt.",
          "Practice at the time of day you feel strongest.",
          "Reward yourself after each attempt.",
          "Aim for consistency rather than perfection.",
        ],
      };
  }
};

const calculateAverageImprovement = (hierarchy) => {
  const improvements = hierarchy
    .filter((item) => item.currentSuds !== null)
    .map((item) => item.originalSuds - item.currentSuds);

  if (improvements.length === 0) {
    return "N/A";
  }

  const average =
    improvements.reduce((total, value) => total + value, 0) / improvements.length;

  return average > 0 ? `-${average.toFixed(1)}` : average.toFixed(1);
};

const getEncouragement = (completed, attempted) => {
  if (completed >= 3) {
    return "Outstanding work this week. You've shown remarkable courage in facing multiple exposure challenges.";
  }

  if (completed >= 1) {
    return "Well done on completing exposure steps this week. Each success builds your confidence.";
  }

  if (attempted >= 1) {
    return "You've shown courage by attempting exposure work. Even attempts that feel incomplete are valuable learning experiences.";
  }

  return "Starting exposure work can feel daunting. Your presence here shows commitment to change, which is the first step.";
};

const getDetailedSchedule = (hierarchy) => {
  const needsMoreWork = hierarchy.find(
    (item) => item.currentSuds !== null && item.currentSuds > 2
  );

  const focusStep = needsMoreWork || hierarchy[0];

  return [
    {
      title: "Monday & Thursday - Foundation Days",
      description: `Repeat "${focusStep.step}" and focus on staying in the situation long enough for anxiety to settle.`,
    },
    {
      title: "Tuesday & Friday - Repetition Days",
      description: `Practice the same step again. Repetition, not progression, is the key goal this week.`,
    },
    {
      title: "Wednesday - Mid-Week Check",
      description:
        "Rate your SUDS before and after practice. Only move forward when your current step drops to 0-2.",
    },
    {
      title: "Weekend - Intensive Practice",
      description:
        "If possible, repeat your current step two or three times across the weekend to strengthen habituation.",
    },
  ];
};

const getRecommendations = (hierarchy) => {
  const unmastered = hierarchy.find(
    (item) =>
      item.status !== "not-started" &&
      item.currentSuds !== null &&
      item.currentSuds > 2
  );
  const nextStep = hierarchy.find((item) => item.status === "not-started");
  const masteredCount = hierarchy.filter(
    (item) => item.mastered || (item.currentSuds !== null && item.currentSuds <= 2)
  ).length;

  const items = [];

  if (unmastered) {
    items.push(
      `Priority focus: Continue practicing "${unmastered.step}" until SUDS reaches 0-2.`
    );
    items.push(
      `Current SUDS is ${unmastered.currentSuds}/10, so repetition should stay your main goal this week.`
    );
    items.push("Do not move to harder steps until this one feels meaningfully easier.");
  } else if (nextStep) {
    items.push(`You are ready to begin planning for "${nextStep.step}".`);
    items.push("Start with a brief version of the exposure and build confidence gradually.");
  }

  if (masteredCount > 0) {
    items.push("Keep practicing mastered steps occasionally so the confidence stays strong.");
  }

  items.push("Practice at roughly the same time each day to make it easier to follow through.");
  items.push("Keep a simple log of the step, date, SUDS before, and SUDS after.");

  return items;
};

function MessageCard({ message, hierarchy, week, onReviewStep }) {
  if (message.type === "hierarchy") {
    return (
      <div className="progress-card">
        <div className="progress-card-header">Your Exposure Hierarchy - Week {week}</div>
        {hierarchy.map((item, index) => (
          <div
            key={`${item.step}-${index}`}
            className={`step-review ${item.status}`}
            onClick={() => onReviewStep(index)}
          >
            <div className="step-header">
              <span className="step-title">Step {index + 1}</span>
              <span className={`step-status ${item.status}`}>
                {STATUS_LABELS[item.status]}
              </span>
            </div>
            <div className="step-description">{item.step}</div>
            <div className="suds-tracker">
              <span className="suds-label">Original SUDS</span>
              <span className="suds-value">{item.originalSuds}/10</span>
              {item.currentSuds !== null ? (
                <>
                  <span className="suds-arrow">-&gt;</span>
                  <span className="suds-label">Current</span>
                  <span className="suds-value">{item.currentSuds}/10</span>
                </>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (message.type === "strategy") {
    return (
      <div className="recommendations-box">
        <div className="summary-header">{message.title}</div>
        {message.items.map((item) => (
          <div key={item} className="recommendation-item">
            {item}
          </div>
        ))}
      </div>
    );
  }

  if (message.type === "summary") {
    const completed = hierarchy.filter((item) => item.status === "completed").length;
    const attempted = hierarchy.filter((item) => item.status !== "not-started").length;
    const avgImprovement = calculateAverageImprovement(hierarchy);

    return (
      <div className="weekly-summary">
        <div className="summary-header">Week {week} Summary</div>
        <div className="summary-stats">
          <div className="stat-box">
            <div className="stat-value">{completed}</div>
            <div className="stat-label">Steps Completed</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{attempted}</div>
            <div className="stat-label">Steps Attempted</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{avgImprovement}</div>
            <div className="stat-label">Avg SUDS Reduction</div>
          </div>
        </div>
        <div className="encouragement-box">
          {getEncouragement(completed, attempted)}
        </div>
      </div>
    );
  }

  if (message.type === "schedule") {
    const schedule = getDetailedSchedule(hierarchy);

    return (
      <div className="recommendations-box">
        <div className="summary-header">Your Personalised Week {week + 1} Schedule</div>
        {schedule.map((item, index) => (
          <div key={item.title} className="recommendation-item">
            <span className="recommendation-number">{index + 1}</span>
            <strong>{item.title}</strong>
            <div className="mt-2">{item.description}</div>
          </div>
        ))}
      </div>
    );
  }

  if (message.type === "recommendations") {
    const items = getRecommendations(hierarchy);

    return (
      <div className="recommendations-box">
        <div className="summary-header">Your Homework Plan For Week {week + 1}</div>
        {items.map((item, index) => (
          <div key={item} className="recommendation-item">
            <span className="recommendation-number">{index + 1}</span>
            {item}
          </div>
        ))}
      </div>
    );
  }

  if (message.type === "reflection") {
    return <div className="reflection-prompt">{message.content}</div>;
  }

  return <div>{message.content}</div>;
}

export default function BehavioursPage() {
  const searchParams = useSearchParams();
  const chatContainerRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [currentStage, setCurrentStage] = useState("loading");
  const [hierarchy, setHierarchy] = useState(INITIAL_HIERARCHY);
  const [reviewingStep, setReviewingStep] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const currentWeek = useMemo(() => {
    const weekFromQuery = Number.parseInt(searchParams.get("week") || "1", 10);
    return Number.isNaN(weekFromQuery) ? 1 : Math.max(weekFromQuery, 1);
  }, [searchParams]);

  const inputEnabled = useMemo(
    () => currentStage === "reflection-support" || currentStage === "reflection-general",
    [currentStage]
  );

  const addBotMessage = (type, payload = {}, delay = 500) =>
    new Promise((resolve) => {
      setIsTyping(true);
      window.setTimeout(() => {
        setMessages((currentMessages) => [
          ...currentMessages,
          buildMessage("bot", type, payload),
        ]);
        setIsTyping(false);
        resolve();
      }, delay);
    });

  const addUserMessage = (content) => {
    setMessages((currentMessages) => [
      ...currentMessages,
      buildMessage("user", "text", { content }),
    ]);
  };

  useEffect(() => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [isTyping, messages]);

  useEffect(() => {
    let cancelled = false;

    const startConversation = async () => {
      setMessages([]);
      setHierarchy(INITIAL_HIERARCHY);
      setReviewingStep(null);
      setCurrentStage("loading");

      await addBotMessage("text", {
        content:
          currentWeek === 1
            ? "Welcome back. I hope you've had a chance to begin working with your exposure hierarchy for 'Avoiding social situations'."
            : `Welcome to week ${currentWeek} of your exposure therapy journey. Let's continue working on 'Avoiding social situations'.`,
      });

      if (cancelled) {
        return;
      }

      await addBotMessage(
        "text",
        {
          content:
            "Remember: successful exposure therapy isn't about rushing through steps. It's about repeating each step until your anxiety naturally decreases. Most people need 5-10 repetitions of the same exposure before their SUDS drops significantly.",
        },
        1100
      );

      if (cancelled) {
        return;
      }

      await addBotMessage(
        "text",
        { content: "How have you been finding the homework this week?" },
        1000
      );

      if (!cancelled) {
        setCurrentStage("initial-choice");
      }
    };

    startConversation();

    return () => {
      cancelled = true;
    };
  }, [currentWeek]);

  const showHierarchyReview = async () => {
    await addBotMessage("text", {
      content:
        "Let's review each step from your hierarchy. We'll go through them one by one, and you can tell me about your experience with each.",
    });
    await addBotMessage("hierarchy", {}, 400);
    setCurrentStage("hierarchy");
  };

  const handleInitialResponse = async (choice) => {
    const selectedOption = INITIAL_RESPONSE_OPTIONS.find((item) => item.id === choice);

    if (!selectedOption) {
      return;
    }

    addUserMessage(selectedOption.label);
    setCurrentStage("loading");

    await addBotMessage("text", { content: getResponseText(choice) }, 500);
    await showHierarchyReview();
  };

  const handleReviewStep = async (index) => {
    const step = hierarchy[index];

    if (!step) {
      return;
    }

    setReviewingStep(index);
    setCurrentStage("loading");
    await addBotMessage("text", {
      content: `Let's talk about Step ${index + 1}: "${step.step}". Did you have a chance to practice this step this week?`,
    });
    setCurrentStage("step-status");
  };

  const handleStatusSelection = async (status) => {
    const option = STEP_STATUS_OPTIONS.find((item) => item.id === status);

    if (!option || reviewingStep === null) {
      return;
    }

    addUserMessage(option.label);
    setHierarchy((currentHierarchy) =>
      currentHierarchy.map((item, index) =>
        index === reviewingStep ? { ...item, status } : item
      )
    );
    setCurrentStage("loading");

    if (status === "not-started") {
      await addBotMessage("text", {
        content:
          "That's perfectly fine. Let's make a plan for you to try this step in the coming week.",
      });
      await addBotMessage(
        "text",
        { content: "What day next week would work best for you to attempt this step?" },
        800
      );
      setCurrentStage("step-day");
      return;
    }

    await addBotMessage("text", {
      content:
        "How would you rate your distress level when you attempted this step? (0 = no distress, 10 = maximum distress)",
    });
    setCurrentStage("step-suds");
  };

  const handleSudsSelection = async (rating) => {
    if (reviewingStep === null) {
      return;
    }

    addUserMessage(`${rating}/10`);

    const currentItem = hierarchy[reviewingStep];
    const updatedItem = {
      ...currentItem,
      currentSuds: rating,
      attempts: currentItem.attempts + 1,
      mastered: rating <= 2,
    };

    const updatedHierarchy = hierarchy.map((item, index) =>
      index === reviewingStep ? updatedItem : item
    );

    setHierarchy(updatedHierarchy);
    setCurrentStage("loading");

    const improvement = updatedItem.originalSuds - rating;

    if (improvement > 0) {
      await addBotMessage("text", {
        content: `Good work. Your distress has decreased from ${updatedItem.originalSuds}/10 to ${rating}/10. This shows the exposure is starting to work.`,
      });
    } else if (improvement === 0) {
      await addBotMessage("text", {
        content:
          "Your distress level stayed the same, which is still completely normal. Repetition often matters more than speed.",
      });
    } else {
      await addBotMessage("text", {
        content:
          "I notice this felt harder than expected today. That can happen, especially on difficult weeks.",
      });
    }

    if (rating <= 2) {
      await addBotMessage("text", {
        content: `Excellent. With your SUDS at ${rating}/10, you've mastered this step.`,
      });
      await addBotMessage(
        "text",
        {
          content:
            "Would you like to review another step from your hierarchy, or finish with your weekly summary?",
        },
        900
      );
      setCurrentStage("next-action");
      return;
    }

    await addBotMessage("text", {
      content: `This step still causes significant distress (${rating}/10), which is perfectly normal. Let's problem-solve together.`,
    });
    await addBotMessage(
      "text",
      {
        content: `To help reduce your SUDS for "${updatedItem.step}", what was the hardest part about it?`,
      },
      900
    );
    setCurrentStage("step-problem");
  };

  const handleDaySelection = async (day) => {
    if (reviewingStep === null) {
      return;
    }

    addUserMessage(day);
    setHierarchy((currentHierarchy) =>
      currentHierarchy.map((item, index) =>
        index === reviewingStep ? { ...item, plannedDay: day } : item
      )
    );
    setCurrentStage("loading");

    await addBotMessage("text", {
      content: `Perfect. I've scheduled "${hierarchy[reviewingStep].step}" for ${day} next week.`,
    });
    await addBotMessage(
      "text",
      { content: "Would you like any tips for making this step easier when you attempt it?" },
      900
    );
    setCurrentStage("tips-choice");
  };

  const handleTipsChoice = async (wantsTips) => {
    addUserMessage(
      wantsTips ? "Yes, please give me tips" : "No, I'm ready to move on"
    );
    setCurrentStage("loading");

    if (wantsTips && reviewingStep !== null) {
      const currentStep = hierarchy[reviewingStep];
      await addBotMessage("strategy", {
        title: "Preparation tips for this step",
        items: [
          `Choose a specific moment to practise "${currentStep.step}".`,
          "Keep the first attempt brief so it feels manageable.",
          "Use calm breathing before you begin.",
          "Count success as attempting the exposure, not doing it perfectly.",
        ],
      });
    }

    await addBotMessage(
      "text",
      {
        content:
          "Would you like to review another step from your hierarchy, or finish with your weekly summary?",
      },
      900
    );
    setCurrentStage("next-action");
  };

  const handleProblemSelection = async (problemType) => {
    const option = PROBLEM_OPTIONS.find((item) => item.id === problemType);

    if (!option) {
      return;
    }

    addUserMessage(option.label);
    setCurrentStage("loading");

    const strategy = getProblemStrategy(problemType);
    await addBotMessage("strategy", strategy);
    await addBotMessage(
      "text",
      {
        content:
          "Your homework for next week is to repeat this same step several times using these strategies. Would you like to review another step or move to your weekly summary?",
      },
      900
    );
    setCurrentStage("next-action");
  };

  const handleNextAction = async (action) => {
    addUserMessage(
      action === "review"
        ? "Review another step from hierarchy"
        : "Finish and see weekly summary"
    );
    setCurrentStage("loading");

    if (action === "review") {
      await showHierarchyReview();
      return;
    }

    await addBotMessage("summary", {});
    await addBotMessage(
      "text",
      {
        content:
          "Let's plan for next week. Based on your progress, would you like help creating a specific schedule for your exposure practice?",
      },
      900
    );
    setCurrentStage("scheduling-choice");
  };

  const handleSchedulingChoice = async (choice) => {
    const selectedOption = schedulingChoices.find((item) => item.id === choice);

    if (!selectedOption) {
      return;
    }

    addUserMessage(selectedOption.label);
    setCurrentStage("loading");

    if (choice === "detailed") {
      await addBotMessage("schedule", {});
      await addBotMessage(
        "text",
        {
          content:
            "Would you like me to finish with a clear homework plan for next week?",
        },
        900
      );
      await addBotMessage("recommendations", {}, 400);
      await addBotMessage(
        "text",
        {
          content:
            "Focus on repetition over progression. Master each step fully before moving on.",
        },
        1000
      );
      setCurrentStage("done");
      return;
    }

    if (choice === "general") {
      await addBotMessage("reflection", {
        content:
          "General guidance for next week: aim to practice 3-4 times, keep steps manageable, and notice how repetition reduces anxiety. What specific support would help you succeed next week?",
      });
      setCurrentStage("reflection-general");
      return;
    }

    await addBotMessage("reflection", {
      content:
        "Reflection question: What would help you feel more prepared for next week's exposure practice?",
    });
    setCurrentStage("reflection-support");
  };

  const handleSend = async () => {
    if (!inputEnabled || !inputValue.trim() || isTyping) {
      return;
    }

    const value = inputValue.trim();
    addUserMessage(value);
    setInputValue("");
    setCurrentStage("loading");

    await addBotMessage("text", {
      content:
        "Thank you for sharing that. Your insight is valuable, and it helps shape a plan that feels more realistic and supportive.",
    });
    await addBotMessage("recommendations", {}, 900);
    await addBotMessage(
      "text",
      {
        content:
          "You're making meaningful progress. Keep your focus on steady repetition, and we'll build from there next week.",
      },
      1000
    );
    setCurrentStage("done");
  };

  return (
    <div className="relative min-h-screen bg-[#FBFBFC]/30 text-[#1a1a1a]">
      {/* Project-Themed Aura Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-0 h-[500px] w-[500px] rounded-full bg-[#4A7C59]/10 blur-[120px]" />
        <div className="absolute -right-20 top-20 h-[600px] w-[600px] rounded-full bg-[#DBE5DE]/40 blur-[140px]" />
        <div className="absolute bottom-0 left-1/4 h-96 w-96 rounded-full bg-[#4A7C59]/5 blur-[100px]" />
      </div>

      <div className="relative mx-auto flex min-h-[700px] w-full flex-col overflow-hidden rounded-[32px] border border-white/50 bg-[#FBFBFC]/15 shadow-[0_30px_80px_rgba(15,25,18,0.08)] backdrop-blur-xl">
        {/* Project Branded Header */}
        <div className="border-b border-white/40 bg-[#4A7C59]/5 px-6 py-8 text-center backdrop-blur-md sm:px-8">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-[#4A7C59]/70">
            The UK Inkind Psychology Clinic
          </div>
          <h1 className="mb-2 font-serif text-2xl font-light tracking-[-0.03em] text-[#0F1912] sm:text-[32px]">
            Weekly Progress Review
          </h1>
          <p className="text-sm font-light leading-6 text-[#4E5A51]">
            Continuing your behavioral exposure journey
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#4A7C59] px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-white shadow-lg shadow-[#4A7C59]/20">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            Week {currentWeek}
          </div>
        </div>

        <div
          ref={chatContainerRef}
          className="chat-container flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(219,229,222,0.1)_100%)] px-6 py-8 sm:px-8"
        >
          {messages.map((message) => (
            <div key={message.id} className="message">
              <div
                className={
                  message.sender === "bot" ? "bot-message" : "user-message"
                }
              >
                <MessageCard
                  message={message}
                  hierarchy={hierarchy}
                  week={currentWeek}
                  onReviewStep={handleReviewStep}
                />
              </div>
            </div>
          ))}

          {isTyping ? (
            <div className="message">
              <div className="bot-message">Thinking...</div>
            </div>
          ) : null}

          {currentStage === "initial-choice" ? (
            <div className="message">
              <div className="bot-message">
                <div className="options-container">
                  {INITIAL_RESPONSE_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className="option-btn"
                      onClick={() => handleInitialResponse(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {currentStage === "step-status" ? (
            <div className="message">
              <div className="bot-message">
                <div className="options-container">
                  {STEP_STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className="option-btn"
                      onClick={() => handleStatusSelection(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {currentStage === "step-suds" ? (
            <div className="message">
              <div className="bot-message">
                <div className="rating-scale">
                  {Array.from({ length: 11 }, (_, index) => (
                    <button
                      key={index}
                      type="button"
                      className="rating-btn"
                      onClick={() => handleSudsSelection(index)}
                    >
                      {index}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {currentStage === "step-day" ? (
            <div className="message">
              <div className="bot-message">
                <div className="options-container">
                  {DAY_OPTIONS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      className="option-btn"
                      onClick={() => handleDaySelection(day)}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {currentStage === "tips-choice" ? (
            <div className="message">
              <div className="bot-message">
                <div className="options-container">
                  <button
                    type="button"
                    className="option-btn"
                    onClick={() => handleTipsChoice(true)}
                  >
                    Yes, please give me tips
                  </button>
                  <button
                    type="button"
                    className="option-btn"
                    onClick={() => handleTipsChoice(false)}
                  >
                    No, I&apos;m ready to move on
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {currentStage === "step-problem" ? (
            <div className="message">
              <div className="bot-message">
                <div className="options-container">
                  {PROBLEM_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className="option-btn"
                      onClick={() => handleProblemSelection(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {currentStage === "next-action" ? (
            <div className="message">
              <div className="bot-message">
                <div className="options-container">
                  <button
                    type="button"
                    className="option-btn"
                    onClick={() => handleNextAction("review")}
                  >
                    Review another step from hierarchy
                  </button>
                  <button
                    type="button"
                    className="option-btn"
                    onClick={() => handleNextAction("finish")}
                  >
                    Finish and see weekly summary
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {currentStage === "scheduling-choice" ? (
            <div className="message">
              <div className="bot-message">
                <div className="options-container">
                  {schedulingChoices.map((choice) => (
                    <button
                      key={choice.id}
                      type="button"
                      className="option-btn"
                      onClick={() => handleSchedulingChoice(choice.id)}
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex gap-3 border-t border-white/40 bg-white/38 px-6 py-5 backdrop-blur-md sm:px-8">
          <input
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSend();
              }
            }}
            className="input-field flex-1"
            placeholder="Type your response here..."
            disabled={!inputEnabled}
          />
          <button
            type="button"
            onClick={handleSend}
            className="send-btn"
            disabled={!inputEnabled || !inputValue.trim() || isTyping}
          >
            Send
          </button>
        </div>
      </div>

      <style jsx>{`
        .chat-container::-webkit-scrollbar {
          width: 6px;
        }

        .chat-container::-webkit-scrollbar-track {
          background: #f0f0f0;
        }

        .chat-container::-webkit-scrollbar-thumb {
          background: #ccc;
          border-radius: 3px;
        }

        .message {
          margin-bottom: 20px;
          animation: fadeIn 0.4s ease-in;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(5px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .bot-message {
          width: fit-content;
          max-width: 75%;
          border: 1px solid rgba(255, 255, 255, 0.65);
          background: rgba(255, 255, 255, 0.78);
          box-shadow: 0 18px 35px rgba(15, 25, 18, 0.06);
          padding: 18px 20px;
          font-size: 15px;
          line-height: 1.7;
          color: #314036;
          font-weight: 300;
          backdrop-filter: blur(18px);
        }

        .user-message {
          margin-left: auto;
          width: fit-content;
          max-width: 75%;
          border: 1px solid rgba(74, 124, 89, 0.18);
          background: linear-gradient(135deg, #4a7c59 0%, #5f936f 100%);
          box-shadow: 0 18px 35px rgba(74, 124, 89, 0.18);
          padding: 18px 20px;
          font-size: 15px;
          line-height: 1.7;
          color: #ffffff;
          font-weight: 300;
        }

        .progress-card {
          margin: 15px 0;
          border: 1px solid rgba(255, 255, 255, 0.65);
          background: rgba(255, 255, 255, 0.82);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
          padding: 20px;
          backdrop-filter: blur(18px);
        }

        .progress-card-header {
          margin-bottom: 15px;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #6e756e;
        }

        .step-review {
          margin: 10px 0;
          cursor: pointer;
          border: 1px solid rgba(225, 232, 226, 0.9);
          background: rgba(249, 251, 249, 0.95);
          padding: 15px;
          transition: all 0.2s ease;
        }

        .step-review:hover {
          border-color: rgba(74, 124, 89, 0.35);
          background: rgba(255, 255, 255, 0.98);
          transform: translateY(-1px);
        }

        .step-review.completed {
          border-left: 3px solid #4a7c59;
        }

        .step-review.in-progress {
          border-left: 3px solid #d99d3e;
        }

        .step-review.not-started {
          border-left: 3px solid #d7ded8;
        }

        .step-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .step-title {
          font-size: 14px;
          font-weight: 400;
          color: #233229;
        }

        .step-status {
          background: #eef3ef;
          padding: 3px 8px;
          font-size: 11px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: #5f6d64;
        }

        .step-status.completed {
          background: #4a7c59;
          color: white;
        }

        .step-status.in-progress {
          background: #d99d3e;
          color: white;
        }

        .step-description {
          margin-bottom: 8px;
          font-size: 13px;
          line-height: 1.5;
          color: #55645a;
        }

        .suds-tracker {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 10px;
          border-top: 1px solid #f0f0f0;
          padding-top: 10px;
        }

        .suds-label {
          font-size: 11px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: #7b857d;
        }

        .suds-value {
          min-width: 45px;
          background: #233229;
          padding: 4px 8px;
          text-align: center;
          font-size: 11px;
          color: white;
        }

        .suds-arrow {
          font-size: 18px;
          color: #4a7c59;
        }

        .options-container {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 15px;
        }

        .option-btn {
          position: relative;
          cursor: pointer;
          border: 1px solid rgba(209, 218, 211, 0.95);
          background: rgba(255, 255, 255, 0.9);
          padding: 12px 20px;
          font-size: 14px;
          font-weight: 300;
          color: #314036;
          transition: all 0.2s ease;
        }

        .option-btn:hover {
          border-color: #4a7c59;
          background: #4a7c59;
          color: #ffffff;
          transform: translateY(-1px);
        }

        .rating-scale {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 15px;
        }

        .rating-btn {
          height: 40px;
          width: 40px;
          cursor: pointer;
          border: 1px solid rgba(209, 218, 211, 0.95);
          background: rgba(255, 255, 255, 0.92);
          font-size: 14px;
          color: #314036;
          transition: all 0.2s ease;
        }

        .rating-btn:hover {
          transform: scale(1.1);
          border-color: #4a7c59;
          background: #4a7c59;
          color: white;
        }

        .input-field {
          border: 1px solid rgba(215, 223, 216, 0.95);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.86);
          padding: 14px 18px;
          font-size: 14px;
          font-weight: 300;
          color: #233229;
          transition: all 0.2s ease;
        }

        .input-field:focus {
          outline: none;
          border-color: #4a7c59;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(74, 124, 89, 0.08);
        }

        .input-field::placeholder {
          color: #94a098;
        }

        .send-btn {
          cursor: pointer;
          border: none;
          border-radius: 999px;
          background: #4a7c59;
          padding: 14px 30px;
          font-size: 14px;
          font-weight: 400;
          letter-spacing: 0.5px;
          color: white;
          transition: all 0.2s ease;
        }

        .send-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          background: #3d6649;
        }

        .send-btn:disabled {
          cursor: not-allowed;
          opacity: 0.3;
        }

        .weekly-summary {
          margin-top: 20px;
          border: 1px solid rgba(255, 255, 255, 0.6);
          background: rgba(249, 251, 249, 0.92);
          padding: 20px;
        }

        .summary-header {
          margin-bottom: 15px;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #6e756e;
        }

        .summary-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 20px;
        }

        .stat-box {
          border: 1px solid rgba(224, 232, 225, 0.95);
          background: rgba(255, 255, 255, 0.95);
          padding: 15px;
          text-align: center;
        }

        .stat-value {
          margin-bottom: 5px;
          font-size: 24px;
          font-weight: 300;
          color: #233229;
        }

        .stat-label {
          font-size: 11px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: #7b857d;
        }

        .encouragement-box {
          margin-top: 15px;
          background: linear-gradient(135deg, #233229 0%, #31483b 100%);
          padding: 18px;
          font-size: 14px;
          line-height: 1.7;
          font-weight: 300;
          color: white;
        }

        .reflection-prompt {
          margin: 15px 0;
          border: 1px solid rgba(224, 232, 225, 0.95);
          border-left: 3px solid #4a7c59;
          background: rgba(255, 255, 255, 0.92);
          padding: 15px;
          font-size: 14px;
          line-height: 1.6;
          color: #55645a;
        }

        .recommendations-box {
          margin-top: 15px;
          border: 1px solid rgba(255, 255, 255, 0.65);
          background: rgba(250, 252, 250, 0.94);
          padding: 20px;
          backdrop-filter: blur(18px);
        }

        .recommendation-item {
          border-bottom: 1px solid rgba(235, 240, 236, 0.95);
          padding: 10px 0;
          font-size: 14px;
          line-height: 1.6;
        }

        .recommendation-item:last-child {
          border-bottom: none;
        }

        .recommendation-number {
          display: inline-block;
          height: 24px;
          width: 24px;
          margin-right: 10px;
          background: #233229;
          text-align: center;
          font-size: 12px;
          line-height: 24px;
          color: white;
        }

        @media (max-width: 768px) {
          .bot-message,
          .user-message {
            max-width: 100%;
          }

          .summary-stats {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
