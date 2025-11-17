'use client'

import { useCallback, useEffect, useState } from 'react'
import ReactFlow, {
  addEdge,
  Node,
  Edge,
  applyNodeChanges,
  applyEdgeChanges,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  Controls,
  Background,
} from 'reactflow'

import 'reactflow/dist/style.css'
import CustomEdge from './customEdge'

// --- DF-QuAD helper ------------------------------------------------
interface Argument {
  id: string
  label: string
  tau: number // intrinsic base score
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

// -------------------------------------------------------------------

export default function FlowTest({
  nodes: initNodes,
  edges: initEdges,
}: {
  nodes: Node[]
  edges: Edge[]
}) {
  const [nodes, setNodes] = useState<Node[]>(initNodes)
  const [edges, setEdges] = useState<Edge[]>(initEdges)

  const onNodesChange: OnNodesChange = useCallback(
    changes => setNodes(nds => applyNodeChanges(changes, nds)),
    []
  )

  const onEdgesChange: OnEdgesChange = useCallback(
    changes => setEdges(eds => applyEdgeChanges(changes, eds)),
    []
  )

  const onConnect: OnConnect = useCallback(
    params => setEdges(eds => addEdge(params, eds)),
    []
  )

  // --- demo ArgLLM simulation -------------------------------------
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
          : { x: 100 + i * 200, y: 250 }, // simple layout
      style: {
        background: `rgba(120, 200, 120, ${
          0.4 + sigma[a.id] * 0.6
        })`,
        border: `2px solid ${
          sigma[a.id] > 0.5 ? 'green' : 'red'
        }`,
        borderRadius: 12,
        padding: 8,
        color: '#111',
        fontWeight: 500,
        whiteSpace: 'pre-line',
        transition: 'all 0.5s ease',
      },
    }))

    const e: Edge[] = [
  {
    id: 'a1-claim',
    source: 'a1',
    target: 'claim',
    type: 'custom',
    label: 'attack',
    animated: true,
    style: { stroke: 'red' },
    labelStyle: { fontSize: 40, fontWeight: 700 },
    labelShowBg: true,
    labelBgStyle: {
      fill: 'rgba(255,255,255,0.8)',
      stroke: 'none',
      padding: 4,
      borderRadius: 4
    },
  },
  {
    id: 'a2-claim',
    source: 'a2',
    target: 'claim',
    type: 'custom',
    label: 'support',
    animated: true,
    style: { stroke: 'green' },
    labelStyle: { fontSize: 18, fontWeight: 700 },
    labelShowBg: true,
    labelBgStyle: {
      fill: 'rgba(255,255,255,0.8)',
      stroke: 'none',
      padding: 4,
      borderRadius: 4
    },
  },
];


    setNodes(n)
    setEdges(e)
  }, [])
  // ---------------------------------------------------------------
  const edgeTypes = {
    custom: CustomEdge,
  };

  return (
    <div
      className="relative fade-in"
      style={{
        width: '100%',
        height: '550px',
        animation: 'fadeInSmooth 0.8s ease forwards',
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        edgeTypes = {edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Background color="#aaa" gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  )
}
