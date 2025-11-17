'use client'

import { useEffect, useState, useCallback } from 'react'
import ReactFlow, {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Edge,
  Node,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
} from 'reactflow'

import 'reactflow/dist/style.css'

// ----------------------------------------
// Types from your new GPT JSON
// ----------------------------------------
interface Relation {
  source: string
  target: string
  type: 'SUPPORTS' | 'ATTACKS'
  score: number
}

interface FlowProps {
  relations: Relation[]
}

// ----------------------------------------
// DF-QuAD helper functions (unchanged)
// ----------------------------------------
interface Argument {
  id: string
  label: string
  tau: number
  attackers?: string[]
  supporters?: string[]
}

function computeDfQuad(args: Argument[]) {
  const sigma: Record<string, number> = {}
  args.forEach(a => (sigma[a.id] = a.tau))

  const F = (vals: number[]) =>
    vals.length === 0 ? 0 : 1 - vals.reduce((p, v) => p * Math.abs(1 - v), 1)

  const C = (v0: number, va: number, vs: number) => {
    if (va === vs) return v0
    if (va > vs) return v0 - v0 * Math.abs(vs - va)
    return v0 + (1 - v0) * Math.abs(vs - va)
  }

  for (let iter = 0; iter < 10; iter++) {
    let delta = 0
    for (const a of args) {
      const va = F((a.attackers ?? []).map(id => sigma[id]))
      const vs = F((a.supporters ?? []).map(id => sigma[id]))
      const newVal = C(a.tau, va, vs)
      delta = Math.max(delta, Math.abs(newVal - sigma[a.id]))
      sigma[a.id] = newVal
    }
    if (delta < 1e-4) break
  }
  return sigma
}

// ----------------------------------------
// Main Visualization Component
// ----------------------------------------
export default function FlowComponent({ relations }: FlowProps) {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  const onNodesChange: OnNodesChange = useCallback(
    ch => setNodes(nds => applyNodeChanges(ch, nds)),
    []
  )
  const onEdgesChange: OnEdgesChange = useCallback(
    ch => setEdges(eds => applyEdgeChanges(ch, eds)),
    []
  )
  const onConnect: OnConnect = useCallback(
    params => setEdges(eds => addEdge(params, eds)),
    []
  )

  // ----------------------------------------
  // Convert GPT relations → Argument graph
  // ----------------------------------------
  useEffect(() => {
    if (!relations || relations.length === 0) return

    // Collect all nodes
    const nodeNames = new Set<string>()
    relations.forEach(r => {
      nodeNames.add(r.source)
      nodeNames.add(r.target)
    })

    const argMap: Record<string, Argument> = {}
    nodeNames.forEach(n => {
      argMap[n] = {
        id: n,
        label: n,
        tau: 0.5,     // default prior
        attackers: [],
        supporters: []
      }
    })

    relations.forEach(r => {
      if (r.type === 'ATTACKS')
        argMap[r.target].attackers!.push(r.source)
      else
        argMap[r.target].supporters!.push(r.source)
    })

    const args = Object.values(argMap)
    const sigma = computeDfQuad(args)

    // Colors
    const green = (s: number) => `rgba(78, 148, 79, ${0.35 + s * 0.55})`
    const red   = (s: number) => `rgba(196, 62, 62, ${0.35 + s * 0.55})`

    // Position layout (simple grid)
    const nodeArray = Array.from(nodeNames)
    const nodeObjs: Node[] = nodeArray.map((name, i) => ({
      id: name,
      data: { label: `${name}\nσ=${sigma[name].toFixed(2)}` },
      position: { x: 150 + (i % 4) * 220, y: 100 + Math.floor(i / 4) * 180 },
      style: {
        background: sigma[name] > 0.5 ? green(sigma[name]) : red(sigma[name]),
        borderRadius: 12,
        padding: 10,
        textAlign: 'center',
        fontWeight: 500,
        whiteSpace: 'pre-line',
        color: 'black',
        transition: 'all 0.6s ease',
      }
    }))

    // Edges
    const edgeObjs: Edge[] = relations.map((r, i) => ({
      id: `e-${i}`,
      source: r.source,
      target: r.target,
      label: r.type === 'ATTACKS' ? 'attack' : 'support',
      animated: true,
      style: {
        stroke: r.type === 'ATTACKS' ? '#c43e3e' : '#4e944f',
        strokeWidth: 2
      },
      markerEnd: {
        type: 'arrowclosed',
        color: r.type === 'ATTACKS' ? '#c43e3e' : '#4e944f'
      },
      labelStyle: { fontSize: 15 },
      labelShowBg: true,
      labelBgStyle: {
        fill: "rgba(255,255,255,0.95)",
        stroke: "rgba(0,0,0,0.15)",
        strokeWidth: 0.6,
        padding: 2,
        borderRadius: 4
      }
    }))

    setNodes(nodeObjs)
    setEdges(edgeObjs)

  }, [relations])

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
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
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
