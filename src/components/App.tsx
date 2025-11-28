'use client';
import { useLocalStorage } from '../lib/hooks/use-local-storage.ts';
import { toast } from 'react-hot-toast';
import { type Message } from 'ai/react';
import React, { useState, useCallback } from 'react';

import { EmptyScreen } from './empty-screen.tsx';
import ChatListContainer from './chat-list-container.tsx';
import WebSearchPanel from './WebSearchPanel.tsx';
import PostTrialSurvey from './PostTrialSurvey.tsx';
import { ChatScrollAnchor } from './chat-scroll-anchors.tsx';

import { useNodesState, useEdgesState } from 'reactflow';
import { useAtom } from 'jotai';
import { viewModeAtom } from '../lib/state.ts';

import { Button } from './ui/button.tsx';
import 'reactflow/dist/style.css';

import { askGpt4Once } from '../lib/openai-client.ts';
import { CustomGraphNode, CustomGraphEdge } from '../lib/types.ts';

import { FROZEN_RESPONSES } from '../lib/frozenResponses.ts';
import { TrialProvider, useTrial } from '../lib/useTrial.tsx';

/* =========================================================================
   NORMALIZATION (punctuation-free, space-collapsed)
   ========================================================================= */
const normalizeQuestion = (q: string) =>
  q
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')       // remove punctuation
    .replace(/\s+/g, ' ');         // collapse multiple spaces

/* =========================================================================
   TRUE_TABLE (normalized keys, NO PUNCTUATION)
   ========================================================================= */
const TRUE_TABLE: Record<string, { gt: 'yes' | 'no'; ai: 'yes' | 'no' }> = {
  "did dupilumab receive fda approval for asthma before chronic rhinosinusitis":
    { gt: "yes", ai: "no" },

  "is there more antihistamine in benadryl than rhinocort":
    { gt: "yes", ai: "no" },

  "is deep vein thrombosis a common side effect of ocella":
    { gt: "no", ai: "yes" },

  "is spironolactone an fdaadproved drug for treating acne":
    { gt: "no", ai: "yes" },

  "are both simvastatin and ambien drugs recommended to be taken at night":
    { gt: "yes", ai: "yes" },

  "is uveitis a common symptom of ankylosing spondylitis":
    { gt: "yes", ai: "yes" },

  "is fever a common symptom of jock itch":
    { gt: "no", ai: "no" },

  "can an adult who has not had chickenpox get shingles":
    { gt: "no", ai: "no" }
};

/* =========================================================================
   WRAPPER
   ========================================================================= */
export function Chat(props) {
  return (
    <TrialProvider>
      <ChatInner {...props} />
    </TrialProvider>
  );
}

/* =========================================================================
   MAIN COMPONENT
   ========================================================================= */
function ChatInner({ id, initialMessages }) {
  const hasOpenAiKey = !!import.meta.env.VITE_OPENAI_API_KEY;
  const trial = useTrial();

  const [useFrozen, setUseFrozen] = useState(true);
  const [viewMode, setViewMode] = useAtom(viewModeAtom);

  const [messages, setMessages] = useState<Message[]>(initialMessages ?? []);
  const [nodes, setNodes] = useNodesState<CustomGraphNode>([]);
  const [edges, setEdges] = useEdgesState<CustomGraphEdge>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [qaCache, setQaCache] = useState<Record<string, string>>({});
  const [showSurvey, setShowSurvey] = useState(false);
  const [previousMode, setPreviousMode] =
    useState<'paragraph' | 'token' | 'relation' | 'raw'>('paragraph');

  const [savedSearches, setSavedSearches] = useLocalStorage(
    'recommended-searches',
    { paragraph_level: [], token_level: [], relation_level: [] }
  );

  const [previewToken] = useLocalStorage('ai-token', null);
  const [serperToken] = useLocalStorage('serper-token', null);

  /* =========================================================================
     SUBMIT TRIAL → Google Sheets
     ========================================================================= */
  async function submitTrialToSheet(surveyData) {
    const WEB_APP_URL =
      "https://script.google.com/macros/s/AKfycbw3x92gcd2Fov1j57tF-grx-bBnxpCuI_OI6y4j5MbCppRhw_RKTqf68_y9CN8VaBWz/exec";

    const body = {
      participantId: trial.participantId,
      interfaceMode: trial.interfaceMode,
      questionId: trial.questionId,

      finalAnswer: surveyData.finalAnswer,
      ConfidenceAI: surveyData.aiConfidence,
      ConfidenceAnswer: surveyData.selfConfidence,
      UseAI: surveyData.useAI ? "TRUE" : "FALSE",
      UseLink: surveyData.useLink ? "TRUE" : "FALSE",
      UseInternet: surveyData.useInternet ? "TRUE" : "FALSE",

      Correct: trial.correctness ? "TRUE" : "FALSE",
      Agree: trial.agreement ? "TRUE" : "FALSE",
      Time: trial.computeResponseTime() / 1000,
      LinkClick: trial.linkClickCount > 0 ? "TRUE" : "FALSE",

      RawData: {
        surveyData,
        trialState: trial
      }
    };

    try {
      await fetch(`${WEB_APP_URL}?t=${Date.now()}`, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
    } catch (err) {
      console.error("Failed to submit trial:", err);
    }
  }

  /* =========================================================================
     APPEND (user submits question)
     ========================================================================= */
  const append = async (msg: any) => {
    const userText = typeof msg === "string" ? msg : msg.content ?? "";
    if (!userText.trim()) return;

    const normalized = normalizeQuestion(userText);
    trial.setQuestionId(normalized);

    // Look up correctness info
    const entry = TRUE_TABLE[normalized];
    if (entry) {
      trial.correctAnswer = entry.gt;
      trial.aiAnswer = entry.ai;
    }

    const newUser: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: userText
    };

    /* DEMO MODE */
    if (useFrozen) {
      const frozen = FROZEN_RESPONSES[normalized];
      if (!frozen) {
        toast.error("No frozen response found.");
        return;
      }

      const resString = JSON.stringify(frozen);

      const newAssistant: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: resString
      };

      if (frozen.recommended_searches) {
        setSavedSearches(frozen.recommended_searches);
      }

      setQaCache((p) => ({ ...p, [normalized]: resString }));
      setMessages((prev) => [...prev, newUser, newAssistant]);
      return;
    }

    /* LIVE MODE */
    if (!hasOpenAiKey) {
      toast.error("Missing OpenAI key.");
      return;
    }

    if (qaCache[normalized]) {
      const cachedAssistant: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: qaCache[normalized]
      };

      try {
        const json = JSON.parse(qaCache[normalized]);
        if (json?.recommended_searches) {
          setSavedSearches(json.recommended_searches);
        }
      } catch {}

      setMessages((prev) => [...prev, newUser, cachedAssistant]);
      return;
    }

    setIsLoading(true);

    const tempAssistant: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "Generating answer…"
    };

    setMessages((prev) => [...prev, newUser, tempAssistant]);

    try {
      const raw = await askGpt4Once(userText, trial.aiAnswer);
      const resString = typeof raw === "string" ? raw : JSON.stringify(raw);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempAssistant.id ? { ...m, content: resString } : m
        )
      );

      setQaCache((p) => ({ ...p, [normalized]: resString }));

      try {
        const json = JSON.parse(resString);
        if (json?.recommended_searches) {
          setSavedSearches(json.recommended_searches);
        }
      } catch {}
    } catch {
      toast.error("GPT-4 failed.");
      setMessages((prev) =>
        prev.filter((m) => m.id !== tempAssistant.id)
      );
    } finally {
      setIsLoading(false);
    }
  };

  /* SHOW SURVEY */
  const handleBackToHome = useCallback(() => {
    setPreviousMode(viewMode);
    setShowSurvey(true);
  }, [viewMode]);

  /* =========================================================================
     RENDER
     ========================================================================= */
  return (
    <div className="w-full flex justify-center">
      <div className="max-w-6xl w-full rounded-lg border bg-background p-6 flex">

        {/* LEFT SIDE */}
        <div className="flex-1">
          <div className="flex justify-end mb-4">
            <Button
              variant={useFrozen ? "secondary" : "default"}
              onClick={() => setUseFrozen(!useFrozen)}
            >
              {useFrozen ? "Demo Mode" : "Live Mode"}
            </Button>
          </div>

          {showSurvey && (
            <PostTrialSurvey
              onDone={async (surveyData) => {
                trial.correctness =
                  surveyData.finalAnswer === trial.correctAnswer;
                trial.agreement =
                  surveyData.finalAnswer === trial.aiAnswer;

                await submitTrialToSheet(surveyData);

                setShowSurvey(false);
                setMessages([]);
                setNodes([]);
                setEdges([]);
                setViewMode(previousMode);
                trial.reset();
              }}
              onBack={() => {
                setShowSurvey(false);
                setViewMode(previousMode);
              }}
            />
          )}

          {!showSurvey && messages.length > 0 && (
            <>
              <div className="flex justify-start mb-3">
                <Button variant="ghost" onClick={handleBackToHome}>
                  ← Back to Home
                </Button>
              </div>

              <div className="pt-4 md:pt-10 flex justify-center fade-in">
                <div className="max-w-2xl w-full text-center">
                  <ChatListContainer
                    key={messages.map((m) => m.id).join('|')}
                    messages={messages}
                    nodes={nodes}
                    edges={edges}
                    activeStep={0}
                    onLinkClick={() => trial.recordExternalLink()}
                  />
                  <ChatScrollAnchor trackVisibility={isLoading} />
                </div>
              </div>
            </>
          )}

          {!showSurvey && messages.length === 0 && (
            <EmptyScreen
              setInput={() => {}}
              id={id}
              append={append}
              initialOpen={!previewToken || !serperToken}
              isModelLoaded={hasOpenAiKey}
            />
          )}
        </div>

        {/* RIGHT SIDE */}
        {messages.length > 0 && !showSurvey && (
          <WebSearchPanel
            recommended={savedSearches}
            viewMode={viewMode}
            onSearchClick={() => trial.recordSearchClick()}
          />
        )}
      </div>
    </div>
  );
}
