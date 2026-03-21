import dagre from 'dagre';
import { Node, Edge, MarkerType } from '@xyflow/react';

export const NODE_WIDTH = 260;
export const NODE_HEIGHT = 70;

const CORE_RENDER_RELS = ['Parent', 'Step-Parent', 'Child', 'Step-Child', 'Spouse', 'Ex-Spouse', 'Separated', 'Estranged', 'Sibling', 'Step-Sibling', 'Half-Sibling'];
const HORIZONTAL_RELS = ['Sibling', 'Spouse', 'Ex-Spouse', 'Separated', 'Estranged', 'Friend', 'Cousin', 'Step-Sibling', 'Half-Sibling', 'Sibling-in-law'];

interface LayoutOptions {
  relationships: any[];
  peopleMap: Record<string, { name: string; thumbnailPath?: string }>;
  handleAddRelationClick: (info: any) => void;
  translateLabel: (key: string, gender?: 'male' | 'female' | 'other' | null) => string;
  getParents: (id: string) => string[];
  getChildren: (id: string) => string[];
  getSpouses: (id: string) => string[];
  getSiblings: (id: string) => string[];
  highlightedIds?: Set<string>;
}

export function buildLayoutedGraph(opts: LayoutOptions): {
  layoutedNodes: Node[];
  layoutedEdges: Edge[];
  suggestions: any[];
} {
  const { relationships, peopleMap, handleAddRelationClick, translateLabel, getParents, getChildren, getSpouses, getSiblings, highlightedIds } = opts;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'TB', ranksep: 100, nodesep: 40, edgesep: 30 });

  const rawNodesMap: Record<string, Node> = {};
  const normalizedEdges = new Map<string, Edge>();
  const suggestionsTemp: any[] = [];

  const addSuggestion = (source: string, target: string, type: string) => {
    let finalSource = source;
    let finalTarget = target;
    if (['Sibling', 'Spouse', 'Ex-Spouse', 'Separated', 'Estranged', 'Friend', 'Cousin', 'Step-Sibling'].includes(type)) {
      if (source > target) { finalSource = target; finalTarget = source; }
    } else if (type === 'Child' || type === 'Step-Child') {
      finalSource = target; finalTarget = source;
      type = type === 'Child' ? 'Parent' : 'Step-Parent';
    }
    const key = `${finalSource}-${finalTarget}`;
    if (!normalizedEdges.has(key) && !suggestionsTemp.some((s) => s.key === key)) {
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

  const addCleanEdge = (source: string, target: string, type: string, realId: string | null = null, marriageDate: string | null = null) => {
    let finalSource = source;
    let finalTarget = target;
    let finalLabel = type;
    if (type === 'Child' || type === 'Step-Child') {
      finalSource = target; finalTarget = source;
      finalLabel = type === 'Child' ? 'Parent' : 'Step-Parent';
    } else if (['Sibling', 'Spouse', 'Ex-Spouse', 'Separated', 'Estranged', 'Friend', 'Cousin', 'Step-Sibling'].includes(type)) {
      if (source > target) { finalSource = target; finalTarget = source; }
    }
    const key = `${finalSource}-${finalTarget}`;
    if (!normalizedEdges.has(key)) {
      normalizedEdges.set(key, {
        id: key, source: finalSource, target: finalTarget, label: finalLabel,
        data: { realId, sourceId: finalSource, targetId: finalTarget, label: finalLabel, marriageDate },
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15 },
      });
    } else {
      const existing = normalizedEdges.get(key)!;
      existing.data = { ...(existing.data || {}), realId, marriageDate: marriageDate || existing.data?.marriageDate };
    }
  };

  // Build nodes + edges from raw DB relationships
  relationships.forEach((rel) => {
    [rel.person1Id, rel.person2Id].forEach((id: string) => {
      if (!rawNodesMap[id]) {
        rawNodesMap[id] = {
          id, type: 'person', position: { x: 0, y: 0 },
          data: {
            label: peopleMap[id]?.name || 'Unknown',
            imageUrl: peopleMap[id]?.thumbnailPath || '',
            birthDate: (peopleMap[id] as any)?.birthDate || null,
            deathDate: (peopleMap[id] as any)?.deathDate || null,
            gender: (peopleMap[id] as any)?.gender || null,
            alias: (peopleMap[id] as any)?.alias || null,
            onAddRelationClick: handleAddRelationClick,
          },
        };
      }
    });
    addCleanEdge(rel.person1Id, rel.person2Id, rel.relationshipType, rel.id, rel.marriageDate);
  });

  // Tag each node with whether they have children
  Object.values(rawNodesMap).forEach((node) => {
    node.data = { ...node.data, hasChildren: getChildren(node.id).length > 0 };
  });

  const nodesArr = Object.values(rawNodesMap);

  // Suggestions: Siblings
  nodesArr.forEach((nodeA) => {
    const aId = nodeA.id;
    const parentsA = getParents(aId);
    parentsA.forEach((pA) => {
      getChildren(pA).forEach((bId) => { if (aId !== bId) addSuggestion(aId, bId, 'Sibling'); });
    });

    // Suggestions: Cousins (robust engine)
    parentsA.forEach((pA) => {
      const auntsAndUncles = new Set(getSiblings(pA));
      getParents(pA).forEach((gp) => getChildren(gp).forEach((c) => auntsAndUncles.add(c)));
      const byMarriage = new Set<string>();
      auntsAndUncles.forEach((au) => getSpouses(au).forEach((sp) => byMarriage.add(sp)));
      const allAU = [...Array.from(auntsAndUncles), ...Array.from(byMarriage)];
      allAU.forEach((au) => {
        if (au === pA || getSpouses(pA).includes(au)) return;
        getChildren(au).forEach((cousinId) => {
          if (cousinId !== aId && !getSiblings(aId).includes(cousinId)) addSuggestion(aId, cousinId, 'Cousin');
        });
      });
    });

    // Propagate cousin edges across sibling lines
    getSiblings(aId).forEach((sib) => {
      relationships.forEach((r) => {
        if (r.relationshipType === 'Cousin') {
          if (r.person1Id === sib && r.person2Id !== aId) addSuggestion(aId, r.person2Id, 'Cousin');
          if (r.person2Id === sib && r.person1Id !== aId) addSuggestion(aId, r.person1Id, 'Cousin');
        }
      });
    });

    // Propagate explicit cousin edges down target's sibling lines
    relationships.forEach((r) => {
      if (r.relationshipType === 'Cousin') {
        const cousinId = r.person1Id === aId ? r.person2Id : r.person2Id === aId ? r.person1Id : null;
        if (cousinId) {
          getSiblings(cousinId).forEach((cousinSib) => {
            if (cousinSib !== aId && !getSiblings(aId).includes(cousinSib)) addSuggestion(aId, cousinSib, 'Cousin');
          });
        }
      }
    });

    // Suggest step-parent
    const spousesA = getSpouses(aId);
    spousesA.forEach((spouseId) => {
      const spouseChildren = getChildren(spouseId);
      const myChildren = getChildren(aId);
      spouseChildren.forEach((childId) => {
        if (!myChildren.includes(childId) && aId !== childId) addSuggestion(aId, childId, 'Parent');
      });
    });
  });

  // Feed Dagre
  nodesArr.forEach((node) => dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));

  normalizedEdges.forEach((edge) => {
    if (edge.label === 'Parent' || edge.label === 'Step-Parent') {
      const isFamily = highlightedIds?.has(edge.source) && highlightedIds?.has(edge.target);
      dagreGraph.setEdge(edge.source, edge.target, { weight: isFamily ? 20 : 2 });
    }
  });

  const proxyByParent = new Map<string, string>();
  normalizedEdges.forEach((edge) => {
    if (edge.label === 'Spouse') {
      const isFamily = highlightedIds?.has(edge.source) && highlightedIds?.has(edge.target);
      const dummyId = `proxy_marriage_${edge.source}_${edge.target}`;
      dagreGraph.setNode(dummyId, { width: 1, height: 1 });
      dagreGraph.setEdge(edge.source, dummyId, { weight: isFamily ? 1000 : 100, minlen: 0 });
      dagreGraph.setEdge(edge.target, dummyId, { weight: isFamily ? 1000 : 100, minlen: 0 });
      proxyByParent.set(edge.source, dummyId);
      proxyByParent.set(edge.target, dummyId);
    }
  });

  normalizedEdges.forEach((edge) => {
    if (edge.label === 'Parent' || edge.label === 'Step-Parent') {
      const proxyId = proxyByParent.get(edge.source);
      const isFamily = highlightedIds?.has(edge.source) && highlightedIds?.has(edge.target);
      if (proxyId) dagreGraph.setEdge(proxyId, edge.target, { weight: isFamily ? 20 : 2, minlen: 1 });
      else dagreGraph.setEdge(edge.source, edge.target, { weight: isFamily ? 20 : 2, minlen: 1 });
    }
  });

  dagre.layout(dagreGraph);

  // --- Local helpers ---
  const isSpouse = (n1: string, n2: string) => {
    const e1 = normalizedEdges.get(`${n1}-${n2}`);
    const e2 = normalizedEdges.get(`${n2}-${n1}`);
    return (e1 && e1.label === 'Spouse') || (e2 && e2.label === 'Spouse');
  };

  const isSibling = (n1: string, n2: string) => {
    const e1 = normalizedEdges.get(`${n1}-${n2}`);
    const e2 = normalizedEdges.get(`${n2}-${n1}`);
    if (e1 && ['Sibling', 'Step-Sibling', 'Half-Sibling'].includes(e1.label as string)) return true;
    if (e2 && ['Sibling', 'Step-Sibling', 'Half-Sibling'].includes(e2.label as string)) return true;
    const p1 = getParents(n1);
    const p2 = getParents(n2);
    return (p1.length > 0 && p1.some((p) => p2.includes(p)));
  };

  // --- Force siblings and spouses to the same Y level ---
  const siblingSpouseClusters: Set<string>[] = [];
  const processedForCluster = new Set<string>();

  nodesArr.forEach((node) => {
    if (processedForCluster.has(node.id)) return;
    const cluster = new Set<string>([node.id]);
    const queue = [node.id];
    processedForCluster.add(node.id);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      nodesArr.forEach((cand) => {
        if (!processedForCluster.has(cand.id) && (isSibling(curr, cand.id) || isSpouse(curr, cand.id))) {
          cluster.add(cand.id);
          processedForCluster.add(cand.id);
          queue.push(cand.id);
        }
      });
    }
    if (cluster.size > 1) siblingSpouseClusters.push(cluster);
  });

  siblingSpouseClusters.forEach((cluster) => {
    const ys = Array.from(cluster).map(id => dagreGraph.node(id).y).sort((a,b) => a-b);
    const medianY = ys[Math.floor(ys.length / 2)];
    cluster.forEach(id => {
      const node = dagreGraph.node(id);
      node.y = medianY;
    });
  });

  // --- Pyramid layout per rank ---
  const layoutedNodes: Node[] = [];
  const ranks = new Map<number, Node[]>();
  const yRanks: number[] = [];

  nodesArr.forEach((node) => {
    const dNode = dagreGraph.node(node.id);
    const y = dNode.y;
    let foundY = yRanks.find((ry) => Math.abs(ry - y) < 50);
    if (foundY === undefined) { foundY = y; yRanks.push(foundY); ranks.set(foundY, []); }
    ranks.get(foundY)!.push(node);
  });

  Array.from(ranks.keys()).sort((a, b) => a - b).forEach((y) => {
    const rawRankNodes = ranks.get(y)!;
    rawRankNodes.sort((a, b) => dagreGraph.node(a.id).x - dagreGraph.node(b.id).x);

    // Group spouses
    const spouseGroups: Node[][] = [];
    const processedSpouses = new Set<string>();
    rawRankNodes.forEach((node) => {
      if (processedSpouses.has(node.id)) return;
      const group = [node];
      processedSpouses.add(node.id);
      for (const n of rawRankNodes) {
        if (!processedSpouses.has(n.id) && isSpouse(node.id, n.id)) { group.push(n); processedSpouses.add(n.id); }
      }
      group.sort((a, b) => {
        const aP = getParents(a.id).length;
        const bP = getParents(b.id).length;
        return aP !== bP ? bP - aP : dagreGraph.node(a.id).x - dagreGraph.node(b.id).x;
      });
      spouseGroups.push(group);
    });

    // Order sibling groups
    const orderedGroups: Node[][] = [];
    const processedGroups = new Set<Node[]>();
    spouseGroups.forEach((sg) => {
      if (processedGroups.has(sg)) return;
      const groupSeq = [sg];
      const queue = [sg];
      processedGroups.add(sg);
      while (queue.length > 0) {
        const currSg = queue.shift()!;
        const mates = spouseGroups.filter((targetSg) => {
          if (processedGroups.has(targetSg)) return false;
          return currSg.some((cn) => targetSg.some((tn) => isSibling(cn.id, tn.id)));
        });
        mates.sort((a, b) => dagreGraph.node(a[0].id).x - dagreGraph.node(b[0].id).x);
        mates.forEach((m) => { processedGroups.add(m); groupSeq.push(m); queue.push(m); });
      }
      orderedGroups.push(...groupSeq);
    });

    // Compute compact positions
    let rankMinX = Infinity;
    let rankMaxX = -Infinity;
    for (const sg of orderedGroups) {
      for (const n of sg) {
        const dx = dagreGraph.node(n.id).x - NODE_WIDTH / 2;
        if (dx < rankMinX) rankMinX = dx;
        if (dx > rankMaxX) rankMaxX = dx;
      }
    }

    const rankMap = new Map<string, number>();
    let simulatedX = rankMinX;

    for (let i = 0; i < orderedGroups.length; i++) {
      const sg = orderedGroups[i];
      const nextSg = orderedGroups[i + 1];
      const isLinkedToNextSibling = nextSg && sg.some((s1) => nextSg.some((s2) => isSibling(s1.id, s2.id)));
      for (let j = 0; j < sg.length; j++) {
        rankMap.set(sg[j].id, simulatedX);
        const isLastSpouse = j === sg.length - 1;
        if (!isLastSpouse) simulatedX += NODE_WIDTH + 20;
        else if (isLinkedToNextSibling) simulatedX += NODE_WIDTH + 40;
        else if (nextSg) simulatedX += NODE_WIDTH + 100;
      }
    }

    const compactWidth = simulatedX - rankMinX;
    const dagreWidth = rankMaxX - rankMinX;
    const offset = Math.max(0, (dagreWidth - compactWidth) / 2);

    for (const sg of orderedGroups) {
      for (const node of sg) {
        node.data = { ...node.data, roundedClass: 'rounded-xl' };
        layoutedNodes.push({ ...node, position: { x: (rankMap.get(node.id) ?? 0) + offset, y: y - NODE_HEIGHT / 2 } });
      }
    }
  });

  // Detect adjacent siblings/spouses for fusion
  for (let i = 0; i < layoutedNodes.length; i++) {
    for (let j = 0; j < layoutedNodes.length; j++) {
      if (i === j) continue;
      const n1 = layoutedNodes[i];
      const n2 = layoutedNodes[j];
      if (n1.position.y === n2.position.y) {
        const distance = n2.position.x - (n1.position.x + NODE_WIDTH);
        if (isSibling(n1.id, n2.id) && distance >= 35 && distance <= 50) {
          n1.data = { ...n1.data, adjacentSiblingId: n2.id };
          n2.data = { ...n2.data, prevSiblingId: n1.id };
        } else if (isSpouse(n1.id, n2.id) && distance >= 15 && distance <= 25) {
          n1.data = { ...n1.data, adjacentSpouseId: n2.id };
          n2.data = { ...n2.data, prevSpouseId: n1.id };
        }
      }
    }
  }

  // Assign handles and filter to core renderable edges
  const layoutedEdges: Edge[] = Array.from(normalizedEdges.values())
    .filter((edge) => CORE_RENDER_RELS.includes(edge.label as string))
    .map((edge) => {
      let sourceHandle = 's-bottom';
      let targetHandle = 't-top';

      const sourceNode = layoutedNodes.find((n) => n.id === edge.source);
      const targetNode = layoutedNodes.find((n) => n.id === edge.target);

      if (sourceNode && targetNode && HORIZONTAL_RELS.includes(edge.label as string)) {
        if (sourceNode.position.x < targetNode.position.x) { sourceHandle = 's-right'; targetHandle = 't-left'; }
        else { sourceHandle = 's-left'; targetHandle = 't-right'; }
      }

      return {
        ...edge,
        sourceHandle,
        targetHandle,
        type: 'customEdge',
        data: { 
          ...(edge.data || {}), 
          type: edge.label as string, 
          label: translateLabel(edge.label as string, (peopleMap[edge.source] as any)?.gender), 
          marriageDate: edge.data?.marriageDate 
        },
      };
    });

  return { layoutedNodes, layoutedEdges, suggestions: suggestionsTemp };
}
