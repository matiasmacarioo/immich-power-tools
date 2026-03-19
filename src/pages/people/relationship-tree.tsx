import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/layouts/PageLayout';
import Header from '@/components/shared/Header';
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
  loading: () => <div className="h-full w-full flex items-center justify-center">Loading tree...</div>
});

const RELATIONSHIP_TYPES = ['Parent', 'Step-Parent', 'Child', 'Spouse', 'Ex-Spouse', 'Separated', 'Estranged', 'Sibling', 'Step-Sibling', 'Cousin', 'Godparent', 'Godchild', 'Friend', 'Other'];

export default function RelationshipTree() {
  const { t } = useLanguage();
  const [relationships, setRelationships] = useState<any[]>([]);
  const [people, setPeople] = useState<IPerson[]>([]);
  const [person1, setPerson1] = useState<string>('');
  const [person2, setPerson2] = useState<string>('');
  const [relationType, setRelationType] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchRelationships = async () => {
    try {
      const res = await fetch('/api/relationships');
      const data = await res.json();
      setRelationships(data);
    } catch (e) {
      toast.error('Failed to fetch relationships');
    }
  };

  const fetchAllPeople = async () => {
    try {
      // Fetch people (using sensible max to get naming map)
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
        body: JSON.stringify({ person1Id: person1, person2Id: person2, relationshipType: relationType })
      });
      if (res.ok) {
        toast.success('Relationship added!');
        setPerson1('');
        setPerson2('');
        setRelationType('');
        await fetchRelationships();
      } else {
        toast.error('Failed to add relationship');
      }
    } catch (e) {
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
      } catch (err) {
        toast.error('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  return (
    <PageLayout className="!p-0 !mb-0 flex flex-col">
      {/* Top Bar for Adding / Importing / Exporting */}
      <div className="flex items-center gap-2 p-4 border-b bg-background shadow-sm flex-wrap">
        <div className="w-48"><PeopleDropdown peopleIds={person1 ? [person1] : []} onChange={(ids) => setPerson1(ids[0] || '')} /></div>
        <span className="text-sm font-medium">{t('is')}</span>
        <div className="w-36">
          <Select value={relationType} onValueChange={setRelationType}>
            <SelectTrigger><SelectValue placeholder={t('Relation')} /></SelectTrigger>
            <SelectContent>
              {RELATIONSHIP_TYPES.map(type => <SelectItem key={type} value={type}>{t(type)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <span className="text-sm font-medium">{t('to')}</span>
        <div className="w-48"><PeopleDropdown peopleIds={person2 ? [person2] : []} onChange={(ids) => setPerson2(ids[0] || '')} /></div>
        
        <Button onClick={handleAddRelation} disabled={isLoading} size="sm" className="ml-2">
          {t('Add Relation')}
        </Button>

        <div className="flex-1"></div>

        <Button variant="outline" size="sm" onClick={handleExport} className="flex gap-2">
          <Download size={16} /> {t('Export')}
        </Button>

        <label className="cursor-pointer">
          <input type="file" accept=".json" className="hidden" onChange={handleImport} />
          <Button variant="outline" size="sm" asChild>
            <span className="flex gap-2"><Upload size={16} /> {t('Import')}</span>
          </Button>
        </label>
      </div>

      <div className='flex-1 w-full relative min-h-[500px]'>
        <RelationshipGraph relationships={relationships} people={people} onAddVisual={fetchRelationships} />
      </div>
    </PageLayout>
  );
}
