import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { ReactFlow, Controls, Background, MiniMap, Node, Edge, Connection, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { IPerson } from '@/types/person';
import { useTheme } from 'next-themes';
import toast from 'react-hot-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import PeopleDropdown from './PeopleDropdown';
import { Button } from '../ui/button';
import { Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

import { getEdgeColor } from '../tree/edgeColors';
import PersonNode from '../tree/PersonNode';
import CustomEdge from '../tree/CustomEdge';
import { buildLayoutedGraph } from '../tree/layoutEngine';
import { buildRelationshipHelpers } from '../tree/inferenceEngine';
import { getPersonAssets } from '@/handlers/api/person.handler';
import AssetGrid from './AssetGrid';
import { IAsset } from '@/types/asset';

interface RelationshipGraphProps {
  relationships: any[];
  people: IPerson[];
  onAddVisual?: () => void;
}

const nodeTypes = { person: PersonNode };
const edgeTypes = { customEdge: CustomEdge };

export default function RelationshipGraph({ relationships, people, onAddVisual }: RelationshipGraphProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const [addingRelation, setAddingRelation] = useState<{ personId: string; relType: string; category: string; personName: string } | null>(null);
  const [edgeToDelete, setEdgeToDelete] = useState<Edge | null>(null);
  const [selectedPersonForAdd, setSelectedPersonForAdd] = useState<string[]>([]);
  const [selectedRelType, setSelectedRelType] = useState<string>('');

  const [selectedPersonPhotos, setSelectedPersonPhotos] = useState<{ id: string; name: string } | null>(null);
  const [personPhotos, setPersonPhotos] = useState<IAsset[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [photosPage, setPhotosPage] = useState(1);
  const [hasMorePhotos, setHasMorePhotos] = useState(true);

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
    });
    return { initialNodes: layoutedNodes, initialEdges: layoutedEdges, suggestions: sugg };
  }, [relationships, peopleMap, handleAddRelationClick, t, getParents, getChildren, getSpouses, getSiblings]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

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
    try {
      const res = await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person1Id: p1, person2Id: p2, relationshipType: rType }),
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
      let badgeLabel: string | undefined;
      let badgeColor: string | undefined;

      const inferredRelation = inferences.get(n.id);
      if (inferredRelation) {
        isConnectedNode = true;

        // The inference engine returns 'Parent' from the hovered person's edge (depth-1 explicit),
        // which lands on the card as "hovered IS their parent" → flip to 'Child' for the card.
        // Deeper types (Grandchild, Great-Grandchild, Aunt/Uncle…) are already named from the
        // card's perspective by the path-find logic, so they must NOT be flipped.
        const FLIP_MAP: Record<string, string> = {
          'Parent': 'Child', 'Child': 'Parent',
          'Step-Parent': 'Step-Child', 'Step-Child': 'Step-Parent',
          'Godparent': 'Godchild', 'Godchild': 'Godparent',
        };
        const flippedType = FLIP_MAP[inferredRelation.type];
        const displayType = (flippedType && !n.data.hasChildren) ? flippedType : inferredRelation.type;

        badgeLabel = displayType;
        badgeColor = getEdgeColor(displayType);
      } else if (isConnectedNode) {
        badgeColor = '#e2e8f0';
      }

      let fusedRightType: string | null = null;
      let fusedLeftType: string | null = null;

      if (isConnectedNode && n.data.adjacentSiblingId && highlightedIds.has(n.data.adjacentSiblingId as string)) fusedRightType = 'Sibling';
      else if (isConnectedNode && n.data.adjacentSpouseId && highlightedIds.has(n.data.adjacentSpouseId as string)) fusedRightType = 'Spouse';

      if (isConnectedNode && n.data.prevSiblingId && highlightedIds.has(n.data.prevSiblingId as string)) fusedLeftType = 'Sibling';
      else if (isConnectedNode && n.data.prevSpouseId && highlightedIds.has(n.data.prevSpouseId as string)) fusedLeftType = 'Spouse';

      const anyFusion = fusedRightType || fusedLeftType;
      if (isConnectedNode && !inferredRelation && anyFusion) {
        badgeColor = getEdgeColor(fusedRightType === 'Sibling' || fusedLeftType === 'Sibling' ? 'Sibling' : 'Spouse');
      }

      return {
        ...n,
        data: { ...n.data, hoverBadge: badgeLabel ? t(badgeLabel) : undefined, hoverColor: badgeColor, fusedRightType, fusedLeftType },
        style: { ...n.style, opacity: isConnectedNode ? 1 : 0.4, transition: 'opacity 0.2s' },
      };
    }));
  }, [setEdges, setNodes, getInferredRelationship, t, people]);

  const onNodeMouseLeave = useCallback(() => {
    setEdges((eds) => eds.map((ed) => ({
      ...ed, animated: false,
      style: {
        strokeWidth: 1,
        stroke: getEdgeColor(ed.data?.type as string || ed.label as string),
        opacity: 1,
        transition: 'stroke-width 0.2s, stroke 0.2s, opacity 0.2s',
      },
    })));
    setNodes((nds) => nds.map((n) => ({
      ...n,
      data: { ...n.data, hoverBadge: undefined, hoverColor: undefined, fusedRightType: null, fusedLeftType: null },
      style: { ...n.style, opacity: 1, transition: 'opacity 0.2s' },
    })));
  }, [setEdges, setNodes]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedPersonPhotos({ id: node.id, name: node.data.label as string });
    setPhotosPage(1);
    setPersonPhotos([]);
    setHasMorePhotos(true);
  }, []);

  useEffect(() => {
    if (selectedPersonPhotos) {
      setLoadingPhotos(true);
      getPersonAssets(selectedPersonPhotos.id, photosPage)
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
  }, [selectedPersonPhotos, photosPage]);

  const onEdgeMouseEnter = useCallback((_: React.MouseEvent, edge: Edge) => {
    setEdges((eds) => eds.map((ed) => {
      const isHovered = ed.id === edge.id;
      const edgeType = ed.data?.type || ed.label;
      return {
        ...ed, animated: isHovered,
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
        style: { ...n.style, opacity: isConnectedNode ? 1 : 0.4, transition: 'opacity 0.2s' },
      };
    }));
  }, [setEdges, setNodes]);

  // ──── Render ─────────────────────────────────────────────────────────────────

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
        onNodeClick={onNodeClick}
        onEdgeContextMenu={handleEdgeContextMenu}
        colorMode={theme === 'dark' ? 'dark' : 'light'}
      >
        <Controls />
        <MiniMap />
        <Background gap={12} size={1} />
      </ReactFlow>

      {/* Suggestions panel */}
      {suggestions.length > 0 && (
        <div className="absolute top-4 right-4 z-50 bg-card/95 backdrop-blur-sm border rounded-lg shadow-lg w-80 max-h-[80vh] flex flex-col pointer-events-auto">
          <div className="p-3 border-b font-semibold bg-muted/50 rounded-t-lg">Suggested Relationships</div>
          <div className="flex flex-col p-2 gap-2 overflow-y-auto">
            {suggestions.map((s) => (
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

      {/* Add relation dialog */}
      <Dialog open={!!addingRelation} onOpenChange={(open) => !open && setAddingRelation(null)}>
        <DialogContent className="max-w-md !p-6">
          <DialogHeader>
            <DialogTitle>Add Relationship for {addingRelation?.personName}</DialogTitle>
            <DialogDescription>Select the relationship type and search for a person.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4 mt-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Relationship Type</label>
              <select value={selectedRelType} onChange={(e) => setSelectedRelType(e.target.value)} className="w-full border rounded-md p-2 bg-background cursor-pointer">
                {addingRelation?.category === 'Top' && (<>
                  <option value="Parent">{t('Parent')}</option>
                  <option value="Step-Parent">{t('Step-Parent')}</option>
                  <option value="Godparent">{t('Godparent')}</option>
                  <option value="Parent-in-law">{t('Parent-in-law')}</option>
                  <option value="Aunt/Uncle">{t('Aunt/Uncle')}</option>
                </>)}
                {addingRelation?.category === 'Bottom' && (<>
                  <option value="Child">{t('Child')}</option>
                  <option value="Step-Child">{t('Step-Child')}</option>
                  <option value="Godchild">{t('Godchild')}</option>
                  <option value="Child-in-law">{t('Child-in-law')}</option>
                  <option value="Niece/Nephew">{t('Niece/Nephew')}</option>
                </>)}
                {addingRelation?.category === 'Side' && (<>
                  <option value="Sibling">{t('Sibling')}</option>
                  <option value="Step-Sibling">{t('Step-Sibling')}</option>
                  <option value="Half-Sibling">{t('Half-Sibling')}</option>
                  <option value="Spouse">{t('Spouse')}</option>
                  <option value="Cousin">{t('Cousin')}</option>
                  <option value="Sibling-in-law">{t('Sibling-in-law')}</option>
                  <option value="Friend">{t('Friend')}</option>
                  <option value="Other">{t('Other')}</option>
                </>)}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Select Person</label>
              <PeopleDropdown onChange={(ids) => setSelectedPersonForAdd(ids)} peopleIds={selectedPersonForAdd} />
            </div>
            <Button className="mt-4" disabled={selectedPersonForAdd.length === 0} onClick={submitManualAdd}>
              Save Relationship
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
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

      {/* Person photos dialog */}
      <Dialog open={!!selectedPersonPhotos} onOpenChange={(open) => !open && setSelectedPersonPhotos(null)} modal={false}>
        <DialogContent
          className="max-w-4xl max-h-[90vh] flex flex-col !p-6"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{selectedPersonPhotos?.name}&apos;s Photos</DialogTitle>
            <DialogDescription>Photos ordered by date.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto mt-4 min-h-[400px]">
            {loadingPhotos && photosPage === 1 ? (
              <div className="flex justify-center items-center h-full">Loading...</div>
            ) : personPhotos.length > 0 ? (
              <div className="flex flex-col gap-4">
                <AssetGrid
                  assets={personPhotos}
                  isInternal={true}
                  selectable={false}
                />
                {hasMorePhotos && (
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => setPhotosPage(p => p + 1)}
                    disabled={loadingPhotos}
                  >
                    {loadingPhotos ? "Loading..." : "Load More"}
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex justify-center items-center h-full text-muted-foreground">
                No photos found.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
