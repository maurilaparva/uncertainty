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

  const parseDemo = (msg: any) => {
    try {
      const parsed = typeof msg === 'string' ? JSON.parse(msg) : msg
      return parsed?.type === 'demo' ? parsed : null
    } catch {
      return null
    }
  }

  return (
    <div className="relative mx-auto px-14">
      {messages.map((message, index) => {
        const demoData =
          message.role === 'assistant' ? parseDemo(message.content) : null

        // ✅ DEMO: show the answer paragraph and confidence directly
        if (demoData) {
          return (
            <div key={index} className="my-6 text-left">
              {/* the answer text itself */}
              <p className="text-lg leading-relaxed text-gray-800">
                {demoData.paragraph}
              </p>

              {/* the confidence line */}
              <p className="text-sm text-gray-600 mt-2">
                Model confidence: {(demoData.overall_confidence * 100).toFixed(1)}%
              </p>
            </div>
          )
        }

        // Normal messages
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
