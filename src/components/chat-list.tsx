'use client';
import { Message } from 'ai';
import { useViewMode } from './ui/view-mode';
import { ChatMessage } from './chat-message';
import { CustomGraphNode, CustomGraphEdge } from '../lib/types';
import React, { useEffect, useState } from 'react';

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

  // --- helper to parse demo content ---
  const parseDemo = (msg: any) => {
    try {
      const parsed = typeof msg === 'string' ? JSON.parse(msg) : msg;
      if (parsed?.type === 'demo') {
        return parsed;
      }
      return null;
    } catch (err) {
      console.warn('⚠️ parseDemo JSON error:', msg);
      return null;
    }
  };

  // --- visualization for demo paragraph (smooth animated reveal) ---
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
          setTimeout(() => setShowConfidence(true), 500);
          return prev;
        });
      }, Math.max(25, 2000 / words.length)); // adaptive pacing
      return () => clearInterval(interval);
    }, [data.paragraph]);

    return (
      <div className="mt-4 text-left">
        <p className="text-lg leading-relaxed flex flex-wrap gap-1">
          {words.slice(0, visibleCount).map((word, i) => (
            <span
              key={i}
              className="inline-block opacity-0 animate-[fadeIn_0.4s_ease_forwards]"
              style={{
                animationDelay: `${i * 40}ms`,
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
                  backgroundColor: 'rgb(216, 180, 132)', // warm beige tone
                  animation: `growBar 1.5s ease-out forwards`,
                  // custom property for target width used by animation
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

  // --- token visualization (refined, professional beige style) ---
const RenderTokenDemo = ({ data }: { data: any }) => {
  const [visibleCount, setVisibleCount] = useState(0);

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

  return (
    <div className="mt-4 text-left flex flex-wrap gap-1 justify-start leading-relaxed">
      {data.tokens.slice(0, visibleCount).map((t: any, i: number) => {
        // Only highlight tokens with uncertainty ≥ 0.8
        const highlight = t.score >= 0.8;

        // Warm beige-to-rose subtle gradient for uncertainty
        const base = [216, 180, 132]; // beige tone
        const normScore = (t.score - 0.8) / 0.2; // 0 → low, 1 → high
        const intensity = Math.min(Math.max(normScore, 0), 1);

        const color = highlight
          ? `rgba(${base[0] + intensity * 45}, ${base[1] - intensity * 120}, ${
              base[2] - intensity * 100
            }, 0.9)`
          : 'transparent';

        return (
          <span
            key={i}
            title={`Uncertainty: ${(t.score * 100).toFixed(1)}%`}
            className="inline-block opacity-0 animate-[fadeIn_0.4s_ease_forwards]"
            style={{
              animationDelay: `${i * 25}ms`,
              backgroundColor: color,
              borderRadius: '3px',
              padding: highlight ? '1px 3px' : '1px 2px',
              border: highlight ? '0.5px solid rgba(0,0,0,0.08)' : 'none',
              color: highlight ? (t.score > 0.9 ? '#fff' : '#222') : '#222',
              marginRight: '2px',
              transition: 'all 0.3s ease',
              cursor: highlight ? 'pointer' : 'default',
            }}
          >
            {t.word}
          </span>
        );
      })}
      {visibleCount >= data.tokens.length && (
        <p className="text-xs text-gray-500 mt-3 w-full italic">
          ⚠️ Tokens with uncertainty ≥ 0.8 are highlighted
        </p>
      )}
    </div>
  );
};

  // --- main render ---
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
              {!['paragraph', 'token'].includes(viewMode ?? '') && (
                <p className="text-gray-600 italic mt-2">
                  [No visualization mode active — showing raw text:] {demoData.paragraph}
                </p>
              )}
            </div>
          );
        }

        // fallback: user or regular assistant messages
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
