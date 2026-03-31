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
  // 1. Core Lookups (O(1) access)
  const parentMap = new Map<string, Set<string>>();
  const childMap = new Map<string, Set<string>>();
  const explicitSpouseMap = new Map<string, Set<string>>();
  const siblingsDirectMap = new Map<string, Set<string>>();

  const parentTypes = ['parent', 'padre', 'madre', 'father', 'mother', 'step-parent', 'padrastro', 'madrastra'];
  const childTypes = ['child', 'hijo', 'hija', 'son', 'daughter', 'step-child', 'hijastro', 'hijastra'];
  const siblingTypes = ['sibling', 'hermano', 'hermana', 'brother', 'sister', 'step-sibling', 'hermanastro', 'hermanastra', 'half-sibling', 'medio hermano', 'media hermana'];

  // All unique people IDs for pre-calculating extended relationships
  const peopleIds = new Set<string>();

  relationships.forEach(r => {
    const type = r.relationshipType.toLowerCase();
    const p1 = r.person1Id;
    const p2 = r.person2Id;
    peopleIds.add(p1);
    peopleIds.add(p2);

    if (parentTypes.includes(type)) {
      // P1 is parent of P2
      if (!parentMap.has(p2)) parentMap.set(p2, new Set());
      parentMap.get(p2)!.add(p1);
      if (!childMap.has(p1)) childMap.set(p1, new Set());
      childMap.get(p1)!.add(p2);
    } else if (childTypes.includes(type)) {
      // P1 is child of P2
      if (!childMap.has(p2)) childMap.set(p2, new Set());
      childMap.get(p2)!.add(p1);
      if (!parentMap.has(p1)) parentMap.set(p1, new Set());
      parentMap.get(p1)!.add(p2);
    } else if (type === 'spouse' || type === 'esposo' || type === 'esposa' || type === 'husband' || type === 'wife') {
      if (!explicitSpouseMap.has(p1)) explicitSpouseMap.set(p1, new Set());
      explicitSpouseMap.get(p1)!.add(p2);
      if (!explicitSpouseMap.has(p2)) explicitSpouseMap.set(p2, new Set());
      explicitSpouseMap.get(p2)!.add(p1);
    } else if (siblingTypes.includes(type)) {
      if (!siblingsDirectMap.has(p1)) siblingsDirectMap.set(p1, new Set());
      siblingsDirectMap.get(p1)!.add(p2);
      if (!siblingsDirectMap.has(p2)) siblingsDirectMap.set(p2, new Set());
      siblingsDirectMap.get(p2)!.add(p1);
    }
  });

  const getParents = (id: string): string[] => Array.from(parentMap.get(id) || []);
  const getChildren = (id: string): string[] => Array.from(childMap.get(id) || []);

  // 2. Pre-compute extended mappings (Spouses and Siblings)
  const spousesLookup = new Map<string, string[]>();
  const siblingsLookup = new Map<string, string[]>();

  peopleIds.forEach(p => {
    // Spouses: Explicit + Parents of the same children
    const sSet = new Set(explicitSpouseMap.get(p) || []);
    getChildren(p).forEach(c => {
      getParents(c).forEach(parentOfChild => {
        if (parentOfChild !== p) sSet.add(parentOfChild);
      });
    });
    if (sSet.size > 0) spousesLookup.set(p, Array.from(sSet));

    // Siblings: Direct + Shared parents + Step-siblings
    const sibSet = new Set(siblingsDirectMap.get(p) || []);
    getParents(p).forEach(parent => {
      getChildren(parent).forEach(child => {
        if (child !== p) sibSet.add(child);
      });
    });
    // Re-iterate for step-siblings after spouse map is ready
    if (sibSet.size > 0 || getParents(p).length > 0) siblingsLookup.set(p, Array.from(sibSet));
  });

  // Second pass for step-siblings (requires spouse lookup to be filled)
  peopleIds.forEach(p => {
    const sibSet = new Set(siblingsLookup.get(p) || []);
    getParents(p).forEach(parent => {
      (spousesLookup.get(parent) || []).forEach(spouse => {
        getChildren(spouse).forEach(child => {
          if (child !== p) sibSet.add(child);
        });
      });
    });
    if (sibSet.size > 0) siblingsLookup.set(p, Array.from(sibSet));
  });

  const getSpouses = (id: string): string[] => spousesLookup.get(id) || [];
  const getSiblings = (id: string): string[] => siblingsLookup.get(id) || [];

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

  const parentInLawTypes = ['parent-in-law', 'suegro', 'suegra', 'father-in-law', 'mother-in-law'];
  const childInLawTypes = ['child-in-law', 'yerno', 'nuera', 'son-in-law', 'daughter-in-law'];
  const siblingInLawTypes = ['sibling-in-law', 'cuñado', 'cuñada', 'brother-in-law', 'sister-in-law'];
  const greatAuntUncleTypes = ['great-aunt/uncle', 'tío abuelo', 'tía abuela', 'great-uncle', 'great-aunt'];
  const greatNieceNephewTypes = ['great-niece/nephew', 'sobrino nieto', 'sobrina nieta', 'great-nephew', 'great-niece'];
  const firstCousinOnceRemovedTypes = ['first-cousin-once-removed', 'tío segundo', 'tía segunda', 'first-cousin-once-removed-up'];
  const firstCousinOnceRemovedDownTypes = ['first-cousin-once-removed-down', 'sobrino segundo', 'sobrina segunda', 'first-cousin-once-removed-down'];
  const grandparentInLawTypes = ['grandparent-in-law', 'abuelo político', 'abuela política', 'grandfather-in-law', 'grandmother-in-law'];
  const grandchildInLawTypes = ['grandchild-in-law', 'nieto político', 'nieta política', 'grandson-in-law', 'granddaughter-in-law'];
  const greatGrandparentInLawTypes = ['great-grandparent-in-law', 'bisabuelo político', 'bisabuela política', 'great-grandfather-in-law', 'great-grandmother-in-law'];
  const greatGrandchildInLawTypes = ['great-grandchild-in-law', 'bisnieto político', 'bisnieta política', 'great-grandson-in-law', 'great-granddaughter-in-law'];

  const getInferredRelationship = (targetId: string, nodeId: string): InferredRelation | null => {
    if (targetId === nodeId) return null;

    // Explicit relationships lookup
    const exactEdge = relationships.find(
      (r) =>
        (r.person1Id === targetId && r.person2Id === nodeId) ||
        (r.person2Id === targetId && r.person1Id === nodeId)
    );
    
    let explicitType: string | null = null;
    if (exactEdge) {
      const type = exactEdge.relationshipType.toLowerCase();
      if (parentTypes.includes(type)) {
        explicitType = exactEdge.person1Id === targetId ? 'Child' : 'Parent';
      } else if (childTypes.includes(type)) {
        explicitType = exactEdge.person1Id === targetId ? 'Parent' : 'Child';
      } else if (['spouse', 'esposo', 'esposa', 'husband', 'wife'].includes(type)) {
        explicitType = 'Spouse';
      } else if (siblingTypes.includes(type)) {
        explicitType = 'Sibling';
      } else if (parentInLawTypes.includes(type)) {
        explicitType = exactEdge.person1Id === targetId ? 'Child-in-law' : 'Parent-in-law';
      } else if (childInLawTypes.includes(type)) {
        explicitType = exactEdge.person1Id === targetId ? 'Parent-in-law' : 'Child-in-law';
      } else if (siblingInLawTypes.includes(type)) {
        explicitType = 'Sibling-in-law';
      } else if (greatAuntUncleTypes.includes(type)) {
        explicitType = exactEdge.person1Id === targetId ? 'Great-Niece/Nephew' : 'Great-Aunt/Uncle';
      } else if (greatNieceNephewTypes.includes(type)) {
        explicitType = exactEdge.person1Id === targetId ? 'Great-Aunt/Uncle' : 'Great-Niece/Nephew';
      } else if (firstCousinOnceRemovedTypes.includes(type)) {
        explicitType = exactEdge.person1Id === targetId ? 'First-Cousin-Once-Removed-Down' : 'First-Cousin-Once-Removed';
      } else if (firstCousinOnceRemovedDownTypes.includes(type)) {
        explicitType = exactEdge.person1Id === targetId ? 'First-Cousin-Once-Removed' : 'First-Cousin-Once-Removed-Down';
      } else if (grandparentInLawTypes.includes(type)) {
        explicitType = exactEdge.person1Id === targetId ? 'Grandchild-in-law' : 'Grandparent-in-law';
      } else if (grandchildInLawTypes.includes(type)) {
        explicitType = exactEdge.person1Id === targetId ? 'Grandparent-in-law' : 'Grandchild-in-law';
      } else if (greatGrandparentInLawTypes.includes(type)) {
        explicitType = exactEdge.person1Id === targetId ? 'Great-grandchild-in-law' : 'Great-grandparent-in-law';
      } else if (greatGrandchildInLawTypes.includes(type)) {
        explicitType = exactEdge.person1Id === targetId ? 'Great-grandparent-in-law' : 'Great-grandchild-in-law';
      } else {
        // Handle other explicit types like Godparent
        if (type === 'godparent') explicitType = exactEdge.person1Id === targetId ? 'Godchild' : 'Godparent';
        else if (type === 'godchild') explicitType = exactEdge.person1Id === targetId ? 'Godparent' : 'Godchild';
        else explicitType = exactEdge.relationshipType;
      }
    }

    const tParents = getParents(targetId);
    const tChildren = getChildren(targetId);
    const tSpouses = getSpouses(targetId);
    const tSiblings = getSiblings(targetId);

    const findBiologicalRelation = (): InferredRelation | null => {
      // 0. Direct
      const directTypes = [
        'Parent', 'Child', 'Spouse', 'Sibling', 'Step-Sibling', 'Half-Sibling', 
        'Sibling-in-law', 'Parent-in-law', 'Child-in-law',
        'Great-Aunt/Uncle', 'Great-Niece/Nephew', 'First-Cousin-Once-Removed', 'First-Cousin-Once-Removed-Down',
        'Grandparent-in-law', 'Grandchild-in-law', 'Great-grandparent-in-law', 'Great-grandchild-in-law'
      ];
      if (explicitType && directTypes.includes(explicitType)) {
        return { type: explicitType, path: [targetId, nodeId] };
      }

      // 1. Inferred Sibling
      if (tSiblings.includes(nodeId)) return { type: 'Sibling', path: [targetId, nodeId] };

      // 2. Ancestors
      const ancestorPath = findPath(targetId, nodeId, 'up', 5);
      if (ancestorPath) {
        if (ancestorPath.depth === 1) return { type: 'Parent', path: ancestorPath.path };
        if (ancestorPath.depth === 2) return { type: 'Grandparent', path: ancestorPath.path };
        if (ancestorPath.depth === 3) return { type: 'Great-Grandparent', path: ancestorPath.path };
        if (ancestorPath.depth === 4) return { type: 'Great-Great-Grandparent', path: ancestorPath.path };
        if (ancestorPath.depth === 5) return { type: 'Chosno-Ancestor', path: ancestorPath.path };
      }

      // 3. Descendants 
      const descendantPath = findPath(targetId, nodeId, 'down', 5);
      if (descendantPath) {
        if (descendantPath.depth === 1) return { type: 'Child', path: descendantPath.path };
        if (descendantPath.depth === 2) return { type: 'Grandchild', path: descendantPath.path };
        if (descendantPath.depth === 3) return { type: 'Great-Grandchild', path: descendantPath.path };
        if (descendantPath.depth === 4) return { type: 'Great-Great-Grandchild', path: descendantPath.path };
        if (descendantPath.depth === 5) return { type: 'Chosno', path: descendantPath.path };
      }

      // Aunt/Uncle
      for (const p of tParents) {
        const pSiblings = getSiblings(p);
        if (pSiblings.includes(nodeId)) return { type: 'Aunt/Uncle', path: [targetId, p, nodeId] };
        for (const psib of pSiblings) {
          if (getSpouses(psib).includes(nodeId)) return { type: 'Aunt/Uncle', path: [targetId, p, psib, nodeId] };
        }
      }

      // Niece/Nephew
      for (const s of tSiblings) {
        if (getChildren(s).includes(nodeId)) return { type: 'Niece/Nephew', path: [targetId, s, nodeId] };
        for (const sp of getSpouses(s)) {
          if (getChildren(sp).includes(nodeId)) return { type: 'Niece/Nephew', path: [targetId, s, sp, nodeId] };
        }
      }

      // Cousins
      for (const p of tParents) {
        for (const au of getSiblings(p)) {
          if (getChildren(au).includes(nodeId)) return { type: 'Cousin', path: [targetId, p, au, nodeId] };
          for (const sp of getSpouses(au)) {
            if (getChildren(sp).includes(nodeId)) return { type: 'Cousin', path: [targetId, p, au, sp, nodeId] };
          }
          // Cousin-in-law
          for (const c of getChildren(au)) {
            if (getSpouses(c).includes(nodeId)) return { type: 'Cousin-in-law', path: [targetId, p, au, c, nodeId] };
          }
        }
      }

      // Second-Cousin
      for (const p of tParents) {
        for (const gp of getParents(p)) {
          for (const gau of getSiblings(gp)) {
            for (const pc of getChildren(gau)) {
              const pcChildren = getChildren(pc);
              if (pcChildren.includes(nodeId)) return { type: 'Second-Cousin', path: [targetId, p, gp, gau, pc, nodeId] };
              for (const pcc of pcChildren) {
                if (getSpouses(pcc).includes(nodeId)) return { type: 'Cousin-in-law', path: [targetId, p, gp, gau, pc, pcc, nodeId] };
              }
              for (const pcs of getSpouses(pc)) {
                for (const pcc of getChildren(pcs)) {
                  if (pcc === nodeId) return { type: 'Second-Cousin', path: [targetId, p, gp, gau, pc, pcs, nodeId] };
                  if (getSpouses(pcc).includes(nodeId)) return { type: 'Cousin-in-law', path: [targetId, p, gp, gau, pc, pcs, pcc, nodeId] };
                }
              }
            }
          }
        }
      }

      // Great-Aunt/Uncle
      for (const p of tParents) {
        for (const gp of getParents(p)) {
          for (const gau of getSiblings(gp)) {
            if (gau === nodeId) return { type: 'Great-Aunt/Uncle', path: [targetId, p, gp, gau] };
            if (getSpouses(gau).includes(nodeId)) return { type: 'Great-Aunt/Uncle', path: [targetId, p, gp, gau, nodeId] };
          }
        }
      }

      // Great-Niece/Nephew
      for (const s of tSiblings) {
        for (const c of getChildren(s)) {
          if (getChildren(c).includes(nodeId)) return { type: 'Great-Niece/Nephew', path: [targetId, s, c, nodeId] };
          for (const sp of getSpouses(c)) {
            if (getChildren(sp).includes(nodeId)) return { type: 'Great-Niece/Nephew', path: [targetId, s, c, sp, nodeId] };
          }
        }
      }

      // First-Cousin-Once-Removed (Up)
      for (const p of tParents) {
        for (const pp of getParents(p)) {
          for (const pau of getSiblings(pp)) {
            for (const pc of getChildren(pau)) {
              if (pc === nodeId) return { type: 'First-Cousin-Once-Removed', path: [targetId, p, pp, pau, pc] };
              if (getSpouses(pc).includes(nodeId)) return { type: 'First-Cousin-Once-Removed', path: [targetId, p, pp, pau, pc, nodeId] };
            }
          }
        }
      }

      // First-Cousin-Once-Removed (Down)
      for (const p of tParents) {
        for (const au of getSiblings(p)) {
          for (const c of getChildren(au)) {
            if (getChildren(c).includes(nodeId)) return { type: 'First-Cousin-Once-Removed-Down', path: [targetId, p, au, c, nodeId] };
            for (const csp of getSpouses(c)) {
              if (getChildren(csp).includes(nodeId)) return { type: 'First-Cousin-Once-Removed-Down', path: [targetId, p, au, c, csp, nodeId] };
            }
          }
        }
      }

      // Grandparent-in-law
      for (const sp of tSpouses) {
        for (const spar of getParents(sp)) {
          for (const gp of getParents(spar)) {
            if (gp === nodeId) return { type: 'Grandparent-in-law', path: [targetId, sp, spar, gp] };
          }
        }
      }

      // Great-grandparent-in-law
      for (const sp of tSpouses) {
        for (const spar of getParents(sp)) {
          for (const gp of getParents(spar)) {
            for (const ggp of getParents(gp)) {
              if (ggp === nodeId) return { type: 'Great-grandparent-in-law', path: [targetId, sp, spar, gp, ggp] };
            }
          }
        }
      }

      // Grandchild-in-law
      for (const child of tChildren) {
        for (const gc of getChildren(child)) {
          if (getSpouses(gc).includes(nodeId)) return { type: 'Grandchild-in-law', path: [targetId, child, gc, nodeId] };
        }
      }

      // Great-grandchild-in-law
      for (const child of tChildren) {
        for (const gc of getChildren(child)) {
          for (const ggc of getChildren(gc)) {
            if (getSpouses(ggc).includes(nodeId)) return { type: 'Great-grandchild-in-law', path: [targetId, child, gc, ggc, nodeId] };
          }
        }
      }

      // In-Laws (Parents/Siblings of spouse, Spouse of sibling/child)
      for (const sp of tSpouses) {
        if (getSiblings(sp).includes(nodeId)) return { type: 'Sibling-in-law', path: [targetId, sp, nodeId] };
        if (getParents(sp).includes(nodeId)) return { type: 'Parent-in-law', path: [targetId, sp, nodeId] };
      }
      for (const sib of tSiblings) {
        if (getSpouses(sib).includes(nodeId)) return { type: 'Sibling-in-law', path: [targetId, sib, nodeId] };
      }
      for (const child of tChildren) {
        if (getSpouses(child).includes(nodeId)) return { type: 'Child-in-law', path: [targetId, child, nodeId] };
      }

      return null;
    };

    const bioRel = findBiologicalRelation();
    if (bioRel) return bioRel;
    if (explicitType) return { type: explicitType, path: [targetId, nodeId] };
    return null;
  };

  return { getParents, getChildren, getSpouses, getSiblings, findPath, getInferredRelationship };
}
