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

// Custom node featuring robust visual handles
const PersonNode = ({ id, data }: any) => {

  const handleClick = (e: React.MouseEvent, type: string, category: string) => {
    e.stopPropagation();
    if (data.onAddRelationClick) {
      data.onAddRelationClick({ personId: id, relType: type, category, personName: data.label });
    }
  };

  return (
    <div className={`flex items-center gap-3 bg-card border p-2 pr-4 shadow-sm w-[220px] relative transition-all ${data.roundedClass || 'rounded-lg'}`}>
      {/* Target handles */}
      <Handle type="target" position={Position.Top} id="t-top" className="w-3 h-3 bg-transparent border-transparent" />
      <Handle type="target" position={Position.Bottom} id="t-bottom" className="w-3 h-3 bg-transparent border-transparent" />
      <Handle type="target" position={Position.Left} id="t-left" className="w-3 h-3 bg-transparent border-transparent" />
      <Handle type="target" position={Position.Right} id="t-right" className="w-3 h-3 bg-transparent border-transparent" />

      {/* Source handles */}
      <Handle type="source" position={Position.Top} id="s-top" className="w-3 h-3 bg-primary cursor-pointer hover:scale-150 transition-transform" onClick={(e) => handleClick(e, 'Parent', 'Top')} />
      <Handle type="source" position={Position.Bottom} id="s-bottom" className="w-3 h-3 bg-primary cursor-pointer hover:scale-150 transition-transform" onClick={(e) => handleClick(e, 'Child', 'Bottom')} />
      <Handle type="source" position={Position.Left} id="s-left" className="w-3 h-3 bg-primary cursor-pointer hover:scale-150 transition-transform" onClick={(e) => handleClick(e, 'Side', 'Side')} />
      <Handle type="source" position={Position.Right} id="s-right" className="w-3 h-3 bg-primary cursor-pointer hover:scale-150 transition-transform" onClick={(e) => handleClick(e, 'Side', 'Side')} />

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
  
  const [addingRelation, setAddingRelation] = useState<{ personId: string, relType: string, category: string, personName: string } | null>(null);
  const [selectedPersonForAdd, setSelectedPersonForAdd] = useState<string[]>([]);
  const [selectedRelType, setSelectedRelType] = useState<string>('');

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
    setSelectedRelType(type);
    setSelectedPersonForAdd([]);
  }, [relationships]);

  const peopleMap = useMemo(() => {
    const map: Record<string, IPerson> = {};
    people.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [people]);

  const getParents = useCallback((personId: string) => {
    return relationships.filter(r => r.relationshipType === 'Parent' && r.person2Id === personId).map(r => r.person1Id);
  }, [relationships]);

  const getChildren = useCallback((personId: string) => {
    return relationships.filter(r => r.relationshipType === 'Parent' && r.person1Id === personId).map(r => r.person2Id);
  }, [relationships]);

  const getSpouses = useCallback((personId: string) => {
    const spouses = new Set<string>();
    relationships.filter(r => r.relationshipType === 'Spouse' && r.person1Id === personId).forEach(r => spouses.add(r.person2Id));
    relationships.filter(r => r.relationshipType === 'Spouse' && r.person2Id === personId).forEach(r => spouses.add(r.person1Id));
    const children = getChildren(personId);
    children.forEach(child => {
        const coParents = getParents(child);
        coParents.forEach(cp => {
            if (cp !== personId) spouses.add(cp);
        });
    });
    return Array.from(spouses);
  }, [relationships, getChildren, getParents]);

  const getSiblings = useCallback((personId: string) => {
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
  }, [relationships, getParents, getChildren]);

  const { initialNodes, initialEdges, suggestions } = useMemo(() => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'TB', ranksep: 100, nodesep: 40, edgesep: 30 });

    const rawNodesMap: Record<string, Node> = {};
    const normalizedEdges = new Map<string, Edge>();
    const suggestionsTemp: any[] = [];

    const addSuggestion = (source: string, target: string, type: string) => {
        let finalSource = source;
        let finalTarget = target;
        if (['Sibling', 'Spouse', 'Friend', 'Cousin', 'Step-Sibling'].includes(type)) {
            if (source > target) {
                finalSource = target;
                finalTarget = source;
            }
        } else if (type === 'Child' || type === 'Step-Child') {
            finalSource = target;
            finalTarget = source;
            type = type === 'Child' ? 'Parent' : 'Step-Parent';
        }
        
        const key = `${finalSource}-${finalTarget}`;
        if (!normalizedEdges.has(key) && !suggestionsTemp.some(s => s.key === key)) {
            suggestionsTemp.push({
                key,
                sourceId: finalSource,
                targetId: finalTarget,
                label: type,
                sourceName: peopleMap[finalSource]?.name || 'Unknown',
                targetName: peopleMap[finalTarget]?.name || 'Unknown',
                sourceImage: peopleMap[finalSource]?.thumbnailPath || '',
                targetImage: peopleMap[finalTarget]?.thumbnailPath || '',
            });
        }
    };

    const addCleanEdge = (source: string, target: string, type: string, realId: string | null = null) => {
      let finalSource = source;
      let finalTarget = target;
      let finalLabel = type;

      if (type === 'Child' || type === 'Step-Child') {
        finalSource = target;
        finalTarget = source;
        finalLabel = type === 'Child' ? 'Parent' : 'Step-Parent';
      } else if (['Sibling', 'Spouse', 'Friend', 'Cousin', 'Step-Sibling'].includes(type)) {
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
           data: { 
             realId,
             sourceId: finalSource,
             targetId: finalTarget,
             label: finalLabel,
           },
           type: 'smoothstep',
           markerEnd: {
             type: MarkerType.ArrowClosed,
             width: 15,
             height: 15,
           },
         });
      } else {
         const existing = normalizedEdges.get(key)!;
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
      addCleanEdge(rel.person1Id, rel.person2Id, rel.relationshipType, rel.id);
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
                  addSuggestion(aId, bId, 'Sibling');
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
                      addSuggestion(aId, bId, 'Cousin');
                   }
               });
           });
       });

       // Infer spouse's children as possible 'Parent' relationships
       const spousesA = getSpouses(aId);
       spousesA.forEach(spouseId => {
           const spouseChildren = getChildren(spouseId);
           const myChildren = getChildren(aId);
           spouseChildren.forEach(childId => {
               if (!myChildren.includes(childId) && aId !== childId) {
                   // Suggest the current node (aId) as the Parent of the spouse's child
                   addSuggestion(aId, childId, 'Parent');
               }
           });
       });
    });

    nodesArr.forEach((node) => {
      dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    normalizedEdges.forEach((edge) => {
      if (edge.label === 'Parent' || edge.label === 'Step-Parent') {
        dagreGraph.setEdge(edge.source, edge.target, { weight: 2 });
      }
    });

    const proxyByParent = new Map<string, string>();

    normalizedEdges.forEach((edge) => {
      if (edge.label === 'Spouse') {
         const dummyId = `proxy_marriage_${edge.source}_${edge.target}`;
         // 0 width/height proxy node mathematically situated explicitly on the identical rank (minlen 0)
         dagreGraph.setNode(dummyId, { width: 1, height: 1 });
         dagreGraph.setEdge(edge.source, dummyId, { weight: 100, minlen: 0 });
         dagreGraph.setEdge(edge.target, dummyId, { weight: 100, minlen: 0 });

         proxyByParent.set(edge.source, dummyId);
         proxyByParent.set(edge.target, dummyId);
      }
    });

    normalizedEdges.forEach((edge) => {
      if (edge.label === 'Parent' || edge.label === 'Step-Parent') {
        const proxyId = proxyByParent.get(edge.source);
        if (proxyId) {
           // Route the mathematical child layout through the shared marriage proxy.
           // This guarantees the spouses act as a solitary centered anchor directly above ALL their cumulative subtrees.
           dagreGraph.setEdge(proxyId, edge.target, { weight: 2, minlen: 1 });
        } else {
           dagreGraph.setEdge(edge.source, edge.target, { weight: 2, minlen: 1 });
        }
      }
    });

    dagre.layout(dagreGraph);

    const checkMates = (n1: string, n2: string) => {
        const edge1 = normalizedEdges.get(`${n1}-${n2}`);
        const edge2 = normalizedEdges.get(`${n2}-${n1}`);
        // We only allow immediate nuclear family members natively on the same rank (Spouses and Siblings) to form Combined Cards.
        // Allowing extended relations like Cousins causes separate sibling groups to glue together across family boundaries!
        if (edge1 && ['Spouse', 'Sibling', 'Step-Sibling', 'Half-Sibling'].includes(edge1.label as string)) return true;
        if (edge2 && ['Spouse', 'Sibling', 'Step-Sibling', 'Half-Sibling'].includes(edge2.label as string)) return true;

        const p1 = getParents(n1);
        const p2 = getParents(n2);
        if (p1.length > 0 && p1.some(p => p2.includes(p))) return true;

        return false;
    };

    const layoutedNodes: Node[] = [];
    const ranks = new Map<number, Node[]>();
    const yRanks: number[] = [];

    nodesArr.forEach(node => {
        const dNode = dagreGraph.node(node.id);
        const y = dNode.y;
        
        // Dagre sometimes floats nodes vertically by sub-pixels.
        // If we strictly round, they split into independent collision lanes resulting in total visual overlaps!
        // This clusters nodes into the same computational collision-detection tier if they sit within 50px vertically.
        let foundY = yRanks.find(ry => Math.abs(ry - y) < 50);
        if (foundY === undefined) {
            foundY = y;
            yRanks.push(foundY);
            ranks.set(foundY, []);
        }
        ranks.get(foundY)!.push(node);
    });

    Array.from(ranks.keys()).sort((a,b)=>a-b).forEach(y => {
        const rankNodes = ranks.get(y)!;
        rankNodes.sort((a,b) => dagreGraph.node(a.id).x - dagreGraph.node(b.id).x);

        let currentX = dagreGraph.node(rankNodes[0].id).x - nodeWidth / 2;

        for (let i = 0; i < rankNodes.length; i++) {
           const node = rankNodes[i];
           const nextNode = rankNodes[i+1];
           
           let isLinkedToNext = false;
           if (nextNode && checkMates(node.id, nextNode.id)) {
               const dNodeX = dagreGraph.node(node.id).x;
               const dNextX = dagreGraph.node(nextNode.id).x;
               // Dagre spaces adjacent siblings roughly nodeWidth + nodesep apart.
               // We only snap horizontally if dagre positioned them relatively nearby natively.
               if (dNextX - dNodeX < nodeWidth * 1.8) {
                   isLinkedToNext = true;
               }
           }

           const isLinkedToPrev = i > 0 && rankNodes[i-1].data.linkedToNext;

           let roundedClass = 'rounded-lg';
           if (isLinkedToPrev && isLinkedToNext) {
               roundedClass = 'rounded-none border-x-0';
           } else if (isLinkedToPrev && !isLinkedToNext) {
               roundedClass = 'rounded-l-none rounded-r-lg border-l-0';
           } else if (!isLinkedToPrev && isLinkedToNext) {
               roundedClass = 'rounded-r-none rounded-l-lg border-r-0';
           }

           node.data = { ...node.data, roundedClass, linkedToNext: isLinkedToNext };

           layoutedNodes.push({
               ...node,
               position: { x: currentX, y: y - nodeHeight / 2 }
           });

           if (isLinkedToNext) {
               currentX += nodeWidth; // Instantly snap identically next to each other
           } else if (nextNode) {
               const nextOriginalX = dagreGraph.node(nextNode.id).x - nodeWidth / 2;
               currentX = Math.max(currentX + nodeWidth + 40, nextOriginalX);
           }
        }
    });

    // Remap handles dynamically based on actual positions
    const layoutedEdges = Array.from(normalizedEdges.values()).map((edge) => {
      if (['Sibling', 'Spouse', 'Friend', 'Cousin', 'Step-Sibling'].includes(edge.label as string)) {
        const sourceNode = layoutedNodes.find(n => n.id === edge.source);
        const targetNode = layoutedNodes.find(n => n.id === edge.target);
        if (sourceNode && targetNode) {
          if (sourceNode.position.x < targetNode.position.x) {
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

    return { initialNodes: layoutedNodes, initialEdges: layoutedEdges, suggestions: suggestionsTemp };
  }, [relationships, peopleMap, getParents, getChildren, getSiblings, getSpouses]);

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
      const sourceChildren = getChildren(params.source);
      const targetChildren = getChildren(params.target);
      const shareChild = sourceChildren.some(c => targetChildren.includes(c));

      const sourceParents = getParents(params.source);
      const targetParents = getParents(params.target);
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
    let rType = selectedRelType;

    if (['Parent', 'Step-Parent'].includes(selectedRelType)) {
      // The new person (p2) is the parent of the current person (p1)
      p1 = selectedPersonForAdd[0];
      p2 = addingRelation.personId;
    } else if (['Child', 'Step-Child'].includes(selectedRelType)) {
      // The current person (p1) is the parent of the new person (p2)
      p1 = addingRelation.personId;
      p2 = selectedPersonForAdd[0];
      rType = selectedRelType === 'Child' ? 'Parent' : 'Step-Parent';
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
      return {
        ...ed,
        animated: isConnected,
        style: {
          strokeWidth: isConnected ? 3 : 1,
          stroke: isConnected ? '#3b82f6' : undefined,
          opacity: isConnected ? 1 : 0.2,
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
      return {
        ...ed,
        animated: false,
        style: {
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
        fitView
        onConnect={handleConnect}
        onEdgeContextMenu={handleEdgeContextMenu}
        colorMode={theme === 'dark' ? 'dark' : 'light'}
      >
        <Controls />
        <MiniMap />
        <Background gap={12} size={1} />
      </ReactFlow>

      {suggestions.length > 0 && (
         <div className="absolute top-4 right-4 z-50 bg-card/95 backdrop-blur-sm border rounded-lg shadow-lg w-80 max-h-[80vh] flex flex-col pointer-events-auto">
            <div className="p-3 border-b font-semibold bg-muted/50 rounded-t-lg">Suggested Relationships</div>
            <div className="flex flex-col p-2 gap-2 overflow-y-auto">
               {suggestions.map(s => (
                  <div key={s.key} className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-muted/50 border border-transparent hover:border-border transition-all group">
                      <div className="flex items-center gap-3">
                         <div className="flex -space-x-3">
                            {s.sourceImage ? <img src={s.sourceImage} className="w-8 h-8 rounded-full object-cover border-2 border-card" /> : <div className="w-8 h-8 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[10px]">?</div>}
                            {s.targetImage ? <img src={s.targetImage} className="w-8 h-8 rounded-full object-cover border-2 border-card" /> : <div className="w-8 h-8 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[10px]">?</div>}
                         </div>
                         <div className="flex flex-col gap-1">
                            <span className="font-semibold leading-tight text-primary">{s.label}</span>
                            <span className="text-xs text-muted-foreground leading-tight">
                               {['Parent', 'Step-Parent'].includes(s.label) 
                                 ? `${s.sourceName} is the ${s.label} of ${s.targetName}` 
                                 : `${s.sourceName} and ${s.targetName} are ${s.label}s`}
                            </span>
                         </div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => handleAcceptImplicit(s)} className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-500/20 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Check size={16} />
                      </Button>
                  </div>
               ))}
            </div>
         </div>
      )}

      <Dialog open={!!addingRelation} onOpenChange={(open) => !open && setAddingRelation(null)}>
        <DialogContent className="max-w-md !p-6">
          <DialogHeader>
            <DialogTitle>Add Relationship for {addingRelation?.personName}</DialogTitle>
            <DialogDescription>Select the relationship type and search for a person.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4 mt-2">
            <div className="flex flex-col gap-2">
               <label className="text-sm font-medium">Relationship Type</label>
               <select 
                 value={selectedRelType} 
                 onChange={(e) => setSelectedRelType(e.target.value)}
                 className="w-full border rounded-md p-2 bg-background cursor-pointer"
               >
                 {addingRelation?.category === 'Top' && (
                    <>
                      <option value="Parent">Parent</option>
                      <option value="Step-Parent">Step-Parent</option>
                    </>
                 )}
                 {addingRelation?.category === 'Bottom' && (
                    <>
                      <option value="Child">Child</option>
                      <option value="Step-Child">Step-Child</option>
                    </>
                 )}
                 {addingRelation?.category === 'Side' && (
                    <>
                      <option value="Sibling">Sibling</option>
                      <option value="Step-Sibling">Step-Sibling</option>
                      <option value="Half-Sibling">Half-Sibling</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Cousin">Cousin</option>
                      <option value="Friend">Friend</option>
                    </>
                 )}
               </select>
            </div>
            
            <div className="flex flex-col gap-2">
               <label className="text-sm font-medium">Select Person</label>
               <PeopleDropdown onChange={(ids) => setSelectedPersonForAdd(ids)} peopleIds={selectedPersonForAdd} />
            </div>

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
