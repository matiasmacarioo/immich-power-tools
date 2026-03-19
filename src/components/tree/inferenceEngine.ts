// Relationship inference engine: pure functions that compute family relationships
// from a flat array of raw relationship records.

export interface RelRecord {
  person1Id: string;
  person2Id: string;
  relationshipType: string;
}

export interface InferredRelation {
  type: string;
  path: string[];
}

export function buildRelationshipHelpers(relationships: RelRecord[]) {
  const getParents = (personId: string): string[] =>
    relationships
      .filter((r) => r.relationshipType === 'Parent' && r.person2Id === personId)
      .map((r) => r.person1Id);

  const getChildren = (personId: string): string[] =>
    relationships
      .filter((r) => r.relationshipType === 'Parent' && r.person1Id === personId)
      .map((r) => r.person2Id);

  const getSpouses = (personId: string): string[] => {
    const spouses = new Set<string>();
    relationships.filter((r) => r.relationshipType === 'Spouse' && r.person1Id === personId).forEach((r) => spouses.add(r.person2Id));
    relationships.filter((r) => r.relationshipType === 'Spouse' && r.person2Id === personId).forEach((r) => spouses.add(r.person1Id));
    getChildren(personId).forEach((child) => {
      getParents(child).forEach((cp) => {
        if (cp !== personId) spouses.add(cp);
      });
    });
    return Array.from(spouses);
  };

  const getSiblings = (personId: string): string[] => {
    const parents = getParents(personId);
    const siblings = new Set<string>();
    parents.forEach((p) => {
      getChildren(p).forEach((c) => {
        if (c !== personId) siblings.add(c);
      });
    });
    relationships.forEach((r) => {
      if (['Sibling', 'Step-Sibling', 'Half-Sibling'].includes(r.relationshipType)) {
        if (r.person1Id === personId) siblings.add(r.person2Id);
        if (r.person2Id === personId) siblings.add(r.person1Id);
      }
    });
    return Array.from(siblings);
  };

  const findPath = (
    startId: string,
    endId: string,
    direction: 'up' | 'down',
    maxDepth: number
  ): { id: string; depth: number; path: string[] } | null => {
    type QueueItem = { id: string; depth: number; path: string[] };
    const queue: QueueItem[] = [{ id: startId, depth: 0, path: [startId] }];
    const visited = new Set<string>([startId]);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr.depth > 0 && curr.id === endId) return curr;
      if (curr.depth < maxDepth) {
        const nextIds = direction === 'up' ? getParents(curr.id) : getChildren(curr.id);
        for (const nid of nextIds) {
          if (!visited.has(nid)) {
            visited.add(nid);
            queue.push({ id: nid, depth: curr.depth + 1, path: [...curr.path, nid] });
          }
        }
      }
    }
    return null;
  };

  const getInferredRelationship = (targetId: string, nodeId: string): InferredRelation | null => {
    if (targetId === nodeId) return null;

    // Explicit relationships
    const exactEdge = relationships.find(
      (r) =>
        (r.person1Id === targetId && r.person2Id === nodeId) ||
        (r.person2Id === targetId && r.person1Id === nodeId)
    );
    let explicitType: string | null = null;

    if (exactEdge) {
      explicitType = exactEdge.relationshipType;
      if (explicitType === 'Child') explicitType = exactEdge.person1Id === targetId ? 'Parent' : 'Child';

      if (explicitType && ['Parent', 'Child', 'Spouse', 'Sibling', 'Step-Sibling', 'Half-Sibling'].includes(explicitType)) {
        return { type: explicitType, path: [targetId, nodeId] };
      }
    }

    const tParents = getParents(targetId);
    const tChildren = getChildren(targetId);
    const tSpouses = getSpouses(targetId);
    const tSiblings = getSiblings(targetId);

    const findBiologicalRelation = (): InferredRelation | null => {
      // Ancestors
      const ancestorPath = findPath(targetId, nodeId, 'up', 5);
      if (ancestorPath) {
        if (ancestorPath.depth === 2) return { type: 'Grandparent', path: ancestorPath.path };
        if (ancestorPath.depth === 3) return { type: 'Great-Grandparent', path: ancestorPath.path };
        if (ancestorPath.depth === 4) return { type: 'Great-Great-Grandparent', path: ancestorPath.path };
        if (ancestorPath.depth === 5) return { type: 'Chosno-Ancestor', path: ancestorPath.path };
      }

      // Descendants
      const descendantPath = findPath(targetId, nodeId, 'down', 5);
      if (descendantPath) {
        if (descendantPath.depth === 2) return { type: 'Grandchild', path: descendantPath.path };
        if (descendantPath.depth === 3) return { type: 'Great-Grandchild', path: descendantPath.path };
        if (descendantPath.depth === 4) return { type: 'Great-Great-Grandchild', path: descendantPath.path };
        if (descendantPath.depth === 5) return { type: 'Chosno', path: descendantPath.path };
      }

      // Aunt/Uncle
      for (const p of tParents) {
        if (getSiblings(p).includes(nodeId)) return { type: 'Aunt/Uncle', path: [targetId, p, nodeId] };
        for (const psib of getSiblings(p)) {
          if (getSpouses(psib).includes(nodeId)) return { type: 'Aunt/Uncle', path: [targetId, p, psib, nodeId] };
        }
      }

      // Niece/Nephew
      for (const s of tSiblings) {
        if (getChildren(s).includes(nodeId)) return { type: 'Niece/Nephew', path: [targetId, s, nodeId] };
      }
      for (const sp of tSpouses) {
        for (const spsib of getSiblings(sp)) {
          if (getChildren(spsib).includes(nodeId)) return { type: 'Niece/Nephew', path: [targetId, sp, spsib, nodeId] };
        }
      }

      // In-Laws
      for (const s of tSiblings) {
        if (getSpouses(s).includes(nodeId)) return { type: 'Sibling-in-law', path: [targetId, s, nodeId] };
      }
      for (const sp of tSpouses) {
        if (getSiblings(sp).includes(nodeId)) return { type: 'Sibling-in-law', path: [targetId, sp, nodeId] };
        if (getParents(sp).includes(nodeId)) return { type: 'Parent-in-law', path: [targetId, sp, nodeId] };
      }
      for (const c of tChildren) {
        if (getSpouses(c).includes(nodeId)) return { type: 'Child-in-law', path: [targetId, c, nodeId] };
      }

      // Cousins
      for (const p of tParents) {
        for (const au of getSiblings(p)) {
          if (getChildren(au).includes(nodeId)) return { type: 'Cousin', path: [targetId, p, au, nodeId] };
          for (const sp of getSpouses(au)) {
            if (getChildren(sp).includes(nodeId)) return { type: 'Cousin', path: [targetId, p, au, sp, nodeId] };
          }
        }
      }

      return null;
    };

    const bioRel = findBiologicalRelation();
    if (bioRel) return { type: explicitType || bioRel.type, path: bioRel.path };
    if (explicitType) return { type: explicitType, path: [targetId, nodeId] };

    return null;
  };

  return { getParents, getChildren, getSpouses, getSiblings, findPath, getInferredRelationship };
}
