'use client'

import { useEffect, useState, useMemo } from 'react'
import ReactFlow, {
  Background,
  Edge,
  Node,
  Handle,
  Position
} from 'reactflow'

import 'reactflow/dist/style.css'

// --------------------------------------------
// Types
// --------------------------------------------
interface Relation {
  source: string
  target: string
  type: 'SUPPORTS' | 'ATTACKS'
  score: number
  explanation: string
  relation_links: { url: string; title?: string; summary?: string }[]
}

interface FlowProps {
  centralClaim: string
  relations: Relation[]
  overallConfidence: number
}

// --------------------------------------------
// DF-QuAD Helpers
// --------------------------------------------
function aggregateF(values: number[]): number {
  if (!values || values.length === 0) return 0
  return 1 - values.reduce((acc, v) => acc * Math.abs(1 - v), 1)
}

function computeFinalClaimConfidence(
  v0: number,
  supporters: number[],
  attackers: number[]
) {
  const va = aggregateF(attackers)
  const vs = aggregateF(supporters)

  if (va === vs) return v0
  if (va > vs) return v0 - (v0 * Math.abs(vs - va))
  return v0 + ((1 - v0) * Math.abs(vs - va))
}

// ----------------------------------------------------
// Node Component with SAFE handles + bigger fonts
// ----------------------------------------------------
function RelationNode({ data }: any) {
  const { label, explanation, uncertainty, bgColor, nodeRole } = data

  const isCentral = nodeRole === 'central'
  const isSupport = nodeRole === 'support'
  const isAttack = nodeRole === 'attack'

  // NEW: tooltip state (node-attached)
  const [showTooltip, setShowTooltip] = useState(false)

  const primarySource = data.relation_links?.[0]

  return (
    <div
      style={{ position: 'relative' }}
      // ✅ Drive tooltip from the whole node, not just the link
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Central claim handles */}
      <Handle
        id="left-target"
        type="target"
        position={Position.Left}
        style={{ opacity: isCentral ? 1 : 0, width: 10, height: 10, background: 'black', borderRadius: 5 }}
      />
      <Handle
        id="right-target"
        type="target"
        position={Position.Right}
        style={{ opacity: isCentral ? 1 : 0, width: 10, height: 10, background: 'black', borderRadius: 5 }}
      />
      <Handle
        id="bottom"
        type="target"
        position={Position.Bottom}
        style={{ opacity: isCentral ? 1 : 0, width: 10, height: 10, background: 'black', borderRadius: 5 }}
      />

      {/* Support handle */}
      <Handle
        id="right-out"
        type="source"
        position={Position.Right}
        style={{ opacity: isSupport ? 1 : 0, width: 10, height: 10, background: 'black', borderRadius: 5 }}
      />

      {/* Attack handle */}
      <Handle
        id="left-out"
        type="source"
        position={Position.Left}
        style={{ opacity: isAttack ? 1 : 0, width: 10, height: 10, background: 'black', borderRadius: 5 }}
      />

      {/* Hidden fallback handles */}
      <Handle id="hidden-top" type="source" position={Position.Top} style={{ opacity: 0 }} />
      <Handle id="hidden-bottom" type="target" position={Position.Bottom} style={{ opacity: 0 }} />

      {/* Node UI */}
      <div
        style={{
          borderRadius: 16,
          padding: 6,
          background: bgColor || 'rgba(0,0,0,0.05)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
        }}
      >
        <div
          style={{
            width: 260,
            padding: 14,
            borderRadius: 12,
            border: '1px solid rgba(0,0,0,0.18)',
            background: 'white',
            fontFamily: 'Inter, system-ui, sans-serif',
            color: 'black',
            whiteSpace: 'pre-line'
          }}
        >
          {/* LABEL WITH CITATIONS */}
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            {(() => {
              const text = label
              const parts: any[] = []
              const citationRegex = /\[(\d+)\]/g

              let lastIndex = 0
              let match

              while ((match = citationRegex.exec(text)) !== null) {
                const citeStart = match.index
                const citeEnd = citationRegex.lastIndex

                if (citeStart > lastIndex) {
                  parts.push({
                    type: 'text',
                    value: text.slice(lastIndex, citeStart)
                  })
                }

                parts.push({
                  type: 'cite',
                  number: parseInt(match[1], 10)
                })

                lastIndex = citeEnd
              }

              if (lastIndex < text.length) {
                parts.push({
                  type: 'text',
                  value: text.slice(lastIndex)
                })
              }

              return parts.map((part, idx) => {
                if (part.type === 'text') {
                  return <span key={idx}>{part.value}</span>
                }

                if (part.type === 'cite') {
                  // ALWAYS USE relation_links[0]
                  const src = primarySource
                  if (!src) return <span key={idx}>[{part.number}]</span>

                  return (
                    <a
                      key={idx}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#2563eb',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        userSelect: 'text',
                        pointerEvents: 'auto',
                        position: 'relative',
                        zIndex: 9999
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      [{part.number}]
                    </a>
                  )
                }

                return null
              })
            })()}
          </div>

          {/* EXPLANATION WITH CITATIONS (NO TOOLTIP HERE) */}
          {explanation && (
            <div style={{ marginTop: 10, fontSize: 16, lineHeight: '1.45', color: 'black' }}>
              {(() => {
                const text = explanation
                const parts: any[] = []
                const citationRegex = /\[(\d+)\]/g

                let lastIndex = 0
                let match

                while ((match = citationRegex.exec(text)) !== null) {
                  const citeStart = match.index
                  const citeEnd = citationRegex.lastIndex

                  if (citeStart > lastIndex) {
                    parts.push({
                      type: 'text',
                      value: text.slice(lastIndex, citeStart)
                    })
                  }

                  parts.push({
                    type: 'cite',
                    number: parseInt(match[1], 10)
                  })

                  lastIndex = citeEnd
                }

                if (lastIndex < text.length) {
                  parts.push({
                    type: 'text',
                    value: text.slice(lastIndex)
                  })
                }

                return parts.map((part, idx) => {
                  if (part.type === 'text') {
                    return <span key={idx}>{part.value}</span>
                  }

                  if (part.type === 'cite') {
                    const src = primarySource
                    if (!src) return <span key={idx}>[{part.number}]</span>

                    return (
                      <a
                        key={idx}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#2563eb',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          userSelect: 'text',
                          pointerEvents: 'auto',
                          position: 'relative',
                          zIndex: 9999
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        [{part.number}]
                      </a>
                    )
                  }

                  return null
                })
              })()}
            </div>
          )}

          {/* Uncertainty bar */}
          <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden shadow-inner mt-4">
            <div
              className="h-2 rounded-full"
              style={{
                backgroundColor: 'rgb(255,180,180)',
                width: `${uncertainty * 100}%`,
                transition: 'width 200ms ease-out'
              }}
            />
          </div>

          <p
            style={{
              marginTop: 6,
              fontSize: 14,
              fontStyle: 'italic',
              color: '#444',
              fontFamily: 'Inter, system-ui, sans-serif'
            }}
          >
            Uncertainty: {(uncertainty * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Node-attached tooltip (no link, bold title + summary) */}
      {showTooltip && primarySource && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 280, // a bit to the right of the node (~260 width + padding)
            maxWidth: 260,
            background: 'white',
            border: '1px solid rgba(0,0,0,0.18)',
            borderRadius: 8,
            boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
            padding: 10,
            zIndex: 9999,
            fontFamily: 'Inter, system-ui, sans-serif'
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 13,
              marginBottom: 4,
              color: '#111827'
            }}
          >
            {primarySource.title || 'Source'}
          </div>
          {primarySource.summary && (
            <div
              style={{
                fontSize: 13,
                lineHeight: 1.4,
                color: '#374151'
              }}
            >
              {primarySource.summary}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// --------------------------------------------
// Graph Component
// --------------------------------------------
export default function FlowComponent({
  centralClaim,
  relations,
  overallConfidence
}: FlowProps) {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  const nodeTypes = useMemo(() => ({ relationNode: RelationNode }), [])

  useEffect(() => {
    if (!relations || relations.length === 0 || !centralClaim) {
      setNodes([])
      setEdges([])
      return
    }

    const v0 = 1 - overallConfidence
    const supports = relations.filter((r) => r.type === 'SUPPORTS')
    const attacks = relations.filter((r) => r.type === 'ATTACKS')

    const finalConfidence = computeFinalClaimConfidence(
      v0,
      supports.map((r) => 1 - r.score),
      attacks.map((r) => 1 - r.score)
    )

    const centralUncertainty = 1 - finalConfidence

    const green = 'rgba(120, 200, 160, 0.35)'
    const red = 'rgba(230, 120, 120, 0.35)'
    const bluegray = 'rgba(150, 170, 200, 0.35)'

    const n: Node[] = []
    const e: Edge[] = []

    // CENTRAL CLAIM NODE
    const centralId = 'central'
    n.push({
      id: centralId,
      type: 'relationNode',
      data: {
        label: centralClaim,
        explanation: '',
        linksText: '',
        uncertainty: centralUncertainty,
        bgColor: bluegray,
        nodeRole: 'central'
      },
      position: { x: 480, y: 0 }
    })

    // SUPPORTS
    supports.forEach((rel, i) => {
      const id = `support-${i}`

      n.push({
        id,
        type: 'relationNode',
        data: {
          label: rel.source,
          explanation: rel.explanation,
          relation_links: rel.relation_links || [],
          uncertainty: rel.score,
          bgColor: green,
          nodeRole: 'support'
        },
        position: { x: 200, y: 250 + i * 450 }
      })

      e.push({
        id: `edge-s-${i}`,
        source: id,
        sourceHandle: 'right-out',
        target: centralId,
        targetHandle: 'bottom',
        label: 'supports',
        labelStyle: {
          fontSize: 18,
          fontWeight: 500,
          fill: '#111827',
          fontFamily: 'Inter, system-ui, sans-serif'
        },
        labelBgStyle: {
          fill: 'white',
          stroke: 'rgba(0,0,0,0.25)',
          strokeWidth: 0.9,
          rx: 5,
          ry: 5,
          padding: 5
        },
        style: { stroke: 'black', strokeWidth: 2 },
        markerEnd: { type: 'arrowclosed', color: 'black' }
      })
    })

    // ATTACKS
    attacks.forEach((rel, i) => {
      const id = `attack-${i}`

      n.push({
        id,
        type: 'relationNode',
        data: {
          label: rel.source,
          explanation: rel.explanation,
          relation_links: rel.relation_links || [],
          uncertainty: rel.score,
          bgColor: red,
          nodeRole: 'attack'
        },
        position: { x: 760, y: 250 + i * 480 }
      })

      e.push({
        id: `edge-a-${i}`,
        source: id,
        sourceHandle: 'left-out',
        target: centralId,
        targetHandle: 'bottom',
        label: 'attacks',
        labelStyle: {
          fontSize: 18,
          fontWeight: 500,
          fill: '#111827',
          fontFamily: 'Inter, system-ui, sans-serif'
        },
        labelBgStyle: {
          fill: 'white',
          stroke: 'rgba(0,0,0,0.25)',
          strokeWidth: 0.9,
          rx: 5,
          ry: 5,
          padding: 5
        },
        style: { stroke: 'black', strokeWidth: 2 },
        markerEnd: { type: 'arrowclosed', color: 'black' }
      })
    })

    setNodes(n)
    setEdges(e)
  }, [relations, centralClaim, overallConfidence])

  return (
    <div
      style={{
        width: '100%',
        height: '720px',
        border: '1px solid rgba(0,0,0,0.15)',
        borderRadius: 12,
        background: '#fafafa'
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        edgesFocusable={false}
        defaultEdgeOptions={{
          markerEnd: { type: 'arrowclosed', color: 'black' }
        }}
      >
        <Background color="#e5e5e5" gap={12} />
      </ReactFlow>
    </div>
  )
}
