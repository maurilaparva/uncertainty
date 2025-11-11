'use client';
import { useLocalStorage } from '../lib/hooks/use-local-storage.ts';
import { toast } from 'react-hot-toast';
import { type Message } from 'ai/react';
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo
} from 'react';
import { EmptyScreen } from './empty-screen.tsx';
import { ChatList } from './chat-list.tsx';
import { useNavigate, useLocation } from 'react-router-dom';
import { ViewModeProvider } from './ui/view-mode.tsx';
import { ReactFlowProvider } from 'reactflow';
import { ChatScrollAnchor } from './chat-scroll-anchors.tsx';
import {
  useNodesState,
  useEdgesState,
  addEdge,
  Position,
  ReactFlowInstance
} from 'reactflow';
import dagre from 'dagre';
import { useAtom } from 'jotai';
import {
  gptTriplesAtom,
  recommendationsAtom,
  backendDataAtom,
  viewModeAtom
} from '../lib/state.ts';
import FlowComponent from './vis-flow/index.tsx';
import Slider from './chat-slider.tsx';
import { Button } from './ui/button.tsx';
import { IconRefresh, IconStop } from './ui/icons.tsx';
import 'reactflow/dist/style.css';
import { loadPhi3 } from './model/model.ts';
import {
  CustomGraphNode,
  CustomGraphEdge,
  BackendData
} from '../lib/types.ts';
import {
  highLevelNodes,
  colorForCategory,
  normalizeCategory
} from '../lib/utils.tsx';

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
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const [viewMode] = useAtom(viewModeAtom); // 👈 New: user-selected visualization mode
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? []);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [layoutDirection, setLayoutDirection] = useState('TB');
  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  // 🟢 NEW: back button handler
  const handleBackToHome = useCallback(() => {
    setMessages([]); // clears chat
    setNodes([]); // clears graph
    setEdges([]); // clears edges
    setActiveStep(0);
  }, [setMessages, setNodes, setEdges]);
  // shortened setup: tokens etc
  const [previewToken] = useLocalStorage<string | null>('ai-token', null);
  const [serperToken] = useLocalStorage<string | null>('serper-token', null);

  // model init etc. (rest of your setup omitted here — keep as in your original)

  const append = async (msg: Partial<Message> | string) => {
    if (!phi3 || typeof phi3 !== 'function') {
      toast.error('Model not ready yet.');
      return;
    }
    const userText = typeof msg === 'string' ? msg : msg.content ?? '';
    if (!userText.trim()) return;
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
      const res = await phi3(`Answer the question: ${userText}`, {
        max_new_tokens: 400
      });
      setMessages(prev =>
        prev.map(m =>
          m.id === newAssistant.id ? { ...m, content: res } : m
        )
      );
    } catch (err) {
      toast.error('Model inference failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const StopRegenerateButton = isLoading ? (
    <Button variant="outline" onClick={() => setIsLoading(false)} className="relative left-[60%]">
      <IconStop className="mr-2" /> Stop
    </Button>
  ) : (
    <Button
      variant="outline"
      onClick={() => append(messages[messages.length - 2]?.content || '')}
      className="relative left-[60%]"
    >
      <IconRefresh className="mr-2" /> Regenerate
    </Button>
  );

  // simplified layout update
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
    <div className="max-w-[100vw] rounded-lg border bg-background p-4">
      {messages.length ? (
        <>
          {/* 🟢 Back to Home Button */}
          <div className="flex justify-start mb-3">
            <Button
              variant="ghost"
              onClick={() => {
                setMessages([]);
                setNodes([]);
                setEdges([]);
                setActiveStep(0);
              }}
              className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
            >
              <span className="text-lg">←</span>
              <span>Back to Home</span>
            </Button>
          </div>

          {/* Conditional view based on visualization mode */}
          {viewMode === 'paragraph' && (
            <div className="pt-4 md:pt-10">
              <ViewModeProvider>
                <ChatList
                  key={messages.map(m => m.id).join('|')}
                  messages={messages}
                  activeStep={activeStep}
                  nodes={nodes}
                  edges={edges}
                />
              </ViewModeProvider>
              {StopRegenerateButton}
              <ChatScrollAnchor trackVisibility={isLoading} />
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
                  activeStep={activeStep}
                />
              </ReactFlowProvider>
            </div>
          )}

          {viewMode === 'token' && (
            <div className="pt-4 md:pt-10">
              <ViewModeProvider>
                {/* Later we'll highlight tokens ≥0.8 uq here */}
                <ChatList
                  key={messages.map(m => m.id).join('|')}
                  messages={messages}
                  activeStep={activeStep}
                  nodes={nodes}
                  edges={edges}
                />
              </ViewModeProvider>
              {StopRegenerateButton}
              <ChatScrollAnchor trackVisibility={isLoading} />
            </div>
          )}

          {/* Bottom slider shared */}
          <div className="flex justify-center items-center pt-3">
            <Slider
              messages={messages}
              steps={Math.floor(messages.length / 2)}
              activeStep={activeStep}
              handleNext={() =>
                setActiveStep(Math.min(activeStep + 1, nodes.length - 1))
              }
              handleBack={() => setActiveStep(Math.max(activeStep - 1, 0))}
              jumpToStep={setActiveStep}
            />
          </div>
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
  );

}
