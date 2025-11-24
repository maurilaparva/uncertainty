'use client';
import { useLocalStorage } from '../lib/hooks/use-local-storage.ts';
import { toast } from 'react-hot-toast';
import { type Message } from 'ai/react';
import React, { useState, useCallback, useEffect } from 'react';
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

// ⭐ Frozen responses
import { FROZEN_RESPONSES } from '../lib/frozenResponses.ts';

// ⭐ Trial Provider
import { TrialProvider, useTrial } from '../lib/useTrial.tsx';

const normalizeQuestion = (q: string) => q.trim().toLowerCase();



/* =========================================================================
   WRAPPER: Chat WITH TrialProvider
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

  // ⭐ Global trial tracker
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

  // Freeze recommended searches
  const [savedSearches, setSavedSearches] = useLocalStorage(
    'recommended-searches',
    { paragraph_level: [], token_level: [], relation_level: [] }
  );

  const [previewToken] = useLocalStorage('ai-token', null);
  const [serperToken] = useLocalStorage('serper-token', null);



  /* =========================================================================
     SUBMIT TRIAL TO GOOGLE SHEETS
     ========================================================================= */
  async function submitTrialToSheet(surveyData) {
    const WEB_APP_URL =
      "https://script.google.com/macros/s/AKfycbwfl-xf0QX7WBbMeTIofRIoajjIkq0aTqpPJ5Vwe103QABwr2jgAZf6v7vLLbwy93w0/exec";

    const body = {
      participantId: trial.participantId,
      interfaceMode: trial.interfaceMode,
      questionId: trial.questionId,

      finalAnswer: surveyData.finalAnswer,
      correctness: trial.correctness,
      responseTime: trial.computeResponseTime(),
      agreement: trial.agreement,
      linkClickCount: trial.linkClickCount,

      confidence_ai: surveyData.aiConfidence,
      confidence_self: surveyData.selfConfidence,

      scoreTrust: surveyData.trustScore,
      scoreUsefulness: surveyData.helpfulness,

      searchUsed: trial.searchUsed,
      searchFirstTime: trial.searchFirstTime,
      searchClickCount: trial.searchClickCount,

      answerReliance: trial.answerReliance,

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
        body: JSON.stringify(body),
      });
    } catch (err) {
      console.error("Failed to submit trial:", err);
    }
  }





  /* =========================================================================
     APPEND (existing behavior)
     ========================================================================= */
  const append = async (msg: any) => {
    const userText = typeof msg === "string" ? msg : msg.content ?? "";
    if (!userText.trim()) return;

    const normalized = normalizeQuestion(userText);

    const newUser: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: userText,
    };

    /* ============================================================
       DEMO MODE
       ============================================================ */
    if (useFrozen) {
      const frozen = FROZEN_RESPONSES[normalized];
      if (!frozen) {
        toast.error("No frozen response found for this question.");
        return;
      }

      const responseString = JSON.stringify(frozen);

      const newAssistant: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: responseString,
      };

      setMessages((prev) => [...prev, newUser, newAssistant]);

      if (frozen.recommended_searches) {
        setSavedSearches(frozen.recommended_searches);
      }

      setQaCache((prev) => ({ ...prev, [normalized]: responseString }));
      return;
    }

    /* ============================================================
       LIVE MODE
       ============================================================ */
    if (!hasOpenAiKey) {
      toast.error("OpenAI API key missing in .env");
      return;
    }

    if (qaCache[normalized]) {
      const cachedAssistant: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: qaCache[normalized],
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
      content: "Generating answer…",
    };

    setMessages((prev) => [...prev, newUser, tempAssistant]);

    try {
      const raw = await askGpt4Once(userText);
      const resString =
        typeof raw === "string" ? raw : JSON.stringify(raw);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempAssistant.id ? { ...m, content: resString } : m
        )
      );

      setQaCache((prev) => ({ ...prev, [normalized]: resString }));

      try {
        const json = JSON.parse(resString);
        if (json?.recommended_searches) {
          setSavedSearches(json.recommended_searches);
        }
      } catch {}
    } catch {
      toast.error("GPT-4 inference failed.");
      setMessages((prev) => prev.filter((m) => m.id !== tempAssistant.id));
    } finally {
      setIsLoading(false);
    }
  };



  /* =========================================================================
     Update recommended searches from latest assistant
     ========================================================================= */
  useEffect(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role !== "assistant") continue;

      try {
        const json = JSON.parse(m.content ?? "{}");
        if (json?.recommended_searches) {
          setSavedSearches(json.recommended_searches);
          return;
        }
      } catch {}
    }
  }, [messages]);



  /* =========================================================================
     Show Survey
     ========================================================================= */
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
              {useFrozen
                ? "Demo Mode (Frozen Responses)"
                : "Live Mode (GPT-4)"}
            </Button>
          </div>

          {showSurvey && (
            <PostTrialSurvey
              onDone={async (surveyData) => {
                // ⭐ submit to Google Sheets
                await submitTrialToSheet(surveyData);

                // reset UI
                setShowSurvey(false);
                setMessages([]);
                setNodes([]);
                setEdges([]);

                // reset trial
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
                    key={messages.map((m) => m.id).join("|")}
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
              id={id!}
              append={append}
              initialOpen={!previewToken || !serperToken}
              isModelLoaded={hasOpenAiKey}
            />
          )}
        </div>

        {/* RIGHT SIDE */}
        {messages.length > 0 && !showSurvey && viewMode !== "baseline" && (
          <WebSearchPanel
            recommended={savedSearches}
            viewMode={viewMode}
            onSearchClick={() => trial.recordSearchClick()} // TRACK SEARCH CLICKS
          />
        )}
      </div>
    </div>
  );
}
