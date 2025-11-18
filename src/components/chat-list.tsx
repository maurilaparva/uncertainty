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
// GPT JSON PARSER
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
// Raw output mode
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
  // Paragraph Visualization — fixed sequential paragraphs
  // -----------------------------------------------------------
  const RenderParagraph = ({ data }: { data: any }) => {
    const paragraphs = data.answer.split(/\n\s*\n/); // split on blank lines

    const [visibleWordCounts, setVisibleWordCounts] = useState<number[]>(
      paragraphs.map(() => 0)
    );
    const [activeParagraph, setActiveParagraph] = useState(0);
    const [showConfidence, setShowConfidence] = useState(false);

    useEffect(() => {
      let cancelled = false;

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

            await wait(35);
          }

          await wait(350);
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
                paddingLeft: '0px',
                marginLeft: '0px',
              }}
            >
              {words.map((word, i) => (
                <span
                  key={i}
                  className={`
                    inline-block transition-all duration-200
                    ${i < count ? 'opacity-100' : 'opacity-0 translate-y-1'}
                  `}
                  style={{ whiteSpace: 'pre' }}
                >
                  {word + ' '}
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
                  backgroundColor: 'rgb(216,180,132)',
                  animation: `growBar 1.5s ease-out forwards`,
                  ['--target-width' as any]: `${data.overall_confidence * 100}%`,
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
  // Token Visualization — show ALL words, highlight uncertain
  // -----------------------------------------------------------
  // -----------------------------------------------------------
// Token Visualization — paragraphs + gradient uncertainty
// -----------------------------------------------------------
const RenderToken = ({ data }: { data: any }) => {
  const text: string = data.answer || "";

  // Sparse uncertainty list (each has 1 word + score)
  const tokenInfo: { token: string; score: number }[] =
    data.token_uncertainty || [];

  // Convert list → Map for instant lookup
  const scoreMap = new Map<string, number>();
  for (const t of tokenInfo) {
    scoreMap.set(t.token.toLowerCase(), t.score);
  }

  // Split into paragraphs
  const paragraphs = text.split(/\n\s*\n/);

  // Words per paragraph
  const paragraphWords = paragraphs.map((p) =>
    p.split(/\s+/).filter(Boolean)
  );

  // Reveal animation counter
  const totalWords = paragraphWords.flat().length;
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    setVisibleCount(0);
    if (!totalWords) return;

    const interval = setInterval(() => {
      setVisibleCount((prev) => {
        if (prev >= totalWords) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [data.answer]);

  // Tooltip state
  const [hoveredScore, setHoveredScore] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: any) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left + 14,
      y: e.clientY - rect.top - 36,
    });
  };

  // Aesthetic soft amber color (matches your paragraph bar)
  const amberRGB = "216, 180, 132";

  let globalIndex = 0;

  return (
    <div
      className="mt-4 text-left leading-relaxed relative"
      onMouseMove={handleMouseMove}
    >
      {paragraphWords.map((words, pIdx) => (
        <p
          key={pIdx}
          className="mb-6 flex flex-wrap gap-1 text-lg"
          style={{ paddingLeft: "0px", marginLeft: "0px" }}
        >
          {words.map((word) => {
            const id = globalIndex;
            const isVisible = id < visibleCount;
            globalIndex++;

            // CLEAN lookup key (preserve punctuation visually)
            const clean = word
              .toLowerCase()
              .replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, ""); // trim punctuation only at edges

            const score = scoreMap.has(clean)
              ? scoreMap.get(clean)!
              : null;

            const isUncertain = typeof score === "number";

            // Restored correct intensity curve
            // score 0.8 → just starting visible
            // score 0.9 → medium amber
            // score 1.0 → strongest amber
            let alpha = 0;
            if (isUncertain) {
            // Normalize score 0.8–1.0 → 0–1
            const intensity = Math.max(0, score - 0.8) / 0.2;

            // New much stronger scale:
            // 0 → 0.10
            // 1 → 1.00
            alpha = 0.40 + intensity * 0.90;
          }

            return (
              <span
                key={id}
                onMouseEnter={() => isUncertain && setHoveredScore(score!)}
                onMouseLeave={() => setHoveredScore(null)}
                className={`inline-block transition-all duration-200 ${
                  isVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-1"
                }`}
                style={{
                  animation: isVisible
                    ? "fadeInUp 0.35s ease forwards"
                    : undefined,
                  animationDelay: `${id * 18}ms`,

                  backgroundColor:
                    alpha > 0 ? `rgba(${amberRGB}, ${alpha})` : "transparent",

                  borderRadius: "4px",
                  padding: "2px 4px",
                  whiteSpace: "pre",
                }}
              >
                {word + " "}
              </span>
            );
          })}
        </p>
      ))}

      {hoveredScore !== null && (
        <div
          className="absolute bg-black text-white text-xs px-2 py-1 rounded z-40 shadow-lg"
          style={{
            left: mousePos.x,
            top: mousePos.y,
            pointerEvents: "none",
          }}
        >
          Uncertainty: {(hoveredScore * 100).toFixed(1)}%
        </div>
      )}
    </div>
  );
};







  // -----------------------------------------------------------
  // MAIN RENDER LOOP
  // -----------------------------------------------------------
  return (
    <div className="relative mx-auto px-0">
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
                  <FlowComponent
                    centralClaim={gptData.central_claim}
                    relations={gptData.relations}
                    overallConfidence={gptData.overall_confidence} 
                  />
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
