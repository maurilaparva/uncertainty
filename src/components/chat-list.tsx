'use client';
import { Message } from 'ai';
import { useViewMode } from './ui/view-mode';
import { ChatMessage } from './chat-message';
import { CustomGraphNode } from '../lib/types';
import { createPortal } from "react-dom";
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
function RenderParagraph({
  data,
  trial,
  hideTimeout,
  setPreviewUrl,
  setPreviewPos
}: {
  data: any;
  trial: any;
  hideTimeout: any;
  setPreviewUrl: any;
  setPreviewPos: any;
}) {
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
            {words.map((word, i) => {

              // NEW robust citation parsing inside the word
              const parts = [];
              const citationRegex = /\[(\d+)\]/g;
              let match;
              let lastIndex = 0;

              while ((match = citationRegex.exec(word)) !== null) {
                const citeIndex = match.index;

                // push leading text
                if (citeIndex > lastIndex) {
                  parts.push({ type: "text", value: word.slice(lastIndex, citeIndex) });
                }

                parts.push({
                  type: "cite",
                  number: parseInt(match[1], 10)
                });

                lastIndex = citationRegex.lastIndex;
              }

              // remainder text
              if (lastIndex < word.length) {
                parts.push({ type: "text", value: word.slice(lastIndex) });
              }

              // Render
              return (
                <span key={i} className="inline-block">
                  {parts.map((part, j) => {

                    if (part.type === "text") {
                      return <span key={j}>{part.value}</span>;
                    }

                    if (part.type === "cite") {
                      const src = data.links_paragraph?.[part.number - 1];
                      if (!src) return <span key={j}>[{part.number}]</span>;

                      return (
                        <a
                          key={j}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline hover:opacity-80 cursor-pointer"
                          onClick={() => trial.recordExternalLink(src.url)}
                          onMouseEnter={(e) => {
                            if (hideTimeout.current) clearTimeout(hideTimeout.current);

                            const rect = (e.target as HTMLElement).getBoundingClientRect();
                            const tooltipX = window.scrollX + rect.left + rect.width / 2;
                            const tooltipY = window.scrollY + rect.top;

                            setPreviewUrl(src.summary ?? src.title ?? src.url);
                            setPreviewPos({ x: tooltipX, y: tooltipY });
                          }}
                          onMouseLeave={() => {
                            hideTimeout.current = setTimeout(() => {
                              setPreviewUrl(null);
                            }, 250);
                          }}
                        >
                          [{part.number}]
                        </a>
                      );
                    }

                    return null;
                  })}
                  {" "}
                </span>
              );
            })}

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
function RenderToken({
  data,
  threshold,
  hideTimeout,
  setPreviewUrl,
  setPreviewPos
}: {
  data: any;
  threshold: number;
  hideTimeout: any;
  setPreviewUrl: any;
  setPreviewPos: any;
}) {

  const text: string = data.answer ?? '';
  const tokenInfo = data.token_uncertainty || [];

  const scoreMap = useMemo(() => {
    const m = new Map<string, number>();
    tokenInfo.forEach((t: any) => m.set(t.token.toLowerCase(), t.score));
    return m;
  }, [tokenInfo]);

  const paragraphs = useMemo(() => text.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0), [text]);
  const paragraphWords = useMemo(() => paragraphs.map((p: string) => p.split(/\s+/).filter(Boolean)), [paragraphs]);

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

            let bgColor = "transparent";

            if (uncertain && score >= threshold) {
              const mix = Math.min(1, score * 2.2);
              const r = 255;
              const g = 255 - mix * 180;
              const b = 255 - mix * 180;
              const opacity = 0.35 + mix * 0.55;
              bgColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
            }

            // citation splitter
            const citationRegex = /\[(\d+)\]/g;
            const parts = [];
            let lastIndex2 = 0;
            let m2;

            while ((m2 = citationRegex.exec(word)) !== null) {
              const idx = m2.index;
              const num = parseInt(m2[1], 10);

              if (idx > lastIndex2) {
                parts.push({ type: "text", value: word.slice(lastIndex2, idx) });
              }

              parts.push({ type: "cite", num });
              lastIndex2 = citationRegex.lastIndex;
            }

            if (lastIndex2 < word.length) {
              parts.push({ type: "text", value: word.slice(lastIndex2) });
            }

            return (
              <span key={id} className="inline-flex items-center gap-1">

                {parts.map((part, j) => {

                  if (part.type === "text") {
                    return (
                      <span
                        key={j}
                        className="inline-block rounded px-1 py-[2px] transition-all duration-100 cursor-help"
                        style={{ backgroundColor: bgColor }}
                        onMouseEnter={(e) => {
                          if (!uncertain || typeof score !== 'number') return;

                          const rect = (e.target as HTMLElement).getBoundingClientRect();
                          const tooltipX = window.scrollX + rect.left + rect.width / 2;
                          const tooltipY = window.scrollY + rect.top;

                          setHoverInfo({
                            score,
                            x: tooltipX,
                            y: tooltipY,
                            token: clean || word
                          });
                        }}
                        onMouseLeave={() => setHoverInfo(null)}
                      >
                        {part.value}
                      </span>
                    );
                  }

                  if (part.type === "cite") {
                    const src = data.links_paragraph?.[part.num - 1];

                    if (!src)
                      return (
                        <span key={j} className="text-blue-600">
                          [{part.num}]
                        </span>
                      );

                    return (
                      <a
                        key={j}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline hover:opacity-80 cursor-pointer"
                        onMouseEnter={(e) => {
                          if (hideTimeout.current) clearTimeout(hideTimeout.current);

                          const rect = (e.target as HTMLElement).getBoundingClientRect();
                          const tooltipX = window.scrollX + rect.left + rect.width / 2;
                          const tooltipY = window.scrollY + rect.top;

                          setPreviewUrl(src.summary ?? src.title ?? src.url);
                          setPreviewPos({ x: tooltipX, y: tooltipY });
                        }}
                        onMouseLeave={() => {
                          hideTimeout.current = setTimeout(() => {
                            setPreviewUrl(null);
                          }, 250);
                        }}
                      >
                        [{part.num}]
                      </a>
                    );
                  }

                  return null;
                })}

                {" "}
              </span>
            );
          })}

        </p>
      ))}

      {hoverInfo &&
  createPortal(
    <div
      className="fixed z-50 pointer-events-none bg-white border border-neutral-300 shadow-lg rounded-md px-2 py-1 text-[11px]"
      style={{
        top: hoverInfo.y,
        left: hoverInfo.x,
        maxWidth: '220px',
        fontFamily: 'Inter, system-ui, sans-serif',
        letterSpacing: '-0.01em'
      }}
    >
      <div className="text-neutral-700">
        Uncertainty: <span className="font-semibold">
          {(hoverInfo.score * 100).toFixed(1)}%
        </span>
      </div>
    </div>,
    document.body
  )
}


    </div>
  );
}

/* ----------------------------------------------------
   DISCLAIMER TEXT
---------------------------------------------------- */
function UncertaintyDisclaimer({ viewMode }: { viewMode: string }) {
  const text =
    viewMode === "baseline"
      ? "This AI answer is shown normally, without any uncertainty indicators."
      : viewMode === "paragraph"
      ? "This AI answer includes a single uncertainty score that reflects how confident the model is in the overall response."
      : viewMode === "token"
      ? "This AI answer highlights individual words based on uncertainty, darker highlights indicate areas where the model is less confident."
      : viewMode === "relation"
      ? "This AI answer is broken into supporting and opposing arguments, each with its own uncertainty value that reflects how confident the model is in that part of the reasoning."
      : "";

  if (!text) return null;

  return (
    <p
      className="mt-3 mb-4 text-[14px] text-neutral-700 italic leading-snug"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      {text}
    </p>
  );
}

/* ----------------------------------------------------
   AssistantMessage
---------------------------------------------------- */
function AssistantMessage({
  message,
  gptData,
  viewMode,
  renderLink,
  hideTimeout,
  setPreviewUrl,
  setPreviewPos
}: any) {

  const trial = useTrial();
  const [tokenThreshold, setTokenThreshold] = useState(0.5);

  useEffect(() => {
    trial.markAnswerDisplayFinished();
  }, [trial, message.id]);

  const showSources =
    Array.isArray(gptData.links_paragraph) &&
    gptData.links_paragraph.length > 0;

  return (
    <div className="my-6 text-left text-black font-[Inter] overflow-visible">

      {(viewMode === 'paragraph' || viewMode === 'baseline') && (
        <RenderParagraph
          data={gptData}
          trial={trial}
          hideTimeout={hideTimeout}
          setPreviewUrl={setPreviewUrl}
          setPreviewPos={setPreviewPos}
        />
      )}

      {viewMode === 'token' && (
        <>
          {/* slider styling */}
          <style jsx>{`
            .pro-slider {
              appearance: none;
              -webkit-appearance: none;
              -moz-appearance: none;
              width: 100%;
              height: 6px;
              border-radius: 4px;
              background: #cfd2d6;
              outline: none;
              box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
              cursor: pointer;
            }
            .pro-slider::-webkit-slider-runnable-track {
              background: #cfd2d6;
              height: 6px;
              border-radius: 4px;
            }
            .pro-slider::-webkit-slider-thumb {
              -webkit-appearance: none;
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background: #cfd2d6;
              cursor: pointer;
              box-shadow: 0 1px 3px rgba(0,0,0,0.25);
              transition: background 0.2s ease, transform 0.15s ease;
            }
            .pro-slider::-webkit-slider-thumb:hover {
              transform: scale(1.05);
            }
          `}</style>

          <RenderToken
            data={gptData}
            threshold={tokenThreshold}
            hideTimeout={hideTimeout}
            setPreviewUrl={setPreviewUrl}
            setPreviewPos={setPreviewPos}
          />

          <div className="mt-8">
            <div className="flex flex-col gap-2 mb-4">
              <label className="text-sm text-neutral-700 font-medium" style={{ fontFamily: 'Inter' }}>
                Highlight uncertainty above: {(tokenThreshold * 100).toFixed(0)}%
              </label>

              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={tokenThreshold}
                onChange={(e) => setTokenThreshold(parseFloat(e.target.value))}
                className="pro-slider mt-2"
              />
            </div>

            <div className="mt-4">
              <div className="w-full h-3 rounded-md"
                style={{
                  background: "linear-gradient(to right, rgba(255,255,255,1), rgba(255,200,200,0.8), rgba(255,150,150,0.85), rgba(255,80,80,0.95), rgba(255,0,0,1))"
                }}
              />
              <div className="flex justify-between text-[11px] text-neutral-600 mt-1 px-1">
                <span>Low uncertainty</span>
                <span>High uncertainty</span>
              </div>
            </div>

            <div className="mt-4 p-3 border rounded-md bg-neutral-50">
              <p className="text-xs text-neutral-700">
                Words highlighted in
                <span
                  style={{
                    backgroundColor: "rgba(255,150,150,0.65)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    marginLeft: "4px",
                    marginRight: "4px"
                  }}
                >
                  red
                </span>
                have uncertainty ≥ threshold.
              </p>
            </div>
          </div>
        </>
      )}

      {viewMode === 'relation' && (
        <div className="mt-6 w-full overflow-visible space-y-4">

          <FlowComponent
            centralClaim={gptData.central_claim}
            relations={gptData.relations}
            overallConfidence={gptData.overall_uncertainty}
            hideTimeout={hideTimeout}
            setPreviewUrl={setPreviewUrl}
            setPreviewPos={setPreviewPos}
            trial={trial}
          />

          <div className="p-3 border rounded-md bg-neutral-50 w-fit text-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgb(180,255,180)' }}></span>
              <span className="text-neutral-800">Supporting sub-argument</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgb(255,180,180)' }}></span>
              <span className="text-neutral-800">Attacking sub-argument</span>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'raw' && <RenderRaw message={message} />}

      {showSources && (
        <div className="mt-8 fade-in text-gray-900 overflow-visible">
          <h2 className="text-[13px] font-semibold uppercase mb-3 tracking-wide text-neutral-700">
            Sources
          </h2>
          <ul className="space-y-1">
            {gptData.links_paragraph.map((lnk: any, idx: number) => (
              <li key={lnk.url} className="ml-1 flex gap-2">
                <span className="text-neutral-700 font-medium">[{idx + 1}]</span>
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

  const parsedMessages = useMemo(() =>
    messages.map((m) => ({
      message: m,
      gptData: m.role === 'assistant' ? tryParseGptJson(m.content) : null
    }))
  , [messages]);

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

            const rect = (e.target as HTMLElement).getBoundingClientRect();
            const tooltipX = window.scrollX + rect.left + rect.width / 2;
            const tooltipY = window.scrollY + rect.top;

            setPreviewUrl(link.summary ?? link.title ?? link.url);
            setPreviewPos({ x: tooltipX, y: tooltipY });
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

  return (
    <div className="relative mx-auto px-0 font-[Inter] overflow-visible">

      {parsedMessages.map(({ message, gptData }, index) => {
        const id = message.id;

        if (message.role === "user") {
          const nextIsAssistant =
            parsedMessages[index + 1] &&
            parsedMessages[index + 1].message.role === "assistant";

          return (
            <div key={id}>
              <ChatMessage
                message={message}
                nodes={[]}
                edges={[]}
                clickedNode={clickedNode}
                labelToColor={labelToColor}
              />
            </div>
          );
        }

        if (gptData) {
          return (
            <AssistantMessage
              key={id}
              message={message}
              gptData={gptData}
              viewMode={viewMode}
              renderLink={renderLink}
              hideTimeout={hideTimeout}
              setPreviewUrl={setPreviewUrl}
              setPreviewPos={setPreviewPos}
            />
          );
        }

        return null;
      })}

      {previewUrl &&
  createPortal(
    <div
      className="fixed z-50 pointer-events-none bg-white border shadow-lg rounded-lg p-3 text-sm max-w-xs overflow-visible"
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
    </div>,
    document.body
  )
}

    </div>
  );
}

export default ChatList;
