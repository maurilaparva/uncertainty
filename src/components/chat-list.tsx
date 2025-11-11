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
            <div className="mt-3 w-full bg-neutral-200 rounded-full h-2 shadow-inner transition-opacity duration-500 opacity-100">
              <div
                className="h-2 rounded-full transition-all duration-700"
                style={{
                  width: `${data.overall_confidence * 100}%`,
                  backgroundColor: 'rgb(216, 180, 132)' // professional beige
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

  // --- token visualization (smooth fade per token) ---
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
          const beige = [216, 180, 132]; // base RGB
          const color = `rgba(${beige[0] + t.score * 39}, ${
            beige[1] - t.score * 120
          }, ${beige[2] - t.score * 120}, ${0.85})`;
          return (
            <span
              key={i}
              title={`Uncertainty: ${(t.score * 100).toFixed(1)}%`}
              className="inline-block opacity-0 animate-[fadeIn_0.4s_ease_forwards]"
              style={{
                animationDelay: `${i * 25}ms`,
                backgroundColor: color,
                padding: '2px 4px',
                borderRadius: '4px',
                color: t.score > 0.45 ? 'white' : 'black',
                marginRight: '2px',
                transition: 'all 0.3s ease'
              }}
            >
              {t.word}
            </span>
          );
        })}
        {visibleCount >= data.tokens.length && (
          <p className="text-xs text-gray-500 mt-3 w-full italic">
            🔴 Darker = higher uncertainty
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
