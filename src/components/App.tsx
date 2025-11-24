'use client';
import { useLocalStorage } from '../lib/hooks/use-local-storage.ts';
import { toast } from 'react-hot-toast';
import { type Message } from 'ai/react';
import React, { useState, useCallback, useEffect } from 'react';
import { EmptyScreen } from './empty-screen.tsx';

import ChatListContainer from './chat-list-container.tsx';
import WebSearchPanel from './WebSearchPanel.tsx';
import PostTrialSurvey from './PostTrialSurvey.tsx';

// ❌ REMOVE ViewModeProvider here – it was putting Chat
// in a different Jotai store than its children.
// import { ViewModeProvider } from './ui/view-mode.tsx';
import { ChatScrollAnchor } from './chat-scroll-anchors.tsx';

import { useNodesState, useEdgesState } from 'reactflow';

import { useAtom } from 'jotai';
import { viewModeAtom } from '../lib/state.ts';
import { Button } from './ui/button.tsx';
import 'reactflow/dist/style.css';

import { askGpt4Once } from '../lib/openai-client.ts';
import { CustomGraphNode, CustomGraphEdge } from '../lib/types.ts';

const normalizeQuestion = (q: string) => q.trim().toLowerCase();

export function Chat({ id, initialMessages }) {
  const hasOpenAiKey = !!import.meta.env.VITE_OPENAI_API_KEY;

  // ✅ This now uses the ONE global Jotai store
  const [viewMode, setViewMode] = useAtom(viewModeAtom);

  const [messages, setMessages] = useState<Message[]>(initialMessages ?? []);
  const [nodes, setNodes] = useNodesState<CustomGraphNode>([]);
  const [edges, setEdges] = useEdgesState<CustomGraphEdge>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [qaCache, setQaCache] = useState<Record<string, string>>({});
  const [showSurvey, setShowSurvey] = useState(false);

  // ⭐ Track previous interface when leaving for survey
  const [previousMode, setPreviousMode] = useState<'paragraph' | 'token' | 'relation' | 'raw'>('paragraph');

  // ⭐ Persistent searches (LOCALSTORAGE)
  const [savedSearches, setSavedSearches] = useLocalStorage(
    'recommended-searches',
    {
      paragraph_level: [] as string[],
      token_level: [] as string[],
      relation_level: [] as string[]
    }
  );

  const [previewToken] = useLocalStorage('ai-token', null);
  const [serperToken] = useLocalStorage('serper-token', null);

  // -------------------------------
  // GPT append logic
  // -------------------------------
  const append = async (msg: any) => {
    const userText = typeof msg === 'string' ? msg : msg.content ?? '';
    if (!userText.trim()) return;

    if (!hasOpenAiKey) {
      toast.error('OpenAI API key missing in .env');
      return;
    }

    const normalized = normalizeQuestion(userText);

    const newUser: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userText
    };

    // 👉 Cached response
    if (qaCache[normalized]) {
      const cachedAssistant: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
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

    const newAssistant: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'Generating answer…'
    };

    setMessages((prev) => [...prev, newUser, newAssistant]);

    try {
      const res = await askGpt4Once(userText);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === newAssistant.id ? { ...m, content: res } : m
        )
      );

      setQaCache((prev) => ({ ...prev, [normalized]: res }));

      try {
        const json = JSON.parse(res);
        if (json?.recommended_searches) {
          setSavedSearches(json.recommended_searches);
        }
      } catch {}

    } catch (err) {
      toast.error('GPT-4 inference failed.');
      setMessages((prev) => prev.filter((m) => m.id !== newAssistant.id));
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------
  // Re-extract searches from messages (most recent assistant JSON)
  // -------------------------------------------------------
  useEffect(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role !== 'assistant') continue;

      try {
        const j = JSON.parse(m.content ?? '{}');
        if (j?.recommended_searches) {
          setSavedSearches(j.recommended_searches);
          return;
        }
      } catch {
        // ignore invalid JSON
      }
    }
  }, [messages, setSavedSearches]);

  // ⭐ Clear searches when starting a brand new conversation
  useEffect(() => {
    if (messages.length === 0) {
      setSavedSearches({
        paragraph_level: [],
        token_level: [],
        relation_level: []
      });
    }
  }, [messages.length, setSavedSearches]);

  // -------------------------------
  // “Back to Home”
  // -------------------------------
  const handleBackToHome = useCallback(() => {
    setPreviousMode(viewMode);
    setShowSurvey(true);
  }, [viewMode]);

  // -------------------------------
  // RENDER
  // -------------------------------
  console.log('DEBUG: CURRENT VIEW MODE =', viewMode);

  return (
    // ❌ Removed <ViewModeProvider> – everyone now shares the same jotai store
    <div className="w-full flex justify-center">
      <div className="max-w-6xl w-full rounded-lg border bg-background p-6 flex">

        {/* LEFT SIDE */}
        <div className="flex-1">

          {/* Survey Mode */}
          {showSurvey && (
            <PostTrialSurvey
              onDone={(results) => {
                console.log('Post-trial survey results:', results);

                setShowSurvey(false);
                setMessages([]);
                setNodes([]);
                setEdges([]);
                setViewMode(previousMode);
              }}
              onBack={() => {
                setShowSurvey(false);
                setViewMode(previousMode);
              }}
            />
          )}

          {/* Chat View */}
          {!showSurvey && messages.length > 0 && (
            <>
              <div className="flex justify-start mb-3">
                <Button
                  variant="ghost"
                  onClick={handleBackToHome}
                  className="flex items-center space-x-2"
                >
                  <span className="text-lg">←</span>
                  <span>Back to Home</span>
                </Button>
              </div>

              <div className="pt-4 md:pt-10 flex justify-center fade-in">
                <div className="max-w-2xl w-full text-center">
                  <ChatListContainer
                    key={messages.map((m) => m.id).join('|')}
                    messages={messages}
                    activeStep={0}
                    nodes={nodes}
                    edges={edges}
                  />
                  <ChatScrollAnchor trackVisibility={isLoading} />
                </div>
              </div>
            </>
          )}

          {/* Empty Screen */}
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

        {/* RIGHT SIDE – Web search panel */}
        {messages.length > 0 && !showSurvey && (
          <WebSearchPanel
            recommended={savedSearches}
            viewMode={viewMode}
          />
        )}
      </div>
    </div>
  );
}
