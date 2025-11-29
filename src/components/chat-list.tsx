'use client';
import { Message } from 'ai';
import { useViewMode } from './ui/view-mode';
import { ChatMessage } from './chat-message';
import { CustomGraphNode } from '../lib/types';

import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback
} from 'react';

import FlowComponent from './vis-flow/index.tsx';
import { useTrial } from '../lib/useTrial';

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
    return JSON.parse(msg);
  } catch {
    return null;
  }
};

/* ----------------------------------------------------
   RAW VIEW
---------------------------------------------------- */
const RenderRaw = ({ message }: { message: Message }) => (
  <pre className="text-left whitespace-pre-wrap bg-neutral-50 p-3 rounded border text-sm mt-4 text-black">
    {typeof message.content === 'string'
      ? message.content
      : JSON.stringify(message.content, null, 2)}
  </pre>
);

/* ----------------------------------------------------
   PARAGRAPH VIEW
---------------------------------------------------- */
function RenderParagraph({ data }: { data: any }) {
  const { viewMode } = useViewMode();
  const paragraphs = useMemo(
    () => (data.answer || '').split(/\n\s*\n/).filter((p: string) => p.trim().length > 0),
    [data.answer]
  );

  return (
    <div className="mt-4 text-left text-black">
      {paragraphs.map((para: string, pIdx: number) => {
        const words = para.split(/\s+/).filter(Boolean);

        return (
          <p key={pIdx} className="text-[17px] flex flex-wrap gap-1 mb-6 text-black">
            {words.map((word, i) => (
              <span key={i} className="inline-block">
                {word + ' '}
              </span>
            ))}
          </p>
        );
      })}

      {viewMode !== 'baseline' && (
        <div className="mt-2">
          <div className="mt-3 w-full h-2 bg-neutral-200 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-2 rounded-full"
              style={{
                backgroundColor: 'rgb(255,180,180)',
                width: `${(data.overall_uncertainty ?? 0) * 100}%`,
                transition: 'width 200ms ease-out'
              }}
            />
          </div>

          <p
            className="text-xs mt-1 italic text-neutral-700"
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              letterSpacing: '-0.01em'
            }}
          >
            Uncertainty: {(data.overall_uncertainty * 100).toFixed(1)}%
          </p>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------
   TOKEN VIEW
---------------------------------------------------- */
function RenderToken({ data, threshold }: { data: any; threshold: number }) {
  const text: string = data.answer ?? '';
  const tokenInfo = data.token_uncertainty || [];
  const scoreMap = useMemo(() => {
    const m = new Map<string, number>();
    tokenInfo.forEach((t: any) => m.set(t.token.toLowerCase(), t.score));
    return m;
  }, [tokenInfo]);

  const paragraphs = useMemo(
    () => text.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0),
    [text]
  );
  const paragraphWords = useMemo(
    () => paragraphs.map((p: string) => p.split(/\s+/).filter(Boolean)),
    [paragraphs]
  );

  const [hoverInfo, setHoverInfo] = useState<{
    score: number;
    x: number;
    y: number;
    token: string;
  } | null>(null);

  let globalIndex = 0;

  return (
    <div className="mt-4 text-left leading-relaxed text-black relative">
      {paragraphWords.map((words, pIdx) => (
        <p key={pIdx} className="mb-6 flex flex-wrap gap-1 text-[17px] text-black">
          {words.map((word: string) => {
            const id = globalIndex++;

            const clean = word
              .toLowerCase()
              .replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '');

            const score = scoreMap.get(clean);
            const uncertain = typeof score === 'number';

            let bgColor = 'transparent';
            if (uncertain && score >= threshold) {
              const denom = 1 - threshold || 1;
              const norm = Math.min(1, Math.max(0, (score - threshold) / denom));

              const r = Math.round(255 - 35 * norm);
              const g = Math.round(200 - 160 * norm);
              const b = Math.round(200 - 160 * norm);
              const alpha = 0.12 + 0.85 * norm;

              bgColor = `rgba(${r},${g},${b},${alpha})`;
            }

            return (
              <span
                key={id}
                className="inline-block rounded px-1 py-[2px] transition-colors duration-150 cursor-help"
                style={{ backgroundColor: bgColor }}
                onMouseEnter={(e) => {
                  if (!uncertain || typeof score !== 'number') return;
                  setHoverInfo({
                    score,
                    x: e.pageX + 12,
                    y: e.pageY + 12,
                    token: clean || word
                  });
                }}
                onMouseLeave={() => setHoverInfo(null)}
              >
                {word + ' '}
              </span>
            );
          })}
        </p>
      ))}

      {hoverInfo && (
        <div
          className="fixed z-50 bg-white border border-neutral-300 shadow-lg rounded-md px-2 py-1 text-[11px]"
          style={{
            top: hoverInfo.y - 150,
            left: hoverInfo.x - 410,
            maxWidth: '220px',
            fontFamily: 'Inter, system-ui, sans-serif',
            letterSpacing: '-0.01em'
          }}
        >
          <div className="text-neutral-700">
            Uncertainty:{' '}
            <span className="font-semibold">
              {(hoverInfo.score * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      )}
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
}: any) {
  const trial = useTrial();
  const [tokenThreshold, setTokenThreshold] = useState(0.5);

  useEffect(() => {
    trial.markAnswerDisplayFinished();
  }, [trial, message.id]);

  const showSources =
    viewMode !== 'baseline' &&
    Array.isArray(gptData.links_paragraph) &&
    gptData.links_paragraph.length > 0;

  return (
    <div className="my-6 text-left text-black font-[Inter] overflow-visible"> {/* ★ changed */}
      {(viewMode === 'paragraph' || viewMode === 'baseline') && (
        <RenderParagraph data={gptData} />
      )}

      {viewMode === 'token' && (
        <RenderToken data={gptData} threshold={tokenThreshold} />
      )}

      {/* === RELATION MODE === */}
      {viewMode === 'relation' && (
        <div className="mt-6 w-full overflow-visible">  {/* ★ changed */}
          <FlowComponent
            centralClaim={gptData.central_claim}
            relations={gptData.relations}
            overallConfidence={gptData.overall_uncertainty}
          />
        </div>
      )}

      {viewMode === 'raw' && <RenderRaw message={message} />}

      {showSources && (
        <div className="mt-8 fade-in text-gray-900 overflow-visible">
          <h2
            className="text-[13px] font-semibold uppercase mb-3 tracking-wide text-neutral-700"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            Sources
          </h2>

          <ul className="space-y-1">
            {gptData.links_paragraph.map((lnk: any) => (
              <li key={lnk.url} className="ml-1">
                {renderLink(lnk)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {viewMode === 'token' && (
        <div className="mt-6">{/* token slider unchanged */}</div>
      )}
    </div>
  );
}

/* ----------------------------------------------------
   MAIN ChatList
---------------------------------------------------- */
export function ChatList({
  messages,
  nodes,
  edges,
  clickedNode,
  previewUrl,
  previewPos,
  setPreviewUrl,
  setPreviewPos
}: ChatListProps) {
  const { viewMode } = useViewMode();
  const trial = useTrial();
  const labelToColor = useLabelToColorMap(nodes);
  const hideTimeout = useRef<any>(null);

  if (!messages.length) return null;

  const parsedMessages = useMemo(
    () =>
      messages.map((m) => ({
        message: m,
        gptData: m.role === 'assistant' ? tryParseGptJson(m.content) : null
      })),
    [messages]
  );

  const renderLink = useCallback(
    (link, opts: any = {}) => {
      if (!link?.url) return null;

      return (
        <a
          key={link.url}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:opacity-80 text-md"
          style={opts.style}
          onClick={() => trial.recordExternalLink(link.url)}
          onMouseEnter={(e) => {
            if (hideTimeout.current) clearTimeout(hideTimeout.current);
            setPreviewUrl(link.url);
            setPreviewPos({
              x: e.clientX - 350,
              y: e.clientY - 200
            });
          }}
          onMouseLeave={() => {
            hideTimeout.current = setTimeout(() => {
              setPreviewUrl(null);
            }, 250);
          }}
        >
          {link.title || link.url}
        </a>
      );
    },
    [trial, setPreviewUrl, setPreviewPos]
  );

  /* ★ Entire wrapper gets overflow-visible */
  return (
    <div className="relative mx-auto px-0 font-[Inter] overflow-visible"> 
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
            message={message}
            nodes={message.role === 'user' ? [] : nodes}
            edges={message.role === 'user' ? [] : edges}
            clickedNode={clickedNode}
            labelToColor={labelToColor}
          />
        );
      })}

      {previewUrl && (
        <div
          className="fixed z-50 bg-white border shadow-lg rounded-lg p-3 text-sm max-w-xs overflow-visible"
          style={{
            top: previewPos.y,
            left: previewPos.x,
            fontFamily: 'Inter, system-ui, sans-serif'
          }}
          onMouseEnter={() => {
            if (hideTimeout.current) clearTimeout(hideTimeout.current);
          }}
          onMouseLeave={() => {
            hideTimeout.current = setTimeout(() => {
              setPreviewUrl(null);
            }, 250);
          }}
        >
          <div className="font-semibold text-[13px] mb-1 text-neutral-900">
            Source Preview
          </div>
          <div className="text-blue-700 text-[13px]">{previewUrl}</div>
        </div>
      )}
    </div>
  );
}

export default ChatList;
