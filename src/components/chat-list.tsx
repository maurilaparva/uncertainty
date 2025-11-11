'use client'
import { Message } from 'ai'
import { useViewMode } from './ui/view-mode'
import { ChatMessage } from './chat-message'
import { CustomGraphNode, CustomGraphEdge } from '../lib/types'
import React from 'react'

const stripCategories = (s: string) =>
  s
    .replace(/\s*\|\|\s*\[[\s\S]*$|\s*\|\s*\[[\s\S]*$/g, '')
    .replace(/\s*,\s*"(?:[^"\\]|\\.)+"\s*(?:,\s*"(?:[^"\\]|\\.)+"\s*)*\]?$/g, '')
    .replace(/\|(?!\s*\[)[^,.;:\n)\]]+/g, '')
    .trim()

export interface ChatListProps {
  messages: Message[]
  activeStep: number
  nodes: CustomGraphNode[]
  edges: CustomGraphEdge[]
  clickedNode?: any
}

function useLabelToColorMap(nodes: CustomGraphNode[]) {
  return React.useMemo(() => {
    const m = new Map<string, string>()
    for (const n of nodes || []) {
      const label = (n?.data as any)?.label ?? ''
      const key = String(label).toLowerCase().trim()
      const bg =
        (n?.data as any)?.bgColor ||
        (n?.style as any)?.background ||
        ''
      if (key && bg) m.set(key, bg)
    }
    return m
  }, [nodes])
}

export function ChatList({
  messages,
  activeStep,
  nodes,
  edges,
  clickedNode
}: ChatListProps) {
  const { viewMode } = useViewMode()
  const labelToColor = useLabelToColorMap(nodes)

  if (!messages.length) return null

  // --- helper to parse demo content ---
  const parseDemo = (msg: any) => {
    try {
      const parsed = typeof msg === 'string' ? JSON.parse(msg) : msg
      if (parsed?.type === 'demo') {
        console.log('✅ parseDemo success:', parsed)
        return parsed
      }
      return null
    } catch (err) {
      console.warn('⚠️ parseDemo JSON error:', msg)
      return null
    }
  }

  // --- paragraph visualization ---
  const renderParagraphDemo = (data: any) => (
    <div className="mt-4 text-left">
      <p className="text-lg leading-relaxed text-gray-800">{data.paragraph}</p>
      <div className="mt-4 w-full bg-gray-200 rounded-full h-3">
        <div
          className="bg-blue-500 h-3 rounded-full transition-all duration-500"
          style={{ width: `${data.overall_confidence * 100}%` }}
        />
      </div>
      <p className="text-sm text-gray-600 mt-1">
        Confidence: {(data.overall_confidence * 100).toFixed(1)}%
      </p>
    </div>
  )

  // --- token visualization ---
  const renderTokenDemo = (data: any) => (
    <div className="mt-4 text-left flex flex-wrap gap-1 justify-start leading-relaxed">
      {data.tokens.map((t: any, i: number) => {
        const color = `rgba(255, 0, 0, ${t.score})`
        return (
          <span
            key={i}
            title={`Uncertainty: ${(t.score * 100).toFixed(1)}%`}
            style={{
              backgroundColor: color,
              padding: '2px 4px',
              borderRadius: '4px',
              color: t.score > 0.4 ? 'white' : 'black',
              marginRight: '2px',
              whiteSpace: 'pre-wrap'
            }}
          >
            {t.word}
          </span>
        )
      })}
      <p className="text-xs text-gray-500 mt-3">🔴 darker = higher uncertainty</p>
    </div>
  )

  return (
    <div className="relative mx-auto px-14">
      {messages.map((message, index) => {
        const isAssistant = message.role === 'assistant'
        const demoData = isAssistant ? parseDemo(message.content) : null

        console.log(`🧾 Rendering [${index}]`, { role: message.role, viewMode, demoData })

        if (isAssistant && demoData) {
          return (
            <div key={index} className="my-6 text-left">
              {viewMode === 'paragraph' && renderParagraphDemo(demoData)}
              {viewMode === 'token' && renderTokenDemo(demoData)}
              {/* Safety fallback — show text if neither mode matched */}
              {(!viewMode || (viewMode !== 'paragraph' && viewMode !== 'token')) && (
                <p className="text-gray-600 italic mt-2">
                  [No visualization mode active — showing raw text:] {demoData.paragraph}
                </p>
              )}
            </div>
          )
        }

        // Fallback for user and normal messages
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
        )
      })}
    </div>
  )
}

export default ChatList
