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
import { useLanguage } from '@/contexts/LanguageContext';

const getEdgeColor = (type: string) => {
  switch (type) {
    case 'Spouse': return '#ec4899'; 
    case 'Sibling': 
    case 'Step-Sibling':
    case 'Half-Sibling': return '#3b82f6'; 
    case 'Parent':
    case 'Step-Parent':
    case 'Child': return '#22c55e'; 
    case 'Cousin': return '#f97316'; 
    case 'Grandparent':
    case 'Grandchild': 
    case 'Great-Grandparent':
    case 'Great-Grandchild':
    case 'Great-Great-Grandparent':
    case 'Great-Great-Grandchild':
    case 'Chosno-Ancestor':
    case 'Chosno': return '#14b8a6'; 
    case 'Aunt/Uncle':
    case 'Niece/Nephew': return '#8b5cf6'; 
    case 'Sibling-in-law':
    case 'Parent-in-law':
    case 'Child-in-law': return '#eab308'; 
    default: return '#64748b'; 
  }
};

interface RelationshipGraphProps {
  relationships: any[];
  people: IPerson[];
  onAddVisual?: () => void;
}

const nodeWidth = 220;
const nodeHeight = 60;

// Custom node featuring robust visual handles
const PersonNode = ({ id, data }: any) => {
  const { t } = useLanguage();

  const handleClick = (e: React.MouseEvent, type: string, pos: string) => {
    e.stopPropagation();
    if (data.onAddRelationClick) {
      data.onAddRelationClick({ personId: id, relType: type, category: pos, personName: data.label });
    }
  };

  const { isFusedRight, isFusedLeft, hoverColor } = data;
  let computedRounded = data.roundedClass || 'rounded-xl';
  if (isFusedRight && isFusedLeft) computedRounded = 'rounded-none border-x-0';
  else if (isFusedRight) computedRounded = 'rounded-l-xl rounded-r-none border-r-0';
  else if (isFusedLeft) computedRounded = 'rounded-r-xl rounded-l-none border-l-0';

  const isEntering = !!hoverColor;
  const colorTrans = `border-color 200ms ease ${isEntering ? '250ms' : '0ms'}`;
  const radiusTrans = `border-radius 250ms ease`;
  const bgTrans = `background-color 200ms ease`;

  const mainStyle = {
      borderColor: hoverColor || 'var(--border)',
      zIndex: hoverColor ? 10 : 1,
      transition: `${colorTrans}, ${radiusTrans}, ${bgTrans}`
  };

  const bridgeStyle = {
      left: 'calc(100% - 1px)',
      width: isFusedRight ? '42px' : '0px',
      opacity: isFusedRight ? 1 : 0,
      borderTopWidth: '1px',
      borderBottomWidth: '1px',
      borderColor: hoverColor || 'var(--border)',
      transition: `width 250ms ease, opacity 250ms ease, ${colorTrans}`
  };

  return (
    <div className={`flex items-center justify-center gap-3 bg-card border p-2 shadow-sm w-[220px] relative ${computedRounded}`} style={mainStyle}>
      <div className="absolute top-[-1px] bottom-[-1px] bg-card -z-10" style={bridgeStyle} />
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
      <div className="flex flex-col overflow-hidden items-start">
        <span className="font-semibold text-sm truncate max-w-[140px] text-left">{data.label}</span>
        {data.hoverBadge && (
           <span 
             className="text-[10px] font-bold uppercase -mt-0.5 tracking-wide animate-in fade-in zoom-in duration-200" 
             style={{ color: data.hoverColor }}
           >
             {data.hoverBadge}
           </span>
        )}
      </div>
    </div>
  );
};

const CustomEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, data }: any) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 16
  });
  
  const isHovered = !!style?.stroke;

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'none',
          }}
          className={`flex items-center bg-background/90 backdrop-blur-md px-2 py-0.5 rounded-full border shadow-sm text-[10px] font-medium z-10 transition-opacity duration-200 ${['Sibling', 'Spouse', 'Step-Sibling', 'Half-Sibling', 'Cousin'].includes(data?.type) ? 'hidden' : ''} ${isHovered ? 'opacity-0' : 'opacity-100'}`}
        >
          <span className="text-muted-foreground">{data?.label}</span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

const nodeTypes = {
  person: PersonNode,
};
const edgeTypes = {
  customEdge: CustomEdge,
};
export default function RelationshipGraph({ relationships, people, onAddVisual }: RelationshipGraphProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  
  const [addingRelation, setAddingRelation] = useState<{ personId: string, relType: string, category: string, personName: string } | null>(null);
  const [edgeToDelete, setEdgeToDelete] = useState<Edge | null>(null);
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
    relationships.forEach(r => {
      if (['Sibling', 'Step-Sibling', 'Half-Sibling'].includes(r.relationshipType)) {
        if (r.person1Id === personId) siblings.add(r.person2Id);
        if (r.person2Id === personId) siblings.add(r.person1Id);
      }
    });
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

       // Infer cousins (Robust Engine)
       // 1. Through Aunts/Uncles (parents' siblings and their spouses)
       parentsA.forEach(pA => {
           const auntsAndUncles = new Set(getSiblings(pA));
           
           getParents(pA).forEach(gp => {
               getChildren(gp).forEach(c => auntsAndUncles.add(c));
           });

           const auntsAndUnclesByMarriage = new Set<string>();
           auntsAndUncles.forEach(au => {
               getSpouses(au).forEach(sp => auntsAndUnclesByMarriage.add(sp));
           });

           const allAuntsUncles = Array.from(auntsAndUncles).concat(Array.from(auntsAndUnclesByMarriage));
           
           allAuntsUncles.forEach(au => {
               if (au === pA || getSpouses(pA).includes(au)) return; 
               getChildren(au).forEach(cousinId => {
                   if (cousinId !== aId && !getSiblings(aId).includes(cousinId)) {
                       addSuggestion(aId, cousinId, 'Cousin');
                   }
               });
           });
       });

       // 2. Propagate explicit cousin edges across sibling lines
       // If my sibling has an explicit cousin, they are my cousin too.
       getSiblings(aId).forEach(sib => {
           relationships.forEach(r => {
               if (r.relationshipType === 'Cousin') {
                   if (r.person1Id === sib && r.person2Id !== aId) addSuggestion(aId, r.person2Id, 'Cousin');
                   if (r.person2Id === sib && r.person1Id !== aId) addSuggestion(aId, r.person1Id, 'Cousin');
               }
           });
       });

       // 3. Propagate explicit cousin edges down target's sibling lines
       // If I have an explicit cousin C, C's siblings are also my cousins.
       relationships.forEach(r => {
           if (r.relationshipType === 'Cousin') {
               const cousinId = r.person1Id === aId ? r.person2Id : (r.person2Id === aId ? r.person1Id : null);
                if (cousinId) {
                    getSiblings(cousinId).forEach(cousinSib => {
                        if (cousinSib !== aId && !getSiblings(aId).includes(cousinSib)) {
                            addSuggestion(aId, cousinSib, 'Cousin');
                        }
                    });
                }
            }
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

    const isSpouse = (n1: string, n2: string) => {
        const edge1 = normalizedEdges.get(`${n1}-${n2}`);
        const edge2 = normalizedEdges.get(`${n2}-${n1}`);
        return (edge1 && edge1.label === 'Spouse') || (edge2 && edge2.label === 'Spouse');
    };

    const isSibling = (n1: string, n2: string) => {
        const edge1 = normalizedEdges.get(`${n1}-${n2}`);
        const edge2 = normalizedEdges.get(`${n2}-${n1}`);
        if (edge1 && ['Sibling', 'Step-Sibling', 'Half-Sibling'].includes(edge1.label as string)) return true;
        if (edge2 && ['Sibling', 'Step-Sibling', 'Half-Sibling'].includes(edge2.label as string)) return true;

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
        const rawRankNodes = ranks.get(y)!;
        rawRankNodes.sort((a,b) => dagreGraph.node(a.id).x - dagreGraph.node(b.id).x);

        const spouseGroups: Node[][] = [];
        const processedSpouses = new Set<string>();

        rawRankNodes.forEach(node => {
            if (processedSpouses.has(node.id)) return;
            const group = [node];
            processedSpouses.add(node.id);
            
            for (let n of rawRankNodes) {
                if (!processedSpouses.has(n.id) && isSpouse(node.id, n.id)) {
                    group.push(n);
                    processedSpouses.add(n.id);
                }
            }

            group.sort((a,b) => {
                const aP = getParents(a.id).length;
                const bP = getParents(b.id).length;
                if (aP !== bP) return bP - aP; 
                return dagreGraph.node(a.id).x - dagreGraph.node(b.id).x;
            });

            spouseGroups.push(group);
        });

        const orderedGroups: Node[][] = [];
        const processedGroups = new Set<Node[]>();

        spouseGroups.forEach(sg => {
            if (processedGroups.has(sg)) return;
            
            const groupSeq = [sg];
            const queue = [sg];
            processedGroups.add(sg);
            
            while(queue.length > 0) {
               const currSg = queue.shift()!;
               const mates = spouseGroups.filter(targetSg => {
                   if (processedGroups.has(targetSg)) return false;
                   return currSg.some(currNode => targetSg.some(targetNode => isSibling(currNode.id, targetNode.id)));
               });

               mates.sort((a,b) => dagreGraph.node(a[0].id).x - dagreGraph.node(b[0].id).x);
               mates.forEach(m => {
                   processedGroups.add(m);
                   groupSeq.push(m);
                   queue.push(m);
               });
            }
            orderedGroups.push(...groupSeq);
        });

        let currentX = dagreGraph.node(orderedGroups[0][0].id).x - nodeWidth / 2;

        for (let i = 0; i < orderedGroups.length; i++) {
           const sg = orderedGroups[i];
           const nextSg = orderedGroups[i+1];
           
           let isLinkedToNextSibling = false;
           if (nextSg && sg.some(s1 => nextSg.some(s2 => isSibling(s1.id, s2.id)))) {
               isLinkedToNextSibling = true;
           }

           for (let j = 0; j < sg.length; j++) {
               const node = sg[j];

               node.data = { ...node.data, roundedClass: 'rounded-xl' };

               layoutedNodes.push({
                   ...node,
                   position: { x: currentX, y: y - nodeHeight / 2 }
               });
               
               const isLastSpouse = j === sg.length - 1;

               if (!isLastSpouse) {
                   currentX += nodeWidth + 20; // Tight explicitly contextual gap for Spouse
               } else if (isLinkedToNextSibling) {
                   currentX += nodeWidth + 40; // Moderate margin bridging Sibling groups
               } else if (nextSg) {
                   const originalDagreX = dagreGraph.node(nextSg[0].id).x - nodeWidth / 2;
                   currentX = Math.max(currentX + nodeWidth + 120, originalDagreX); // Massive padding bounding different families
               }
           }
        }
    });

    for (let i = 0; i < layoutedNodes.length; i++) {
        for (let j = 0; j < layoutedNodes.length; j++) {
            if (i === j) continue;
            const n1 = layoutedNodes[i];
            const n2 = layoutedNodes[j];
            if (n1.position.y === n2.position.y && isSibling(n1.id, n2.id)) {
                const distance = n2.position.x - (n1.position.x + nodeWidth);
                if (distance >= 35 && distance <= 45) {
                    n1.data = { ...n1.data, adjacentSiblingId: n2.id };
                    n2.data = { ...n2.data, prevSiblingId: n1.id };
                }
            }
        }
    }

    // Remap handles dynamically computing optimal geometric short-paths
    const layoutedEdges = Array.from(normalizedEdges.values()).map((edge) => {
      let sourceHandle = 's-bottom';
      let targetHandle = 't-top';

      const sourceNode = layoutedNodes.find(n => n.id === edge.source);
      const targetNode = layoutedNodes.find(n => n.id === edge.target);

      if (sourceNode && targetNode && ['Sibling', 'Spouse', 'Friend', 'Cousin', 'Step-Sibling', 'Half-Sibling'].includes(edge.label as string)) {
          if (sourceNode.position.x < targetNode.position.x) {
             sourceHandle = 's-right';
             targetHandle = 't-left';
          } else {
             sourceHandle = 's-left';
             targetHandle = 't-right';
          }
      }

      return {
          ...edge,
          sourceHandle,
          targetHandle,
          type: 'customEdge',
          data: {
              ...edge.data,
              type: edge.label as string,
              label: t(edge.label as string)
          }
      };
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

  const handleEdgeContextMenu = useCallback((e: React.MouseEvent, edge: Edge) => {
    e.preventDefault();
    if (!edge.data?.realId) return;
    setEdgeToDelete(edge);
  }, []);

  const confirmDeleteEdge = async () => {
    if (!edgeToDelete?.data?.realId) return;

    try {
      const res = await fetch(`/api/relationships/${edgeToDelete.data.realId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success(t('Relationship successfully purged!'));
        if (onAddVisual) onAddVisual();
      } else {
        toast.error(t('Failed to delete relationship.'));
      }
    } catch {
      toast.error(t('Error contacting server.'));
    } finally {
      setEdgeToDelete(null);
    }
  };

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

  const findPath = useCallback((startId: string, endId: string, direction: 'up'|'down', maxDepth: number) => {
      type QueueItem = { id: string, depth: number, path: string[] };
      const queue: QueueItem[] = [{ id: startId, depth: 0, path: [startId] }];
      const visited = new Set<string>([startId]);

      while(queue.length > 0) {
          const curr = queue.shift()!;
          if (curr.depth > 0 && curr.id === endId) {
             return curr; // found!
          }
          if (curr.depth < maxDepth) {
              const nextIds = direction === 'up' ? getParents(curr.id) : getChildren(curr.id);
              for (let nid of nextIds) {
                  if (!visited.has(nid)) {
                      visited.add(nid);
                      queue.push({ id: nid, depth: curr.depth + 1, path: [...curr.path, nid] });
                  }
              }
          }
      }
      return null;
  }, [getParents, getChildren]);

  const getInferredRelationship = useCallback((targetId: string, nodeId: string): { type: string, path: string[] } | null => {
    if (targetId === nodeId) return null;
    
    // Explicit
    const exactEdge = relationships.find(r => (r.person1Id === targetId && r.person2Id === nodeId) || (r.person2Id === targetId && r.person1Id === nodeId));
    if (exactEdge) {
       let relType = exactEdge.relationshipType;
       if (relType === 'Child') relType = exactEdge.person1Id === targetId ? 'Parent' : 'Child';
       return { type: relType, path: [targetId, nodeId] };
    }

    const tParents = getParents(targetId);
    const tChildren = getChildren(targetId);
    const tSpouses = getSpouses(targetId);
    const tSiblings = getSiblings(targetId);

    // Deep Ancestors (up to 5 levels)
    const ancestorPath = findPath(targetId, nodeId, 'up', 5);
    if (ancestorPath) {
        if (ancestorPath.depth === 2) return { type: 'Grandparent', path: ancestorPath.path };
        if (ancestorPath.depth === 3) return { type: 'Great-Grandparent', path: ancestorPath.path };
        if (ancestorPath.depth === 4) return { type: 'Great-Great-Grandparent', path: ancestorPath.path };
        if (ancestorPath.depth === 5) return { type: 'Chosno-Ancestor', path: ancestorPath.path };
    }

    // Deep Descendants
    const descendantPath = findPath(targetId, nodeId, 'down', 5);
    if (descendantPath) {
        if (descendantPath.depth === 2) return { type: 'Grandchild', path: descendantPath.path };
        if (descendantPath.depth === 3) return { type: 'Great-Grandchild', path: descendantPath.path };
        if (descendantPath.depth === 4) return { type: 'Great-Great-Grandchild', path: descendantPath.path };
        if (descendantPath.depth === 5) return { type: 'Chosno', path: descendantPath.path };
    }
    
    // Aunt/Uncle
    for (let p of tParents) {
        if (getSiblings(p).includes(nodeId)) return { type: 'Aunt/Uncle', path: [targetId, p, nodeId] };
        for (let psib of getSiblings(p)) {
            if (getSpouses(psib).includes(nodeId)) return { type: 'Aunt/Uncle', path: [targetId, p, psib, nodeId] };
        }
    }

    // Niece/Nephew
    for (let s of tSiblings) {
        if (getChildren(s).includes(nodeId)) return { type: 'Niece/Nephew', path: [targetId, s, nodeId] };
    }
    for (let sp of tSpouses) {
        for (let spsib of getSiblings(sp)) {
            if (getChildren(spsib).includes(nodeId)) return { type: 'Niece/Nephew', path: [targetId, sp, spsib, nodeId] };
        }
    }

    // In-Laws
    for (let s of tSiblings) {
        if (getSpouses(s).includes(nodeId)) return { type: 'Sibling-in-law', path: [targetId, s, nodeId] };
    }
    for (let sp of tSpouses) {
        if (getSiblings(sp).includes(nodeId)) return { type: 'Sibling-in-law', path: [targetId, sp, nodeId] };
        if (getParents(sp).includes(nodeId)) return { type: 'Parent-in-law', path: [targetId, sp, nodeId] };
    }
    for (let c of tChildren) {
        if (getSpouses(c).includes(nodeId)) return { type: 'Child-in-law', path: [targetId, c, nodeId] };
    }

    // Cousins
    for (let p of tParents) {
        for (let au of getSiblings(p)) {
            if (getChildren(au).includes(nodeId)) return { type: 'Cousin', path: [targetId, p, au, nodeId] };
            for (let sp of getSpouses(au)) {
                if (getChildren(sp).includes(nodeId)) return { type: 'Cousin', path: [targetId, p, au, sp, nodeId] };
            }
        }
    }

    return null;
  }, [relationships, getParents, getChildren, getSpouses, getSiblings, findPath]);

  const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
    const inferences = new Map<string, { type: string, path: string[] }>();
    people.forEach(p => {
       const inf = getInferredRelationship(node.id, p.id);
       if (inf) inferences.set(p.id, inf);
    });

    setEdges((eds) => eds.map((ed) => {
      const isDirectlyConnected = ed.source === node.id || ed.target === node.id;
      let isPathEdge = isDirectlyConnected;
      let computedEdgeColor = isDirectlyConnected ? getEdgeColor((ed.data?.type || ed.label) as string) : undefined;

      if (!isPathEdge) {
          for (const inf of Array.from(inferences.values())) {
              const pNodes = inf.path;
              for (let i = 0; i < pNodes.length - 1; i++) {
                  if ((ed.source === pNodes[i] && ed.target === pNodes[i+1]) || 
                      (ed.target === pNodes[i] && ed.source === pNodes[i+1])) {
                      isPathEdge = true;
                      computedEdgeColor = getEdgeColor(inf.type);
                      break;
                  }
              }
              if (isPathEdge) break;
          }
      }

      return {
        ...ed,
        animated: isPathEdge,
        style: {
          strokeWidth: isPathEdge ? 3 : 1,
          stroke: isPathEdge ? computedEdgeColor : undefined,
          opacity: isPathEdge ? 1 : 0.2,
          transition: 'stroke-width 0.2s, stroke 0.2s, opacity 0.2s',
        },
      };
    }));
    
    const highlightedIds = new Set([node.id, ...Array.from(inferences.keys())]);

    setNodes((nds) => nds.map((n) => {
      let isConnectedNode = n.id === node.id;
      let badgeLabel = undefined;
      let badgeColor = undefined;
      
      const inferredRelation = inferences.get(n.id);
      
      if (inferredRelation) {
          isConnectedNode = true;
          badgeLabel = inferredRelation.type;
          badgeColor = getEdgeColor(inferredRelation.type);
      } else if (isConnectedNode) {
          badgeColor = '#e2e8f0'; // Clean slate-200 distinct highlighting for self
      }
      
      let isFusedRight = false;
      let isFusedLeft = false;
      
      if (isConnectedNode && n.data.adjacentSiblingId && highlightedIds.has(n.data.adjacentSiblingId as string)) {
          isFusedRight = true;
      }
      if (isConnectedNode && n.data.prevSiblingId && highlightedIds.has(n.data.prevSiblingId as string)) {
          isFusedLeft = true;
      }

      if (isConnectedNode && !inferredRelation && (isFusedRight || isFusedLeft)) {
          badgeColor = getEdgeColor('Sibling');
      }

      return {
        ...n,
        data: {
          ...n.data,
          hoverBadge: badgeLabel ? t(badgeLabel) : undefined,
          hoverColor: badgeColor,
          isFusedRight,
          isFusedLeft
        },
        style: {
           ...n.style,
           opacity: isConnectedNode ? 1 : 0.4,
           transition: 'opacity 0.2s',
        }
      };
    }));
  }, [setEdges, setNodes, getInferredRelationship, t, people]);

  const onNodeMouseLeave = useCallback(() => {
    setEdges((eds) => eds.map((ed) => {
      const edgeType = ed.data?.type || ed.label;
      return {
        ...ed,
        animated: false,
        style: {
          strokeWidth: 1,
          stroke: getEdgeColor(edgeType as string),
          opacity: 1,
          transition: 'stroke-width 0.2s, stroke 0.2s, opacity 0.2s',
        },
      };
    }));
    
    setNodes((nds) => nds.map((n) => ({
      ...n,
      data: {
        ...n.data,
        hoverBadge: undefined,
        hoverColor: undefined,
        isFusedRight: false,
        isFusedLeft: false
      },
      style: {
        ...n.style,
        opacity: 1,
        transition: 'opacity 0.2s',
      }
    })));
  }, [setEdges, setNodes]);

  const onEdgeMouseEnter = useCallback((_: React.MouseEvent, edge: Edge) => {
    setEdges((eds) => eds.map((ed) => {
      const isHovered = ed.id === edge.id;
      const edgeType = ed.data?.type || ed.label;
      return {
        ...ed,
        animated: isHovered,
        style: {
          strokeWidth: isHovered ? 3 : 1,
          stroke: isHovered ? getEdgeColor(edgeType as string) : undefined,
          opacity: isHovered ? 1 : 0.2,
          transition: 'stroke-width 0.2s, stroke 0.2s, opacity 0.2s',
        },
      };
    }));
    
    setNodes((nds) => nds.map((n) => {
      const isConnectedNode = n.id === edge.source || n.id === edge.target;
      return {
        ...n,
        data: {
          ...n.data,
          hoverBadge: isConnectedNode ? (edge.data?.label || edge.label) : undefined,
          hoverColor: isConnectedNode ? getEdgeColor((edge.data?.type || edge.label) as string) : undefined,
        },
        style: {
           ...n.style,
           opacity: isConnectedNode ? 1 : 0.4,
           transition: 'opacity 0.2s',
        }
      };
    }));
  }, [setEdges, setNodes]);

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    // Optional: Add functionality for edge click, e.g., showing edge details
    console.log('Edge clicked:', edge);
  }, []);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseLeave={onNodeMouseLeave}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        onConnect={handleConnect}
        onEdgeContextMenu={handleEdgeContextMenu}
        onEdgeClick={onEdgeClick}
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
                            <span className="font-semibold leading-tight text-primary">{t(s.label)}</span>
                            <span className="text-xs text-muted-foreground leading-tight">
                               {['Parent', 'Step-Parent'].includes(s.label) 
                                 ? `${s.sourceName} ${t('is')} ${t(s.label)} ${t('to')} ${s.targetName}` 
                                 : `${s.sourceName} y ${s.targetName} ${t('are_' + s.label)}`}
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

      <Dialog open={!!edgeToDelete} onOpenChange={(open) => !open && setEdgeToDelete(null)}>
        <DialogContent className="max-w-sm !p-6">
          <DialogHeader>
            <DialogTitle>{t('Delete')}</DialogTitle>
            <DialogDescription>{t('Are you sure you want to remove this connection?')}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
             <Button variant="outline" onClick={() => setEdgeToDelete(null)}>{t('Cancel')}</Button>
             <Button variant="destructive" onClick={confirmDeleteEdge}>{t('Delete')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
