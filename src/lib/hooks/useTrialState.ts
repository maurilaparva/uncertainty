import { useEffect, useRef, useState } from "react";

export function useTrialState(questionId: string) {
  const startTime = useRef(Date.now());

  // Performance
  const [finalAnswer, setFinalAnswer] = useState<"yes" | "no" | null>(null);
  const [correctness, setCorrectness] = useState<boolean | null>(null);
  const [agreement, setAgreement] = useState<boolean | null>(null);

  // Confidence
  const [confidenceAI, setConfidenceAI] = useState<number | null>(null);
  const [confidenceSelf, setConfidenceSelf] = useState<number | null>(null);
  const [scoreTrust, setScoreTrust] = useState<number | null>(null);
  const [scoreUsefulness, setScoreUsefulness] = useState<number | null>(null);

  // Search usage
  const [searchUsed, setSearchUsed] = useState(false);
  const [searchClickCount, setSearchClickCount] = useState(0);
  const [searchFirstTime, setSearchFirstTime] = useState<number | null>(null);

  // Answer reliance
  const [answerReliance, setAnswerReliance] = useState<string[]>([]);

  function recordSearchClick() {
    if (!searchUsed) {
      setSearchUsed(true);
      setSearchFirstTime(Date.now());
    }
    setSearchClickCount((c) => c + 1);
  }
    const [linkClickCount, setLinkClickCount] = useState(0);

    function recordExternalLink() {
    setLinkClickCount(c => c + 1);
    }
  function computeResponseTime() {
    return Date.now() - startTime.current;
  }
  function reset() {
    startTime.current = Date.now();

    setFinalAnswer(null);
    setCorrectness(null);
    setAgreement(null);

    setConfidenceAI(null);
    setConfidenceSelf(null);
    setScoreTrust(null);
    setScoreUsefulness(null);

    setSearchUsed(false);
    setSearchClickCount(0);
    setSearchFirstTime(null);

    setAnswerReliance([]);
    }

  return {
    // responses
    finalAnswer,
    correctness,
    agreement,
    confidenceAI,
    confidenceSelf,
    scoreTrust,
    scoreUsefulness,
    searchUsed,
    searchClickCount,
    searchFirstTime,
    answerReliance,
    linkClickCount,
    recordExternalLink,

    // setters
    setFinalAnswer,
    setCorrectness,
    setAgreement,
    setConfidenceAI,
    setConfidenceSelf,
    setScoreTrust,
    setScoreUsefulness,
    setAnswerReliance,
    reset,

    // logging
    recordSearchClick,
    computeResponseTime
  };
}
