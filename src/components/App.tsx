'use client';
import { useLocalStorage } from '../lib/hooks/use-local-storage.ts';
import { toast } from 'react-hot-toast';
import { type Message } from 'ai/react';
import React, { useState, useEffect, useCallback } from 'react';
import { EmptyScreen } from './empty-screen.tsx';
import { ChatList } from './chat-list.tsx';
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
import FlowComponent from './vis-flow/index.tsx';
import { Button } from './ui/button.tsx';
import { IconRefresh, IconStop } from './ui/icons.tsx';
import 'reactflow/dist/style.css';
import { loadPhi3 } from './model/model.ts';
import {
  CustomGraphNode,
  CustomGraphEdge
} from '../lib/types.ts';

// ---- Layout helpers (unchanged) ----
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));
const nodeWidth = 172;
const nodeHeight = 86;

const getLayoutedElements = (
  nodes: CustomGraphNode[],
  edges: CustomGraphEdge[],
  direction = 'TB'
) => {
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

// ---- component start ----
export function Chat({ id, initialMessages }: { id?: string; initialMessages?: Message[] }) {
  const [phi3, setPhi3] = useState<any | null>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      console.log('⏳ Loading Phi-3...');
      const model = await loadPhi3();
      if (mounted) setPhi3(() => model);
      console.log('✅ Phi-3 loaded:', model ? 'success' : 'failed');
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const [viewMode] = useAtom(viewModeAtom);
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? []);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [layoutDirection, setLayoutDirection] = useState('TB');
  const [isLoading, setIsLoading] = useState(false);

  const handleBackToHome = useCallback(() => {
    console.log('↩️ Returning to Home — clearing messages');
    setMessages([]);
    setNodes([]);
    setEdges([]);
  }, []);

  const [previewToken] = useLocalStorage<string | null>('ai-token', null);
  const [serperToken] = useLocalStorage<string | null>('serper-token', null);

  // Debug whenever messages change
  useEffect(() => {
    console.log('📜 Messages updated:', messages);
  }, [messages]);

  // 🧠 Enhanced append() with demo case
  const append = async (msg: Partial<Message> | string) => {
    console.log('🧠 append() received:', msg);
    const userText = typeof msg === 'string' ? msg : msg.content ?? '';
    if (!userText.trim()) return;

    // 🧪 DEMO MODE: Dupilumab example
    if (userText === '__demo_dupilumab__') {
      console.log('🧪 DEMO branch triggered');

      const demoQuestion = "Did Dupilumab receive FDA approval for Asthma before Chronic Rhinosinusitis?";
      const demoParagraph =
        "Dupilumab was approved by the FDA for Chronic Rhinosinusitis with Nasal Polyps on June 26, 2019. It was later approved for Asthma on October 20, 2022.";

      const fakeTokenUncertainty = [
        { word: 'Dupilumab', score: 0.2 },
        { word: 'was', score: 0.1 },
        { word: 'approved', score: 0.3 },
        { word: 'by', score: 0.1 },
        { word: 'the', score: 0.05 },
        { word: 'FDA', score: 0.25 },
        { word: 'for', score: 0.15 },
        { word: 'Chronic', score: 0.4 },
        { word: 'Rhinosinusitis', score: 0.45 },
        { word: 'with', score: 0.2 },
        { word: 'Nasal', score: 0.25 },
        { word: 'Polyps', score: 0.3 },
        { word: 'on', score: 0.1 },
        { word: 'June', score: 0.2 },
        { word: '26,', score: 0.1 },
        { word: '2019.', score: 0.05 },
        { word: 'It', score: 0.1 },
        { word: 'was', score: 0.15 },
        { word: 'later', score: 0.2 },
        { word: 'approved', score: 0.25 },
        { word: 'for', score: 0.15 },
        { word: 'Asthma', score: 0.35 },
        { word: 'on', score: 0.15 },
        { word: 'October', score: 0.25 },
        { word: '20,', score: 0.1 },
        { word: '2022.', score: 0.05 }
      ];

      const demoAssistant: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: JSON.stringify({
          type: 'demo',
          paragraph: demoParagraph,
          overall_confidence: 0.76,
          tokens: fakeTokenUncertainty
        })
      };

      console.log('🧩 demoAssistant created:', demoAssistant);

      setMessages(prev => {
        const newMessages = [
          ...prev,
          { id: crypto.randomUUID(), role: 'user', content: demoQuestion },
          demoAssistant
        ];
        console.log('✅ Setting messages to:', newMessages);
        return newMessages;
      });

      return;
    }

    // 🔄 Normal model behavior
    if (!phi3 || typeof phi3 !== 'function') {
      toast.error('Model not ready yet.');
      return;
    }

    setIsLoading(true);
    const newUser: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userText
    };
    setMessages(prev => [...prev, newUser]);

    const newAssistant: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'Generating answer…'
    };
    setMessages(prev => [...prev, newAssistant]);

    try {
      console.log('⚙️ Calling Phi-3 model...');
      const res = await phi3(`Answer the question: ${userText}`, {
        max_new_tokens: 400
      });
      console.log('✅ Phi-3 response:', res);
      setMessages(prev =>
        prev.map(m =>
          m.id === newAssistant.id ? { ...m, content: res } : m
        )
      );
    } catch (err) {
      console.error('❌ Model inference failed:', err);
      toast.error('Model inference failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const StopRegenerateButton = isLoading ? (
    <Button variant="outline" onClick={() => setIsLoading(false)} className="mx-auto mt-4 flex">
      <IconStop className="mr-2" /> Stop
    </Button>
  ) : (
    <Button
      variant="outline"
      onClick={() => append(messages[messages.length - 2]?.content || '')}
      className="mx-auto mt-4 flex"
    >
      <IconRefresh className="mr-2" /> Regenerate
    </Button>
  );

  const updateLayout = useCallback(() => {
    const { nodes: n, edges: e } = getLayoutedElements(
      nodes as CustomGraphNode[],
      edges as CustomGraphEdge[],
      layoutDirection
    );
    setNodes(n);
    setEdges(e);
  }, [nodes, edges, layoutDirection]);

  useEffect(() => {
    updateLayout();
  }, [updateLayout]);

  // --- MAIN RENDER ---
  return (
    <ViewModeProvider>
      <div className="w-full flex justify-center">
        <div className="max-w-4xl w-full rounded-lg border bg-background p-6">
          {messages.length ? (
            <>
              <div className="flex justify-start mb-3">
                <Button
                  variant="ghost"
                  onClick={handleBackToHome}
                  className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
                >
                  <span className="text-lg">←</span>
                  <span>Back to Home</span>
                </Button>
              </div>

              {viewMode === 'paragraph' && (
                <div className="pt-4 md:pt-10 flex justify-center">
                  <div className="max-w-2xl w-full text-center">
                    <ChatList
                      key={messages.map(m => m.id).join('|')}
                      messages={messages}
                      activeStep={0}
                      nodes={nodes}
                      edges={edges}
                    />
                    {StopRegenerateButton}
                    <ChatScrollAnchor trackVisibility={isLoading} />
                  </div>
                </div>
              )}

              {viewMode === 'relation' && (
                <div className="pt-4 md:pt-10">
                  <ReactFlowProvider>
                    <FlowComponent
                      nodes={nodes}
                      edges={edges}
                      onNodesChange={onNodesChange}
                      onEdgesChange={onEdgesChange}
                      updateLayout={updateLayout}
                      setLayoutDirection={setLayoutDirection}
                      isLoading={isLoading}
                      id={id}
                      append={append}
                      activeStep={0}
                    />
                  </ReactFlowProvider>
                </div>
              )}

              {viewMode === 'token' && (
                <div className="pt-4 md:pt-10 flex justify-center">
                  <div className="max-w-2xl w-full text-center">
                    <ChatList
                      key={messages.map(m => m.id).join('|')}
                      messages={messages}
                      activeStep={0}
                      nodes={nodes}
                      edges={edges}
                    />
                    {StopRegenerateButton}
                    <ChatScrollAnchor trackVisibility={isLoading} />
                  </div>
                </div>
              )}
            </>
          ) : (
            <EmptyScreen
              setInput={() => {}}
              id={id!}
              append={append}
              initialOpen={!previewToken || !serperToken}
              isModelLoaded={!!phi3}
            />
          )}
        </div>
      </div>
    </ViewModeProvider>
  );
}
