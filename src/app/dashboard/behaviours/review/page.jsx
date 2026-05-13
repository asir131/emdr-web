"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useStoredAuth } from "@/redux/authStorage";

const INITIAL_HIERARCHY = [
  {
    step: "Say hello to a cashier at the shop",
    originalSuds: 3,
    currentSuds: null,
    status: "not-started",
    attempts: 0,
    mastered: false,
    plannedDay: "",
    problemType: "",
  },
  {
    step: "Make small talk with a colleague at the coffee machine",
    originalSuds: 5,
    currentSuds: null,
    status: "not-started",
    attempts: 0,
    mastered: false,
    plannedDay: "",
    problemType: "",
  },
  {
    step: "Attend a small team meeting and contribute one comment",
    originalSuds: 7,
    currentSuds: null,
    status: "not-started",
    attempts: 0,
    mastered: false,
    plannedDay: "",
    problemType: "",
  },
  {
    step: "Join a social lunch with colleagues",
    originalSuds: 8,
    currentSuds: null,
    status: "not-started",
    attempts: 0,
    mastered: false,
    plannedDay: "",
    problemType: "",
  },
  {
    step: "Attend a networking event for 30 minutes",
    originalSuds: 10,
    currentSuds: null,
    status: "not-started",
    attempts: 0,
    mastered: false,
    plannedDay: "",
    problemType: "",
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

const EXPOSURE_PLAN_STORAGE_KEYS = [
  "activeExposurePlanId",
  "currentExposurePlanId",
  "selectedExposurePlanId",
  "exposurePlanId",
];

const getBaseUrl = () => {
  const rawBaseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || process.env.VITE_BASE_URL || "";

  return rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl;
};

const formatAverageImprovement = (value) => {
  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return "N/A";
  }

  if (numericValue === 0) {
    return "0.0";
  }

  return numericValue > 0
    ? `-${numericValue.toFixed(1)}`
    : numericValue.toFixed(1);
};

const getStoredExposurePlanId = () => {
  if (typeof window === "undefined") {
    return "";
  }

  for (const key of EXPOSURE_PLAN_STORAGE_KEYS) {
    const value = window.localStorage.getItem(key);

    if (value) {
      return value;
    }
  }

  return "";
};

const persistExposurePlanId = (planId) => {
  if (typeof window === "undefined" || !planId) {
    return;
  }

  window.localStorage.setItem("activeExposurePlanId", planId);
};

const getWeeklyChatHistoryStorageKey = (planId) =>
  `behaviours-weekly-chat-history:${planId}`;

const loadWeeklyChatHistory = (planId) => {
  if (typeof window === "undefined" || !planId) {
    return {};
  }

  try {
    return JSON.parse(
      window.localStorage.getItem(getWeeklyChatHistoryStorageKey(planId)) ||
      "{}",
    );
  } catch {
    return {};
  }
};

const persistWeeklyChatHistory = (planId, history) => {
  if (typeof window === "undefined" || !planId) {
    return;
  }

  window.localStorage.setItem(
    getWeeklyChatHistoryStorageKey(planId),
    JSON.stringify(history),
  );
};

const normalizeHierarchyStep = (step, index, reviewStep) => {
  const currentSuds =
    typeof reviewStep?.sudsRating === "number"
      ? reviewStep.sudsRating
      : typeof step?.currentSuds === "number"
        ? step.currentSuds
        : null;
  const status =
    reviewStep?.status ||
    (step?.completed
      ? "completed"
      : currentSuds !== null || Number(step?.attempts || 0) > 0
        ? "in-progress"
        : "not-started");

  return {
    step: step?.step || `Exposure step ${index + 1}`,
    originalSuds: Number(step?.originalSuds ?? step?.suds ?? 0),
    currentSuds,
    status,
    attempts: Number(step?.attempts || 0),
    mastered:
      typeof step?.mastered === "boolean"
        ? step.mastered
        : status !== "not-started" && currentSuds !== null && currentSuds <= 2,
    plannedDay: reviewStep?.plannedDay || step?.plannedDay || "",
    problemType: reviewStep?.problemType || "",
    notes: reviewStep?.notes || "",
  };
};

const buildStepReviewPayload = ({
  hierarchy,
  currentWeek,
  stepIndex,
  overrides = {},
}) => {
  const step = hierarchy[stepIndex];

  if (!step) {
    return null;
  }

  const status = overrides.status || step.status;
  const sudsRating =
    typeof overrides.sudsRating === "number"
      ? overrides.sudsRating
      : typeof step.currentSuds === "number"
        ? step.currentSuds
        : null;
  const problemType = overrides.problemType || step.problemType;
  const plannedDay = overrides.plannedDay || step.plannedDay;
  const notes = overrides.notes || step.notes;
  const payload = {
    weekNumber: currentWeek,
    stepIndex,
    status,
  };

  if (status !== "not-started" && sudsRating !== null) {
    payload.sudsRating = sudsRating;
  }

  if (problemType) {
    payload.problemType = problemType;
  }

  if (plannedDay) {
    payload.plannedDay = plannedDay;
  }

  if (notes) {
    payload.notes = notes;
  }

  return payload;
};

const buildFullReviewPayload = ({
  hierarchy,
  currentWeek,
  overallFeeling,
}) => ({
  weekNumber: currentWeek,
  overallFeeling,
  stepReviews: hierarchy.map((item, index) =>
    buildStepReviewPayload({
      hierarchy,
      currentWeek,
      stepIndex: index,
      overrides: {
        status: item.status,
      },
    }),
  ),
});

const exposureReviewRequest = async ({
  baseUrl,
  token,
  path,
  method = "GET",
  body,
  errorMessage,
}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || errorMessage || "Request failed.");
  }

  return result?.data;
};

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
    improvements.reduce((total, value) => total + value, 0) /
    improvements.length;

  return formatAverageImprovement(average);
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
    (item) => item.currentSuds !== null && item.currentSuds > 2,
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
      item.currentSuds > 2,
  );
  const nextStep = hierarchy.find((item) => item.status === "not-started");
  const masteredCount = hierarchy.filter(
    (item) =>
      item.mastered || (item.currentSuds !== null && item.currentSuds <= 2),
  ).length;

  const items = [];

  if (unmastered) {
    items.push(
      `Priority focus: Continue practicing "${unmastered.step}" until SUDS reaches 0-2.`,
    );
    items.push(
      `Current SUDS is ${unmastered.currentSuds}/10, so repetition should stay your main goal this week.`,
    );
    items.push(
      "Do not move to harder steps until this one feels meaningfully easier.",
    );
  } else if (nextStep) {
    items.push(`You are ready to begin planning for "${nextStep.step}".`);
    items.push(
      "Start with a brief version of the exposure and build confidence gradually.",
    );
  }

  if (masteredCount > 0) {
    items.push(
      "Keep practicing mastered steps occasionally so the confidence stays strong.",
    );
  }

  items.push(
    "Practice at roughly the same time each day to make it easier to follow through.",
  );
  items.push(
    "Keep a simple log of the step, date, SUDS before, and SUDS after.",
  );

  return items;
};

function MessageCard({ message, hierarchy, week, onReviewStep }) {
  if (message.type === "hierarchy") {
    return (
      <div className="progress-card">
        <div className="progress-card-header">
          Your Exposure Hierarchy - Week {week}
        </div>
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
    const completed =
      message.summary?.completedSteps ??
      hierarchy.filter((item) => item.status === "completed").length;
    const attempted =
      message.summary?.attemptedSteps ??
      hierarchy.filter((item) => item.status !== "not-started").length;
    const avgImprovement =
      typeof message.summary?.avgSudsReduction === "number"
        ? formatAverageImprovement(message.summary.avgSudsReduction)
        : calculateAverageImprovement(hierarchy);

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
        <div className="summary-header">
          Your Personalised Week {week + 1} Schedule
        </div>
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
        <div className="summary-header">
          Your Homework Plan For Week {week + 1}
        </div>
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

export default function WeeklyReviewPage() {
  const searchParams = useSearchParams();
  const { token, hasHydrated } = useStoredAuth();
  const chatContainerRef = useRef(null);
  const baseUrl = useMemo(() => getBaseUrl(), []);
  const requestedWeek = useMemo(() => {
    const weekFromQuery = Number.parseInt(searchParams.get("week") || "1", 10);
    return Number.isNaN(weekFromQuery) ? 1 : Math.max(weekFromQuery, 1);
  }, [searchParams]);
  const testWeekFromQuery = useMemo(
    () =>
      searchParams.get("testWeek")
        ? Number.parseInt(searchParams.get("testWeek"), 10)
        : null,
    [searchParams],
  );
  const [messages, setMessages] = useState([]);
  const [currentStage, setCurrentStage] = useState("loading");
  const [hierarchy, setHierarchy] = useState(INITIAL_HIERARCHY);
  const [reviewingStep, setReviewingStep] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(requestedWeek);
  const [planId, setPlanId] = useState("");
  const [selectedBehavior, setSelectedBehavior] = useState(
    "Avoiding social situations",
  );
  const [selectedFeeling, setSelectedFeeling] = useState("");
  const [loadError, setLoadError] = useState("");
  const [syncError, setSyncError] = useState("");
  const [reviewHistory, setReviewHistory] = useState([]);
  const [weeklyChatHistory, setWeeklyChatHistory] = useState({});
  const [currentWeekChatProgress, setCurrentWeekChatProgress] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSyncingStep, setIsSyncingStep] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const inputEnabled = useMemo(
    () =>
      currentStage === "reflection-support" ||
      currentStage === "reflection-general",
    [currentStage],
  );

  const isBusy =
    isTyping || isInitialLoading || isSyncingStep || isSubmittingReview;

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
    setCurrentWeek(requestedWeek);
  }, [requestedWeek]);

  useEffect(() => {
    let cancelled = false;

    const startConversation = async ({ reviewWeek, behaviorLabel }) => {
      await addBotMessage("text", {
        content:
          reviewWeek === 1
            ? `Welcome back. I hope you've had a chance to begin working with your exposure hierarchy for "${behaviorLabel}".`
            : `Welcome to week ${reviewWeek} of your exposure therapy journey. Let's continue working on "${behaviorLabel}".`,
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
        1100,
      );

      if (cancelled) {
        return;
      }

      await addBotMessage(
        "text",
        { content: "How have you been finding the homework this week?" },
        1000,
      );

      if (!cancelled) {
        setCurrentStage("initial-choice");
      }
    };

    const resolveLatestPlanId = async () => {
      const plansData = await exposureReviewRequest({
        baseUrl,
        token,
        path: "/api/exposure/plans",
        errorMessage: "Unable to load your exposure plans.",
      });

      const plans = Array.isArray(plansData)
        ? plansData
        : Array.isArray(plansData?.plans)
          ? plansData.plans
          : Array.isArray(plansData?.items)
            ? plansData.items
            : [];

      const storedPlanId = getStoredExposurePlanId();

      if (storedPlanId) {
        const matchingPlan = plans.find(
          (item) => (item?._id || item?.id) === storedPlanId,
        );

        if (matchingPlan) {
          return storedPlanId;
        }
      }

      const activePlan =
        plans.find((item) => item?.status === "in_progress") ||
        plans.find((item) => item?.status === "not_started") ||
        plans[0];

      return activePlan?._id || activePlan?.id || "";
    };

    const createDefaultPlan = async () =>
      exposureReviewRequest({
        baseUrl,
        token,
        path: "/api/exposure/plan",
        method: "POST",
        body: {
          selectedBehavior: "Avoiding social situations",
          hierarchy: INITIAL_HIERARCHY.map((item) => ({
            step: item.step,
            suds: item.originalSuds,
          })),
        },
        errorMessage: "Unable to create your first exposure plan.",
      });

    const loadReviewDataForPlan = async (nextPlanId) => {
      const [reviewData, historyData] = await Promise.all([
        exposureReviewRequest({
          baseUrl,
          token,
          path: `/api/exposure/plan/${nextPlanId}/weekly-review`,
          errorMessage: "Unable to load this week's review.",
        }),
        exposureReviewRequest({
          baseUrl,
          token,
          path: `/api/exposure/plan/${nextPlanId}/weekly-review/history`,
          errorMessage: "Unable to load weekly review history.",
        }).catch(() => null),
      ]);

      return { reviewData, historyData };
    };

    const loadWeeklyReview = async () => {
      if (!hasHydrated) {
        return;
      }

      setMessages([]);
      setHierarchy(INITIAL_HIERARCHY);
      setReviewingStep(null);
      setCurrentStage("loading");
      setCurrentWeek(requestedWeek);
      setSelectedBehavior("Avoiding social situations");
      setSelectedFeeling("");
      setLoadError("");
      setSyncError("");
      setReviewHistory([]);
      setWeeklyChatHistory({});
      setCurrentWeekChatProgress(0);
      setIsInitialLoading(true);

      if (!token) {
        setLoadError("Please sign in again to load your weekly review.");
        setIsInitialLoading(false);
        return;
      }

      if (!baseUrl) {
        setLoadError("Weekly review service is not configured.");
        setIsInitialLoading(false);
        return;
      }

      try {
        let nextPlanId = await resolveLatestPlanId().catch(() => "");

        if (!nextPlanId) {
          const createdPlan = await createDefaultPlan();
          nextPlanId = createdPlan?._id || createdPlan?.id || "";
        }

        if (!nextPlanId) {
          throw new Error("Unable to create or load an exposure plan.");
        }

        const loadedPlanData = await loadReviewDataForPlan(nextPlanId);
        const data = loadedPlanData.reviewData;
        const historyData = loadedPlanData.historyData;

        if (cancelled) {
          return;
        }

        const plan = data?.plan || {};
        const review = data?.review || null;
        const reviewStepsByIndex = new Map(
          (review?.stepReviews || []).map((item) => [item.stepIndex, item]),
        );
        const nextHierarchy =
          Array.isArray(plan?.hierarchy) && plan.hierarchy.length > 0
            ? plan.hierarchy.map((step, index) =>
              normalizeHierarchyStep(
                step,
                index,
                reviewStepsByIndex.get(index),
              ),
            )
            : INITIAL_HIERARCHY;
        const serverWeek =
          testWeekFromQuery !== null
            ? testWeekFromQuery
            : Number(plan?.currentWeek) > 0
              ? Number(plan.currentWeek)
              : requestedWeek;
        const behaviorLabel =
          plan?.selectedBehavior || "Avoiding social situations";

        persistExposurePlanId(nextPlanId);
        setPlanId(nextPlanId);
        setHierarchy(nextHierarchy);
        setCurrentWeek(serverWeek);
        setSelectedBehavior(behaviorLabel);
        setSelectedFeeling(review?.overallFeeling || "");
        setReviewHistory(
          Array.isArray(historyData?.reviews) ? historyData.reviews : [],
        );
        const storedWeeklyHistory = loadWeeklyChatHistory(nextPlanId);
        setWeeklyChatHistory(storedWeeklyHistory);
        setCurrentWeekChatProgress(
          Number(storedWeeklyHistory?.[serverWeek] || 0),
        );

        await startConversation({
          reviewWeek: serverWeek,
          behaviorLabel,
        });
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error?.message || "Unable to load your weekly review right now.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsInitialLoading(false);
        }
      }
    };

    loadWeeklyReview();

    return () => {
      cancelled = true;
    };
  }, [
    baseUrl,
    hasHydrated,
    requestedWeek,
    testWeekFromQuery,
    token,
  ]);

  const syncStepToBackend = async (stepIndex, status, sudsRating = null) => {
    if (!planId || isBusy) {
      return;
    }

    setIsSyncingStep(true);
    setSyncError("");

    try {
      const payload = buildStepReviewPayload({
        hierarchy,
        currentWeek,
        stepIndex,
        overrides: {
          status,
          sudsRating,
        },
      });

      await exposureReviewRequest({
        baseUrl,
        token,
        method: "PATCH",
        path: `/api/exposure/plan/${planId}/weekly-review/step`,
        body: payload,
        errorMessage: "Unable to save your progress for this step.",
      });
    } catch (error) {
      setSyncError(error.message);
    } finally {
      setIsSyncingStep(false);
    }
  };

  const submitFullReview = async () => {
    if (!planId || isBusy) {
      return null;
    }

    setIsSubmittingReview(true);
    setSyncError("");

    try {
      const payload = buildFullReviewPayload({
        hierarchy,
        currentWeek,
        overallFeeling: selectedFeeling,
      });

      return await exposureReviewRequest({
        baseUrl,
        token,
        method: "POST",
        path: `/api/exposure/plan/${planId}/weekly-review`,
        body: payload,
        errorMessage: "Unable to save your weekly summary.",
      });
    } catch (error) {
      setSyncError(error.message);
      return null;
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const registerWeeklyChatProgress = () => {
    if (!planId) {
      return;
    }

    const nextProgress = currentWeekChatProgress + 1;
    const nextHistory = {
      ...weeklyChatHistory,
      [currentWeek]: nextProgress,
    };

    setWeeklyChatHistory(nextHistory);
    setCurrentWeekChatProgress(nextProgress);
    persistWeeklyChatHistory(planId, nextHistory);
  };

  const handleInitialChoice = async (choice) => {
    const selectedOption = INITIAL_RESPONSE_OPTIONS.find(
      (item) => item.id === choice,
    );

    if (!selectedOption || isBusy) {
      return;
    }

    addUserMessage(selectedOption.label);
    registerWeeklyChatProgress();
    setSelectedFeeling(choice);
    setCurrentStage("loading");

    await addBotMessage("text", {
      content: getResponseText(choice),
    });

    if (choice === "unable") {
      await addBotMessage("text", {
        content:
          "I understand. Sometimes things come up. Let's look at the steps we've planned and see what might help for next week.",
      });
    }

    await addBotMessage(
      "hierarchy",
      {
        hierarchy,
        week: currentWeek,
      },
      800,
    );

    await addBotMessage(
      "text",
      {
        content:
          "Take a look at your hierarchy. You can click on any step to update its progress or record a new SUDS rating.",
      },
      1200,
    );

    await addBotMessage(
      "text",
      {
        content: "When you're finished reviewing your steps, let me know.",
      },
      800,
    );

    setCurrentStage("hierarchy-review");
  };

  const handleReviewStep = (index) => {
    if (currentStage !== "hierarchy-review" || isBusy) {
      return;
    }

    setReviewingStep(index);
    addUserMessage(`I'll review Step ${index + 1}: ${hierarchy[index].step}`);
    registerWeeklyChatProgress();
    setCurrentStage("loading");

    window.setTimeout(async () => {
      await addBotMessage("text", {
        content: `How did it go with "${hierarchy[index].step}"?`,
      });
      setCurrentStage("step-status");
    }, 600);
  };

  const handleStatusSelection = async (statusId) => {
    const selectedOption = STEP_STATUS_OPTIONS.find(
      (item) => item.id === statusId,
    );

    if (!selectedOption || reviewingStep === null || isBusy) {
      return;
    }

    addUserMessage(selectedOption.label);
    registerWeeklyChatProgress();

    const nextHierarchy = [...hierarchy];
    nextHierarchy[reviewingStep] = {
      ...nextHierarchy[reviewingStep],
      status: statusId,
    };
    setHierarchy(nextHierarchy);

    setCurrentStage("loading");

    if (statusId === "not-started") {
      await addBotMessage("text", {
        content:
          "That's okay. We'll keep it in the plan. Would you like to review another step or finish the summary?",
      });
      await syncStepToBackend(reviewingStep, statusId);
      setReviewingStep(null);
      setCurrentStage("hierarchy-review");
      return;
    }

    await addBotMessage("text", {
      content:
        "What was your peak SUDS (anxiety level) during this exposure? (0 = no anxiety, 10 = extreme anxiety)",
    });
    setCurrentStage("step-suds");
  };

  const handleSudsSelection = async (suds) => {
    if (reviewingStep === null || isBusy) {
      return;
    }

    addUserMessage(`My SUDS was ${suds}`);
    registerWeeklyChatProgress();

    const nextHierarchy = [...hierarchy];
    nextHierarchy[reviewingStep] = {
      ...nextHierarchy[reviewingStep],
      currentSuds: suds,
      mastered: suds <= 2,
    };
    setHierarchy(nextHierarchy);

    setCurrentStage("loading");

    if (suds > 6) {
      const strategy = getProblemStrategy("during");
      await addBotMessage("text", {
        content:
          "That sounds like a very high level of anxiety. It's brave of you to stay with it. Here are some strategies that might help manage that intensity next time:",
      });
      await addBotMessage("strategy", {
        title: strategy.title,
        items: strategy.items,
      });
    } else {
      await addBotMessage("text", {
        content:
          "Thanks for sharing that rating. It helps us see exactly how you're habituating to this situation.",
      });
    }

    await addBotMessage("text", {
      content: "Which day(s) did you practice this step?",
    });
    setCurrentStage("step-day");
  };

  const handleDaySelection = async (day) => {
    if (reviewingStep === null || isBusy) {
      return;
    }

    addUserMessage(`I practiced on ${day}`);
    registerWeeklyChatProgress();

    const nextHierarchy = [...hierarchy];
    nextHierarchy[reviewingStep] = {
      ...nextHierarchy[reviewingStep],
      plannedDay: day,
    };
    setHierarchy(nextHierarchy);

    setCurrentStage("loading");
    await syncStepToBackend(
      reviewingStep,
      nextHierarchy[reviewingStep].status,
      nextHierarchy[reviewingStep].currentSuds,
    );

    await addBotMessage("text", {
      content:
        "Got it. Would you like some specific tips for this step, or are you ready to review something else?",
    });
    setCurrentStage("tips-choice");
  };

  const handleTipsChoice = async (wantsTips) => {
    if (reviewingStep === null || isBusy) {
      return;
    }

    addUserMessage(
      wantsTips ? "Yes, please give me tips" : "No, I'm ready to move on",
    );
    registerWeeklyChatProgress();
    setCurrentStage("loading");

    if (wantsTips) {
      await addBotMessage("text", {
        content: "What felt like the biggest challenge during this practice?",
      });
      setCurrentStage("step-problem");
      return;
    }

    setReviewingStep(null);
    await addBotMessage("text", {
      content:
        "Okay. Would you like to review another step or are you ready to finish the weekly summary?",
    });
    setCurrentStage("hierarchy-review");
  };

  const handleProblemSelection = async (problemId) => {
    const selectedOption = PROBLEM_OPTIONS.find(
      (item) => item.id === problemId,
    );

    if (!selectedOption || reviewingStep === null || isBusy) {
      return;
    }

    addUserMessage(selectedOption.label);
    registerWeeklyChatProgress();

    const strategy = getProblemStrategy(problemId);
    setCurrentStage("loading");

    await addBotMessage("text", {
      content: `That's a very common challenge. Here's a strategy specifically for ${selectedOption.label.toLowerCase()}:`,
    });
    await addBotMessage("strategy", {
      title: strategy.title,
      items: strategy.items,
    });

    setReviewingStep(null);
    await addBotMessage("text", {
      content:
        "Would you like to review another step or finish the weekly summary?",
    });
    setCurrentStage("hierarchy-review");
  };

  const handleFinishReview = async () => {
    if (currentStage !== "hierarchy-review" || isBusy) {
      return;
    }

    addUserMessage("I'm finished reviewing my steps for this week");
    registerWeeklyChatProgress();
    setCurrentStage("loading");

    await addBotMessage("text", {
      content:
        "Excellent. Let me prepare your weekly summary and look at the overall progress you've made.",
    });

    const reviewResult = await submitFullReview();

    if (reviewResult?.summary) {
      setReviewHistory((currentHistory) => {
        const nextEntry = {
          weekNumber: currentWeek,
          overallFeeling: selectedFeeling || "mixed",
          summary: reviewResult.summary,
          createdAt: reviewResult.createdAt,
        };
        const filteredHistory = currentHistory.filter(
          (item) => Number(item?.weekNumber) !== currentWeek,
        );

        return [...filteredHistory, nextEntry].sort(
          (left, right) => Number(left.weekNumber) - Number(right.weekNumber),
        );
      });
    }

    await addBotMessage("summary", {
      summary: reviewResult?.summary,
    });
    await addBotMessage(
      "text",
      {
        content:
          "Let's plan for next week. Based on your progress, would you like help creating a specific schedule for your exposure practice?",
      },
      900,
    );
    setCurrentStage("scheduling-choice");
  };

  const handleSchedulingChoice = async (choice) => {
    const selectedOption = schedulingChoices.find((item) => item.id === choice);

    if (!selectedOption || isBusy) {
      return;
    }

    addUserMessage(selectedOption.label);
    registerWeeklyChatProgress();
    setCurrentStage("loading");

    if (choice === "detailed") {
      await addBotMessage("schedule", {});
      await addBotMessage(
        "text",
        {
          content:
            "Would you like me to finish with a clear homework plan for next week?",
        },
        900,
      );
      await addBotMessage("recommendations", {}, 400);
      await addBotMessage(
        "text",
        {
          content:
            "Focus on repetition over progression. Master each step fully before moving on.",
        },
        1000,
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
    if (!inputEnabled || !inputValue.trim() || isBusy) {
      return;
    }

    const value = inputValue.trim();
    addUserMessage(value);
    registerWeeklyChatProgress();
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
      1000,
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
            Continuing your behavioral exposure journey for {selectedBehavior}
          </p>
          <div className="mt-4 flex flex-col items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#4A7C59] px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-white shadow-lg shadow-[#4A7C59]/20">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                Week {currentWeek}
              </div>
              <div className="text-[13px] font-bold text-[#4A7C59]">
                {hierarchy.reduce((sum, s) => sum + s.originalSuds, 0) > 0
                  ? Math.round(
                    (hierarchy.reduce((sum, s) => {
                      if (s.currentSuds !== null) {
                        return sum + Math.max(0, s.originalSuds - s.currentSuds);
                      }
                      return sum;
                    }, 0) /
                      hierarchy.reduce((sum, s) => sum + s.originalSuds, 0)) *
                    100,
                  )
                  : 0}
                %
              </div>
            </div>

            <div className="mt-1 flex gap-3">
              <div className="rounded-md bg-[#4A7C59]/5 px-2 py-0.5 text-[10px] font-medium text-[#4A7C59]">
                Avg Impr: -
                {(
                  hierarchy.reduce((sum, s) => {
                    if (s.currentSuds !== null) {
                      return sum + Math.max(0, s.originalSuds - s.currentSuds);
                    }
                    return sum;
                  }, 0) / (hierarchy.filter((s) => s.currentSuds !== null).length || 1)
                ).toFixed(1)}{" "}
                marks
              </div>
            </div>

            <div className="mt-2 w-full max-w-xs">
              <div className="mb-1 flex justify-between text-[11px] font-medium text-[#4E5A51]">
                <span>Resolved Marks</span>
                <span>
                  {hierarchy
                    .reduce((sum, s) => {
                      if (s.currentSuds !== null) {
                        return sum + Math.max(0, s.originalSuds - s.currentSuds);
                      }
                      return sum;
                    }, 0)
                    .toFixed(1)}{" "}
                  of {hierarchy.reduce((sum, s) => sum + s.originalSuds, 0)} potential
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#4A7C59]/10">
                <div
                  className="h-full rounded-full bg-[#4A7C59] transition-all duration-500 ease-out"
                  style={{
                    width: `${hierarchy.reduce((sum, s) => sum + s.originalSuds, 0) > 0
                        ? (hierarchy.reduce((sum, s) => {
                          if (s.currentSuds !== null) {
                            return sum + Math.max(0, s.originalSuds - s.currentSuds);
                          }
                          return sum;
                        }, 0) /
                          hierarchy.reduce((sum, s) => sum + s.originalSuds, 0)) *
                        100
                        : 0
                      }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Chat Container */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(234,242,236,0.18)_100%)] px-4 py-8 sm:px-8"
        >
          <div className="mx-auto max-w-3xl space-y-8">
            {loadError ? (
              <div className="status-banner error">{loadError}</div>
            ) : null}

            {isInitialLoading && messages.length === 0 ? (
              <div className="status-banner">
                Loading your weekly review and preparing your conversation...
              </div>
            ) : null}

            {messages.map((msg) => (
              <div key={msg.id} className={`message-row ${msg.sender}`}>
                {msg.sender === "bot" && (
                  <div className="message-avatar">
                    <div className="h-full w-full rounded-full bg-gradient-to-br from-[#4A7C59] to-[#2D4B36]" />
                  </div>
                )}
                <div className={`message-bubble ${msg.sender}`}>
                  <MessageCard
                    message={msg}
                    hierarchy={hierarchy}
                    week={currentWeek}
                    onReviewStep={handleReviewStep}
                  />
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="message-row bot">
                <div className="message-avatar">
                  <div className="h-full w-full rounded-full bg-gradient-to-br from-[#4A7C59] to-[#2D4B36]" />
                </div>
                <div className="message-bubble bot typing-indicator">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            {currentStage === "initial-choice" ? (
              <div className="message-row bot">
                <div className="message-bubble bot bg-transparent p-0 shadow-none">
                  <div className="flex flex-wrap gap-3">
                    {INITIAL_RESPONSE_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className="option-btn"
                        disabled={isBusy}
                        onClick={() => handleInitialChoice(option.id)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {currentStage === "step-status" ? (
              <div className="message-row bot">
                <div className="message-bubble bot bg-transparent p-0 shadow-none">
                  <div className="flex flex-wrap gap-3">
                    {STEP_STATUS_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className="option-btn"
                        disabled={isBusy}
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
              <div className="message-row bot">
                <div className="message-bubble bot bg-transparent p-0 shadow-none">
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 11 }, (_, index) => (
                      <button
                        key={index}
                        type="button"
                        className="rating-btn"
                        disabled={isBusy}
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
              <div className="message-row bot">
                <div className="message-bubble bot bg-transparent p-0 shadow-none">
                  <div className="flex flex-wrap gap-3">
                    {DAY_OPTIONS.map((day) => (
                      <button
                        key={day}
                        type="button"
                        className="option-btn"
                        disabled={isBusy}
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
              <div className="message-row bot">
                <div className="message-bubble bot bg-transparent p-0 shadow-none">
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="option-btn"
                      disabled={isBusy}
                      onClick={() => handleTipsChoice(true)}
                    >
                      Yes, please give me tips
                    </button>
                    <button
                      type="button"
                      className="option-btn"
                      disabled={isBusy}
                      onClick={() => handleTipsChoice(false)}
                    >
                      No, I&apos;m ready to move on
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {currentStage === "step-problem" ? (
              <div className="message-row bot">
                <div className="message-bubble bot bg-transparent p-0 shadow-none">
                  <div className="flex flex-wrap gap-3">
                    {PROBLEM_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className="option-btn"
                        disabled={isBusy}
                        onClick={() => handleProblemSelection(option.id)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {currentStage === "hierarchy-review" ? (
              <div className="message-row bot">
                <div className="message-bubble bot bg-transparent p-0 shadow-none">
                  <button
                    type="button"
                    className="finish-btn"
                    disabled={isBusy}
                    onClick={handleFinishReview}
                  >
                    Finish Weekly Summary
                  </button>
                </div>
              </div>
            ) : null}

            {currentStage === "scheduling-choice" ? (
              <div className="message-row bot">
                <div className="message-bubble bot bg-transparent p-0 shadow-none">
                  <div className="flex flex-wrap gap-3">
                    {schedulingChoices.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className="option-btn"
                        disabled={isBusy}
                        onClick={() => handleSchedulingChoice(option.id)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Input Bar */}
        <div className="border-t border-white/40 bg-white/30 p-4 backdrop-blur-md sm:p-6">
          <div className="mx-auto flex max-w-3xl gap-3">
            <input
              type="text"
              placeholder={
                inputEnabled
                  ? "Type your reflection here..."
                  : "Please select an option above to continue..."
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={!inputEnabled || isBusy}
              className="flex-1 rounded-2xl border border-[#4A7C59]/20 bg-white/60 px-6 py-4 text-sm focus:border-[#4A7C59] focus:outline-none focus:ring-4 focus:ring-[#4A7C59]/5 disabled:opacity-50"
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <button
              onClick={handleSend}
              disabled={!inputEnabled || !inputValue.trim() || isBusy}
              className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-[#4A7C59] text-white shadow-lg shadow-[#4A7C59]/20 transition-all hover:bg-[#3B6648] hover:shadow-[#4A7C59]/30 disabled:opacity-30"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
          {syncError && (
            <div className="mx-auto mt-2 max-w-3xl text-center text-xs font-medium text-red-500">
              {syncError}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .message-row {
          display: flex;
          gap: 16px;
          animation: fadeInUp 0.5s ease-out;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .message-row.bot {
          justify-content: flex-start;
        }
        .message-row.user {
          justify-content: flex-end;
        }

        .message-avatar {
          height: 40px;
          width: 40px;
          flex-shrink: 0;
          border: 2px solid white;
          box-shadow: 0 10px 24px rgba(15, 25, 18, 0.08);
          border-radius: 50%;
        }

        .message-bubble {
          max-width: 80%;
          border-radius: 24px;
          padding: 16px 20px;
          font-size: 15px;
          line-height: 1.6;
          box-shadow: 0 14px 32px rgba(15, 25, 18, 0.06);
        }

        .message-bubble.bot {
          background: rgba(255, 255, 255, 0.92);
          color: #233229;
          border: 1px solid rgba(74, 124, 89, 0.08);
          border-bottom-left-radius: 4px;
          backdrop-filter: blur(18px);
        }

        .message-bubble.user {
          background: linear-gradient(135deg, #4a7c59 0%, #5e9070 100%);
          color: white;
          border-bottom-right-radius: 4px;
        }

        .option-btn {
          background: white;
          border: 1px solid #4a7c59;
          color: #4a7c59;
          padding: 10px 18px;
          border-radius: 14px;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(74, 124, 89, 0.06);
        }

        .option-btn:hover:not(:disabled) {
          background: #4a7c59;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 10px rgba(74, 124, 89, 0.2);
        }

        .option-btn:disabled,
        .rating-btn:disabled,
        .finish-btn:disabled {
          cursor: not-allowed;
          opacity: 0.45;
          transform: none;
          box-shadow: none;
        }

        .rating-btn {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border: 1px solid #4a7c59;
          color: #4a7c59;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s ease;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(74, 124, 89, 0.06);
        }

        .rating-btn:hover:not(:disabled) {
          background: #4a7c59;
          color: white;
        }

        .finish-btn {
          background: #233229;
          color: white;
          padding: 12px 24px;
          border-radius: 14px;
          font-weight: 600;
          transition: all 0.2s ease;
          cursor: pointer;
          border: none;
        }

        .finish-btn:hover:not(:disabled) {
          background: #000;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
        }

        .typing-indicator {
          display: flex;
          gap: 4px;
          align-items: center;
          padding: 12px 18px;
        }

        .typing-indicator span {
          width: 6px;
          height: 6px;
          background: #4a7c59;
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;
        }

        .typing-indicator span:nth-child(1) {
          animation-delay: -0.32s;
        }
        .typing-indicator span:nth-child(2) {
          animation-delay: -0.16s;
        }

        @keyframes bounce {
          0%,
          80%,
          100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }

        /* Message Card Styles */
        .progress-card {
          background: rgba(248, 250, 249, 0.94);
          border-radius: 16px;
          padding: 20px;
          border: 1px solid rgba(74, 124, 89, 0.1);
          width: 100%;
          min-width: 280px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);
        }

        .progress-card-header {
          font-weight: 700;
          font-size: 14px;
          margin-bottom: 16px;
          color: #233229;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .step-review {
          background: white;
          border-radius: 12px;
          padding: 14px;
          margin-bottom: 12px;
          border: 1px solid #eee;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .step-review:hover {
          border-color: #4a7c59;
          transform: translateX(4px);
        }

        .step-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .step-title {
          font-weight: 700;
          font-size: 13px;
          color: #4a7c59;
        }

        .step-status {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 100px;
        }

        .step-status.completed {
          background: #e6f7ec;
          color: #2e7d32;
        }
        .step-status.in-progress {
          background: #fff3e0;
          color: #ef6c00;
        }
        .step-status.not-started {
          background: #f5f5f5;
          color: #757575;
        }

        .step-description {
          font-size: 14px;
          color: #233229;
          margin-bottom: 10px;
          font-weight: 500;
        }

        .suds-tracker {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #666;
        }

        .suds-value {
          font-weight: 700;
          color: #233229;
        }

        .suds-arrow {
          color: #4a7c59;
          font-weight: bold;
        }

        /* Weekly Summary Styles */
        .weekly-summary {
          background: rgba(255, 255, 255, 0.96);
          border-radius: 16px;
          padding: 24px;
          border: 1px solid #4a7c5922;
        }

        .summary-header {
          font-weight: 700;
          font-size: 18px;
          color: #233229;
          margin-bottom: 20px;
        }

        .summary-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }

        .stat-box {
          background: #f8faf9;
          padding: 16px 10px;
          border-radius: 12px;
          text-align: center;
        }

        .stat-value {
          font-size: 20px;
          font-weight: 800;
          color: #4a7c59;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 10px;
          color: #666;
          font-weight: 600;
          text-transform: uppercase;
        }

        .encouragement-box {
          font-size: 14px;
          font-style: italic;
          color: #4a7c59;
          line-height: 1.6;
          padding: 16px;
          background: #e6f7ec/30;
          border-radius: 12px;
          border-left: 4px solid #4a7c59;
        }

        /* Recommendation Box */
        .recommendations-box {
          background: rgba(255, 255, 255, 0.96);
          border-radius: 16px;
          padding: 24px;
          border: 1px solid #4a7c5922;
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
          border-radius: 6px;
        }

        .status-banner {
          border: 1px solid rgba(74, 124, 89, 0.12);
          background: rgba(255, 255, 255, 0.88);
          border-radius: 18px;
          padding: 16px 18px;
          font-size: 14px;
          line-height: 1.6;
          color: #425449;
          box-shadow: 0 12px 28px rgba(15, 25, 18, 0.05);
          backdrop-filter: blur(14px);
        }

        .status-banner.error {
          border-color: rgba(188, 68, 68, 0.16);
          background: rgba(255, 241, 241, 0.92);
          color: #8d2c2c;
        }

        @media (max-width: 768px) {
          .message-row {
            gap: 12px;
          }

          .message-bubble {
            max-width: calc(100% - 52px);
          }

          .summary-stats {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
