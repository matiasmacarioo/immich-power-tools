import React, { useRef, useState } from 'react';
import { Download, Upload, Users } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import toast from 'react-hot-toast';
import { listPeople } from '@/handlers/api/people.handler';
import { ContactMergeDialog, ParsedContact } from './ContactMergeDialog';

export function ImportExportDropdown() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [parsedContacts, setParsedContacts] = useState<ParsedContact[]>([]);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const parseVCardDate = (bdayStr: string) => {
    // Basic cleanup
    let clean = bdayStr.replace(/[^0-9-]/g, '');
    if (clean.length === 8 && !clean.includes('-')) {
      // YYYYMMDD -> YYYY-MM-DD
      return `${clean.substring(0, 4)}-${clean.substring(4, 6)}-${clean.substring(6, 8)}`;
    }
    return clean;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();

      // Simple regex-based vCard parser
      // A vcard starts with BEGIN:VCARD and ends with END:VCARD
      const cardsText = text.split('BEGIN:VCARD');
      const contacts: ParsedContact[] = [];

      for (const card of cardsText) {
        if (!card.trim()) continue;

        const fnMatch = card.match(/^FN(?:;[^:]*)?:(.*)$/m);
        if (fnMatch) {
          const name = fnMatch[1].trim();
          const bdayMatch = card.match(/^BDAY(?:;[^:]*)?:(.*)$/m);
          const uidMatch = card.match(/^UID(?:;[^:]*)?:(.*)$/m);
          const uid = uidMatch ? uidMatch[1].trim() : undefined;

          if (bdayMatch) {
            const bday = parseVCardDate(bdayMatch[1].trim());
            contacts.push({ fn: name, bday: bday || null, uid });
          } else {
            contacts.push({ fn: name, bday: null, uid });
          }
        } else {
          console.log(`[vCard Debug] Could not find a name (FN) for a card block.`);
        }
      }

      if (contacts.length > 0) {
        setParsedContacts(contacts);
        setDialogOpen(true);
      } else {
        toast.error('No valid contacts found.');
      }

    } catch (error) {
      console.error(error);
      toast.error('Could not read the file.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExportClick = async () => {
    try {
      toast.loading('Preparing vCard export...', { id: 'export-vcard' });
      const response = await listPeople({ page: 1, type: 'named', perPage: 10000 });
      const people = response.people;

      if (people.length === 0) {
        toast.dismiss('export-vcard');
        toast.error('No people found to export.');
        return;
      }

      let uidsMap = new Map();
      let relationships: any[] = [];
      try {
        const [uidsRes, relsRes] = await Promise.all([
          fetch('/api/vcard-uids'),
          fetch('/api/relationships')
        ]);
        
        if (uidsRes.ok) {
          const uidsRaw = await uidsRes.json();
          uidsRaw.forEach((u: any) => uidsMap.set(u.personId, u.uid));
        }
        
        if (relsRes.ok) {
          relationships = await relsRes.json();
        }
      } catch (e) {
        // optionally ignore
      }

      let vcardContent = '';
      const peopleMap = new Map(people.map(p => [p.id, p]));

      for (const person of people) {
        vcardContent += 'BEGIN:VCARD\r\n';
        vcardContent += 'VERSION:3.0\r\n';
        
        // Proper Name Parsing (Use alias if available)
        const displayName = person.alias || person.name;
        const nameParts = displayName.trim().split(/\s+/);
        let lastName = '';
        let firstNames = '';
        if (nameParts.length > 1) {
          lastName = nameParts[nameParts.length - 1];
          firstNames = nameParts.slice(0, -1).join(' ');
        } else {
          firstNames = displayName;
        }

        vcardContent += `FN:${displayName}\r\n`;
        vcardContent += `N:${lastName};${firstNames};;;\r\n`;

        // Birthday (handle 1604 correctly)
        if (person.birthDate) {
          const dateStr = person.birthDate.toISOString().split('T')[0].replace(/-/g, '');
          if (dateStr.startsWith('1604')) {
            vcardContent += `BDAY:--${dateStr.substring(4)}\r\n`;
          } else {
            vcardContent += `BDAY:${dateStr}\r\n`;
          }
        }

        // UID
        if (uidsMap.has(person.id)) {
          vcardContent += `UID:${uidsMap.get(person.id)}\r\n`;
        }

        // Relationships
        const personRels = relationships.filter(r => r.person1Id === person.id || r.person2Id === person.id);
        personRels.forEach((rel, idx) => {
          const isP1 = rel.person1Id === person.id;
          const otherId = isP1 ? rel.person2Id : rel.person1Id;
          const otherPerson = peopleMap.get(otherId);
          if (otherPerson) {
            let relType = rel.relationshipType.toLowerCase();
            // Map types for better phone compatibility
            if (relType === 'parent') relType = isP1 ? 'child' : 'father';
            if (relType === 'spouse') relType = 'spouse';
            
            vcardContent += `X-ABRELATEDNAMES;type=${relType}:${otherPerson.name}\r\n`;
            vcardContent += `RELATED;TYPE=${relType}:text:${otherPerson.name}\r\n`;
          }
        });

        vcardContent += 'END:VCARD\r\n';
      }

      const blob = new Blob([vcardContent], { type: 'text/vcard;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'immich-birthdays.vcf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.dismiss('export-vcard');
      toast.success(`Exported ${people.length} contacts!`);
    } catch (error) {
      console.error(error);
      toast.dismiss('export-vcard');
      toast.error('Failed to export contacts.');
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".vcf,text/vcard"
        className="hidden"
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" title="Import / Export Contacts">
            <Users size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Contacts Sync</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleImportClick}>
            <Upload size={16} className="mr-2" />
            <span>Import vCard (.vcf)</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportClick}>
            <Download size={16} className="mr-2" />
            <span>Export vCard (.vcf)</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ContactMergeDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        contacts={parsedContacts}
      />
    </>
  );
}
