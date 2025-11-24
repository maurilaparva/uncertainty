'use client';
import { Message } from 'ai';
import { useViewMode } from './ui/view-mode';
import { ChatMessage } from './chat-message';
import { CustomGraphNode, CustomGraphEdge } from '../lib/types';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import FlowComponent from './vis-flow/index.tsx';

/* ----------------------------------------------------
   Props
---------------------------------------------------- */
export interface ChatListProps {
  messages: Message[];
  activeStep: number;
  nodes: CustomGraphNode[];
  edges: CustomGraphEdge[];
  clickedNode?: any;

  previewUrl: string | null;
  previewPos: { x: number; y: number };
  setPreviewUrl: (u: string | null) => void;
  setPreviewPos: (p: { x: number; y: number }) => void;

  sourcesVisible?: Record<string, boolean>;
  markSourcesVisible?: (id: string) => void;
}

/* ----------------------------------------------------
   Helpers
---------------------------------------------------- */
function useLabelToColorMap(nodes: CustomGraphNode[]) {
  return useMemo(() => {
    const m = new Map<string, string>();
    for (const n of nodes ?? []) {
      const label = (n?.data as any)?.label ?? '';
      const key = String(label).toLowerCase().trim();
      const bg = (n?.data as any)?.bgColor || (n?.style as any)?.background || '';

      if (key && bg) m.set(key, bg);
    }
    return m;
  }, [nodes]);
}

const tryParseGptJson = (msg: any) => {
  if (typeof msg !== 'string') return null;
  try {
    const parsed = JSON.parse(msg);
    return parsed;   // ⭐ FULL JSON — KEEP EVERYTHING
  } catch (_) {}
  return null;
};

/* ----------------------------------------------------
   Hover preview
---------------------------------------------------- */
function LinkPreview({
  url,
  position
}: {
  url: string;
  position: { x: number; y: number };
}) {
  return (
    <div
      className="fixed z-50 bg-white border shadow-xl rounded-md p-2"
      style={{ top: position.y, left: position.x, width: 320, height: 240 }}
    >
      <iframe
        src={url}
        sandbox="allow-same-origin allow-scripts"
        className="w-full h-full rounded"
      />
    </div>
  );
}

/* ----------------------------------------------------
   RAW VIEW
---------------------------------------------------- */
const RenderRaw = ({ message }: { message: Message }) => (
  <pre className="text-left whitespace-pre-wrap bg-neutral-50 p-3 rounded border text-sm mt-4">
    {typeof message.content === 'string'
      ? message.content
      : JSON.stringify(message.content, null, 2)}
  </pre>
);

/* ----------------------------------------------------
   PARAGRAPH VIEW
---------------------------------------------------- */
function RenderParagraph({
  data,
  onDone
}: {
  data: any;
  onDone: () => void;
}) {
  const paragraphs = useMemo(
    () => data.answer.split(/\n\s*\n/),
    [data.answer]
  );

  const [visibleWordCounts, setVisibleWordCounts] = useState(
    () => paragraphs.map(() => 0)
  );
  const [activeParagraph, setActiveParagraph] = useState(0);
  const [showConfidence, setShowConfidence] = useState(false);
  const previousAnswer = useRef<string>(data.answer);
  const doneCalled = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

    if (previousAnswer.current !== data.answer) {
      previousAnswer.current = data.answer;
      setVisibleWordCounts(paragraphs.map(() => 0));
      setActiveParagraph(0);
      setShowConfidence(false);
      doneCalled.current = false;
    }

    async function animate() {
      if (doneCalled.current) return;

      for (let p = 0; p < paragraphs.length; p++) {
        if (cancelled) return;
        setActiveParagraph(p);

        const words = paragraphs[p].split(/\s+/).filter(Boolean);

        for (let w = 0; w < words.length; w++) {
          if (cancelled) return;
          setVisibleWordCounts((prev) => {
            const u = [...prev];
            u[p] = w + 1;
            return u;
          });
          await wait(15);
        }

        await wait(200);
      }

      await wait(150);
      setShowConfidence(true);

      await wait(300);
      if (!doneCalled.current) {
        doneCalled.current = true;
        onDone();
      }
    }

    animate();
    return () => {
      cancelled = true;
    };
  }, [data.answer, paragraphs, onDone]);

  return (
    <div className="mt-4 text-left">
      {paragraphs.map((para, pIdx) => {
        if (pIdx > activeParagraph) return null;
        const words = para.split(/\s+/).filter(Boolean);
        const count = visibleWordCounts[pIdx];

        return (
          <p key={pIdx} className="text-[17px] flex flex-wrap gap-1 mb-6">
            {words.map((word, i) => (
              <span
                key={i}
                className={`transition-all inline-block ${
                  i < count ? 'opacity-100' : 'opacity-0 translate-y-1'
                }`}
              >
                {word + ' '}
              </span>
            ))}
          </p>
        );
      })}

      {showConfidence && (
        <div className="fade-in">
          <div className="mt-3 w-full h-2 bg-neutral-200 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-2 rounded-full"
              style={{
                backgroundColor: 'rgb(216,180,132)',
                animation: 'growBar 1.5s ease-out forwards',
                ['--target-width' as any]: `${(data.overall_confidence ?? 0) * 100}%`
              }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-1 italic">
            Model confidence: {((data.overall_confidence ?? 0) * 100).toFixed(1)}%
          </p>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------
   TOKEN VIEW
---------------------------------------------------- */
function RenderToken({ data }: { data: any }) {
  const text: string = data.answer;
  const tokenInfo: { token: string; score: number }[] =
    data.token_uncertainty || [];

  const scoreMap = useMemo(() => {
    const m = new Map<string, number>();
    tokenInfo.forEach((t) => m.set(t.token.toLowerCase(), t.score));
    return m;
  }, [tokenInfo]);

  const paragraphs = useMemo(
    () => text.split(/\n\s*\n/),
    [text]
  );
  const paragraphWords = useMemo(
    () => paragraphs.map((p) => p.split(/\s+/).filter(Boolean)),
    [paragraphs]
  );

  const totalWords = paragraphWords.flat().length;
  const [visibleCount, setVisibleCount] = useState(0);
  const prev = useRef(text);

  useEffect(() => {
    if (prev.current !== text) {
      prev.current = text;
      setVisibleCount(0);
    }

    const interval = setInterval(() => {
      setVisibleCount((x) => {
        if (x >= totalWords) {
          clearInterval(interval);
          return x;
        }
        return x + 1;
      });
    }, 15);

    return () => clearInterval(interval);
  }, [text, totalWords]);

  let globalIndex = 0;
  const amberRGB = '216, 180, 132';

  return (
    <div className="mt-4 text-left leading-relaxed">
      {paragraphWords.map((words, pIdx) => (
        <p key={pIdx} className="mb-6 flex flex-wrap gap-1 text-[17px]">
          {words.map((word) => {
            const id = globalIndex++;
            const isVisible = id < visibleCount;

            const clean = word
              .toLowerCase()
              .replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '');

            const score = scoreMap.get(clean);
            const uncertain = typeof score === 'number';

            let alpha = 0;
            if (uncertain) {
              const intensity = Math.max(0, score! - 0.8) / 0.2;
              alpha = 0.4 + intensity * 0.9;
            }

            return (
              <span
                key={id}
                className={`transition-all inline-block ${
                  isVisible ? 'opacity-100' : 'opacity-0 translate-y-1'
                }`}
                style={{
                  backgroundColor:
                    uncertain && alpha > 0
                      ? `rgba(${amberRGB},${alpha})`
                      : 'transparent',
                  borderRadius: 4,
                  padding: '2px 4px'
                }}
              >
                {word + ' '}
              </span>
            );
          })}
        </p>
      ))}
    </div>
  );
}

/* ----------------------------------------------------
   AssistantMessage
---------------------------------------------------- */
function AssistantMessage({
  message,
  gptData,
  viewMode,
  renderLink
}: {
  message: Message;
  gptData: any;
  viewMode: string;
  renderLink: (link: { url: string; title: string }) => React.ReactNode;
}) {
  const [showSources, setShowSources] = useState(false);

  useEffect(() => {
    setShowSources(false);
  }, [message.id, viewMode]);

  const handleParagraphDone = useCallback(() => {
    setShowSources(true);
  }, []);

  useEffect(() => {
    if (viewMode === 'paragraph') return;

    const delay = viewMode === 'raw' ? 100 : 200;
    const t = setTimeout(() => {
      setShowSources(true);
    }, delay);

    return () => clearTimeout(t);
  }, [viewMode, message.id]);

  return (
    <div className="my-6 text-left">
      {viewMode === 'paragraph' && (
        <RenderParagraph data={gptData} onDone={handleParagraphDone} />
      )}

      {viewMode === 'token' && <RenderToken data={gptData} />}

      {viewMode === 'relation' && (
        <div className="mt-6">
          <FlowComponent
            centralClaim={gptData.central_claim}
            relations={gptData.relations}
            overallConfidence={gptData.overall_confidence}
          />
        </div>
      )}

      {viewMode === 'raw' && <RenderRaw message={message} />}

      {showSources &&
        Array.isArray(gptData.links) &&
        gptData.links.length > 0 && (
          <div className="mt-8 fade-in">
            <h1
              className="text-base font-semibold text-gray-900 mb-2"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              Sources
            </h1>

            <ul className="space-y-2">
              {gptData.links.map((lnk: any) => (
                <li key={lnk.url} className="ml-1">
                  {renderLink(lnk)}
                </li>
              ))}
            </ul>
          </div>
        )}
    </div>
  );
}

/* ----------------------------------------------------
   MAIN COMPONENT
---------------------------------------------------- */
export function ChatList({
  messages,
  activeStep,
  nodes,
  edges,
  clickedNode,

  previewUrl,
  previewPos,
  setPreviewUrl,
  setPreviewPos
}: ChatListProps) {
  const { viewMode } = useViewMode();
  const labelToColor = useLabelToColorMap(nodes);

  if (!messages.length) return null;

  const parsedMessages = useMemo(
    () =>
      messages.map((m) => ({
        message: m,
        gptData:
          m.role === 'assistant' ? tryParseGptJson(m.content) : null
      })),
    [messages]
  );

  const renderLink = useCallback(
    (link: { url: string; title: string }) => {
      if (!link?.url) return null;
      return (
        <a
          key={link.url}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:opacity-80 text-md"
          onMouseEnter={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setPreviewUrl(link.url);
            setPreviewPos({ x: rect.right + 10, y: rect.top });
          }}
          onMouseLeave={() => setPreviewUrl(null)}
        >
          {link.title || link.url}
        </a>
      );
    },
    [setPreviewPos, setPreviewUrl]
  );

  return (
    <div className="relative mx-auto px-0">
      {parsedMessages.map(({ message, gptData }) => {
        const id = message.id;

        if (gptData) {
          return (
            <AssistantMessage
              key={id}
              message={message}
              gptData={gptData}
              viewMode={viewMode}
              renderLink={renderLink}
            />
          );
        }

        return (
          <ChatMessage
            key={id}
            message={message}  // ⭐ STOP STRIPPING JSON
            nodes={message.role === 'user' ? [] : nodes}
            edges={message.role === 'user' ? [] : edges}
            clickedNode={clickedNode}
            labelToColor={labelToColor}
          />
        );
      })}

      {previewUrl && (
        <LinkPreview url={previewUrl} position={previewPos} />
      )}
    </div>
  );
}

export default ChatList;
