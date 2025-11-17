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

// ------------------------------
// DF-QuAD helper functions
// ------------------------------
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

// ------------------------------
// Main visualization component
// ------------------------------
export default function FlowComponent() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  const onNodesChange: OnNodesChange = useCallback(
    chs => setNodes(nds => applyNodeChanges(chs, nds)),
    []
  )
  const onEdgesChange: OnEdgesChange = useCallback(
    chs => setEdges(eds => applyEdgeChanges(chs, eds)),
    []
  )
  const onConnect: OnConnect = useCallback(
    params => setEdges(eds => addEdge(params, eds)),
    []
  )

  // ---- Demo ArgLLM structure ----
  useEffect(() => {
    const demoArgs: Argument[] = [
      {
        id: 'claim',
        label: 'Dupilumab treats asthma',
        tau: 0.5,
        attackers: ['a1'],
        supporters: ['a2'],
      },
      {
        id: 'a1',
        label: 'Limited clinical trials',
        tau: 0.3,
      },
      {
        id: 'a2',
        label: 'FDA approval evidence',
        tau: 0.8,
      },
    ]

    const sigma = computeDfQuad(demoArgs)

    // ✅ Fixed layout + edge anchor directions
    const n: Node[] = [
      {
        id: 'claim',
        data: { label: `${demoArgs[0].label}\nσ=${sigma['claim'].toFixed(2)}` },
        position: { x: 300, y: 80 },
        targetPosition: 'bottom', // ✅ incoming edges attach to bottom
        sourcePosition: 'top',    // ✅ outgoing edges (if any) go upward
        style: {
          background: `rgba(230, 215, 180, ${0.4 + sigma['claim'] * 0.6})`,
          border: `2px solid ${sigma['claim'] > 0.5 ? '#4e944f' : '#c43e3e'}`,
          borderRadius: 12,
          padding: 10,
          textAlign: 'center',
          fontWeight: 500,
          whiteSpace: 'pre-line',
          transition: 'all 0.6s ease',
          fontSize: '14px', // reverted smaller consistent font
        },
      },
      {
        id: 'a1',
        data: { label: `${demoArgs[1].label}\nσ=${sigma['a1'].toFixed(2)}` },
        position: { x: 150, y: 300 },
        targetPosition: 'bottom',
        sourcePosition: 'top',
        style: {
          background: `rgba(230, 215, 180, ${0.4 + sigma['a1'] * 0.6})`,
          border: '2px solid #c43e3e',
          borderRadius: 12,
          padding: 10,
          textAlign: 'center',
          fontWeight: 500,
          whiteSpace: 'pre-line',
          fontSize: '14px',
        },
      },
      {
        id: 'a2',
        data: { label: `${demoArgs[2].label}\nσ=${sigma['a2'].toFixed(2)}` },
        position: { x: 450, y: 300 },
        targetPosition: 'bottom',
        sourcePosition: 'top',
        style: {
          background: `rgba(230, 215, 180, ${0.4 + sigma['a2'] * 0.6})`,
          border: '2px solid #4e944f',
          borderRadius: 12,
          padding: 10,
          textAlign: 'center',
          fontWeight: 500,
          whiteSpace: 'pre-line',
          fontSize: '14px',
        },
      },
    ]

    const e: Edge[] = [
      {
        id: 'a1-claim',
        source: 'a1',
        target: 'claim',
        label: 'attack',
        labelStyle: { fontSize: 15},
        labelShowBg: true, 
        labelBgStyle: {
          fill: "rgba(255,255,255,0.95)",   // faint white
          stroke: "rgba(0,0,0,0.15)",      // very light border
          strokeWidth: 0.6,                // thin outline
          padding: 2,                      // minimal padding
          borderRadius: 4                  // soft corners
        },
        animated: true,
        style: { stroke: '#c43e3e', strokeWidth: 2 },
        markerEnd: { type: 'arrowclosed', color: '#c43e3e' },
      },
      {
        id: 'a2-claim',
        source: 'a2',
        target: 'claim',
        label: 'support',
        labelStyle: { fontSize: 15},
        labelShowBg: true, 
        labelBgStyle: {
          fill: "rgba(255,255,255,0.95)",   // faint white
          stroke: "rgba(0,0,0,0.15)",      // very light border
          strokeWidth: 0.6,                // thin outline
          padding: 2,                      // minimal padding
          borderRadius: 4                  // soft corners
        },
        animated: true,
        style: { stroke: '#4e944f', strokeWidth: 2 },
        markerEnd: { type: 'arrowclosed', color: '#4e944f' },
      },
    ]

    setNodes(n)
    setEdges(e)
  }, [])

  // ------------------------------
  return (
    <div
      className="fade-in"
      style={{
        width: '100%',
        height: '550px',
        border: '1px solid rgba(0,0,0,0.15)',
        borderRadius: '10px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
        backgroundColor: '#fafafa',
        animation: 'fadeInSmooth 0.8s ease forwards',
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        proOptions={{ hideAttribution: true }} // ✅ removes “React Flow” watermark
        zoomOnScroll={false}
        zoomOnPinch={false}
        panOnScroll={false}
        zoomOnDoubleClick={false}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background color="#ddd" gap={16} />
      </ReactFlow>
    </div>
  )
}
