'use client';
import { useLocalStorage } from '../lib/hooks/use-local-storage.ts';
import { toast } from 'react-hot-toast';
import { type Message } from 'ai/react';
import React, { useState, useEffect, useCallback } from 'react';
import { EmptyScreen } from './empty-screen.tsx';

import ChatListContainer from './chat-list-container.tsx';
import WebSearchPanel from './WebSearchPanel.tsx';

import { ViewModeProvider } from './ui/view-mode.tsx';
import { ReactFlowProvider } from 'reactflow';
import { ChatScrollAnchor } from './chat-scroll-anchors.tsx';
import {
  useNodesState,
  useEdgesState,
  Position,
} from 'reactflow';
import dagre from 'dagre';
import { useAtom } from 'jotai';
import { viewModeAtom } from '../lib/state.ts';
import { Button } from './ui/button.tsx';
import 'reactflow/dist/style.css';

import { askGpt4Once } from '../lib/openai-client.ts';
import { webSearch } from '../lib/search.ts';   // ← NEW (DuckDuckGo scraper)

import {
  CustomGraphNode,
  CustomGraphEdge
} from '../lib/types.ts';

// ---- Layout Helpers ----
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));
const nodeWidth = 172;
const nodeHeight = 86;

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: 120,
    nodesep: 80,
    edgesep: 30
  });

  nodes.forEach(node => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });
  edges.forEach(edge => {
    dagreGraph.setEdge(edge.source, edge.target);
  });
  dagre.layout(dagreGraph);

  nodes.forEach(node => {
    const n = dagreGraph.node(node.id);
    node.targetPosition = isHorizontal ? Position.Left : Position.Top;
    node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;
    node.position = { x: n.x - nodeWidth / 2, y: n.y - nodeHeight / 2 };
  });

  return { nodes, edges };
};

const normalizeQuestion = (q: string) => q.trim().toLowerCase();

export function Chat({ id, initialMessages }) {
  const hasOpenAiKey = !!import.meta.env.VITE_OPENAI_API_KEY;

  const [viewMode] = useAtom(viewModeAtom);
  const [messages, setMessages] = useState(initialMessages ?? []);
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);
  const [layoutDirection] = useState('TB');
  const [isLoading, setIsLoading] = useState(false);

  const [qaCache, setQaCache] = useState({});

  const handleBackToHome = useCallback(() => {
    setMessages([]);
    setNodes([]);
    setEdges([]);
  }, []);

  const [previewToken] = useLocalStorage('ai-token', null);
  const [serperToken] = useLocalStorage('serper-token', null);

  useEffect(() => {
    console.log('📜 Messages updated:', messages);
  }, [messages]);


  // -----------------------
  //    append() → GPT-4
  // -----------------------
  const append = async (msg) => {
    console.log('🧠 append() received:', msg);

    const userText = typeof msg === 'string' ? msg : msg.content ?? '';
    if (!userText.trim()) return;

    if (!hasOpenAiKey) {
      toast.error('OpenAI API key missing in .env');
      return;
    }

    const normalized = normalizeQuestion(userText);

    const newUser = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userText
    };

    // Cached?
    if (qaCache[normalized]) {
      const cachedAssistant = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: qaCache[normalized]
      };
      setMessages(prev => [...prev, newUser, cachedAssistant]);
      return;
    }

    setIsLoading(true);

    const newAssistant = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'Generating answer…'
    };

    setMessages(prev => [...prev, newUser, newAssistant]);

    try {
      const res = await askGpt4Once(userText);

      setMessages(prev =>
        prev.map(m => (m.id === newAssistant.id ? { ...m, content: res } : m))
      );

      setQaCache(prev => ({ ...prev, [normalized]: res }));
    } catch (err) {
      console.error('❌ GPT-4 failed:', err);
      toast.error('GPT-4 inference failed.');
      setMessages(prev => prev.filter(m => m.id !== newAssistant.id));
    } finally {
      setIsLoading(false);
    }
  };


  // --------------------------
  //       MAIN RETURN
  // --------------------------
  return (
    <ViewModeProvider>
      <div className="w-full flex justify-center">

        {/* Outer container includes space for sidebar */}
        <div className="max-w-6xl w-full rounded-lg border bg-background p-6 flex">

          {/* LEFT COLUMN — Chat */}
          <div className="flex-1">

            {messages.length ? (
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

                <div className="pt-4 md:pt-10 flex justify-center">
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
            ) : (
              <EmptyScreen
                setInput={() => {}}
                id={id!}
                append={append}
                initialOpen={!previewToken || !serperToken}
                isModelLoaded={hasOpenAiKey}
              />
            )}

          </div>

          {/* RIGHT COLUMN — Web Search Panel */}
          <WebSearchPanel onSearch={webSearch} />

        </div>
      </div>
    </ViewModeProvider>
  );
}
