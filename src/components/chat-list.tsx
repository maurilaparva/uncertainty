'use client';

import { Message } from 'ai';
import { useViewMode } from './ui/view-mode';
import { ChatMessage } from './chat-message';
import { CustomGraphNode } from '../lib/types';

import React, {
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
  try { return JSON.parse(msg); } catch { return null; }
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
   PARAGRAPH VIEW (no animations)
---------------------------------------------------- */
function RenderParagraph({ data }: any) {
  const { viewMode } = useViewMode();
  const paragraphs = useMemo(() => data.answer.split(/\n\s*\n/), [data.answer]);

  return (
    <div className="mt-4 text-left text-black">
      {/* paragraphs instantly */}
      {paragraphs.map((para: string, idx: number) => (
        <p key={idx} className="text-[17px] flex flex-wrap gap-1 mb-6 text-black">
          {para.split(/\s+/).map((w: string, i: number) => (
            <span key={i}>{w + ' '}</span>
          ))}
        </p>
      ))}

      {/* uncertainty bar */}
      {viewMode !== 'baseline' && (
        <div className="mt-3">
          <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-2 rounded-full"
              style={{
                backgroundColor: 'rgb(255,150,150)', // stronger pastel red
                width: `${(data.overall_uncertainty ?? 0) * 100}%`,
                transition: 'width 0.3s ease-out'
              }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-1 italic">
            Uncertainty: {(data.overall_uncertainty * 100).toFixed(1)}%
          </p>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------
   TOKEN VIEW (slider + tooltip + no animations)
---------------------------------------------------- */
function RenderToken({ data }: any) {
  const text: string = data.answer;
  const tokenInfo = data.token_uncertainty || [];

  const scoreMap = useMemo(() => {
    const m = new Map<string, number>();
    tokenInfo.forEach((t: any) => m.set(t.token.toLowerCase(), t.score));
    return m;
  }, [tokenInfo]);

  const paragraphs = useMemo(() => text.split(/\n\s*\n/), [text]);
  const wordsPerParagraph = useMemo(
    () => paragraphs.map((p) => p.split(/\s+/).filter(Boolean)),
    [paragraphs]
  );

  const [threshold, setThreshold] = useState(0.5);

  const pastelRedRGB = '255,150,150';

  return (
    <div className="mt-4 text-left leading-relaxed text-black">
      {/* slider */}
      <div className="mb-3 flex items-center gap-3 text-xs text-gray-700">
        <span className="font-medium">Uncertainty threshold</span>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(threshold * 100)}
          onChange={(e) => setThreshold(Number(e.target.value) / 100)}
          className="w-40"
        />
        <span>{Math.round(threshold * 100)}%</span>
        <span className="text-[11px] text-gray-500">Tokens ≥ threshold highlighted</span>
      </div>

      {wordsPerParagraph.map((words, pIdx) => (
        <p key={pIdx} className="mb-6 flex flex-wrap gap-1 text-[17px] text-black">
          {words.map((word: string, i: number) => {
            const clean = word.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '');
            const score = scoreMap.get(clean) ?? 0;

            let alpha = 0;
            if (score >= threshold) {
              const norm = (score - threshold) / (1 - threshold);
              alpha = 0.25 + 0.45 * norm;
            }

            return (
              <span
                key={i}
                title={`Uncertainty: ${(score * 100).toFixed(1)}%`} // tooltip
                style={{
                  backgroundColor:
                    score >= threshold ? `rgba(${pastelRedRGB},${alpha})` : 'transparent',
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
   ASSISTANT MESSAGE (now always shows sources)
---------------------------------------------------- */
function AssistantMessage({ message, gptData, viewMode, renderLink }: any) {
  return (
    <div className="my-6 text-left text-black font-[Inter]">

      {viewMode === 'paragraph' && <RenderParagraph data={gptData} />}

      {viewMode === 'baseline' && <RenderParagraph data={gptData} />}

      {viewMode === 'token' && <RenderToken data={gptData} />}

      {viewMode === 'relation' && (
        <div className="mt-6">
          <FlowComponent
            centralClaim={gptData.central_claim}
            relations={gptData.relations}
            overallConfidence={gptData.overall_uncertainty}
          />
        </div>
      )}

      {viewMode === 'raw' && <RenderRaw message={message} />}

      {/* Always show sources below paragraph & token views */}
      {viewMode !== 'relation' &&
        Array.isArray(gptData.links_paragraph) &&
        gptData.links_paragraph.length > 0 && (
          <div className="mt-10 font-[Inter] text-gray-900">
            <h2 className="text-[13px] font-semibold tracking-wide uppercase text-neutral-700 mb-3">
              Sources
            </h2>
            <ul className="space-y-1">
              {gptData.links_paragraph.map((lnk: any) => (
                <li key={lnk.url} className="ml-1">
                  {renderLink(lnk, {
                    className:
                      'text-[14px] leading-tight font-medium text-blue-700 hover:text-blue-900 underline underline-offset-2 transition-colors'
                  })}
                </li>
              ))}
            </ul>
          </div>
        )}
    </div>
  );
}

/* ----------------------------------------------------
   MAIN CHAT LIST
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
  const trial = useTrial(); // still needed for recordExternalLink
  const hideTimeout = useRef<any>(null);

  const labelToColor = useLabelToColorMap(nodes);

  if (!messages.length) return null;

  const parsed = useMemo(
    () => messages.map((m) => ({ message: m, gptData: m.role === 'assistant' ? tryParseGptJson(m.content) : null })),
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
          className={opts.className ?? 'text-blue-600 underline'}
          onClick={() => trial.recordExternalLink(link.url)}
          onMouseEnter={(e) => {
            if (hideTimeout.current) clearTimeout(hideTimeout.current);
            setPreviewUrl(link.url);
            setPreviewPos({ x: e.clientX - 350, y: e.clientY - 200 });
          }}
          onMouseLeave={() => {
            hideTimeout.current = setTimeout(() => setPreviewUrl(null), 250);
          }}
        >
          {link.title || link.url}
        </a>
      );
    },
    [trial, setPreviewUrl, setPreviewPos]
  );

  return (
    <div className="relative mx-auto px-0 font-[Inter]">

      {parsed.map(({ message, gptData }) => {
        if (gptData) {
          return (
            <AssistantMessage
              key={message.id}
              message={message}
              gptData={gptData}
              viewMode={viewMode}
              renderLink={renderLink}
            />
          );
        }
        return (
          <ChatMessage
            key={message.id}
            message={message}
            nodes={[]}
            edges={[]}
            clickedNode={clickedNode}
            labelToColor={labelToColor}
          />
        );
      })}

      {/* Tooltip */}
      {previewUrl && (
        <div
          className="fixed z-50 bg-white border shadow-lg rounded-lg p-3 text-sm max-w-xs font-[Inter]"
          style={{ top: previewPos.y, left: previewPos.x }}
          onMouseEnter={() => clearTimeout(hideTimeout.current)}
          onMouseLeave={() => {
            hideTimeout.current = setTimeout(() => setPreviewUrl(null), 250);
          }}
        >
          <div className="font-semibold text-[13px] mb-1">Source Preview</div>
          <div className="text-blue-700 text-[13px] leading-snug">{previewUrl}</div>
        </div>
      )}
    </div>
  );
}

export default ChatList;
