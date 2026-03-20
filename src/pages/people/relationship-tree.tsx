import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/layouts/PageLayout';
import PeopleDropdown from '@/components/shared/PeopleDropdown';
import { Button } from '@/components/ui/button';
import { listPeople } from '@/handlers/api/people.handler';
import { IPerson } from '@/types/person';
import dynamic from 'next/dynamic';
import { toast } from 'react-hot-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Upload } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const RelationshipGraph = dynamic(() => import('@/components/shared/RelationshipGraph'), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center">Loading tree...</div>,
});

const RELATIONSHIP_TYPES = [
  'Parent', 'Step-Parent', 'Child', 'Spouse', 'Ex-Spouse', 'Separated',
  'Estranged', 'Sibling', 'Step-Sibling', 'Cousin', 'Godparent', 'Godchild', 'Friend', 'Other',
];

export default function RelationshipTree() {
  const { t } = useLanguage();
  const [relationships, setRelationships] = useState<any[]>([]);
  const [people, setPeople] = useState<IPerson[]>([]);
  const [person1, setPerson1] = useState<string>('');
  const [person2, setPerson2] = useState<string>('');
  const [relationType, setRelationType] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

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

  useEffect(() => {
    fetchRelationships();
    fetchAllPeople();
  }, []);

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
        await fetchRelationships();
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
          fetchRelationships();
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

  return (
    <PageLayout className="!p-0 !mb-0 flex flex-col">
      <div className="flex-1 w-full relative min-h-[500px]">
        <RelationshipGraph relationships={relationships} people={people} onAddVisual={fetchRelationships} />

        {/* Floating panel anchor — sits top-left, above the ReactFlow controls */}
        <div className="absolute top-4 left-4 z-50 flex flex-col gap-2 pointer-events-auto">
          {/* Toggle button */}
          <Button
            id="add-relation-toggle"
            size="sm"
            variant={panelOpen ? 'default' : 'outline'}
            className="shadow-md bg-background/90 backdrop-blur-sm border hover:bg-muted transition-all"
            onClick={() => setPanelOpen((v) => !v)}
          >
            {panelOpen ? `✕ ${t('Close')}` : `＋ ${t('Add Relation')}`}
          </Button>

          {/* Slide-down card */}
          {panelOpen && (
            <div className="bg-card/95 backdrop-blur-sm border rounded-xl shadow-xl p-4 flex flex-col gap-3 w-72 animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('Add Relation')}
              </p>

              <div className="flex flex-col gap-2">
                {/* Person 1 */}
                <PeopleDropdown
                  peopleIds={person1 ? [person1] : []}
                  onChange={(ids) => setPerson1(ids[0] || '')}
                />

                {/* Relation type */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground shrink-0">{t('is')}</span>
                  <Select value={relationType} onValueChange={setRelationType}>
                    <SelectTrigger className="flex-1 h-8 text-sm">
                      <SelectValue placeholder={t('Relation')} />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIP_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{t(type)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Person 2 */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground shrink-0">{t('to')}</span>
                  <div className="flex-1">
                    <PeopleDropdown
                      peopleIds={person2 ? [person2] : []}
                      onChange={(ids) => setPerson2(ids[0] || '')}
                    />
                  </div>
                </div>
              </div>

              <Button id="submit-add-relation" onClick={handleAddRelation} disabled={isLoading} size="sm" className="w-full">
                {isLoading ? '...' : t('Add Relation')}
              </Button>

              {/* Export / Import */}
              <div className="flex gap-2 border-t pt-3">
                <Button variant="outline" size="sm" onClick={handleExport} className="flex-1 flex gap-1.5">
                  <Download size={13} /> {t('Export')}
                </Button>
                <label className="flex-1 cursor-pointer">
                  <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                  <Button variant="outline" size="sm" className="w-full flex gap-1.5" asChild>
                    <span><Upload size={13} /> {t('Import')}</span>
                  </Button>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
