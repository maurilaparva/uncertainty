// lib/useTrial.tsx
'use client';

import React, { createContext, useContext, useState } from 'react';
import { useTrialState } from './hooks/useTrialState';
import { useLocalStorage } from './hooks/use-local-storage';

interface TrialContextType {
  participantId: string;

  interfaceMode: string;
  setInterfaceMode: (mode: string) => void;

  questionId: string;
  setQuestionId: (id: string) => void;

  // Persisted per question
  aiAnswer: "yes" | "no" | null;
  correctAnswer: "yes" | "no" | null;
  setAiAnswer: (x: "yes" | "no") => void;
  setCorrectAnswer: (x: "yes" | "no") => void;

  // trial state (from useTrialState)
  finalAnswer: "yes" | "no" | null;
  correctness: boolean | null;
  agreement: boolean | null;

  confidenceAI: number | null;
  confidenceSelf: number | null;

  searchUsed: boolean;
  searchClickCount: number;
  searchFirstTime: number | null;

  linkClickCount: number;
  recordExternalLink: () => void;

  markAnswerDisplayFinished: () => void;
  answerDisplayedAt: number | null;

  setFinalAnswer: (x: any) => void;
  setCorrectness: (x: any) => void;
  setAgreement: (x: any) => void;

  setConfidenceAI: (x: any) => void;
  setConfidenceSelf: (x: any) => void;

  // ⭐ NEWLY ENSURED (search tracking)
  recordSearchClick: () => void;

  computeResponseTime: () => number;

  computeCorrectness: (fa: "yes" | "no") => boolean;
  computeAgreement: (fa: "yes" | "no") => boolean;

  reset: () => void;
}

const TrialContext = createContext<TrialContextType | null>(null);

// ==================================================================
// Provider
// ==================================================================
export function TrialProvider({ children }) {
  const [participantId] = useLocalStorage(
    'participant-id',
    crypto.randomUUID()
  );

  const [interfaceMode, setInterfaceMode] = useState("baseline");

  const [questionId, setQuestionId] = useState("");

  // Persisted per-question values
  const [aiAnswer, setAiAnswer] = useState<"yes" | "no" | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<"yes" | "no" | null>(null);

  // ⭐ NEW — persistent counter for search clicks
  const [searchClickCount, setSearchClickCount] = useState(0);

  // Base state (timing, correctness, link clicks, etc.)
  const trialState = useTrialState();

  // ⭐ NEW — unified search logger
  function recordSearchClick() {
    setSearchClickCount((x) => x + 1);

    // Mark searchUsed + first timestamp
    if (!trialState.searchUsed) {
      trialState.setSearchUsed(true);
      trialState.setSearchFirstTime(Date.now());
    }
  }

  // Reset participant-trial actions between questions
  const reset = () => {
    trialState.reset();

    // We DO NOT reset aiAnswer or correctAnswer here
    // but we SHOULD reset search count per question:
    setSearchClickCount(0);
  };

  const value: TrialContextType = {
    participantId,
    interfaceMode,
    setInterfaceMode,

    questionId,
    setQuestionId,

    aiAnswer,
    correctAnswer,
    setAiAnswer,
    setCorrectAnswer,

    // useTrialState values (spread)
    ...trialState,

    // ⭐ ensure search tracking functions & values are exported
    recordSearchClick,
    searchClickCount,

    reset,
  };

  return (
    <TrialContext.Provider value={value}>
      {children}
    </TrialContext.Provider>
  );
}

export function useTrial() {
  const ctx = useContext(TrialContext);
  if (!ctx) throw new Error("useTrial must be used inside <TrialProvider>");
  return ctx;
}
