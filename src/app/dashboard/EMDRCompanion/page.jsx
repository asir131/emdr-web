"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStoredAuth } from "@/redux/authStorage";
import { updateSessionProgress, checkSessionAccess } from "@/utils/sessionProgress";

const CURRENT_EMDR_SESSION_STORAGE_KEY = "currentEMDRSessionId";

const getBaseUrl = () => {
  const rawBaseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || process.env.VITE_BASE_URL || "";

  return rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl;
};

const emdrSessionRequest = async ({
  baseUrl,
  token,
  path,
  method = "GET",
  body,
}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || "Failed to save EMDR session.");
  }

  return result?.data;
};

const startEmdrSession = ({ baseUrl, token, sessionType }) =>
  emdrSessionRequest({
    baseUrl,
    token,
    path: "/api/emdr-session/start",
    method: "POST",
    body: {
      sessionType,
    },
  });

const saveEmdrTarget = ({
  baseUrl,
  token,
  sessionId,
  targetDescription,
  freezeFrame,
}) =>
  emdrSessionRequest({
    baseUrl,
    token,
    path: `/api/emdr-session/${sessionId}/target`,
    method: "PATCH",
    body: {
      targetDescription,
      freezeFrame,
    },
  });

const saveEmdrBeliefs = ({ baseUrl, token, sessionId, beliefPairs }) =>
  emdrSessionRequest({
    baseUrl,
    token,
    path: `/api/emdr-session/${sessionId}/beliefs`,
    method: "PATCH",
    body: {
      beliefPairs,
    },
  });

const saveEmdrEmotions = ({
  baseUrl,
  token,
  sessionId,
  primaryEmotion,
  additionalEmotions,
  bodyLocation,
}) =>
  emdrSessionRequest({
    baseUrl,
    token,
    path: `/api/emdr-session/${sessionId}/emotions`,
    method: "PATCH",
    body: {
      primaryEmotion,
      additionalEmotions,
      bodyLocation,
    },
  });

const saveEmdrSud = ({ baseUrl, token, sessionId, sudRating }) =>
  emdrSessionRequest({
    baseUrl,
    token,
    path: `/api/emdr-session/${sessionId}/sud`,
    method: "PATCH",
    body: {
      sudRating,
    },
  });

const saveEmdrAddiction = ({
  baseUrl,
  token,
  sessionId,
  aspect,
  positiveFeeling,
  pfsRating,
  associatedThoughts,
  bodyLocation,
  visualization,
}) =>
  emdrSessionRequest({
    baseUrl,
    token,
    path: `/api/emdr-session/${sessionId}/addiction`,
    method: "PATCH",
    body: {
      aspect,
      positiveFeeling,
      pfsRating,
      associatedThoughts,
      bodyLocation,
      visualization,
    },
  });

const completeEmdrSession = ({ baseUrl, token, sessionId }) =>
  emdrSessionRequest({
    baseUrl,
    token,
    path: `/api/emdr-session/${sessionId}/complete`,
    method: "PATCH",
  });

const negativeBeliefs = {
  "RESPONSIBILITY - I AM SOMETHING 'WRONG'": [
    "I don't deserve love",
    "I am a bad person",
    "I am terrible",
    "I am worthless (inadequate)",
    "I am shameful",
    "I am not lovable",
    "I am not good enough",
    "I deserve only bad things",
    "I am permanently damaged",
    "I am ugly (my body is hateful)",
    "I do not deserve...",
    "I am stupid (not smart enough)",
    "I am insignificant (unimportant)",
    "I am a disappointment",
    "I deserve to die",
    "I deserve to be miserable",
    "I am different (don't belong)",
  ],
  "RESPONSIBILITY - I DID SOMETHING 'WRONG'": [
    "I should have done something",
    "I did something wrong",
    "I should have known better",
  ],
  "SAFETY/VULNERABILITY": [
    "I cannot be trusted",
    "I cannot trust myself",
    "I cannot trust my judgment",
    "I cannot trust anyone",
    "I cannot protect myself",
    "I am in danger",
    "It's not okay to feel (show) my emotions",
    "I cannot stand up for myself",
    "I cannot let it out",
  ],
  "CONTROL/CHOICE": [
    "I am not in control",
    "I am powerless (helpless)",
    "I am weak",
    "I cannot get what I want",
    "I am a failure (will fail)",
    "I cannot succeed",
    "I have to be perfect (please everyone)",
    "I cannot stand it",
    "I am inadequate",
  ],
};

const positiveBeliefs = {
  "RESPONSIBILITY - I AM SOMETHING 'RIGHT'": [
    "I deserve love; I can have love",
    "I am a good (loving) person",
    "I am fine as I am",
    "I am worthy; I am worthwhile",
    "I am honorable",
    "I am lovable",
    "I am deserving (fine/okay)",
    "I deserve good things",
    "I am (can be) healthy",
    "I am fine (attractive/lovable)",
    "I can have (deserve)...",
    "I am intelligent (able to learn)",
    "I am significant (important)",
    "I am okay just the way I am",
    "I deserve to live",
    "I deserve to be happy",
    "I am okay as I am",
  ],
  "RESPONSIBILITY - I DID THE BEST I COULD": [
    "I did the best I could",
    "I learned (can learn) from it",
    "I do the best I can (I can learn)",
  ],
  "SAFETY/TRUST": [
    "I can be trusted",
    "I can (learn to) trust myself",
    "I can trust my judgment",
    "I can choose whom to trust",
    "I can (learn to) take care of myself",
    "It's over; I am safe now",
    "I can safely feel (show) my emotions",
    "I can make my needs known",
    "I can choose to let it out",
  ],
  "CONTROL/CHOICE": [
    "I am now in control",
    "I now have choices",
    "I am strong",
    "I can get what I want",
    "I can succeed",
    "I can be myself (make mistakes)",
    "I can handle it",
    "I am capable",
    "I can choose whom to trust",
  ],
};

const questionFlows = {
  memory: [
    "Can you describe the memory or event you'd like to work with? Take your time and share as much or as little as feels comfortable.",
    "When you think of this memory, try to 'freeze frame' the most difficult or disturbing moment. So imagine the event is a movie and you press pause on the worst moment. What do you see, hear?",
    "NEGATIVE_BELIEFS",
    "POSITIVE_BELIEFS",
    "VOC_RATING",
    "What emotions are you noticing as you think about this memory? (e.g., sad, frightened, angry, ashamed) Remember to choose an emotion - something you feel in your body, not a thought.",
    "Are there other emotions that come along with the main one? If so, which emotions?",
    "Where do you feel these emotions in your body?",
    "SUD_RATING",
  ],
  future: [
    "Can you describe the future scenario or worst-case situation you're imagining? (e.g., I will catch a virus and infect my family, the house will burn down because I left something on, I will have a panic attack in public, I'll fail the exam and lose everything, my partner will leave me)",
    "If you had to pick one 'freeze frame' moment from this scenario - the worst part - imagine it's a movie and you press pause. What would that look like? What do you see, hear?",
    "NEGATIVE_BELIEFS",
    "POSITIVE_BELIEFS",
    "VOC_RATING",
    "What emotions come up when you imagine this future scenario? (e.g., terrified, panicked, helpless, ashamed) Remember to choose an emotion - something you feel in your body, not a thought.",
    "Are there other emotions that come along with the main one? If so, which emotions?",
    "Where do you notice these feelings in your body?",
    "SUD_RATING",
  ],
  words: [
    "What are the words or thoughts that keep running through your mind?",
    "Can you think of a specific situation - past, present, or imagined future - where these words feel especially true or painful? Try to freeze frame that moment.",
    "NEGATIVE_BELIEFS",
    "POSITIVE_BELIEFS",
    "VOC_RATING",
    "What emotions arise when these words run through your mind? (e.g., anxious, sad, angry, guilty) Remember to choose an emotion - something you feel in your body, not a thought.",
    "Are there other emotions that come along with the main one? If so, which emotions?",
    "Where do you feel this in your body?",
    "SUD_RATING",
  ],
  negative: [
    "What difficult emotion are you experiencing that you'd like to work with?",
    "Can you recall a specific time when you felt this emotion very intensely? Or perhaps imagine a situation where you might feel it? Try to freeze frame that moment. As if it was a movie you are pressing pause on the worst moment.",
    "NEGATIVE_BELIEFS",
    "POSITIVE_BELIEFS",
    "VOC_RATING",
    "Are there other emotions that come along with the main one? If so, which emotions? (Remember: emotions are what you feel in your body like scared, angry, sad - not thoughts)",
    "Where do you notice these emotions in your body?",
    "SUD_RATING",
  ],
  addiction: [
    "What aspect of this addictive behavior has the most intense feeling with it? (e.g., the rush, the anticipation, the first time you did it, the moment of release)",
    "What is the specific positive feeling? (e.g., relaxed, excited, euphoric, powerful, free, numb)",
    "PFS_RATING",
    "Are there any thoughts that go with this positive feeling? What does your mind tell you when you experience it?",
    "Where does this positive feeling sit in your body? (e.g., chest, head, stomach, all over)",
    "Take a moment to visualise this positive feeling. What colour, shape, or image comes to mind when you focus on it?",
    "BLS_INSTRUCTION",
  ],
};

const startingChoices = [
  {
    id: "memory",
    title: "Memory/Past Event",
    subtitle: '"Something that happened"',
    items: ["The assault", "Car accident", "Being bullied"],
    cardClass: "border-[#a8c3b8] hover:bg-[#f0f5f2]",
  },
  {
    id: "future",
    title: "Future Scenario",
    subtitle: '"What if..." fears',
    items: ["Contaminating others", "Failing & losing job", "Being judged"],
    cardClass: "border-[#c3b8a8] hover:bg-[#f5f2f0]",
  },
  {
    id: "words",
    title: "Words/Thoughts",
    subtitle: '"Loops in my head"',
    items: [
      '"Is this the right person?"',
      '"What if I hurt someone?"',
      '"Did I lock the door?"',
    ],
    cardClass: "border-[#b8a8c3] hover:bg-[#f2f0f5]",
  },
  {
    id: "negative",
    title: "Difficult Emotions",
    subtitle: '"I just feel..."',
    items: ["Frozen/numb", "Random panic", "Overwhelming shame"],
    cardClass: "border-[#c3a8b3] hover:bg-[#f5f0f2]",
  },
  {
    id: "addiction",
    title: "Addiction/Craving",
    subtitle: '"Pleasurable but problematic"',
    items: ["Alcohol/drug high", "Shopping rush", "Gaming excitement"],
    cardClass: "border-[#d4b896] hover:bg-[#faf6f0]",
  },
];

const getChoiceLabel = (choiceId) =>
  startingChoices.find((choice) => choice.id === choiceId)?.title || choiceId;

const getSuggestedPositiveBelief = (negativeBelief) => {
  const suggestions = {
    "I am not good enough": "I am good enough",
    "I am not lovable": "I am lovable",
    "I don't deserve love": "I deserve love; I can have love",
    "I am worthless (inadequate)": "I am worthy; I am worthwhile",
    "I am powerless (helpless)": "I now have choices",
    "I am weak": "I am strong",
    "I cannot succeed": "I can succeed",
    "I am a bad person": "I am a good (loving) person",
    "I cannot trust myself": "I can (learn to) trust myself",
    "I am not in control": "I am now in control",
    "I am in danger": "It's over; I am safe now",
    "I am stupid (not smart enough)": "I am intelligent (able to learn)",
    "I am permanently damaged": "I am (can be) healthy",
    "I deserve to die": "I deserve to live",
    "I am a failure (will fail)": "I can succeed",
    "I cannot protect myself": "I can (learn to) take care of myself",
    "I should have done something": "I did the best I could",
    "I did something wrong": "I learned (can learn) from it",
  };

  return suggestions[negativeBelief] || "";
};

const createSummaryMarkup = ({ responses, beliefPairs }) => {
  const isAddictionFlow =
    responses[0] && responses[0].toLowerCase().includes("addiction");
  const sessionType = (responses[0] || "").replace("Starting point: ", "").toLowerCase();
  const emotionIndex = sessionType.includes("difficult emotions") ? 1 : 6;
  const additionalEmotionIndex = sessionType.includes("difficult emotions") ? 6 : 7;
  const bodyLocationIndex = sessionType.includes("difficult emotions") ? 7 : 8;
  const negativeBeliefs = beliefPairs
    .map((pair) => pair?.negative || pair?.negativeBelief || "")
    .filter(Boolean);
  const positiveBeliefs = beliefPairs
    .map((pair) => pair?.positive || pair?.positiveBelief || "")
    .filter(Boolean);
  const target = responses[2] || responses[1] || "";
  const targetPrefix = sessionType.includes("future")
    ? "You are imagining"
    : sessionType.includes("words")
      ? "You are bringing to mind"
      : sessionType.includes("difficult emotions")
        ? "You are focusing on"
        : "You are remembering";
  const emotionParts = [
    responses[emotionIndex],
    responses[additionalEmotionIndex],
  ].filter(Boolean);
  const narrationParts = isAddictionFlow
    ? [
        responses[1] ? `You are focusing on ${responses[1]}.` : "",
        responses[2] ? `The positive feeling is ${responses[2]}.` : "",
        responses[4] ? `The thoughts connected with it are ${responses[4]}.` : "",
        responses[5] ? `You notice it in ${responses[5]}.` : "",
        responses[6] ? `The image or shape that comes to mind is ${responses[6]}.` : "",
        "Now, when you are ready and have this in mind, press start.",
      ]
    : [
        target ? `${targetPrefix} ${target}.` : "",
        negativeBeliefs.length ? `The thoughts are ${negativeBeliefs.join(", ")}.` : "",
        emotionParts.length ? `You are feeling ${emotionParts.join(", ")}.` : "",
        responses[bodyLocationIndex] ? `It sits in ${responses[bodyLocationIndex]}.` : "",
        positiveBeliefs.length
          ? `The positive belief${positiveBeliefs.length > 1 ? "s are" : " is"} ${positiveBeliefs.join(", ")}.`
          : "",
        "Now, when you are ready and have this in mind, press start.",
      ];

  return {
    startingPoint: responses[0]?.replace("Starting point: ", "") || "",
    target: responses[1] || "",
    freezeFrame: responses[2] || "",
    beliefPairs,
    primaryEmotion: !isAddictionFlow ? responses[emotionIndex] || "" : "",
    additionalEmotions: !isAddictionFlow ? responses[additionalEmotionIndex] || "" : "",
    bodyLocation: !isAddictionFlow ? responses[bodyLocationIndex] || "" : responses[5] || "",
    roadmapSummaryText: narrationParts.filter(Boolean).join(" "),
    isAddictionFlow,
    pfsRating: isAddictionFlow
      ? responses.find((item) => /^[0-9]$|^10$/.test(item || ""))
      : null,
    sudRating: !isAddictionFlow
      ? [...responses].reverse().find((item) => /^[0-9]$|^10$/.test(item || ""))
      : null,
  };
};

export default function EMDRCompanion() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, hasHydrated } = useStoredAuth();
  const chatboxRef = useRef(null);
  const currentFlowRef = useRef(null);
  const currentStepRef = useRef(-1);
  const responsesRef = useRef([]);
  const selectedNegativeBeliefsRef = useRef([]);
  const beliefPairsRef = useRef([]);
  const currentNegativeBeliefIndexRef = useRef(0);
  const sessionIdRef = useRef("");
  const sessionTypeRef = useRef("");

  const journeyId = searchParams.get("journeyId") || "";
  const journeyTitle = searchParams.get("title") || "";
  const baseUrl = useMemo(() => getBaseUrl(), []);
  const nextSessionRoute = useMemo(() => {
    if (!journeyId) {
      return "/dashboard/EMDRCompanion/session/session5";
    }

    return `/dashboard/EMDRCompanion/session/session5?journeyId=${encodeURIComponent(
      journeyId
    )}&title=${encodeURIComponent(journeyTitle)}&sessionId=5`;
  }, [journeyId, journeyTitle]);

  const [messages, setMessages] = useState([
    {
      id: "intro-message",
      sender: "EMDR Companion",
      text: "I'm here to gently guide you through preparing for your first EMDR session. We'll work together at your pace.",
    },
    {
      id: "starting-message",
      sender: "EMDR Companion",
      text: "Where would you like to start? Do you have a clear memory of an event? An image of a future worst-case scenario? Words running around in your mind? Or is there an overriding emotion without much thought?",
    },
  ]);
  const [currentInteraction, setCurrentInteraction] = useState({
    type: "starting-options",
  });
  const [userInput, setUserInput] = useState("");
  const [selectedBeliefs, setSelectedBeliefs] = useState([]);
  const [selectedRating, setSelectedRating] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [renderNegativeBeliefs, setRenderNegativeBeliefs] = useState([]);
  const [renderBeliefPairs, setRenderBeliefPairs] = useState([]);
  const [renderCurrentNegativeBeliefIndex, setRenderCurrentNegativeBeliefIndex] =
    useState(0);
  const [sessionError, setSessionError] = useState("");
  const [isSyncingSession, setIsSyncingSession] = useState(false);

  useEffect(() => {
    if (!hasHydrated || !token || !baseUrl) return;

    const runAccessCheck = async () => {
      const activeJourneyId = localStorage.getItem("activeJourneyId");
      if (activeJourneyId) {
        const access = await checkSessionAccess({
          baseUrl,
          token,
          journeyId: activeJourneyId,
          requiredSession: 4,
        });

        if (!access.allowed && access.redirectTo) {
          router.replace(access.redirectTo);
        }
      }
    };

    runAccessCheck();
  }, [hasHydrated, token, baseUrl, router]);

  useEffect(() => {
    if (chatboxRef.current) {
      chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight;
    }
  }, [messages, currentInteraction, summaryData]);

  const ensureSessionPrerequisites = () => {
    if (!baseUrl) {
      throw new Error("EMDR session service is not configured.");
    }

    if (!hasHydrated) {
      throw new Error("Please wait a moment and try again.");
    }

    if (!token) {
      throw new Error("Please sign in again to continue your EMDR session.");
    }
  };

  const ensureSessionId = () => {
    if (!sessionIdRef.current) {
      throw new Error("Your EMDR session was not started. Please begin again.");
    }

    return sessionIdRef.current;
  };

  const runSessionRequest = async (action) => {
    setIsSyncingSession(true);
    setSessionError("");

    try {
      await action();
      return true;
    } catch (error) {
      console.error("Error syncing EMDR session:", error);
      setSessionError(
        error?.message || "Unable to save your EMDR session right now."
      );
      return false;
    } finally {
      setIsSyncingSession(false);
    }
  };

  const getEmotionPayload = (responses) => {
    if (sessionTypeRef.current === "negative") {
      return {
        primaryEmotion: responses[1] || "",
        additionalEmotions: responses[6] || "",
        bodyLocation: responses[7] || "",
      };
    }

    return {
      primaryEmotion: responses[6] || "",
      additionalEmotions: responses[7] || "",
      bodyLocation: responses[8] || "",
    };
  };

  const persistSummaryLocally = (nextSummary) => {
    const sessionData = {
      date: new Date().toISOString(),
      sessionId: sessionIdRef.current || "",
      sessionType: sessionTypeRef.current || "",
      startingPoint: responsesRef.current[0] || "",
      beliefPairs: beliefPairsRef.current,
      responses: responsesRef.current,
      summary: nextSummary,
    };

    const sessions = JSON.parse(localStorage.getItem("emdrSessions") || "[]");
    sessions.push(sessionData);
    localStorage.setItem("emdrSessions", JSON.stringify(sessions));
    localStorage.setItem("lastEMDRSession", JSON.stringify(sessionData));
  };

  const persistGeneratedRoadmapAudioLocally = (completedSession) => {
    const roadmapSummaryAudioUrl = completedSession?.roadmapSummaryAudioUrl;
    const roadmapSummaryText = completedSession?.roadmapSummaryText;

    if (!roadmapSummaryAudioUrl && !roadmapSummaryText) return;

    const currentSession = JSON.parse(localStorage.getItem("lastEMDRSession") || "null");
    if (!currentSession) return;

    const updatedSession = {
      ...currentSession,
      roadmapSummaryAudioUrl: roadmapSummaryAudioUrl || currentSession.roadmapSummaryAudioUrl || "",
      roadmapSummaryText: roadmapSummaryText || currentSession.roadmapSummaryText || "",
      summary: {
        ...(currentSession.summary || {}),
        roadmapSummaryAudioUrl:
          roadmapSummaryAudioUrl ||
          currentSession.summary?.roadmapSummaryAudioUrl ||
          "",
        roadmapSummaryText:
          roadmapSummaryText ||
          currentSession.summary?.roadmapSummaryText ||
          "",
      },
    };

    localStorage.setItem("lastEMDRSession", JSON.stringify(updatedSession));

    const sessions = JSON.parse(localStorage.getItem("emdrSessions") || "[]");
    const updatedSessions = sessions.map((session) =>
      session.sessionId && session.sessionId === updatedSession.sessionId
        ? updatedSession
        : session
    );
    localStorage.setItem("emdrSessions", JSON.stringify(updatedSessions));
  };

  const appendBotMessage = (text) => {
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `${Date.now()}-${Math.random()}`,
        sender: "EMDR Companion",
        text,
      },
    ]);
  };

  const appendUserMessage = (text) => {
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `${Date.now()}-${Math.random()}`,
        sender: "You",
        text,
      },
    ]);
  };

  const displaySummary = async () => {
    const nextSummary = createSummaryMarkup({
      responses: responsesRef.current,
      beliefPairs: beliefPairsRef.current,
    });

    setSummaryData(nextSummary);
    setIsSessionComplete(true);
    setCurrentInteraction(null);
    persistSummaryLocally(nextSummary);

    if (!sessionIdRef.current) {
      return;
    }

    setIsSyncingSession(true);

    try {
      ensureSessionPrerequisites();
      const completedSession = await completeEmdrSession({
        baseUrl,
        token,
        sessionId: sessionIdRef.current,
      });
      persistGeneratedRoadmapAudioLocally(completedSession);
      localStorage.removeItem(CURRENT_EMDR_SESSION_STORAGE_KEY);
      sessionIdRef.current = "";
    } catch (error) {
      console.error("Error completing EMDR session:", error);
      setSessionError(
        error?.message ||
        "Your summary was saved locally, but we could not complete the session online."
      );
    } finally {
      setIsSyncingSession(false);
    }
  };

  const askNext = () => {
    const currentFlow = currentFlowRef.current;
    const currentStep = currentStepRef.current;

    if (!currentFlow) {
      appendBotMessage(
        "Where would you like to start? Do you have a clear memory of an event? An image of a future worst-case scenario? Words running around in your mind? Or is there an overriding emotion without much thought?"
      );
      setCurrentInteraction({ type: "starting-options" });
      return;
    }

    if (currentStep >= currentFlow.length) {
      appendBotMessage(
        "Thank you for sharing. I'm preparing your session summary now..."
      );
      void displaySummary();
      return;
    }

    const question = currentFlow[currentStep];
    const isAddictionFlow =
      responsesRef.current[0] &&
      responsesRef.current[0].toLowerCase().includes("addiction");

    if (question === "NEGATIVE_BELIEFS") {
      if (isAddictionFlow) {
        currentStepRef.current += 1;
        askNext();
        return;
      }

      selectedNegativeBeliefsRef.current = [];
      beliefPairsRef.current = [];
      currentNegativeBeliefIndexRef.current = 0;
      setSelectedBeliefs([]);
      appendBotMessage(
        "What negative belief about yourself comes up when you hold that freeze frame?"
      );
      setCurrentInteraction({ type: "beliefs", beliefType: "negative" });
      return;
    }

    if (question === "POSITIVE_BELIEFS") {
      if (isAddictionFlow) {
        currentStepRef.current += 1;
        askNext();
        return;
      }

      setSelectedBeliefs([]);
      appendBotMessage(
        "What would you prefer to believe about yourself in that situation instead?"
      );
      setCurrentInteraction({ type: "beliefs", beliefType: "positive" });
      return;
    }

    if (question === "VOC_RATING") {
      if (isAddictionFlow) {
        currentStepRef.current += 1;
        askNext();
        return;
      }

      setSelectedRating(null);
      setCurrentInteraction({ type: "rating", ratingType: "voc" });
      return;
    }

    if (question === "SUD_RATING") {
      if (isAddictionFlow) {
        currentStepRef.current += 1;
        askNext();
        return;
      }

      setSelectedRating(null);
      setCurrentInteraction({ type: "rating", ratingType: "sud" });
      return;
    }

    if (question === "PFS_RATING") {
      setSelectedRating(null);
      setCurrentInteraction({ type: "rating", ratingType: "pfs" });
      return;
    }

    if (question === "BLS_INSTRUCTION") {
      appendBotMessage(
        "Great. Now we'll begin bilateral stimulation (BLS) to process this positive feeling. Continue with BLS until the Positive Feeling Scale reaches 0 or 1. Remember: The goal is to reduce the intensity of the pleasurable feeling associated with the addictive behavior, not to eliminate all positive feelings in your life."
      );
      void displaySummary();
      return;
    }

    appendBotMessage(question);
    setCurrentInteraction({ type: "text" });
  };

  const handleStartingChoice = async (choiceId) => {
    const label = getChoiceLabel(choiceId);
    const started = await runSessionRequest(async () => {
      ensureSessionPrerequisites();
      const session = await startEmdrSession({
        baseUrl,
        token,
        sessionType: choiceId,
      });
      const nextSessionId = session?._id || session?.id || "";

      if (!nextSessionId) {
        throw new Error("The EMDR session started without returning an id.");
      }

      sessionIdRef.current = nextSessionId;
      sessionTypeRef.current = choiceId;
      localStorage.setItem(CURRENT_EMDR_SESSION_STORAGE_KEY, nextSessionId);
    });

    if (!started) {
      return;
    }

    appendUserMessage(label);
    responsesRef.current = [`Starting point: ${label}`];
    currentFlowRef.current = questionFlows[choiceId];
    currentStepRef.current = 0;
    beliefPairsRef.current = [];
    selectedNegativeBeliefsRef.current = [];
    currentNegativeBeliefIndexRef.current = 0;
    setSummaryData(null);
    setIsSessionComplete(false);
    setSelectedBeliefs([]);
    setSelectedRating(null);
    setRenderNegativeBeliefs([]);
    setRenderBeliefPairs([]);
    setRenderCurrentNegativeBeliefIndex(0);
    setCurrentInteraction(null);

    window.setTimeout(() => {
      askNext();
    }, 150);
  };

  const handleSubmitText = async () => {
    const input = userInput.trim();
    if (!input) {
      return;
    }

    const nextResponses = [...responsesRef.current, input];
    const currentStep = currentStepRef.current;
    let synced = true;

    if (sessionTypeRef.current !== "addiction" && currentStep === 1) {
      synced = await runSessionRequest(async () => {
        ensureSessionPrerequisites();
        await saveEmdrTarget({
          baseUrl,
          token,
          sessionId: ensureSessionId(),
          targetDescription: nextResponses[1] || "",
          freezeFrame: nextResponses[2] || "",
        });
      });
    } else if (
      sessionTypeRef.current !== "addiction" &&
      ((sessionTypeRef.current === "negative" && currentStep === 6) ||
        (sessionTypeRef.current !== "negative" && currentStep === 7))
    ) {
      synced = await runSessionRequest(async () => {
        ensureSessionPrerequisites();
        const emotionPayload = getEmotionPayload(nextResponses);
        await saveEmdrEmotions({
          baseUrl,
          token,
          sessionId: ensureSessionId(),
          primaryEmotion: emotionPayload.primaryEmotion,
          additionalEmotions: emotionPayload.additionalEmotions,
          bodyLocation: emotionPayload.bodyLocation,
        });
      });
    } else if (sessionTypeRef.current === "addiction" && currentStep === 5) {
      synced = await runSessionRequest(async () => {
        ensureSessionPrerequisites();
        await saveEmdrAddiction({
          baseUrl,
          token,
          sessionId: ensureSessionId(),
          aspect: nextResponses[1] || "",
          positiveFeeling: nextResponses[2] || "",
          pfsRating: Number(nextResponses[3] || 0),
          associatedThoughts: nextResponses[4] || "",
          bodyLocation: nextResponses[5] || "",
          visualization: nextResponses[6] || "",
        });
      });
    }

    if (!synced) {
      return;
    }

    appendUserMessage(input);
    responsesRef.current = nextResponses;
    setUserInput("");
    currentStepRef.current += 1;
    setCurrentInteraction(null);

    window.setTimeout(() => {
      askNext();
    }, 150);
  };

  const handleNegativeBeliefsContinue = () => {
    if (selectedBeliefs.length === 0) {
      return;
    }

    setSessionError("");
    selectedNegativeBeliefsRef.current = selectedBeliefs;
    currentNegativeBeliefIndexRef.current = 0;
    setRenderNegativeBeliefs(selectedBeliefs);
    setRenderCurrentNegativeBeliefIndex(0);
    setRenderBeliefPairs([]);
    appendUserMessage(`Selected negative beliefs: ${selectedBeliefs.join(", ")}`);
    responsesRef.current = [
      ...responsesRef.current,
      `Negative beliefs: ${selectedBeliefs.join(", ")}`,
    ];
    setSelectedBeliefs([]);
    currentStepRef.current += 1;
    setCurrentInteraction(null);

    window.setTimeout(() => {
      askNext();
    }, 150);
  };

  const handlePositiveBeliefContinue = () => {
    if (selectedBeliefs.length === 0) {
      return;
    }

    setSessionError("");
    const currentNegativeBelief =
      selectedNegativeBeliefsRef.current[currentNegativeBeliefIndexRef.current];
    const positiveBelief = selectedBeliefs[0];

    beliefPairsRef.current = [
      ...beliefPairsRef.current,
      {
        negative: currentNegativeBelief,
        positive: positiveBelief,
      },
    ];
    setRenderBeliefPairs(beliefPairsRef.current);

    appendUserMessage(
      `For "${currentNegativeBelief}", I choose: "${positiveBelief}"`
    );

    currentNegativeBeliefIndexRef.current += 1;
    setRenderCurrentNegativeBeliefIndex(currentNegativeBeliefIndexRef.current);
    setSelectedBeliefs([]);

    if (
      currentNegativeBeliefIndexRef.current <
      selectedNegativeBeliefsRef.current.length
    ) {
      appendBotMessage(
        "Now, what would you prefer to believe about yourself instead of the next negative belief?"
      );
      setCurrentInteraction({ type: "beliefs", beliefType: "positive" });
      return;
    }

    responsesRef.current = [
      ...responsesRef.current,
      `Positive beliefs: ${beliefPairsRef.current
        .map((pair) => pair.positive)
        .join(", ")}`,
    ];
    currentStepRef.current += 1;
    setCurrentInteraction(null);

    window.setTimeout(() => {
      askNext();
    }, 150);
  };

  const handleRatingContinue = async () => {
    if (selectedRating === null) {
      return;
    }

    let synced = true;

    if (currentInteraction?.ratingType === "voc") {
      synced = await runSessionRequest(async () => {
        ensureSessionPrerequisites();
        await saveEmdrBeliefs({
          baseUrl,
          token,
          sessionId: ensureSessionId(),
          beliefPairs: beliefPairsRef.current.map((pair) => ({
            negativeBelief: pair.negative,
            positiveBelief: pair.positive,
            vocRating: selectedRating,
          })),
        });
      });
    } else if (currentInteraction?.ratingType === "sud") {
      synced = await runSessionRequest(async () => {
        ensureSessionPrerequisites();
        await saveEmdrSud({
          baseUrl,
          token,
          sessionId: ensureSessionId(),
          sudRating: selectedRating,
        });
      });
    }

    if (!synced) {
      return;
    }

    const ratingLabel =
      currentInteraction?.ratingType === "voc"
        ? `VoC Rating: ${selectedRating}`
        : currentInteraction?.ratingType === "sud"
          ? `SUD Rating: ${selectedRating}`
          : `Positive Feeling Scale: ${selectedRating}`;

    appendUserMessage(ratingLabel);
    responsesRef.current = [...responsesRef.current, String(selectedRating)];
    setSelectedRating(null);
    currentStepRef.current += 1;
    setCurrentInteraction(null);

    window.setTimeout(() => {
      askNext();
    }, 150);
  };

  const currentNegativeBelief =
    renderNegativeBeliefs[renderCurrentNegativeBeliefIndex] || "";
  const suggestedPositiveBelief = getSuggestedPositiveBelief(currentNegativeBelief);

  return (
    <div className=" rounded-[1em] bg-[#f6f7f4]/50 p-6 shadow-[0_10px_25px_rgba(0,0,0,0.06)] md:mt-10 md:p-10">
      <h2 className="mb-3 text-center text-[28px] text-[#3e4e44]">
        Sigmund
      </h2>
      <p className="mb-6 text-[18px] leading-7 text-[#2d2d2d]">
        I&apos;m here to gently guide you through preparing for your first EMDR
        session. We&apos;ll work together at your pace.
      </p>
      {sessionError ? (
        <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {sessionError}
        </div>
      ) : null}

      <div
        ref={chatboxRef}
        className="h-[500px] overflow-y-auto rounded-xl border border-[#cfcfcf] bg-white/50 p-6 text-[17px] leading-7"
      >
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id}>
              <p>
                <strong>{message.sender}:</strong> {message.text}
              </p>
            </div>
          ))}

          {currentInteraction?.type === "starting-options" && (
            <div className="space-y-4">
              <h4 className="text-center font-semibold text-[#41594d]">
                Click on the option that feels most present for you:
              </h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {startingChoices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => handleStartingChoice(choice.id)}
                    disabled={isSyncingSession}
                    className={`rounded-xl border-2 bg-white p-4 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 ${choice.cardClass}`}
                  >
                    <h5 className="mb-2 text-sm font-semibold text-[#3e4e44]">
                      {choice.title}
                    </h5>
                    <p className="mb-2 text-[11px] italic text-[#666]">
                      {choice.subtitle}
                    </p>
                    <ul className="space-y-1 text-[11px]">
                      {choice.items.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
              <p className="text-center text-sm italic text-[#666]">
                Tip: Choose the one that feels strongest or most present right now
              </p>
            </div>
          )}

          {currentInteraction?.type === "beliefs" && (
            <div className="rounded-xl bg-[#f9faf8] p-6">
              {currentInteraction.beliefType === "positive" && currentNegativeBelief ? (
                <div className="mb-4 rounded-md bg-[#e8ebe6] p-3 text-sm font-semibold text-[#41594d]">
                  For the negative belief: &quot;{currentNegativeBelief}&quot;
                </div>
              ) : null}

              {currentInteraction.beliefType === "positive" && suggestedPositiveBelief ? (
                <div className="mb-4 rounded-lg border-[3px] border-[#d4b896] bg-[linear-gradient(135deg,#fffbf0,#fef8e8)] p-4">
                  <p className="mb-2 text-sm font-bold text-[#8b6914]">
                    Suggested Positive Belief (Direct Opposite):
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedBeliefs([suggestedPositiveBelief])}
                    className={`w-full rounded-md border-2 p-4 text-center text-base font-medium ${selectedBeliefs[0] === suggestedPositiveBelief
                      ? "border-[#41594d] bg-[#41594d] text-white"
                      : "border-[#d4b896] bg-white text-[#2d2d2d]"
                      }`}
                  >
                    &quot;{suggestedPositiveBelief}&quot;
                  </button>
                  <p className="mt-3 text-center text-xs italic text-[#666]">
                    Click the suggestion above if it feels right, or choose a
                    different belief from the options below.
                  </p>
                </div>
              ) : null}

              <h3 className="mb-4 text-center text-lg font-semibold text-[#41594d]">
                {currentInteraction.beliefType === "negative"
                  ? "Choose what this situation meant or means to you negatively:"
                  : "Select your preferred positive belief:"}
              </h3>

              <div className="max-h-[300px] space-y-5 overflow-y-auto pr-1">
                {(currentInteraction.beliefType === "negative"
                  ? negativeBeliefs
                  : positiveBeliefs
                ) &&
                  Object.entries(
                    currentInteraction.beliefType === "negative"
                      ? negativeBeliefs
                      : positiveBeliefs
                  ).map(([category, beliefs]) => (
                    <div key={category}>
                      <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.5px] text-[#41594d]">
                        {category}
                      </h4>
                      <div className="space-y-2">
                        {beliefs.map((belief) => {
                          const isSelected = selectedBeliefs.includes(belief);

                          return (
                            <button
                              key={belief}
                              type="button"
                              onClick={() =>
                                setSelectedBeliefs((currentBeliefs) => {
                                  if (currentInteraction.beliefType === "negative") {
                                    return currentBeliefs.includes(belief)
                                      ? currentBeliefs.filter(
                                        (currentBelief) =>
                                          currentBelief !== belief
                                      )
                                      : [...currentBeliefs, belief];
                                  }

                                  return [belief];
                                })
                              }
                              className={`w-full rounded-md border px-4 py-3 text-left text-sm transition-all ${isSelected
                                ? "border-[#41594d] bg-[#41594d] text-white"
                                : "border-[#e0e3dd] bg-white text-[#2d2d2d] hover:border-[#41594d] hover:bg-[#e8ebe6]"
                                }`}
                            >
                              {belief}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>

              <button
                type="button"
                onClick={
                  currentInteraction.beliefType === "negative"
                    ? handleNegativeBeliefsContinue
                    : handlePositiveBeliefContinue
                }
                disabled={selectedBeliefs.length === 0 || isSyncingSession}
                className="mx-auto mt-5 block rounded-md bg-[#41594d] px-6 py-3 text-sm text-white transition-colors hover:bg-[#354a3f] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {currentInteraction.beliefType === "negative"
                  ? "Continue with selected belief(s)"
                  : "Continue with positive belief"}
              </button>
            </div>
          )}

          {currentInteraction?.type === "rating" && (
            <div className="rounded-xl bg-[#f9faf8] p-6 text-center">
              <div className="mb-3 text-base font-semibold leading-7 text-[#41594d]">
                {currentInteraction.ratingType === "voc" && (
                  <>
                    Holding the freeze frame in mind, how true does
                    <br />
                    &quot;{renderBeliefPairs.map((pair) => pair.positive).join(", ")}
                    &quot;
                    <br />
                    feel right now?
                  </>
                )}
                {currentInteraction.ratingType === "sud" && (
                  <>
                    Keeping that frozen moment in your awareness and thinking
                    about
                    <br />
                    &quot;{renderNegativeBeliefs.join(", ")}&quot;
                    <br />
                    How intense is the distress right now?
                  </>
                )}
                {currentInteraction.ratingType === "pfs" && (
                  <>
                    How intense is this positive feeling right now
                    <br />
                    when you think about it?
                  </>
                )}
              </div>

              <p className="mb-6 text-sm italic text-[#666]">
                {currentInteraction.ratingType === "voc" &&
                  "Rate from 1 (not true at all) to 7 (completely true)"}
                {currentInteraction.ratingType === "sud" &&
                  "All of the negative emotions together (0 = none, 10 = most intense)"}
                {currentInteraction.ratingType === "pfs" &&
                  "Rate from 0 (no positive feeling) to 10 (most intense positive feeling)"}
              </p>

              <div className="mb-4 flex flex-wrap justify-center gap-3">
                {Array.from(
                  {
                    length: currentInteraction.ratingType === "voc" ? 7 : 11,
                  },
                  (_, index) =>
                    currentInteraction.ratingType === "voc" ? index + 1 : index
                ).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSelectedRating(value)}
                    disabled={isSyncingSession}
                    className={`flex h-[50px] w-[50px] items-center justify-center rounded-full border-2 text-lg font-semibold transition-all ${selectedRating === value
                      ? "scale-110 border-[#41594d] bg-[#41594d] text-white"
                      : "border-[#d4d7d1] bg-white text-[#41594d] hover:scale-105 hover:border-[#41594d] hover:bg-[#e8ebe6]"
                      }`}
                  >
                    {value}
                  </button>
                ))}
              </div>

              <div className="mb-5 flex justify-between px-4 text-xs text-[#666]">
                <span>
                  {currentInteraction.ratingType === "voc"
                    ? "Not true at all"
                    : currentInteraction.ratingType === "sud"
                      ? "No distress"
                      : "No positive feeling"}
                </span>
                <span>
                  {currentInteraction.ratingType === "voc"
                    ? "Completely true"
                    : currentInteraction.ratingType === "sud"
                      ? "Most intense"
                      : "Most intense"}
                </span>
              </div>

              <button
                type="button"
                onClick={handleRatingContinue}
                disabled={selectedRating === null || isSyncingSession}
                className="rounded-md bg-[#41594d] px-6 py-3 text-sm text-white transition-colors hover:bg-[#354a3f] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          )}

          {summaryData && (
            <div className="rounded-xl border border-[#d4d7d1] bg-white p-6">
              <h3 className="mb-4 text-xl font-semibold text-[#41594d]">
                Your EMDR Session Summary
              </h3>
              <div className="space-y-3 rounded-lg bg-[#f9faf8] p-4">
                {summaryData.startingPoint ? (
                  <p>
                    <strong className="text-[#41594d]">Starting Point:</strong>{" "}
                    {summaryData.startingPoint}
                  </p>
                ) : null}
                {summaryData.target ? (
                  <p>
                    <strong className="text-[#41594d]">Target:</strong>{" "}
                    {summaryData.target}
                  </p>
                ) : null}
                {summaryData.freezeFrame ? (
                  <p>
                    <strong className="text-[#41594d]">Freeze Frame:</strong>{" "}
                    {summaryData.freezeFrame}
                  </p>
                ) : null}

                {!summaryData.isAddictionFlow && summaryData.beliefPairs.length > 0 ? (
                  <div>
                    <p className="mb-2">
                      <strong className="text-[#41594d]">Belief Pairs:</strong>
                    </p>
                    <div className="space-y-2 pl-4 text-sm">
                      {summaryData.beliefPairs.map((pair) => (
                        <div key={`${pair.negative}-${pair.positive}`}>
                          <p>• Negative: {pair.negative}</p>
                          <p>→ Positive: {pair.positive}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {summaryData.isAddictionFlow && summaryData.pfsRating ? (
                  <p>
                    <strong className="text-[#41594d]">
                      Positive Feeling Scale (PFS):
                    </strong>{" "}
                    {summaryData.pfsRating}/10
                  </p>
                ) : null}

                {!summaryData.isAddictionFlow && summaryData.sudRating ? (
                  <p>
                    <strong className="text-[#41594d]">
                      Distress Level (SUD):
                    </strong>{" "}
                    {summaryData.sudRating}/10
                  </p>
                ) : null}
              </div>
              <p className="mt-4 text-center text-sm italic text-[#666]">
                This summary has been saved to your My Space area for your next
                session.
              </p>
            </div>
          )}
        </div>
      </div>

      {currentInteraction?.type === "text" ? (
        <div className="mt-6 flex gap-3">
          <input
            type="text"
            value={userInput}
            onChange={(event) => setUserInput(event.target.value)}
            disabled={isSyncingSession}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSubmitText();
              }
            }}
            placeholder="Type your response here..."
            className="flex-1 rounded-lg border border-[#ccc] bg-white px-4 py-3 text-base outline-none transition-colors focus:border-[#41594d]"
          />
          <button
            type="button"
            onClick={handleSubmitText}
            disabled={isSyncingSession}
            className="rounded-lg bg-[#41594d] px-6 py-3 text-base text-white transition-colors hover:bg-[#354a3f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSyncingSession ? "Saving..." : "Send"}
          </button>
        </div>
      ) : null}

      {isSessionComplete ? (
        <button
          type="button"
          onClick={async () => {
            const activeJourneyId = localStorage.getItem("activeJourneyId");
            if (activeJourneyId && token && baseUrl) {
              await updateSessionProgress({
                baseUrl,
                token,
                journeyId: activeJourneyId,
                compledSession: 4,
              });
            }
            router.push(nextSessionRoute);
          }}
          disabled={isSyncingSession}
          className="mt-6 rounded-lg bg-[#41594d] px-6 py-3 text-base text-white transition-colors hover:bg-[#354a3f] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue to Next Session
        </button>
      ) : null}
    </div>
  );
}
