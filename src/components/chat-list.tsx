'use client';
import { Message } from 'ai';
import { useViewMode } from './ui/view-mode';
import { ChatMessage } from './chat-message';
import { CustomGraphNode, CustomGraphEdge } from '../lib/types';
import React, { useEffect, useState } from 'react';
import FlowComponent from './vis-flow/index.tsx';

// -------------------------------------------------------------
// Utility: strip categories for normal chat messages
// -------------------------------------------------------------
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

// -------------------------------------------------------------
// Color map
// -------------------------------------------------------------
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
// NEW: GPT JSON PARSER
// -------------------------------------------------------------
const tryParseGptJson = (msg: any) => {
  if (typeof msg !== 'string') return null;
  try {
    const parsed = JSON.parse(msg);
    if (
      parsed &&
      typeof parsed.answer === 'string' &&
      typeof parsed.overall_confidence === 'number'
    ) {
      return parsed;
    }
  } catch (_) {}
  return null;
};

// -------------------------------------------------------------
// NEW: Raw output mode
// -------------------------------------------------------------
const RenderRaw = ({ message }: { message: Message }) => (
  <pre className="text-left whitespace-pre-wrap bg-neutral-50 p-3 rounded border text-sm mt-4">
    {typeof message.content === 'string'
      ? message.content
      : JSON.stringify(message.content, null, 2)}
  </pre>
);

// -------------------------------------------------------------
// COMPONENT
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

  // -----------------------------------------------------------
  // Paragraph Visualization
  // -----------------------------------------------------------
  // -----------------------------------------------------------
// FIXED RenderParagraph — proper paragraphs + sequential animation
// -----------------------------------------------------------
const RenderParagraph = ({ data }: { data: any }) => {
  const paragraphs = data.answer.split(/\n\s*\n/); // split on blank lines

  // track word counts per paragraph
  const [visibleWordCounts, setVisibleWordCounts] = useState<number[]>(
    paragraphs.map(() => 0)
  );

  const [activeParagraph, setActiveParagraph] = useState(0);
  const [showConfidence, setShowConfidence] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // reset on new answer
    setVisibleWordCounts(paragraphs.map(() => 0));
    setActiveParagraph(0);
    setShowConfidence(false);

    const wait = (ms: number) =>
      new Promise(resolve => setTimeout(resolve, ms));

    async function animate() {
      for (let p = 0; p < paragraphs.length; p++) {
        if (cancelled) return;

        setActiveParagraph(p);

        const words = paragraphs[p].split(/\s+/).filter(Boolean);

        for (let w = 0; w < words.length; w++) {
          if (cancelled) return;

          setVisibleWordCounts(prev => {
            const updated = [...prev];
            updated[p] = w + 1;
            return updated;
          });

          await wait(35); // speed of each word
        }

        await wait(350); // pause before next paragraph starts
      }

      await wait(300);
      setShowConfidence(true);
    }

    animate();

    return () => {
      cancelled = true;
    };
  }, [data.answer]);

  return (
    <div className="mt-4 text-left">
      {paragraphs.map((para, pIdx) => {
        const words = para.split(/\s+/).filter(Boolean);
        const count = visibleWordCounts[pIdx];

        const isVisible = pIdx <= activeParagraph;

        if (!isVisible) return null;

        return (
          <p
            key={pIdx}
            className="text-lg leading-relaxed flex flex-wrap gap-1 mb-6"
            style={{
              paddingLeft: "0px",          // consistent indentation
              marginLeft: "0px",
            }}
          >
            {words.map((word, i) => (
              <span
                key={i}
                className={`
                  inline-block transition-all duration-200
                  ${i < count ? "opacity-100" : "opacity-0 translate-y-1"}
                `}
                style={{ whiteSpace: "pre" }}
              >
                {word + " "}
              </span>
            ))}
          </p>
        );
      })}

      {showConfidence && (
        <>
          <div className="mt-3 w-full bg-neutral-200 rounded-full h-2 shadow-inner overflow-hidden">
            <div
              className="h-2 rounded-full"
              style={{
                backgroundColor: "rgb(216,180,132)",
                animation: `growBar 1.5s ease-out forwards`,
                ["--target-width" as any]: `${data.overall_confidence * 100}%`,
              }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-1 italic">
            Model confidence: {(data.overall_confidence * 100).toFixed(1)}%
          </p>
        </>
      )}
    </div>
  );
};


  // -----------------------------------------------------------
  // Token Visualization
  // -----------------------------------------------------------
  const RenderToken = ({ data }: { data: any }) => {
    const tokens = data.token_uncertainty || [];
    const [visibleCount, setVisibleCount] = useState(0);
    const [hoveredToken, setHoveredToken] = useState<any>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
      setVisibleCount(0);
      const interval = setInterval(() => {
        setVisibleCount(prev => {
          if (prev >= tokens.length) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 35);
      return () => clearInterval(interval);
    }, [tokens]);

    const handleMouseMove = (e: any) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left + 12,
        y: e.clientY - rect.top - 30,
      });
    };

    const baseColor = "255, 185, 100";
    const threshold = 0.8;

    return (
      <div
        className="mt-4 text-left flex flex-wrap gap-1 leading-relaxed relative"
        onMouseMove={handleMouseMove}
      >
        {tokens.slice(0, visibleCount).map((t: any, i: number) => {
          const alpha =
            t.score >= threshold
              ? 0.5 + ((t.score - threshold) / (1 - threshold)) * 0.5
              : 0;

          return (
            <span
              key={i}
              onMouseEnter={() => (t.score >= threshold ? setHoveredToken(t) : null)}
              onMouseLeave={() => setHoveredToken(null)}
              className="opacity-0 animate-[fadeInUp_0.4s_ease_forwards] hover:scale-[1.05]"
              style={{
                animationDelay: `${i * 25}ms`,
                backgroundColor:
                  t.score >= threshold ? `rgba(${baseColor}, ${alpha})` : "transparent",
                borderRadius: "3px",
                padding: "1px 3px",
                marginRight: "2px",
                color: "#222",
                whiteSpace: "pre",
              }}
            >
              {t.token}
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
      </div>
    );
  };

  // -----------------------------------------------------------
  // MAIN RENDER LOOP
  // -----------------------------------------------------------
  return (
    <div className="relative mx-auto px-14">
      {messages.map((message, index) => {
        const isAssistant = message.role === 'assistant';
        const gptData = isAssistant ? tryParseGptJson(message.content) : null;

        // --- GPT answer ---
        if (isAssistant && gptData) {
          return (
            <div key={index} className="my-6 text-left">
              {viewMode === 'paragraph' && <RenderParagraph data={gptData} />}
              {viewMode === 'token' && <RenderToken data={gptData} />}
              {viewMode === 'relation' && (
                <div className="mt-6 fade-in">
                  <FlowComponent relations={gptData.relations} />
                </div>
              )}
              {viewMode === 'raw' && <RenderRaw message={message} />}
            </div>
          );
        }

        // --- Normal chat message ---
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
