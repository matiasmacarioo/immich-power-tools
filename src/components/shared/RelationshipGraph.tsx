import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { ReactFlow, Controls, Background, MiniMap, Node, Edge, Handle, Position, Connection, MarkerType, BaseEdge, EdgeLabelRenderer, getSmoothStepPath, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { IPerson } from '@/types/person';
import { useTheme } from 'next-themes';
import toast from 'react-hot-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import PeopleDropdown from './PeopleDropdown';
import { Button } from '../ui/button';
import { Check } from 'lucide-react';

interface RelationshipGraphProps {
  relationships: any[];
  people: IPerson[];
  onAddVisual?: () => void;
}

const nodeWidth = 220;
const nodeHeight = 60;

// Custom edge to handle rendering inference suggestions cleanly
const ImplicitEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data
}: any) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetPosition,
    targetX,
    targetY,
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, zIndex: 100 }} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
            zIndex: 1000,
          }}
          className="flex items-center justify-center nodrag nopan"
        >
          <div
            className="bg-green-500/30 hover:bg-green-500 border border-green-500 text-white rounded-full p-1 cursor-pointer shadow-md transition-all hover:scale-125 flex items-center justify-center w-7 h-7"
            onClick={(e) => {
              e.stopPropagation();
              if (data?.onAccept) data.onAccept(data);
            }}
            title={data?.tooltipText || "Accept implicit relationship"}
          >
            <Check size={16} className="text-green-700 dark:text-green-300 hover:text-white" />
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

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
      <Handle type="source" position={Position.Top} id="s-top" className="w-3 h-3 bg-primary cursor-pointer hover:scale-150 transition-transform" onClick={(e) => handleClick(e, 'Parent')} />
      <Handle type="source" position={Position.Bottom} id="s-bottom" className="w-3 h-3 bg-primary cursor-pointer hover:scale-150 transition-transform" onClick={(e) => handleClick(e, 'Child')} />
      <Handle type="source" position={Position.Left} id="s-left" className="w-3 h-3 bg-primary cursor-pointer hover:scale-150 transition-transform" onClick={(e) => handleClick(e, 'Side')} />
      <Handle type="source" position={Position.Right} id="s-right" className="w-3 h-3 bg-primary cursor-pointer hover:scale-150 transition-transform" onClick={(e) => handleClick(e, 'Side')} />

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

const edgeTypes = {
  implicitEdge: ImplicitEdge,
};

export default function RelationshipGraph({ relationships, people, onAddVisual }: RelationshipGraphProps) {
  const { theme } = useTheme();
  
  const [addingRelation, setAddingRelation] = useState<{ personId: string, relType: string, personName: string } | null>(null);
  const [selectedPersonForAdd, setSelectedPersonForAdd] = useState<string[]>([]);

  const handleAcceptImplicit = useCallback(async (edgeData: any) => {
    try {
      const res = await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person1Id: edgeData.sourceId,
          person2Id: edgeData.targetId,
          relationshipType: edgeData.label,
        }),
      });
      if (res.ok) {
        toast.success(`Accepted ${edgeData.label}!`);
        if (onAddVisual) onAddVisual();
      } else {
        toast.error('Failed to accept connection.');
      }
    } catch {
      toast.error('Error contacting server.');
    }
  }, [onAddVisual]);

  const handleAddRelationClick = useCallback((info: any) => {
    let type = info.relType;
    if (type === 'Side') {
      const isParent = relationships.some(r => r.relationshipType === 'Parent' && r.person1Id === info.personId);
      type = isParent ? 'Spouse' : 'Sibling';
    }
    setAddingRelation({ ...info, relType: type });
    setSelectedPersonForAdd([]);
  }, [relationships]);

  const peopleMap = useMemo(() => {
    const map: Record<string, IPerson> = {};
    people.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [people]);

  const { initialNodes, initialEdges } = useMemo(() => {
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
      } else if (['Sibling', 'Spouse', 'Friend', 'Cousin'].includes(type)) {
        if (source > target) {
          finalSource = target;
          finalTarget = source;
        }
      }

      const key = `${finalSource}-${finalTarget}`;
      
      const sourceName = peopleMap[finalSource]?.name || 'Unknown';
      const targetName = peopleMap[finalTarget]?.name || 'Unknown';
      let tooltipText = `Accept ${finalLabel} relationship`;
      
      if (finalLabel === 'Parent') {
        tooltipText = `Click to formally save ${sourceName} as the Parent of ${targetName}`;
      } else {
        tooltipText = `Click to formally link ${sourceName} and ${targetName} as ${finalLabel}s`;
      }

      if (!normalizedEdges.has(key)) {
         normalizedEdges.set(key, {
           id: key,
           source: finalSource,
           target: finalTarget,
           label: finalLabel,
           data: { 
             realId,
             sourceId: finalSource,
             targetId: finalTarget,
             label: finalLabel,
             tooltipText,
             onAccept: handleAcceptImplicit
           },
           type: isImplicit ? 'implicitEdge' : 'smoothstep',
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
            existing.type = 'smoothstep';
            existing.style = undefined;
            existing.label = finalLabel;
         }
         existing.data = { ...existing.data, realId };
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

    const getParents = (personId: string) => {
      return relationships.filter(r => r.relationshipType === 'Parent' && r.person2Id === personId).map(r => r.person1Id);
    };
    const getChildren = (personId: string) => {
      return relationships.filter(r => r.relationshipType === 'Parent' && r.person1Id === personId).map(r => r.person2Id);
    };
    const getSiblings = (personId: string) => {
       const parents = getParents(personId);
       const siblings = new Set<string>();
       parents.forEach(p => {
          getChildren(p).forEach(c => {
             if (c !== personId) siblings.add(c);
          });
       });
       relationships.filter(r => r.relationshipType === 'Sibling' && r.person1Id === personId).forEach(r => siblings.add(r.person2Id));
       relationships.filter(r => r.relationshipType === 'Sibling' && r.person2Id === personId).forEach(r => siblings.add(r.person1Id));
       return Array.from(siblings);
    };

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

    // Advanced Inferences
    nodesArr.forEach(nodeA => {
       const aId = nodeA.id;
       const parentsA = getParents(aId);
       
       // Infer siblings
       parentsA.forEach(pA => {
           getChildren(pA).forEach(bId => {
               if (aId !== bId) {
                  addCleanEdge(aId, bId, 'Sibling', true);
               }
           });
       });

       // Infer cousins
       parentsA.forEach(pA => {
           const siblingsP = getSiblings(pA);
           siblingsP.forEach(sP => {
               const childrenS = getChildren(sP);
               childrenS.forEach(bId => {
                   if (aId !== bId) {
                      addCleanEdge(aId, bId, 'Cousin', true);
                   }
               });
           });
       });
    });

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
      if (['Sibling', 'Spouse', 'Friend', 'Cousin'].includes(edge.label as string)) {
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

    return { initialNodes: layoutedNodes, initialEdges: layoutedEdges };
  }, [relationships, peopleMap, handleAddRelationClick]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

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
      const sourceChildren = relationships.filter(r => r.relationshipType === 'Parent' && r.person1Id === params.source).map(r => r.person2Id);
      const targetChildren = relationships.filter(r => r.relationshipType === 'Parent' && r.person1Id === params.target).map(r => r.person2Id);
      const shareChild = sourceChildren.some(c => targetChildren.includes(c));

      const sourceParents = relationships.filter(r => r.relationshipType === 'Parent' && r.person2Id === params.source).map(r => r.person1Id);
      const targetParents = relationships.filter(r => r.relationshipType === 'Parent' && r.person2Id === params.target).map(r => r.person1Id);
      const shareParent = sourceParents.some(p => targetParents.includes(p));

      if (shareChild) {
        relType = 'Spouse';
      } else if (shareParent) {
        relType = 'Sibling';
      } else if (sourceChildren.length > 0 || targetChildren.length > 0) {
        relType = 'Spouse'; 
      } else {
        relType = 'Sibling'; 
      }
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

    let p1 = addingRelation.personId;
    let p2 = selectedPersonForAdd[0];
    let rType = addingRelation.relType;

    if (addingRelation.relType === 'Parent') {
      // The new person (p2) is the parent of the current person (p1)
      p1 = selectedPersonForAdd[0];
      p2 = addingRelation.personId;
      rType = 'Parent';
    } else if (addingRelation.relType === 'Child') {
      // The current person (p1) is the parent of the new person (p2)
      p1 = addingRelation.personId;
      p2 = selectedPersonForAdd[0];
      rType = 'Parent';
    }

    try {
      const res = await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person1Id: p1,
          person2Id: p2,
          relationshipType: rType,
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

  const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
    setEdges((eds) => eds.map((ed) => {
      const isConnected = ed.source === node.id || ed.target === node.id;
      const isImplicit = ed.type === 'implicitEdge';
      return {
        ...ed,
        animated: isConnected ? true : isImplicit,
        style: {
          strokeWidth: isConnected ? 3 : 1,
          stroke: isConnected ? (isImplicit ? '#10b981' : '#3b82f6') : undefined,
          opacity: isConnected ? 1 : 0.2,
          strokeDasharray: isImplicit ? '5,5' : undefined,
          transition: 'stroke-width 0.2s, stroke 0.2s, opacity 0.2s',
        },
      };
    }));
    
    setNodes((nds) => nds.map((n) => {
      const isConnectedNode = n.id === node.id || initialEdges.some(e => 
        (e.source === node.id && e.target === n.id) || 
        (e.target === node.id && e.source === n.id)
      );
      return {
        ...n,
        style: {
           ...n.style,
           opacity: isConnectedNode ? 1 : 0.4,
           transition: 'opacity 0.2s',
        }
      };
    }));
  }, [setEdges, setNodes, initialEdges]);

  const onNodeMouseLeave = useCallback(() => {
    setEdges((eds) => eds.map((ed) => {
      const isImplicit = ed.type === 'implicitEdge';
      return {
        ...ed,
        animated: isImplicit,
        style: {
           strokeDasharray: isImplicit ? '5,5' : undefined,
           transition: 'stroke-width 0.2s, stroke 0.2s, opacity 0.2s',
        },
      };
    }));
    setNodes((nds) => nds.map((n) => ({
      ...n,
      style: {
         ...n.style,
         opacity: 1,
         transition: 'opacity 0.2s',
      }
    })));
  }, [setEdges, setNodes]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
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
