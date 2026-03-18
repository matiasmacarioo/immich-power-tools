import React, { useMemo, useCallback, useState } from 'react';
import { ReactFlow, Controls, Background, MiniMap, Node, Edge, Handle, Position, Connection, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { IPerson } from '@/types/person';
import { useTheme } from 'next-themes';
import toast from 'react-hot-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import PeopleDropdown from './PeopleDropdown';
import { Button } from '../ui/button';

interface RelationshipGraphProps {
  relationships: any[];
  people: IPerson[];
  onAddVisual?: () => void;
}

const nodeWidth = 220;
const nodeHeight = 60;

// Custom node featuring robust visual handles
const PersonNode = ({ id, data }: any) => {

  const handleClick = (e: React.MouseEvent, type: string) => {
    e.stopPropagation();
    if (data.onAddRelationClick) {
      data.onAddRelationClick({ personId: id, relType: type, personName: data.label });
    }
  };

  return (
    <div className="flex items-center gap-3 bg-card border rounded-lg p-2 pr-4 shadow-sm w-[220px] relative">
      {/* Target handles */}
      <Handle type="target" position={Position.Top} id="t-top" className="w-3 h-3 bg-transparent border-transparent" />
      <Handle type="target" position={Position.Bottom} id="t-bottom" className="w-3 h-3 bg-transparent border-transparent" />
      <Handle type="target" position={Position.Left} id="t-left" className="w-3 h-3 bg-transparent border-transparent" />
      <Handle type="target" position={Position.Right} id="t-right" className="w-3 h-3 bg-transparent border-transparent" />

      {/* Source handles */}
      <Handle type="source" position={Position.Top} id="s-top" className="w-3 h-3 bg-primary cursor-pointer hover:scale-150 transition-transform" onClick={(e) => handleClick(e, 'Child')} />
      <Handle type="source" position={Position.Bottom} id="s-bottom" className="w-3 h-3 bg-primary cursor-pointer hover:scale-150 transition-transform" onClick={(e) => handleClick(e, 'Parent')} />
      <Handle type="source" position={Position.Left} id="s-left" className="w-3 h-3 bg-primary cursor-pointer hover:scale-150 transition-transform" onClick={(e) => handleClick(e, 'Sibling')} />
      <Handle type="source" position={Position.Right} id="s-right" className="w-3 h-3 bg-primary cursor-pointer hover:scale-150 transition-transform" onClick={(e) => handleClick(e, 'Sibling')} />

      {data.imageUrl ? (
        <img src={data.imageUrl} alt={data.label} className="w-10 h-10 rounded-full object-cover bg-muted flex-shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-muted flex flex-shrink-0 items-center justify-center text-xs">?</div>
      )}
      <div className="flex flex-col overflow-hidden">
        <span className="font-semibold text-sm truncate">{data.label}</span>
      </div>
    </div>
  );
};

const nodeTypes = {
  person: PersonNode,
};

export default function RelationshipGraph({ relationships, people, onAddVisual }: RelationshipGraphProps) {
  const { theme } = useTheme();
  
  const [addingRelation, setAddingRelation] = useState<{ personId: string, relType: string, personName: string } | null>(null);
  const [selectedPersonForAdd, setSelectedPersonForAdd] = useState<string[]>([]);

  const handleAddRelationClick = useCallback((info: any) => {
    setAddingRelation(info);
    setSelectedPersonForAdd([]);
  }, []);

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
    dagreGraph.setGraph({ rankdir: 'TB', ranksep: 120, nodesep: 150 });

    const rawNodesMap: Record<string, Node> = {};
    const normalizedEdges = new Map<string, Edge>();

    const addCleanEdge = (source: string, target: string, type: string, isImplicit = false, realId: string | null = null) => {
      let finalSource = source;
      let finalTarget = target;
      let finalLabel = type;

      if (type === 'Child') {
        finalSource = target;
        finalTarget = source;
        finalLabel = 'Parent';
      } else if (['Sibling', 'Spouse', 'Friend'].includes(type)) {
        if (source > target) {
          finalSource = target;
          finalTarget = source;
        }
      }

      const key = `${finalSource}-${finalTarget}`;
      
      if (!normalizedEdges.has(key)) {
         normalizedEdges.set(key, {
           id: key,
           source: finalSource,
           target: finalTarget,
           label: finalLabel,
           data: { realId },
           type: 'smoothstep',
           markerEnd: {
             type: MarkerType.ArrowClosed,
             width: 15,
             height: 15,
           },
           animated: isImplicit,
           style: isImplicit ? { strokeDasharray: '5,5' } : undefined,
         });
      } else if (!isImplicit) {
         const existing = normalizedEdges.get(key)!;
         if (existing.animated) {
            existing.animated = false;
            existing.style = undefined;
            existing.label = finalLabel;
         }
         if (realId) existing.data = { realId };
      }
    };

    relationships.forEach((rel) => {
      [rel.person1Id, rel.person2Id].forEach((id) => {
        if (!rawNodesMap[id]) {
          rawNodesMap[id] = {
            id, type: 'person', position: { x: 0, y: 0 },
            data: { 
               label: peopleMap[id]?.name || 'Unknown', 
               imageUrl: peopleMap[id]?.thumbnailPath || '',
               onAddRelationClick: handleAddRelationClick
            },
          };
        }
      });
      addCleanEdge(rel.person1Id, rel.person2Id, rel.relationshipType, false, rel.id);
    });

    const currentEdges = Array.from(normalizedEdges.values());
    currentEdges.forEach((e1) => {
      if (e1.label === 'Parent') {
        currentEdges.forEach((e2) => {
           if (e2.label === 'Sibling') {
             if (e2.source === e1.target) {
               addCleanEdge(e1.source, e2.target, 'Parent', true);
             } else if (e2.target === e1.target) {
               addCleanEdge(e1.source, e2.source, 'Parent', true);
             }
           }
        });
      }
    });

    const nodesArr = Object.values(rawNodesMap);

    nodesArr.forEach((node) => {
      dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    normalizedEdges.forEach((edge) => {
      if (edge.label === 'Parent') {
        dagreGraph.setEdge(edge.source, edge.target);
      }
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodesArr.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id) || { x: 0, y: 0 };
      return {
        ...node,
        targetPosition: 'top',
        sourcePosition: 'bottom',
        position: {
          x: nodeWithPosition.x - (nodeWidth / 2),
          y: nodeWithPosition.y - (nodeHeight / 2),
        },
      } as Node;
    });

    // Remap handles dynamically based on actual positions
    const layoutedEdges = Array.from(normalizedEdges.values()).map((edge) => {
      if (['Sibling', 'Spouse', 'Friend'].includes(edge.label as string)) {
        const sourceNode = dagreGraph.node(edge.source);
        const targetNode = dagreGraph.node(edge.target);
        if (sourceNode && targetNode) {
          if (sourceNode.x < targetNode.x) {
            edge.sourceHandle = 's-right';
            edge.targetHandle = 't-left';
          } else {
            edge.sourceHandle = 's-left';
            edge.targetHandle = 't-right';
          }
        }
      } else {
        // Hierarchical relationships defaults
        edge.sourceHandle = 's-bottom';
        edge.targetHandle = 't-top';
      }
      return edge;
    });

    return { nodes: layoutedNodes, edges: layoutedEdges };
  }, [relationships, peopleMap, handleAddRelationClick]);

  const handleConnect = useCallback(async (params: Connection) => {
    if (params.source === params.target) {
      toast.error('Cannot relate to themselves!');
      return;
    }

    let relType = 'Friend';
    if (params.sourceHandle === 's-bottom') {
      relType = 'Parent'; 
    } else if (params.sourceHandle === 's-top') {
      relType = 'Child'; 
    } else if (params.sourceHandle === 's-left' || params.sourceHandle === 's-right') {
      relType = 'Sibling'; 
    }

    try {
      const res = await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person1Id: params.source,
          person2Id: params.target,
          relationshipType: relType,
        }),
      });
      if (res.ok) {
        toast.success(`Visual connection saved as ${relType}!`);
        if (onAddVisual) onAddVisual();
      } else {
        toast.error('Failed to save connection.');
      }
    } catch {
      toast.error('Error contacting server.');
    }
  }, [onAddVisual]);

  const handleEdgeContextMenu = useCallback(async (event: React.MouseEvent, edge: Edge) => {
    event.preventDefault();
    if (edge.animated) {
      toast.error('This is an inferred relationship! Delete the explicit relationship that generated it instead.');
      return;
    }
    if (!edge.data?.realId) return;

    if (confirm(`Remove the explicitly added '${edge.label}' relationship between these people?`)) {
      try {
        const res = await fetch(`/api/relationships/${edge.data.realId}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          toast.success('Relationship successfully purged!');
          if (onAddVisual) onAddVisual();
        } else {
          toast.error('Failed to delete relationship.');
        }
      } catch {
        toast.error('Error contacting server.');
      }
    }
  }, [onAddVisual]);

  const submitManualAdd = async () => {
    if (!addingRelation || selectedPersonForAdd.length === 0) return;
    try {
      const res = await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person1Id: addingRelation.personId,
          person2Id: selectedPersonForAdd[0],
          relationshipType: addingRelation.relType,
        }),
      });
      if (res.ok) {
        toast.success(`Relationship saved!`);
        setAddingRelation(null);
        if (onAddVisual) onAddVisual();
      } else {
        toast.error('Failed to save connection.');
      }
    } catch {
      toast.error('Error contacting server.');
    }
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        onConnect={handleConnect}
        onEdgeContextMenu={handleEdgeContextMenu}
        colorMode={theme === 'dark' ? 'dark' : 'light'}
      >
        <Controls />
        <MiniMap />
        <Background gap={12} size={1} />
      </ReactFlow>

      <Dialog open={!!addingRelation} onOpenChange={(open) => !open && setAddingRelation(null)}>
        <DialogContent className="max-w-md !p-6">
          <DialogHeader>
            <DialogTitle>Add {addingRelation?.relType} for {addingRelation?.personName}</DialogTitle>
            <DialogDescription>Search for a person to assign this relationship.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4 mt-2">
            <PeopleDropdown onChange={(ids) => setSelectedPersonForAdd(ids)} peopleIds={selectedPersonForAdd} />
            <Button 
              className="mt-4"
              disabled={selectedPersonForAdd.length === 0} 
              onClick={submitManualAdd}
            >
              Save Relationship
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
