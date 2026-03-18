import React, { useEffect, useState } from 'react'
import { Autocomplete, AutocompleteOption } from '../ui/autocomplete';
import { searchPeople } from '@/handlers/api/people.handler';
import { getPersonInfo } from '@/handlers/api/person.handler';

interface IPeopleDropdownProps {
  peopleIds?: string[];
  onChange: (peopleIds: string[]) => void;
}
export default function PeopleDropdown({ peopleIds, onChange }: IPeopleDropdownProps) {
  const [selectedPerson, setSelectedPerson] = useState<AutocompleteOption | null>(null);

  useEffect(() => {
    if (peopleIds && peopleIds.length > 0) {
      if (selectedPerson?.value !== peopleIds[0]) {
        // Fetch person name if only ID is provided (could be improved with caching)
        getPersonInfo(peopleIds[0]).then((p: any) => {
          setSelectedPerson({
            label: p?.name || 'Unknown',
            value: p?.id || '',
            imageUrl: p?.thumbnailPath
          });
        }).catch(() => {});
      }
    } else {
      setSelectedPerson(null);
    }
  }, [peopleIds]);

  return (
    <div>
      <Autocomplete
        loadOptions={(query: string) => searchPeople(query).then((people) => people.map((person: any) => ({
          label: person.name, value: person.id,
          imageUrl: person.thumbnailPath
        })))}
        value={selectedPerson?.value || ""}
        placeholder="Search people..."
        onOptionSelect={(option) => {
           setSelectedPerson(option);
           onChange([option.value]);
        }}
        initialValue={selectedPerson?.label || ""}
        onChange={(e) => {
           if ((e.target as HTMLInputElement).value === '') {
             setSelectedPerson(null);
             onChange([]);
           }
        }}
      />
    </div>
  )
}