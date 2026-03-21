import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PageLayout from '@/components/layouts/PageLayout';
import PeopleDropdown from '@/components/shared/PeopleDropdown';
import { Button } from '@/components/ui/button';
import { listPeople } from '@/handlers/api/people.handler';
import { IPerson } from '@/types/person';
import dynamic from 'next/dynamic';
import { toast } from 'react-hot-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Upload, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const RelationshipGraph = dynamic(() => import('@/components/shared/RelationshipGraph'), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center">Loading tree...</div>,
});

const RELATIONSHIP_TYPES = [
  'Parent', 'Step-Parent', 'Child', 'Spouse', 'Ex-Spouse', 'Separated',
  'Estranged', 'Sibling', 'Step-Sibling', 'Cousin', 'Godparent', 'Godchild', 'Friend', 'Other',
];

/** Extract the last word of a name as the "family name / last name" */
function getLastName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] || '';
}

export default function RelationshipTree() {
  const { t } = useLanguage();
  const [relationships, setRelationships] = useState<any[]>([]);
  const [people, setPeople] = useState<IPerson[]>([]);
  const [person1, setPerson1] = useState<string>('');
  const [person2, setPerson2] = useState<string>('');
  const [relationType, setRelationType] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<string>('__all__');
  const [hideFiltered, setHideFiltered] = useState(false);

  const fetchRelationships = async () => {
    try {
      const res = await fetch('/api/relationships');
      const data = await res.json();
      setRelationships(data);
    } catch {
      toast.error('Failed to fetch relationships');
    }
  };

  const fetchAllPeople = async () => {
    try {
      const res = await listPeople({ page: 1, perPage: 10000 });
      setPeople(res.people);
    } catch (e) {
      console.error(e);
    }
  };

  const refreshData = useCallback(async () => {
    await Promise.all([fetchRelationships(), fetchAllPeople()]);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleAddRelation = async () => {
    if (!person1 || !person2 || !relationType) {
      toast.error('Please fill all fields');
      return;
    }
    if (person1 === person2) {
      toast.error('Cannot create relationship with themselves');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person1Id: person1, person2Id: person2, relationshipType: relationType }),
      });
      if (res.ok) {
        toast.success('Relationship added!');
        setPerson1('');
        setPerson2('');
        setRelationType('');
        setPanelOpen(false);
        await refreshData();
      } else {
        toast.error('Failed to add relationship');
      }
    } catch {
      toast.error('Error adding relationship');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    window.location.href = '/api/relationships/export';
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        const res = await fetch('/api/relationships/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          toast.success('Relationships imported successfully!');
          refreshData();
        } else {
          toast.error('Failed to import data');
        }
      } catch {
        toast.error('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  /** 
   * Transitive descendant expansion starting from a root set.
   * Includes all children recursively, plus spouses of any descendant.
   */
  function expandToDescendantsAndSpouses(rootIds: Set<string>, rels: any[]): Set<string> {
    const highlighted = new Set(rootIds);
    let changed = true;
    while (changed) {
      changed = false;
      for (const r of rels) {
        // Parent -> Child path
        if (r.relationshipType === 'Parent') {
          if (highlighted.has(r.person1Id) && !highlighted.has(r.person2Id)) {
            highlighted.add(r.person2Id);
            changed = true;
          }
        }
        // Spouse path (symmetric)
        if (r.relationshipType === 'Spouse') {
          if (highlighted.has(r.person1Id) && !highlighted.has(r.person2Id)) {
            highlighted.add(r.person2Id);
            changed = true;
          } else if (highlighted.has(r.person2Id) && !highlighted.has(r.person1Id)) {
            highlighted.add(r.person1Id);
            changed = true;
          }
        }
      }
    }
    return highlighted;
  }

  /** Sorted unique last names of families with more than 1 member in the graph */
  const familyOptions = useMemo(() => {
    const surnames = new Set<string>();
    people.forEach((p) => {
      const parts = p.name.trim().split(/\s+/);
      if (parts.length > 1) {
        parts.slice(1).forEach(s => { if (s.length > 2) surnames.add(s); });
      }
    });

    const inGraph = new Set<string>();
    relationships.forEach((r) => { inGraph.add(r.person1Id); inGraph.add(r.person2Id); });

    const countMap = new Map<string, number>();
    people.forEach((p) => {
      if (!inGraph.has(p.id)) return;
      const parts = p.name.trim().split(/\s+/);
      parts.slice(1).forEach(s => {
        if (surnames.has(s)) countMap.set(s, (countMap.get(s) || 0) + 1);
      });
    });

    return Array.from(countMap.entries())
      .filter(([_, count]) => count > 2)
      .map(([s]) => s)
      .sort();
  }, [people, relationships]);

  const highlightedIds = useMemo(() => {
    if (selectedFamily === '__all__') return null;
    
    // 1. Identify all people with this family name in ANY of their surnames
    const familyMemberIds = new Set<string>();
    people.forEach((p) => {
      const parts = p.name.trim().split(/\s+/);
      if (parts.slice(1).some(s => s === selectedFamily)) familyMemberIds.add(p.id);
    });

    // 2. Identify "Heads of Family"
    // Someone is a head if they have the surname but their parent DOES NOT share it.
    const headsOfFamily = new Set<string>();
    familyMemberIds.forEach((id) => {
      const hasFamilyParent = relationships.some(r => 
        r.relationshipType === 'Parent' && 
        r.person2Id === id && 
        familyMemberIds.has(r.person1Id)
      );
      if (!hasFamilyParent) headsOfFamily.add(id);
    });

    // 3. Expand downward
    return expandToDescendantsAndSpouses(headsOfFamily, relationships);
  }, [selectedFamily, people, relationships]);

  const { filteredRels, filteredPeople } = useMemo(() => {
    if (!highlightedIds) return { filteredRels: relationships, filteredPeople: people };
    const r = relationships.filter(r => highlightedIds.has(r.person1Id) && highlightedIds.has(r.person2Id));
    const p = people.filter(p => highlightedIds.has(p.id));
    return { filteredRels: r, filteredPeople: p };
  }, [highlightedIds, relationships, people]);

  const isFiltered = !!highlightedIds;

  return (
    <PageLayout className="!p-0 !mb-0 flex flex-col">
      <div className="flex-1 w-full relative min-h-[500px]">
        <RelationshipGraph
          relationships={hideFiltered ? filteredRels : relationships}
          people={hideFiltered ? filteredPeople : people}
          highlightedIds={highlightedIds || undefined}
          onAddVisual={refreshData}
        />

        <div className="absolute top-4 left-4 z-50 flex flex-col gap-2 pointer-events-auto">
          <div className="flex items-center gap-2">
            <Button
              id="add-relation-toggle"
              size="sm"
              variant={panelOpen ? 'default' : 'outline'}
              className="shadow-md bg-background/90 backdrop-blur-sm border hover:bg-muted transition-all"
              onClick={() => setPanelOpen((v) => !v)}
            >
              {panelOpen ? `✕ ${t('Close')}` : `＋ ${t('Add Relation')}`}
            </Button>

            {familyOptions.length > 0 && (
              <Select value={selectedFamily} onValueChange={setSelectedFamily}>
                <SelectTrigger
                  id="family-filter"
                  className={`h-8 text-sm shadow-md backdrop-blur-sm border transition-all gap-1.5 ${
                    isFiltered
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background/90 text-foreground'
                  }`}
                  style={{ width: 'auto', minWidth: '9rem' }}
                >
                  <Users size={13} className="shrink-0" />
                  <SelectValue placeholder={t('All Families')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t('All Families')}</SelectItem>
                  {familyOptions.map((ln) => (
                    <SelectItem key={ln} value={ln}>
                      {ln}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {isFiltered && (
              <Button
                size="sm"
                variant={hideFiltered ? 'secondary' : 'outline'}
                className="h-8 text-[10px] shadow-sm backdrop-blur-sm px-2 gap-1.5 border border-primary/20"
                onClick={() => setHideFiltered(!hideFiltered)}
                title={hideFiltered ? t('Show All') : t('Hide Filtered')}
              >
                {hideFiltered ? <Users size={12} className="text-secondary-foreground" /> : <Users size={12} className="opacity-40" />}
                {hideFiltered ? 'Ocultos' : 'Limpiar'}
              </Button>
            )}

            {isFiltered && (
              <button
                onClick={() => { setSelectedFamily('__all__'); setHideFiltered(false); }}
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors"
                title="Clear filter"
              >
                ✕
              </button>
            )}
          </div>

          {panelOpen && (
            <div className="bg-card/95 backdrop-blur-sm border rounded-xl shadow-xl p-4 flex flex-col gap-3 w-72 animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('Add Relation')}
              </p>
              <div className="flex flex-col gap-2">
                <PeopleDropdown peopleIds={person1 ? [person1] : []} onChange={(ids) => setPerson1(ids[0] || '')} />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground shrink-0">{t('is')}</span>
                  <Select value={relationType} onValueChange={setRelationType}>
                    <SelectTrigger className="flex-1 h-8 text-sm"><SelectValue placeholder={t('Relation')} /></SelectTrigger>
                    <SelectContent>{RELATIONSHIP_TYPES.map((type) => (<SelectItem key={type} value={type}>{t(type)}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground shrink-0">{t('to')}</span>
                  <div className="flex-1">
                    <PeopleDropdown peopleIds={person2 ? [person2] : []} onChange={(ids) => setPerson2(ids[0] || '')} />
                  </div>
                </div>
              </div>
              <Button id="submit-add-relation" onClick={handleAddRelation} disabled={isLoading} size="sm" className="w-full">
                {isLoading ? '...' : t('Add Relation')}
              </Button>
              <div className="flex gap-2 border-t pt-3">
                <Button variant="outline" size="sm" onClick={handleExport} className="flex-1 flex gap-1.5"><Download size={13} /> {t('Export')}</Button>
                <label className="flex-1 cursor-pointer">
                  <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                  <Button variant="outline" size="sm" className="w-full flex gap-1.5" asChild><span><Upload size={13} /> {t('Import')}</span></Button>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
