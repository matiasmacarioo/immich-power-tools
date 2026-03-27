import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { ReactFlow, Controls, Background, Node, Edge, Connection, useNodesState, useEdgesState, ReactFlowProvider, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { IPerson } from '@/types/person';
import { useTheme } from 'next-themes';
import toast from 'react-hot-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import PeopleDropdown from './PeopleDropdown';
import { Button } from '../ui/button';
import { Check, Edit2, ArrowDownAZ, CalendarArrowUp, CalendarArrowDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '../ui/input';

import { getEdgeColor } from '../tree/edgeColors';
import PersonNode from '../tree/PersonNode';
import CustomEdge from '../tree/CustomEdge';
import { buildLayoutedGraph } from '../tree/layoutEngine';
import { buildRelationshipHelpers } from '../tree/inferenceEngine';
import { getPersonAssets } from '@/handlers/api/person.handler';
import { updatePerson } from '@/handlers/api/people.handler';
import AssetGrid from './AssetGrid';
import { IAsset } from '@/types/asset';
import { Skull, Heart, Image as ImageIcon, Calendar, UserRound } from 'lucide-react';
import PersonBirthdayCell from '../people/PersonBirthdayCell';

interface RelationshipGraphProps {
  relationships: any[];
  people: IPerson[];
  highlightedIds?: Set<string> | null;
  onAddVisual?: () => void;
  isCompactMode?: boolean;
  isLayoutLocked?: boolean;
}

const nodeTypes = { person: PersonNode };
const edgeTypes = { customEdge: CustomEdge };

/** Refit view only on the first load of the graph */
function GraphAutoFitter() {
  const { fitView, setViewport } = useReactFlow();
  const [hasFitted, setHasFitted] = useState(false);
  
  useEffect(() => {
    const saved = localStorage.getItem('rtree_viewport');
    if (saved && !hasFitted) {
      try {
        const { x, y, zoom } = JSON.parse(saved);
        setViewport({ x, y, zoom }, { duration: 0 });
        setHasFitted(true);
      } catch (e) {
        console.error('Failed to restore viewport', e);
      }
    }
  }, [setViewport, hasFitted]);

  useEffect(() => {
    const handleRefit = () => {
      setTimeout(() => fitView({ duration: 400, padding: 0.2 }), 50);
    };
    window.addEventListener('rtree_refit', handleRefit);
    
    if (!hasFitted) {
      setTimeout(() => {
        fitView({ duration: 400, padding: 0.2 });
        setHasFitted(true);
      }, 50);
    }
    return () => window.removeEventListener('rtree_refit', handleRefit);
  }, [fitView, hasFitted]);
  return null;
}

function ReactFlowSaver({ isCompactMode }: { isCompactMode: boolean }) {
  const { getViewport, getNodes } = useReactFlow();
  
  useEffect(() => {
    const interval = setInterval(() => {
      const v = getViewport();
      localStorage.setItem(`rtree_viewport_${isCompactMode ? 'compact' : 'detailed'}`, JSON.stringify(v));
      
      const nodes = getNodes();
      const positions: Record<string, {x: number, y: number}> = {};
      nodes.forEach(n => {
        positions[n.id] = n.position;
      });
      localStorage.setItem(`rtree_positions_${isCompactMode ? 'compact' : 'detailed'}`, JSON.stringify(positions));
    }, 2000); // Save every 2 seconds to not spam localStorage
    
    return () => clearInterval(interval);
  }, [getViewport, getNodes]);
  
  return null;
}

function GraphInner({ relationships, people, highlightedIds, onAddVisual, isCompactMode, isLayoutLocked = true }: RelationshipGraphProps) {
  const { theme } = useTheme();
  const { t, lang, formatDate } = useLanguage();

  const [addingRelation, setAddingRelation] = useState<{ personId: string; relType: string; category: string; personName: string } | null>(null);
  const [edgeToDelete, setEdgeToDelete] = useState<Edge | null>(null);
  const [selectedPersonForAdd, setSelectedPersonForAdd] = useState<string[]>([]);
  const [selectedRelType, setSelectedRelType] = useState<string>('');

  const [selectedPersonPhotos, setSelectedPersonPhotos] = useState<{ id: string; name: string } | null>(null);
  const [personPhotos, setPersonPhotos] = useState<IAsset[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [photosPage, setPhotosPage] = useState(1);
  const [hasMorePhotos, setHasMorePhotos] = useState(true);
  const [photosSort, setPhotosSort] = useState<'date-asc' | 'date-desc' | 'name'>('date-desc');

  const [personStates, setPersonStates] = useState<Record<string, { isDeceased: boolean; deathDate?: string | null; gender?: 'male' | 'female' | 'other' | null }>>({});
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; personId: string; personName: string } | null>(null);

  const [renamingPerson, setRenamingPerson] = useState<{ id: string; name: string } | null>(null);
  const [editingBirthdayFor, setEditingBirthdayFor] = useState<{ id: string; name: string } | null>(null);
  const [newName, setNewName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 640 : false);
  useEffect(() => {
    const checkIsMobile = () => setIsMobile(typeof window !== 'undefined' ? window.innerWidth < 640 : false);
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const [marriageDay, setMarriageDay] = useState('1');
  const [marriageMonth, setMarriageMonth] = useState('0');
  const [marriageYear, setMarriageYear] = useState('');

  // Cache-busting timestamps per personId — survives data refreshes
  const [thumbnailVersions, setThumbnailVersions] = useState<Record<string, number>>({});

  const fetchStates = useCallback(async () => {
    try {
      const res = await fetch('/api/person-states');
      const data = await res.json();
      const map: any = {};
      data.forEach((s: any) => { map[s.personId] = { isDeceased: s.isDeceased === 1, deathDate: s.deathDate, gender: s.gender }; });
      setPersonStates(map);
    } catch (e) { console.error('Failed to fetch person states', e); }
  }, []);

  useEffect(() => { fetchStates(); }, [fetchStates]);

  const toggleDeceased = async (personId: string, currentState: boolean) => {
    try {
      const res = await fetch(`/api/person-states/${personId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDeceased: !currentState }),
      });
      if (res.ok) {
        toast.success(t(!currentState ? 'Marked as deceased' : 'Marked as living'));
        fetchStates();
        setContextMenu(null);
      }
    } catch { toast.error('Failed to update state'); }
  };

  const toggleGender = async (personId: string, currentGender: string | null) => {
    const nextGender = currentGender === 'female' ? 'male' : 'female';
    try {
      const res = await fetch(`/api/person-states/${personId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender: nextGender }),
      });
      if (res.ok) {
        toast.success(t(nextGender === 'female' ? 'Marked as Woman' : 'Marked as Man'));
        fetchStates();
        setContextMenu(null);
      }
    } catch { toast.error('Failed to update gender'); }
  };

  const handleRename = async () => {
    if (!renamingPerson || !newName.trim()) return;
    setIsRenaming(true);
    try {
      await updatePerson(renamingPerson.id, { name: newName.trim() });
      toast.success(t('Person renamed successfully'));
      setRenamingPerson(null);
      if (onAddVisual) onAddVisual();
    } catch {
      toast.error(t('Failed to rename person'));
    } finally {
      setIsRenaming(false);
    }
  };

  const peopleMap = useMemo(() => {
    const map: Record<string, IPerson> = {};
    people.forEach((p) => { map[p.id] = p; });
    return map;
  }, [people]);

  const helpers = useMemo(() => buildRelationshipHelpers(relationships), [relationships]);
  const { getParents, getChildren, getSpouses, getSiblings, getInferredRelationship } = helpers;

  const handleAddRelationClick = useCallback((info: any) => {
    let type = info.relType;
    if (type === 'Side') {
      const isParent = relationships.some((r) => r.relationshipType === 'Parent' && r.person1Id === info.personId);
      type = isParent ? 'Spouse' : 'Sibling';
    }
    setAddingRelation({ ...info, relType: type });
    setSelectedRelType(type);
    setSelectedPersonForAdd([]);
  }, [relationships]);

  const { initialNodes, initialEdges, suggestions } = useMemo(() => {
    const { layoutedNodes, layoutedEdges, suggestions: sugg } = buildLayoutedGraph({
      relationships,
      peopleMap,
      handleAddRelationClick,
      translateLabel: t,
      getParents,
      getChildren,
      getSpouses,
      getSiblings,
      highlightedIds: highlightedIds || undefined,
      isCompactMode,
    });

    const isFiltered = !!highlightedIds;

    const enrichedNodes = layoutedNodes.map((n) => {
      const isHighlighted = isFiltered ? highlightedIds.has(n.id) : true;
      // Apply cache-busting to thumbnail if we've updated this person's profile photo
      const version = thumbnailVersions[n.id];
      const imageUrl = version
        ? `${(n.data.imageUrl as string || '').split('?')[0]}?t=${version}`
        : (n.data.imageUrl as string || '');
      return {
        ...n,
        data: {
          ...n.data,
          imageUrl,
          isDeceased: personStates[n.id]?.isDeceased ?? false,
          deathDate: personStates[n.id]?.deathDate,
          isHighlighted,
        },
        // If filtered, fade out nodes not in the highlighted set
        style: { 
          ...n.style, 
          transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), filter 0.4s, opacity 0.4s', 
          filter: isHighlighted ? undefined : 'grayscale(1)', 
          opacity: isHighlighted ? 1 : 0.25 
        },
      }
    });

    const enrichedEdges = layoutedEdges.map((e) => {
      const isHighlighted = isFiltered ? (highlightedIds.has(e.source) && highlightedIds.has(e.target)) : true;
      return {
        ...e,
        animated: isHighlighted && isFiltered,
        data: { ...e.data, isHovered: false },
        style: { 
          ...e.style, 
          transition: 'opacity 0.4s', 
          opacity: isHighlighted ? 1 : 0.1,
          strokeWidth: isHighlighted && isFiltered ? 2 : 1 
        },
      }
    });

    return { initialNodes: enrichedNodes as Node[], initialEdges: enrichedEdges as Edge[], suggestions: sugg };
  }, [relationships, peopleMap, handleAddRelationClick, t, getParents, getChildren, getSpouses, getSiblings, personStates, highlightedIds, isCompactMode, thumbnailVersions]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const [prevCounts, setPrevCounts] = useState({ n: initialNodes.length, e: initialEdges.length, compact: !!isCompactMode });

  useEffect(() => {
    const isCountChanged = initialNodes.length !== prevCounts.n || initialEdges.length !== prevCounts.e || (!!isCompactMode) !== prevCounts.compact;
    
    setNodes((currentNodes) => {
      // Load saved positions from localStorage if available
      const savedPosStr = localStorage.getItem(`rtree_positions_${isCompactMode ? 'compact' : 'detailed'}`);
      const savedPositions = savedPosStr ? JSON.parse(savedPosStr) : {};

      return initialNodes.map((newNode) => {
        const existingNode = currentNodes.find((n) => n.id === newNode.id);
        const savedPos = savedPositions[newNode.id];
        
        // If count changed, we want a fresh layout from Dagre (initialNodes already has it)
        if (isCountChanged) return newNode;

        if (existingNode) {
          return { ...newNode, position: existingNode.position, measured: existingNode.measured };
        } else if (savedPos) {
           return { ...newNode, position: savedPos };
        }
        return newNode;
      });
    });
    setEdges(initialEdges);

    if (isCountChanged) {
      setPrevCounts({ n: initialNodes.length, e: initialEdges.length, compact: !!isCompactMode });
      window.dispatchEvent(new Event('rtree_refit'));
    }
  }, [initialNodes, initialEdges, setNodes, setEdges, prevCounts, isCompactMode]);

  // ──── Events ────────────────────────────────────────────────────────────────

  const handleAcceptImplicit = useCallback(async (edgeData: any) => {
    try {
      const res = await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person1Id: edgeData.sourceId, person2Id: edgeData.targetId, relationshipType: edgeData.label }),
      });
      if (res.ok) { toast.success(`Accepted ${edgeData.label}!`); if (onAddVisual) onAddVisual(); }
      else toast.error('Failed to accept connection.');
    } catch { toast.error('Error contacting server.'); }
  }, [onAddVisual]);

  const handleConnect = useCallback(async (params: Connection) => {
    if (params.source === params.target) { toast.error('Cannot relate to themselves!'); return; }
    let relType = 'Friend';
    if (params.sourceHandle === 's-bottom') relType = 'Parent';
    else if (params.sourceHandle === 's-top') relType = 'Child';
    else if (params.sourceHandle === 's-left' || params.sourceHandle === 's-right') {
      const shareChild = getChildren(params.source!).some((c) => getChildren(params.target!).includes(c));
      const shareParent = getParents(params.source!).some((p) => getParents(params.target!).includes(p));
      relType = shareChild ? 'Spouse' : shareParent ? 'Sibling' : (getChildren(params.source!).length > 0 || getChildren(params.target!).length > 0) ? 'Spouse' : 'Sibling';
    }
    try {
      const res = await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person1Id: params.source, person2Id: params.target, relationshipType: relType }),
      });
      if (res.ok) { toast.success(`Visual connection saved as ${relType}!`); if (onAddVisual) onAddVisual(); }
      else toast.error('Failed to save connection.');
    } catch { toast.error('Error contacting server.'); }
  }, [onAddVisual, getChildren, getParents]);

  const handleEdgeContextMenu = useCallback((e: React.MouseEvent, edge: Edge) => {
    e.preventDefault();
    if (!edge.data?.realId) return;
    setEdgeToDelete(edge);
  }, []);

  const confirmDeleteEdge = async () => {
    if (!edgeToDelete?.data?.realId) return;
    try {
      const res = await fetch(`/api/relationships/${edgeToDelete.data.realId}`, { method: 'DELETE' });
      if (res.ok) { toast.success(t('Relationship successfully purged!')); if (onAddVisual) onAddVisual(); }
      else toast.error(t('Failed to delete relationship.'));
    } catch { toast.error(t('Error contacting server.')); }
    finally { setEdgeToDelete(null); }
  };

  const submitManualAdd = async () => {
    if (!addingRelation || selectedPersonForAdd.length === 0) return;
    let p1 = addingRelation.personId;
    let p2 = selectedPersonForAdd[0];
    let rType = selectedRelType;
    if (['Parent', 'Step-Parent'].includes(selectedRelType)) { p1 = selectedPersonForAdd[0]; p2 = addingRelation.personId; }
    else if (['Child', 'Step-Child'].includes(selectedRelType)) {
      p1 = addingRelation.personId; p2 = selectedPersonForAdd[0];
      rType = selectedRelType === 'Child' ? 'Parent' : 'Step-Parent';
    }
    const marriageDate = selectedRelType === 'Spouse' && marriageYear ? `${marriageYear.padStart(4, '0')}-${(Number(marriageMonth) + 1).toString().padStart(2, '0')}-${marriageDay.padStart(2, '0')}` : null;
    try {
      const res = await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person1Id: p1, person2Id: p2, relationshipType: rType, marriageDate }),
      });
      if (res.ok) { toast.success('Relationship saved!'); setAddingRelation(null); if (onAddVisual) onAddVisual(); }
      else toast.error('Failed to save connection.');
    } catch { toast.error('Error contacting server.'); }
  };

  // ──── Hover logic ────────────────────────────────────────────────────────────

  const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
    const inferences = new Map<string, { type: string; path: string[] }>();
    people.forEach((p) => {
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
            if ((ed.source === pNodes[i] && ed.target === pNodes[i + 1]) ||
              (ed.target === pNodes[i] && ed.source === pNodes[i + 1])) {
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
        data: { ...ed.data, isHovered: isPathEdge },
        style: {
          strokeWidth: isPathEdge ? 3 : 1,
          stroke: isPathEdge ? computedEdgeColor : undefined,
          opacity: isPathEdge ? 1 : 0.2,
          transition: 'stroke-width 0.2s, stroke 0.2s, opacity 0.2s',
        },
      };
    }));

    const highlightedIdsInternal = new Set([node.id, ...Array.from(inferences.keys())]);

    setNodes((nds) => nds.map((n: any) => {
      let isConnectedNode = n.id === node.id;
      let badgeLabel: string | undefined;
      let badgeColor: string | undefined;

      const inferredRelation = inferences.get(n.id);
      if (inferredRelation) {
        isConnectedNode = true;
        const displayType = inferredRelation.type;

        badgeLabel = displayType;
        badgeColor = getEdgeColor(displayType);
      } else if (isConnectedNode) {
        badgeColor = '#e2e8f0';
      }

      let fusedRightType: string | null = null;
      let fusedLeftType: string | null = null;

      if (isConnectedNode && n.data.adjacentSiblingId && highlightedIdsInternal.has(n.data.adjacentSiblingId as string)) fusedRightType = 'Sibling';
      else if (isConnectedNode && n.data.adjacentSpouseId && highlightedIdsInternal.has(n.data.adjacentSpouseId as string)) fusedRightType = 'Spouse';

      if (isConnectedNode && n.data.prevSiblingId && highlightedIdsInternal.has(n.data.prevSiblingId as string)) fusedLeftType = 'Sibling';
      else if (isConnectedNode && n.data.prevSpouseId && highlightedIdsInternal.has(n.data.prevSpouseId as string)) fusedLeftType = 'Spouse';

      const anyFusion = fusedRightType || fusedLeftType;
      if (isConnectedNode && !inferredRelation && anyFusion) {
        badgeColor = getEdgeColor(fusedRightType === 'Sibling' || fusedLeftType === 'Sibling' ? 'Sibling' : 'Spouse');
      }

      const isInitiallyFaded = !!highlightedIds && !highlightedIds.has(n.id);

      return {
        ...n,
        data: {
          ...n.data,
          hoverBadge: badgeLabel ? t(badgeLabel, personStates[n.id]?.gender) : undefined,
          hoverColor: badgeColor,
          fusedRightType,
          fusedLeftType,
          isDeceased: personStates[n.id]?.isDeceased ?? false,
          deathDate: personStates[n.id]?.deathDate,
          isHighlighted: !isInitiallyFaded,
        },
        style: { ...n.style, opacity: isConnectedNode ? 1 : (isInitiallyFaded ? 0.1 : 0.4), transition: 'opacity 0.2s' },
      };
    }));
  }, [setEdges, setNodes, getInferredRelationship, t, people, personStates, highlightedIds]);

  const onNodeMouseLeave = useCallback(() => {
    setEdges((eds) => eds.map((ed) => {
      const isFiltered = !!highlightedIds;
      const isHighlighted = isFiltered ? (highlightedIds.has(ed.source) && highlightedIds.has(ed.target)) : true;
      return {
        ...ed, animated: isFiltered && isHighlighted,
        data: { ...ed.data, isHovered: false },
        style: {
          strokeWidth: isHighlighted && isFiltered ? 2 : 1,
          stroke: getEdgeColor(ed.data?.type as string || ed.label as string),
          opacity: isHighlighted ? 1 : 0.1,
          transition: 'stroke-width 0.2s, stroke 0.2s, opacity 0.2s',
        },
      };
    }));
    setNodes((nds) => nds.map((n: any) => {
      const isFiltered = !!highlightedIds;
      const isHighlighted = isFiltered ? highlightedIds.has(n.id) : true;
      return {
        ...n,
        data: { ...n.data, hoverBadge: undefined, hoverColor: undefined, fusedRightType: null, fusedLeftType: null },
        style: { ...n.style, opacity: isHighlighted ? 1 : 0.25, filter: isHighlighted ? undefined : 'grayscale(1)', transition: 'opacity 0.2s, filter 0.2s' },
      }
    }));
  }, [setEdges, setNodes, highlightedIds]);

  const handleShowPhotos = (personId: string, name: string) => {
    setSelectedPersonPhotos({ id: personId, name });
    setPhotosPage(1);
    setPersonPhotos([]);
    setHasMorePhotos(true);
    setPhotosSort('date-desc');
  };

  const handleSetProfilePhoto = async (assetId: string) => {
    if (!selectedPersonPhotos) return;
    const personId = selectedPersonPhotos.id;
    try {
      await updatePerson(personId, { featureFaceAssetId: assetId });
      // Close the dialog (lightbox already closed by AssetGrid)
      setSelectedPersonPhotos(null);
      toast.success(t('Profile photo updated!'));
      // Persist a cache-busting version for this person — survives the data refresh below
      setThumbnailVersions((prev) => ({ ...prev, [personId]: Date.now() }));
      if (onAddVisual) onAddVisual();
    } catch {
      toast.error(t('Failed to update profile photo'));
    }
  };

  const onNodeClick = useCallback((e: React.MouseEvent, node: Node) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation(); // Prevent bubbling to window which would hide it immediately
    }
    setContextMenu({ x: (e as any)?.clientX || 0, y: (e as any)?.clientY || 0, personId: node.id, personName: node.data.label as string });
  }, []);

  useEffect(() => {
    if (selectedPersonPhotos) {
      setLoadingPhotos(true);
      getPersonAssets(selectedPersonPhotos.id, photosPage, photosSort)
        .then((assets) => {
          if (photosPage === 1) {
            setPersonPhotos(assets);
          } else {
            setPersonPhotos((prev) => [...prev, ...assets]);
          }
          setHasMorePhotos(assets.length === 100);
        })
        .catch(() => toast.error('Failed to load photos'))
        .finally(() => setLoadingPhotos(false));
    }
  }, [selectedPersonPhotos, photosPage, photosSort]);

  const onEdgeMouseEnter = useCallback((_: React.MouseEvent, edge: Edge) => {
    setEdges((eds) => eds.map((ed) => {
      const isHovered = ed.id === edge.id;
      const edgeType = ed.data?.type || ed.label;
      const isFiltered = !!highlightedIds;
      const isHighlighted = isFiltered ? (highlightedIds.has(ed.source) && highlightedIds.has(ed.target)) : true;
      return {
        ...ed, animated: isHovered || (isFiltered && isHighlighted),
        data: { ...ed.data, isHovered: isHovered },
        style: {
          strokeWidth: isHovered ? 3 : (isHighlighted && isFiltered ? 2 : 1),
          stroke: isHovered ? getEdgeColor(edgeType as string) : undefined,
          opacity: isHovered ? 1 : (isHighlighted ? 0.6 : 0.1),
          transition: 'stroke-width 0.2s, stroke 0.2s, opacity 0.2s',
        },
      };
    }));
    setNodes((nds) => nds.map((n: any) => {
      const isConnectedNode = n.id === edge.source || n.id === edge.target;
      const isFiltered = !!highlightedIds;
      const isHighlighted = isFiltered ? highlightedIds.has(n.id) : true;
      let badgeLabel = (edge.data?.type || edge.label) as string;
      if (isConnectedNode && n.id === edge.target) {
        if (badgeLabel === 'Parent') badgeLabel = 'Child';
        else if (badgeLabel === 'Step-Parent') badgeLabel = 'Step-Child';
        else if (badgeLabel === 'Godparent') badgeLabel = 'Godchild';
        else if (badgeLabel === 'Child') badgeLabel = 'Parent'; // Should not happen if normalized
      }

      return {
        ...n,
        data: {
          ...n.data,
          hoverBadge: isConnectedNode ? t(badgeLabel, personStates[n.id]?.gender) : undefined,
          hoverColor: isConnectedNode ? getEdgeColor((edge.data?.type || edge.label) as string) : undefined,
        },
        style: { ...n.style, opacity: isConnectedNode ? 1 : (isHighlighted ? 0.3 : 0.1), transition: 'opacity 0.2s' },
      };
    }));
  }, [setEdges, setNodes, highlightedIds]);

  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, personId: node.id, personName: node.data.label as string });
  }, []);

  useEffect(() => {
    if (!contextMenu) return;
    const hide = () => setContextMenu(null);
    window.addEventListener('click', hide);
    return () => window.removeEventListener('click', hide);
  }, [contextMenu]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodesDraggable={!isLayoutLocked}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseLeave={onNodeMouseLeave}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onConnect={handleConnect}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={handleEdgeContextMenu}
        colorMode={theme === 'dark' ? 'dark' : 'light'}
        maxZoom={4}
        minZoom={0.1}
        fitView
      >
        <GraphAutoFitter />
        {!isMobile && <Controls />}
        <Background gap={12} size={1} />
        <ReactFlowSaver isCompactMode={!!isCompactMode} />
      </ReactFlow>

      {/* Suggestions panel */}
      {suggestions.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4 sm:bottom-auto sm:top-4 sm:left-auto sm:right-4 z-50 bg-card/95 backdrop-blur-sm border rounded-lg shadow-lg sm:w-80 max-h-[35vh] sm:max-h-[80vh] flex flex-col pointer-events-auto">
          <div className="p-3 border-b font-semibold bg-muted/50 rounded-t-lg">Suggested Relationships</div>
          <div className="flex flex-col p-2 gap-2 overflow-y-auto">
            {suggestions.map((s) => (
              <div key={s.key} className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-muted/50 border border-transparent hover:border-border transition-all group">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-3">
                    {s.sourceImage ? <img src={s.sourceImage} alt={s.sourceName} className="w-8 h-8 rounded-full object-cover border-2 border-card" /> : <div className="w-8 h-8 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[10px]">?</div>}
                    {s.targetImage ? <img src={s.targetImage} alt={s.targetName} className="w-8 h-8 rounded-full object-cover border-2 border-card" /> : <div className="w-8 h-8 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[10px]">?</div>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold">{t(s.label, personStates[s.sourceId]?.gender)}</span>
                    <span className="text-xs text-muted-foreground">{s.sourceName} {t('is')} {t(s.label, personStates[s.sourceId]?.gender)} {t('to')} {s.targetName}</span>
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => handleAcceptImplicit(s)} className="h-8 w-8 text-green-500">
                  <Check size={16} />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add relation dialog */}
      <Dialog open={!!addingRelation} onOpenChange={(open) => !open && setAddingRelation(null)}>
        <DialogContent className="max-w-md !p-6">
          <DialogHeader><DialogTitle>Add Relationship for {addingRelation?.personName}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4 py-4 mt-2">
            <label className="text-sm font-medium">Relationship Type</label>
            <select value={selectedRelType} onChange={(e) => setSelectedRelType(e.target.value)} className="w-full border rounded-md p-2 bg-background">
               {addingRelation?.category === 'Top' && (<><option value="Parent">{t('Parent')}</option><option value="Step-Parent">{t('Step-Parent')}</option></>)}
               {addingRelation?.category === 'Bottom' && (<><option value="Child">{t('Child')}</option><option value="Step-Child">{t('Step-Child')}</option></>)}
               {addingRelation?.category === 'Side' && (<><option value="Sibling">{t('Sibling')}</option><option value="Spouse">{t('Spouse')}</option></>)}
            </select>
            <PeopleDropdown onChange={(ids) => setSelectedPersonForAdd(ids)} peopleIds={selectedPersonForAdd} />
            
            {selectedRelType === 'Spouse' && (
              <div className="flex flex-col gap-2 p-3 border rounded-lg bg-muted/30 animate-in fade-in slide-in-from-top-1 duration-200">
                <label className="text-xs font-bold uppercase text-muted-foreground">{t('Marriage Date')}</label>
                <div className="flex gap-2 items-end">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground ml-1">{t('Day' as any)}</span>
                    <select value={marriageDay} onChange={(e) => setMarriageDay(e.target.value)} className="h-8 w-14 border rounded-md text-xs bg-background">
                      {Array.from({ length: 31 }, (_, i) => (i + 1).toString()).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <span className="text-[10px] text-muted-foreground ml-1">{t('Month' as any)}</span>
                    <select value={marriageMonth} onChange={(e) => setMarriageMonth(e.target.value)} className="h-8 border rounded-md text-xs bg-background">
                      {[
                        { label: 'January', labelEs: 'Enero', value: '0' },
                        { label: 'February', labelEs: 'Febrero', value: '1' },
                        { label: 'March', labelEs: 'Marzo', value: '2' },
                        { label: 'April', labelEs: 'Abril', value: '3' },
                        { label: 'May', labelEs: 'Mayo', value: '4' },
                        { label: 'June', labelEs: 'Junio', value: '5' },
                        { label: 'July', labelEs: 'Julio', value: '6' },
                        { label: 'August', labelEs: 'Agosto', value: '7' },
                        { label: 'September', labelEs: 'Septiembre', value: '8' },
                        { label: 'October', labelEs: 'Octubre', value: '9' },
                        { label: 'November', labelEs: 'Noviembre', value: '10' },
                        { label: 'December', labelEs: 'Diciembre', value: '11' },
                      ].map(m => <option key={m.value} value={m.value}>{lang === 'es' ? m.labelEs : m.label}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <span className="text-[10px] text-muted-foreground ml-1">{t('Year' as any)}</span>
                    <Input 
                      className="h-8 text-xs font-mono" 
                      value={marriageYear} 
                      onChange={(e) => setMarriageYear(e.target.value)} 
                      placeholder="YYYY" 
                      maxLength={4} 
                    />
                  </div>
                </div>
              </div>
            )}

            <Button disabled={selectedPersonForAdd.length === 0} onClick={submitManualAdd}>Save Relationship</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete connection dialog */}
      <Dialog open={!!edgeToDelete} onOpenChange={(open) => !open && setEdgeToDelete(null)}>
        <DialogContent className="max-w-sm !p-6">
          <DialogHeader><DialogTitle>{t('Delete')}</DialogTitle></DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEdgeToDelete(null)}>{t('Cancel')}</Button>
            <Button variant="destructive" onClick={confirmDeleteEdge}>{t('Delete')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={!!renamingPerson} onOpenChange={(open) => !open && setRenamingPerson(null)}>
        <DialogContent className="max-w-sm !p-6">
          <DialogHeader><DialogTitle>{t('Rename Person')}</DialogTitle></DialogHeader>
          <div className="py-4">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t('Full Name')} onKeyDown={(e) => e.key === 'Enter' && handleRename()} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenamingPerson(null)}>{t('Cancel')}</Button>
            <Button onClick={handleRename} disabled={isRenaming || !newName.trim()}>{isRenaming ? t('Renaming...') : t('Rename')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Person photos dialog */}
      <Dialog open={!!selectedPersonPhotos} onOpenChange={(open) => !open && setSelectedPersonPhotos(null)} modal={false}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col !p-6" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="flex items-center justify-between pr-8 gap-2 flex-wrap">
              <DialogTitle>{selectedPersonPhotos?.name}&apos;s Photos</DialogTitle>
              <div className="flex items-center gap-1.5">
                {/* Sort buttons */}
                <div className="flex items-center rounded-md border overflow-hidden shadow-sm">
                  <button
                    title="Oldest first"
                    onClick={() => { setPhotosSort('date-asc'); setPhotosPage(1); setPersonPhotos([]); }}
                    className={`flex items-center gap-1 px-2 py-1 text-xs transition-colors ${
                      photosSort === 'date-asc' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <CalendarArrowUp size={13} />
                  </button>
                  <button
                    title="Newest first"
                    onClick={() => { setPhotosSort('date-desc'); setPhotosPage(1); setPersonPhotos([]); }}
                    className={`flex items-center gap-1 px-2 py-1 text-xs border-l transition-colors ${
                      photosSort === 'date-desc' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <CalendarArrowDown size={13} />
                  </button>
                  <button
                    title="Sort by filename (A→Z)"
                    onClick={() => { setPhotosSort('name'); setPhotosPage(1); setPersonPhotos([]); }}
                    className={`flex items-center gap-1 px-2 py-1 text-xs border-l transition-colors ${
                      photosSort === 'name' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <ArrowDownAZ size={13} />
                  </button>
                </div>
                <Button variant="ghost" size="sm" className="h-8 gap-2" onClick={() => { setRenamingPerson({ id: selectedPersonPhotos!.id, name: selectedPersonPhotos!.name }); setNewName(selectedPersonPhotos!.name); }}>
                  <Edit2 size={14} /> {t('Rename')}
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto mt-4 min-h-[400px]">
            {loadingPhotos && photosPage === 1 ? <div className="flex justify-center items-center h-full">Loading...</div> : personPhotos.length > 0 ? (
              <div className="flex flex-col gap-4">
                <AssetGrid assets={personPhotos} isInternal={true} selectable={false} onSetProfilePhoto={handleSetProfilePhoto} />
                {hasMorePhotos && <Button variant="outline" className="w-full mt-4" onClick={() => setPhotosPage(p => p + 1)} disabled={loadingPhotos}>{loadingPhotos ? "Loading..." : "Load More"}</Button>}
              </div>
            ) : <div className="flex justify-center items-center h-full text-muted-foreground">No photos found.</div>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Birthday dialog */}
      <Dialog open={!!editingBirthdayFor} onOpenChange={(open) => !open && setEditingBirthdayFor(null)}>
        <DialogContent className="max-w-sm !p-6">
          <DialogHeader><DialogTitle>{t('Edit Birthday')}</DialogTitle></DialogHeader>
          <div className="py-2 flex flex-col items-center">
            {(() => {
              const personToEdit = editingBirthdayFor ? peopleMap[editingBirthdayFor.id] : null;
              if (personToEdit) {
                return (
                  <div className="w-full">
                    <PersonBirthdayCell 
                      person={personToEdit} 
                      initialEditing={true}
                      onSaved={() => {
                        setEditingBirthdayFor(null);
                        fetchStates();
                        if (onAddVisual) onAddVisual();
                      }}
                    />
                  </div>
                );
              }
              return <span className="text-muted-foreground text-sm">Loading...</span>;
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBirthdayFor(null)}>{t('Close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Node Context Menu */}
      {contextMenu && (
        <div className="fixed z-[100] bg-card border rounded-lg shadow-xl py-1 min-w-[160px]" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={(e) => e.stopPropagation()}>
          <div className="px-3 py-2 border-b mb-1 uppercase tracking-wider text-[10px] font-bold text-muted-foreground">{contextMenu.personName}</div>
          <button onClick={() => { handleShowPhotos(contextMenu.personId, contextMenu.personName); setContextMenu(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted text-left"><ImageIcon size={14} className="text-blue-500" />{t('View Photos')}</button>
          <button onClick={() => { setEditingBirthdayFor({ id: contextMenu.personId, name: contextMenu.personName }); setContextMenu(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted text-left"><Edit2 size={14} className="text-purple-500" />{t('Edit Birthday')}</button>
          <button onClick={() => toggleDeceased(contextMenu.personId, personStates[contextMenu.personId]?.isDeceased ?? false)} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted text-left">
            {personStates[contextMenu.personId]?.isDeceased ? <><Heart size={14} className="text-rose-500 fill-rose-500/20" />{t('Mark as Living')}</> : <><Skull size={14} className="text-muted-foreground" />{t('Mark as Deceased')}</>}
          </button>
          <button onClick={() => toggleGender(contextMenu.personId, personStates[contextMenu.personId]?.gender ?? null)} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted text-left">
            {personStates[contextMenu.personId]?.gender === 'female' ? <><UserRound size={14} className="text-blue-500" />{t('Mark as Man')}</> : <><UserRound size={14} className="text-pink-500" />{t('Mark as Woman')}</>}
          </button>
        </div>
      )}
    </div>
  );
}

export default function RelationshipGraph(props: RelationshipGraphProps) {
  return (
    <ReactFlowProvider><GraphInner {...props} /></ReactFlowProvider>
  );
}
