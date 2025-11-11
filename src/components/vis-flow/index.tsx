'use client'

import { useEffect, useState, useCallback } from 'react'
import ReactFlow, {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
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
  console.log("✅ DF-QUAD FlowComponent loaded successfully");
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
        attackers: [],
        supporters: [],
      },
      {
        id: 'a2',
        label: 'FDA approval evidence',
        tau: 0.8,
        attackers: [],
        supporters: [],
      },
    ]

    const sigma = computeDfQuad(demoArgs)

    const n: Node[] = demoArgs.map((a, i) => ({
      id: a.id,
      data: {
        label: `${a.label}\nσ=${sigma[a.id].toFixed(2)}`,
      },
      position:
        i === 0
          ? { x: 250, y: 50 }
          : { x: 100 + i * 200, y: 250 },
      style: {
        background: `rgba(230, 215, 180, ${0.4 + sigma[a.id] * 0.6})`,
        border: `2px solid ${sigma[a.id] > 0.5 ? '#4e944f' : '#c43e3e'}`,
        borderRadius: 12,
        padding: 8,
        color: '#222',
        fontWeight: 500,
        whiteSpace: 'pre-line',
        transition: 'all 0.6s ease',
      },
    }))

    const e: Edge[] = [
      {
        id: 'a1-claim',
        source: 'a1',
        target: 'claim',
        label: 'attack',
        animated: true,
        style: { stroke: '#c43e3e', strokeWidth: 2 },
      },
      {
        id: 'a2-claim',
        source: 'a2',
        target: 'claim',
        label: 'support',
        animated: true,
        style: { stroke: '#4e944f', strokeWidth: 2 },
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
      >
        <Background color="#bbb" gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  )
}
