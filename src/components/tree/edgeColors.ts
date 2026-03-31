export const getEdgeColor = (type: string): string => {
  switch (type) {
    case 'Spouse': return '#ec4899';
    case 'Ex-Spouse': return '#f9a8d4';   // faded pink
    case 'Separated': return '#fb923c';   // orange
    case 'Estranged': return '#94a3b8';   // slate gray
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
    case 'Great-Aunt/Uncle':
    case 'Niece/Nephew': 
    case 'Great-Niece/Nephew': return '#8b5cf6';
    case 'Cousin':
    case 'First-Cousin-Once-Removed':
    case 'First-Cousin-Once-Removed-Down': return '#f97316';
    case 'Second-Cousin': return '#ea580c';
    case 'Godparent':
    case 'Godparent':
    case 'Godchild': return '#0ea5e9';
    case 'Sibling-in-law':
    case 'Parent-in-law':
    case 'Child-in-law':
    case 'Cousin-in-law':
    case 'Grandparent-in-law':
    case 'Grandchild-in-law':
    case 'Great-grandparent-in-law':
    case 'Great-grandchild-in-law': return '#eab308';
    default: return '#64748b';
  }
};

/** Types rendered with a dashed stroke */
export const isDashedEdge = (type: string): boolean =>
  ['Ex-Spouse', 'Separated', 'Estranged'].includes(type);

