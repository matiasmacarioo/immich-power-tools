import React, { useMemo } from 'react';
import { ReactFlow, Controls, Background, MiniMap, Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { IPerson } from '@/types/person';
import { useTheme } from 'next-themes';

interface RelationshipGraphProps {
  relationships: any[];
  people: IPerson[];
}

const nodeWidth = 172;
const nodeHeight = 36;

export default function RelationshipGraph({ relationships, people }: RelationshipGraphProps) {
  const { theme } = useTheme();
  
  const peopleMap = useMemo(() => {
    const map: Record<string, IPerson> = {};
    people.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [people]);

  const { nodes, edges } = useMemo(() => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'TB' });

    const rawNodesMap: Record<string, Node> = {};
    const rawEdges: Edge[] = [];

    relationships.forEach((rel) => {
      if (!rawNodesMap[rel.person1Id]) {
        rawNodesMap[rel.person1Id] = {
          id: rel.person1Id,
          position: { x: 0, y: 0 },
          data: { label: peopleMap[rel.person1Id]?.name || 'Unknown' },
        };
      }
      if (!rawNodesMap[rel.person2Id]) {
        rawNodesMap[rel.person2Id] = {
          id: rel.person2Id,
          position: { x: 0, y: 0 },
          data: { label: peopleMap[rel.person2Id]?.name || 'Unknown' },
        };
      }

      rawEdges.push({
        id: rel.id,
        source: rel.person1Id,
        target: rel.person2Id,
        label: rel.relationshipType,
      });
    });

    const nodesArr = Object.values(rawNodesMap);

    nodesArr.forEach((node) => {
      dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    rawEdges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodesArr.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        targetPosition: 'top',
        sourcePosition: 'bottom',
        position: {
          x: nodeWithPosition.x - nodeWidth / 2,
          y: nodeWithPosition.y - nodeHeight / 2,
        },
      } as Node;
    });

    return { nodes: layoutedNodes, edges: rawEdges };
  }, [relationships, peopleMap]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        colorMode={theme === 'dark' ? 'dark' : 'light'}
      >
        <Controls />
        <MiniMap />
        <Background gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}
