// lib/hooks/useTrialState.ts
import { useEffect, useRef, useState } from "react";

export function useTrialState(questionId: string) {
  const startTime = useRef(Date.now());

  // When the assistant finishes displaying its answer
  const [answerDisplayedAt, setAnswerDisplayedAt] = useState<number | null>(null);

  function markAnswerDisplayFinished() {
    if (!answerDisplayedAt) {
      setAnswerDisplayedAt(Date.now());
    }
  }

  // ===============================
  // PERFORMANCE VARIABLES
  // ===============================
  const [finalAnswer, setFinalAnswer] =
    useState<"yes" | "no" | null>(null);

  const [correctness, setCorrectness] =
    useState<boolean | null>(null);

  const [agreement, setAgreement] =
    useState<boolean | null>(null);

  // ===============================
  // CONFIDENCE
  // ===============================
  const [confidenceAI, setConfidenceAI] =
    useState<number | null>(null);

  const [confidenceSelf, setConfidenceSelf] =
    useState<number | null>(null);

  // ===============================
  // SEARCH USAGE
  // ===============================
  const [searchUsed, setSearchUsed] = useState(false);
  const [searchClickCount, setSearchClickCount] = useState(0);
  const [searchFirstTime, setSearchFirstTime] =
    useState<number | null>(null);

  function recordSearchClick() {
    if (!searchUsed) {
      setSearchUsed(true);
      setSearchFirstTime(Date.now() - startTime.current);
    }
    setSearchClickCount((c) => c + 1);
  }

  // ===============================
  // LINK CLICKS
  // ===============================
  const [linkClickCount, setLinkClickCount] = useState(0);

  function recordExternalLink() {
    setLinkClickCount((c) => c + 1);
  }

  // ===============================
  // TIMING
  // ===============================
  function computeResponseTime() {
    return Date.now() - startTime.current;
  }

  // ===============================
  // CORRECTNESS (ground truth table)
  // ===============================
  const truthTable: Record<string, "yes" | "no"> = {
    q1: "yes",
    q2: "yes",
    q3: "no",
    q4: "no",
    q5: "yes",
    q6: "yes",
    q7: "no",
    q8: "no"
  };

  function computeCorrectness(finalAnswer: "yes" | "no") {
    const correct = truthTable[questionId];
    return finalAnswer === correct;
  }

  // ===============================
  // AGREEMENT (AI answer table)
  // ===============================
  const aiAnswerTable: Record<string, "yes" | "no"> = {
    q1: "no",
    q2: "no",
    q3: "yes",
    q4: "yes",
    q5: "yes",
    q6: "yes",
    q7: "no",
    q8: "no"
  };

  function computeAgreement(finalAnswer: "yes" | "no") {
    return finalAnswer === aiAnswerTable[questionId];
  }

  // ===============================
  // RESET (when moving to next question)
  // ===============================
  function reset() {
    startTime.current = Date.now();

    setFinalAnswer(null);
    setCorrectness(null);
    setAgreement(null);

    setConfidenceAI(null);
    setConfidenceSelf(null);

    setSearchUsed(false);
    setSearchClickCount(0);
    setSearchFirstTime(null);

    setLinkClickCount(0);

    setAnswerDisplayedAt(null);
  }

  return {
    // PERFORMANCE
    finalAnswer,
    correctness,
    agreement,

    // CONFIDENCE
    confidenceAI,
    confidenceSelf,

    // SEARCH
    searchUsed,
    searchClickCount,
    searchFirstTime,

    // LINKS
    linkClickCount,
    recordExternalLink,

    // TIMING
    computeResponseTime,

    // COMPUTATIONS
    computeCorrectness,
    computeAgreement,

    // DISPLAY TIMING
    markAnswerDisplayFinished,
    answerDisplayedAt,

    // SETTERS
    setFinalAnswer,
    setCorrectness,
    setAgreement,
    setConfidenceAI,
    setConfidenceSelf,

    // SEARCH
    recordSearchClick,

    // RESET
    reset
  };
}
