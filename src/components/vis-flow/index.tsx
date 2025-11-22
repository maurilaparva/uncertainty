'use client'

import { useEffect, useState } from 'react'
import ReactFlow, {
  Background,
  Edge,
  Node,
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
}

interface FlowProps {
  centralClaim: string
  relations: Relation[]
  overallConfidence: number   // <-- NEW
}

// --------------------------------------------
// DF-QuAD HELPERS
// --------------------------------------------
function aggregateF(values: number[]): number {
  if (!values || values.length === 0) return 0
  const product = values.reduce((acc, v) => acc * Math.abs(1 - v), 1)
  return 1 - product
}

function computeFinalClaimConfidence(
  v0: number,
  supporters: number[],
  attackers: number[]
) {
  const va = aggregateF(attackers)   // aggregated attack force
  const vs = aggregateF(supporters)  // aggregated support force

  if (va === vs) return v0

  if (va > vs) {
    return v0 - (v0 * Math.abs(vs - va))
  } else {
    return v0 + ((1 - v0) * Math.abs(vs - va))
  }
}

// --------------------------------------------
// Component
// --------------------------------------------
export default function FlowComponent({ centralClaim, relations, overallConfidence }: FlowProps) {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  useEffect(() => {
    if (!relations || relations.length === 0 || !centralClaim) return

    const supports = relations.filter(r => r.type === 'SUPPORTS')
    const attacks = relations.filter(r => r.type === 'ATTACKS')

    // --------------------------------------------
    // DF-QuAD: compute final aggregated confidence
    // --------------------------------------------
    const supportScores = supports.map(r => r.score)
    const attackScores = attacks.map(r => r.score)

    const finalConfidence = computeFinalClaimConfidence(
      overallConfidence,
      supportScores,
      attackScores
    )

    // --------------------------------------------
    // COLORS
    // --------------------------------------------
    const centralBlueGray = 'rgba(150, 170, 200, 0.35)'
    const green  = 'rgba(120, 200, 160, 0.25)'
    const red    = 'rgba(230, 120, 120, 0.25)'

    // --------------------------------------------
    // Base style for all nodes
    // --------------------------------------------
    const nodeBaseStyle = {
      borderRadius: 12,
      padding: 12,
      border: '1px solid rgba(0,0,0,0.18)',
      boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
      textAlign: 'center' as const,
      whiteSpace: 'pre-line' as const,
      fontWeight: 400,
      color: 'black',
    }

    const nodeList: Node[] = []

    // --------------------------------------------
    // CENTRAL NODE — now shows aggregated confidence
    // --------------------------------------------
    nodeList.push({
      id: centralClaim,
      data: { label: `${centralClaim}\n(confidence = ${finalConfidence.toFixed(2)})` },
      position: { x: 480, y: -100 },
      style: {
        ...nodeBaseStyle,
        background: centralBlueGray,
        fontSize: 17,
      },
      targetPosition: Position.Bottom,
      sourcePosition: Position.Bottom
    })

    // --------------------------------------------
    // SUPPORTING NODES — green
    // --------------------------------------------
    supports.forEach((rel, i) => {
      nodeList.push({
        id: rel.source,
        data: { label: `${rel.source}\n(confidence = ${rel.score.toFixed(2)})` },
        position: { x: 280, y: 130 + i * 110 },
        style: {
          ...nodeBaseStyle,
          background: green,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left
      })
    })

    // --------------------------------------------
    // ATTACKING NODES — red
    // --------------------------------------------
    attacks.forEach((rel, i) => {
      nodeList.push({
        id: rel.source,
        data: { label: `${rel.source}\n(confidence = ${rel.score.toFixed(2)})` },
        position: { x: 680, y: 130 + i * 110 },
        style: {
          ...nodeBaseStyle,
          background: red,
        },
        sourcePosition: Position.Left,
        targetPosition: Position.Right
      })
    })

    // --------------------------------------------
    // EDGES — dotted with labels
    // --------------------------------------------
    const edgeList: Edge[] = relations.map((rel, i) => ({
      id: `e-${i}`,
      source: rel.source,
      target: centralClaim,
      animated: false,
      label: rel.type === 'SUPPORTS' ? 'supports' : 'attacks',
      style: {
        stroke: 'black',
        strokeWidth: 1.6,
        strokeDasharray: '4 3',
      },
      labelStyle: {
        fontSize: 12.5,
        fontWeight: 500,
        fill: 'black'
      },
      labelShowBg: true,
      labelBgStyle: {
        fill: 'white',
        stroke: 'rgba(0,0,0,0.22)',
        strokeWidth: 0.5,
        borderRadius: 4,
        padding: 2,
      },
      markerEnd: { type: 'arrowclosed', color: 'black' }
    }))

    setNodes(nodeList)
    setEdges(edgeList)
  }, [relations, centralClaim, overallConfidence])

  return (
    <div
      className="fade-in"
      style={{
        width: '100%',
        height: '550px',
        border: '1px solid rgba(0,0,0,0.15)',
        borderRadius: '12px',
        backgroundColor: '#fafafa',
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{
          padding: 0.25,
        }}
        minZoom={0.3}
        maxZoom={2.2}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={true}
        zoomOnPinch={false}
        panOnScroll={false}
      >
        <Background color="#e5e5e5" gap={10} />
      </ReactFlow>
    </div>
  )
}
