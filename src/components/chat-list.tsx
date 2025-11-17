'use client';
import { Message } from 'ai';
import { useViewMode } from './ui/view-mode';
import { ChatMessage } from './chat-message';
import { CustomGraphNode, CustomGraphEdge } from '../lib/types';
import React, { useEffect, useState } from 'react';
import FlowComponent from './vis-flow/index.tsx';

const stripCategories = (s: string) =>
  s
    .replace(/\s*\|\|\s*\[[\s\S]*$|\s*\|\s*\[[\s\S]*$/g, '')
    .replace(/\s*,\s*"(?:[^"\\]|\\.)+"\s*(?:,\s*"(?:[^"\\]|\\.)+"\s*)*\]?$/g, '')
    .replace(/\|(?!\s*\[)[^,.;:\n)\]]+/g, '')
    .trim();

export interface ChatListProps {
  messages: Message[];
  activeStep: number;
  nodes: CustomGraphNode[];
  edges: CustomGraphEdge[];
  clickedNode?: any;
}

function useLabelToColorMap(nodes: CustomGraphNode[]) {
  return React.useMemo(() => {
    const m = new Map<string, string>();
    for (const n of nodes || []) {
      const label = (n?.data as any)?.label ?? '';
      const key = String(label).toLowerCase().trim();
      const bg =
        (n?.data as any)?.bgColor ||
        (n?.style as any)?.background ||
        '';
      if (key && bg) m.set(key, bg);
    }
    return m;
  }, [nodes]);
}

// -------------------------------------------------------------
// NEW: Raw output mode
// -------------------------------------------------------------
const RenderRaw = ({ message }: { message: Message }) => {
  return (
    <pre className="text-left whitespace-pre-wrap bg-neutral-50 p-3 rounded border text-sm mt-4">
      {typeof message.content === 'string'
        ? message.content
        : JSON.stringify(message.content, null, 2)}
    </pre>
  );
};
// -------------------------------------------------------------


export function ChatList({
  messages,
  activeStep,
  nodes,
  edges,
  clickedNode
}: ChatListProps) {
  const { viewMode } = useViewMode();
  const labelToColor = useLabelToColorMap(nodes);

  if (!messages.length) return null;

  const parseDemo = (msg: any) => {
    try {
      const parsed = typeof msg === 'string' ? JSON.parse(msg) : msg;
      if (parsed?.type === 'demo') return parsed;
      return null;
    } catch (err) {
      console.warn('⚠️ parseDemo JSON error:', msg);
      return null;
    }
  };

  // --- paragraph visualization (animated build + bar grow) ---
  const RenderParagraphDemo = ({ data }: { data: any }) => {
    const words = data.paragraph.split(' ').filter(Boolean);
    const [visibleCount, setVisibleCount] = useState(0);
    const [showConfidence, setShowConfidence] = useState(false);

    useEffect(() => {
      setVisibleCount(0);
      setShowConfidence(false);
      const interval = setInterval(() => {
        setVisibleCount(prev => {
          if (prev < words.length) return prev + 1;
          clearInterval(interval);
          setTimeout(() => setShowConfidence(true), 400);
          return prev;
        });
      }, Math.max(25, 2000 / words.length));
      return () => clearInterval(interval);
    }, [data.paragraph]);

    return (
      <div className="mt-4 text-left">
        <p className="text-lg leading-relaxed flex flex-wrap gap-1">
          {words.slice(0, visibleCount).map((word, i) => (
            <span
              key={i}
              className="inline-block opacity-0 animate-[fadeInUp_0.45s_ease_forwards]"
              style={{
                animationDelay: `${i * 35}ms`,
                whiteSpace: 'pre'
              }}
            >
              {word + ' '}
            </span>
          ))}
        </p>

        {showConfidence && (
          <>
            <div className="mt-3 w-full bg-neutral-200 rounded-full h-2 shadow-inner overflow-hidden">
              <div
                className="h-2 rounded-full"
                style={{
                  backgroundColor: 'rgb(216, 180, 132)',
                  animation: `growBar 1.5s ease-out forwards`,
                  ['--target-width' as any]: `${data.overall_confidence * 100}%`,
                }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-1 italic transition-opacity duration-700">
              Model confidence: {(data.overall_confidence * 100).toFixed(1)}%
            </p>
          </>
        )}
      </div>
    );
  };

  // --- token visualization with animations ---
  const RenderTokenDemo = ({ data }: { data: any }) => {
    const [visibleCount, setVisibleCount] = useState(0);
    const [hoveredToken, setHoveredToken] =
      useState<{ word: string; score: number } | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
      setVisibleCount(0);
      const interval = setInterval(() => {
        setVisibleCount(prev => {
          if (prev >= data.tokens.length) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 35);
      return () => clearInterval(interval);
    }, [data.tokens]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left + 12,
        y: e.clientY - rect.top - 30
      });
    };

    const baseColor = "255, 185, 100";
    const threshold = 0.8;

    return (
      <div
        className="mt-4 text-left flex flex-wrap gap-1 justify-start leading-relaxed relative"
        onMouseMove={handleMouseMove}
      >
        {data.tokens.slice(0, visibleCount).map((t: any, i: number) => {
          let alpha = 0;
          if (t.score >= threshold) {
            alpha = 0.5 + ((t.score - threshold) / (1 - threshold)) * 0.5;
          }

          const bgColor = alpha > 0 ? `rgba(${baseColor}, ${alpha})` : "transparent";

          return (
            <span
              key={i}
              onMouseEnter={() => (t.score >= threshold ? setHoveredToken(t) : null)}
              onMouseLeave={() => (t.score >= threshold ? setHoveredToken(null) : null)}
              className="opacity-0 animate-[fadeInUp_0.4s_ease_forwards] hover:scale-[1.05]"
              style={{
                animationDelay: `${i * 25}ms`,
                backgroundColor: bgColor,
                borderRadius: "3px",
                padding: "1px 3px",
                marginRight: "2px",
                whiteSpace: "pre",
                transition: "all 0.3s ease",
                color: "#222",
                cursor: t.score >= threshold ? "pointer" : "default"
              }}
            >
              {t.word}
            </span>
          );
        })}

        {hoveredToken && (
          <div
            className="token-tooltip"
            style={{
              left: `${mousePos.x}px`,
              top: `${mousePos.y}px`
            }}
          >
            Uncertainty: {(hoveredToken.score * 100).toFixed(1)}%
          </div>
        )}

        {visibleCount >= data.tokens.length && (
          <p className="text-xs text-gray-500 mt-3 w-full italic">
            ⚠️ Tokens with uncertainty ≥ 0.8 are highlighted
          </p>
        )}
      </div>
    );
  };

  // -------------------------------------------------------------
  // MAIN RENDER
  // -------------------------------------------------------------
  return (
    <div className="relative mx-auto px-14">
      {messages.map((message, index) => {
        const isAssistant = message.role === 'assistant';
        const demoData = isAssistant ? parseDemo(message.content) : null;

        if (isAssistant && demoData) {
          return (
            <div key={index} className="my-6 text-left">
              {viewMode === 'paragraph' && <RenderParagraphDemo data={demoData} />}
              {viewMode === 'token' && <RenderTokenDemo data={demoData} />}
              {viewMode === 'relation' && (
                <div className="mt-6 fade-in">
                  <FlowComponent />
                </div>
              )}
              {viewMode === 'raw' && <RenderRaw message={message} />}
            </div>
          );
        }

        // normal chat messages
        return (
          <ChatMessage
            key={index}
            message={
              message.role === 'assistant'
                ? { ...message, content: stripCategories(message.content) }
                : message
            }
            nodes={message.role === 'user' ? [] : nodes}
            edges={message.role === 'user' ? [] : edges}
            clickedNode={clickedNode}
            labelToColor={labelToColor}
          />
        );
      })}
    </div>
  );
}

export default ChatList;
