'use client'

import { useEffect, useState } from 'react'
import ReactFlow, {
  Background,
  Edge,
  Node,
} from 'reactflow'

import 'reactflow/dist/style.css'

// ----------------------------------------
// Types from your new GPT JSON
// ----------------------------------------
interface Relation {
  source: string
  target: string   // ALWAYS central_claim
  type: 'SUPPORTS' | 'ATTACKS'
  score: number
}

interface FlowProps {
  centralClaim: string
  relations: Relation[]
}

// ----------------------------------------
// Main Evidence-Tree Visualization Component
// ----------------------------------------
export default function FlowComponent({ centralClaim, relations }: FlowProps) {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  useEffect(() => {
    if (!relations || relations.length === 0 || !centralClaim) return

    // ----------------------------------------
    // Split into SUPPORTS and ATTACKS
    // ----------------------------------------
    const supports = relations.filter(r => r.type === 'SUPPORTS')
    const attacks = relations.filter(r => r.type === 'ATTACKS')

    // Amber color (same family as token-level & paragraph bar)
    const amberRGB = '216, 180, 132'

    // Helper: convert score → background alpha
    const alphaFor = (score: number) => {
      // normalize 0.8–1.0 → 0–1
      const intensity = Math.max(0, score - 0.8) / 0.2
      return 0.35 + intensity * 0.55 // stronger range
    }

    // ----------------------------------------
    // Build nodes
    // ----------------------------------------

    const nodeList: Node[] = []

    // ---- CENTRAL CLAIM NODE ----
    nodeList.push({
      id: centralClaim,
      data: { label: centralClaim },
      position: { x: 600, y: 40 },
      style: {
        background: `rgba(${amberRGB}, 0.75)`,
        borderRadius: 14,
        padding: 15,
        textAlign: 'center',
        fontWeight: 600,
        fontSize: 18,
        whiteSpace: 'pre-line',
        color: 'black',
      }
    })

    // ---- SUPPORT NODES ----
    supports.forEach((rel, i) => {
      nodeList.push({
        id: rel.source,
        data: { label: `${rel.source}\n(score ${rel.score.toFixed(2)})` },
        position: { x: 150, y: 150 + i * 150 },
        style: {
          background: `rgba(${amberRGB}, ${alphaFor(rel.score)})`,
          borderRadius: 12,
          padding: 10,
          textAlign: 'center',
          fontWeight: 500,
          whiteSpace: 'pre-line',
          color: 'black',
        }
      })
    })

    // ---- ATTACK NODES ----
    attacks.forEach((rel, i) => {
      nodeList.push({
        id: rel.source,
        data: { label: `${rel.source}\n(score ${rel.score.toFixed(2)})` },
        position: { x: 1050, y: 150 + i * 150 },
        style: {
          background: `rgba(${amberRGB}, ${alphaFor(rel.score)})`,
          borderRadius: 12,
          padding: 10,
          textAlign: 'center',
          fontWeight: 500,
          whiteSpace: 'pre-line',
          color: 'black',
        }
      })
    })

    // ----------------------------------------
    // Build edges
    // ----------------------------------------

    const edgeList: Edge[] = relations.map((rel, i) => ({
      id: `e-${i}`,
      source: rel.source,
      target: centralClaim,
      label: rel.type === 'SUPPORTS' ? 'supports' : 'attacks',
      animated: true,
      style: {
        stroke: rel.type === 'SUPPORTS' ? '#3fa34d' : '#c43e3e',
        strokeWidth: 2
      },
      markerEnd: {
        type: 'arrowclosed',
        color: rel.type === 'SUPPORTS' ? '#3fa34d' : '#c43e3e'
      },
      labelStyle: {
        fontSize: 14,
        fontWeight: 600,
        fill: rel.type === 'SUPPORTS' ? '#2c7a3f' : '#a83232'
      },
      labelShowBg: true,
      labelBgStyle: {
        fill: "rgba(255,255,255,0.95)",
        stroke: "rgba(0,0,0,0.15)",
        strokeWidth: 0.6,
        padding: 2,
        borderRadius: 4,
      }
    }))

    setNodes(nodeList)
    setEdges(edgeList)
  }, [relations, centralClaim])

  // ----------------------------------------
  // Render
  // ----------------------------------------
  return (
    <div
      className="fade-in"
      style={{
        width: '100%',
        height: '550px',
        border: '1px solid rgba(0,0,0,0.15)',
        borderRadius: '10px',
        backgroundColor: '#fafafa'
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        proOptions={{ hideAttribution: true }}
        zoomOnScroll={false}
        zoomOnPinch={false}
        panOnScroll={false}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background color="#ddd" gap={16} />
      </ReactFlow>
    </div>
  )
}
