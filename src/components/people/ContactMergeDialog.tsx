import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { searchPeople, updatePerson, listPeople } from "@/handlers/api/people.handler";
import { IPerson } from "@/types/person";
import { Autocomplete } from "../ui/autocomplete";
import { Checkbox } from "../ui/checkbox";
import toast from "react-hot-toast";
import { ScrollArea } from "../ui/scroll-area";
import { Avatar } from "../ui/avatar";

export interface ParsedContact {
  fn: string;
  bday: string | null;
  uid?: string;
}

function getLastName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] || '';
}

interface IProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: ParsedContact[];
}

export function ContactMergeDialog({ isOpen, onClose, contacts }: IProps) {
  const [matches, setMatches] = useState<(IPerson | null)[]>([]);
  const [checked, setChecked] = useState<boolean[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !contacts.length) return;
    
    let isMounted = true;
    setLoading(true);
    
    const fetchMatches = async () => {
      let families: string[] = [];
      const hasSingleNames = contacts.some(c => !c.fn.trim().includes(' '));
      if (hasSingleNames) {
        try {
          const [relRes, peopleRes] = await Promise.all([
            fetch('/api/relationships').then(r => r.json()),
            listPeople({ page: 1, perPage: 10000 })
          ]);
          const inGraph = new Set<string>();
          (relRes || []).forEach((r: any) => { inGraph.add(r.person1Id); inGraph.add(r.person2Id); });
          const countMap = new Map<string, number>();
          peopleRes.people.forEach((p: any) => {
            if (inGraph.has(p.id)) {
              const ln = getLastName(p.name);
              if (ln) countMap.set(ln, (countMap.get(ln) || 0) + 1);
            }
          });
          families = Array.from(countMap.entries())
            .filter(([_, count]) => count > 1)
            .sort((a, b) => b[1] - a[1]) // Sort by most common family first
            .map(([ln]) => ln);
        } catch (e) {
          console.error("Failed to load family names for matching.");
        }
      }

      const results = await Promise.all(
        contacts.map(async (c) => {
          try {
            const name = c.fn.trim();
            // Try matching prominent families first if it's a single word name
            if (!name.includes(' ') && families.length > 0) {
              for (const fam of families) {
                const famResp = await searchPeople(`${name} ${fam}`);
                if (famResp.length > 0) return famResp[0];
              }
            }
            // Fallback to exactly what the vCard said
            const resp = await searchPeople(name);
            return resp.length > 0 ? resp[0] : null;
          } catch (e) {
            return null;
          }
        })
      );
      if (isMounted) {
        setMatches(results);
        setChecked(results.map((r) => r !== null));
        setLoading(false);
      }
    };
    
    fetchMatches();
    
    return () => { isMounted = false; };
  }, [contacts, isOpen]);

  const handleMerge = async () => {
    setSaving(true);
    let updatedCount = 0;
    
    const updates = contacts.map(async (contact, idx) => {
        if (checked[idx] && matches[idx]) {
          const m = matches[idx]!;
          
          let birthDateToUpdate = contact.bday;
          // Logic: If member has year but contact doesn't (1604), preserve member's year
          if (contact.bday?.startsWith('1604-') && m.birthDate) {
              const existingDate = new Date(m.birthDate);
              const existingYear = existingDate.getUTCFullYear();
              if (existingYear !== 1604) {
                 birthDateToUpdate = `${existingYear}-${contact.bday.substring(5)}`;
              }
          }

          await Promise.all([
            birthDateToUpdate ? updatePerson(m.id, { birthDate: birthDateToUpdate }) : Promise.resolve(),
            fetch(`/api/person-states/${m.id}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ alias: contact.fn })
            }),
            contact.uid ? fetch('/api/vcard-uids', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ personId: m.id, uid: contact.uid })
            }) : Promise.resolve()
          ]);
          updatedCount++;
        }
    });

    try {
      await Promise.all(updates);
      toast.success(`Successfully updated ${updatedCount} birthdays!`);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update some contacts.");
    } finally {
      setSaving(false);
    }
  };

  const toggleCheck = (index: number, val: boolean) => {
    const newChecked = [...checked];
    newChecked[index] = val;
    setChecked(newChecked);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Merge Contacts</DialogTitle>
          <DialogDescription>
            Review the imported contacts and their suggested matches in Immich. You can manually search for a different person if the suggestion is incorrect.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <span className="text-muted-foreground">Finding matching people...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto border rounded-md min-h-[50vh]">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted sticky top-0 z-10">
                <tr>
                  <th className="p-3 w-12 text-center">Sync</th>
                  <th className="p-3">vCard Contact</th>
                  <th className="p-3">Birthday</th>
                  <th className="p-3 w-1/2">Immich Person Match</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {contacts.map((contact, idx) => {
                  const match = matches[idx];
                  return (
                    <tr key={idx} className={checked[idx] ? "bg-accent/20" : ""}>
                      <td className="p-3 text-center">
                        <Checkbox 
                          checked={checked[idx]} 
                          onCheckedChange={(val) => toggleCheck(idx, !!val)} 
                          disabled={!match && !checked[idx]}
                        />
                      </td>
                      <td className="p-3 font-medium">{contact.fn}</td>
                      <td className="p-3 text-muted-foreground">
                        {contact.bday?.startsWith('1604-') ? contact.bday.substring(5) : (contact.bday || '-')}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {match && (
                            <Avatar 
                              src={match.thumbnailPath} 
                              alt={match.name} 
                              className="w-8 h-8 rounded-full" 
                            />
                          )}
                          <div className="flex-1">
                            <Autocomplete
                              value={match?.id || ""}
                              initialValue={match?.name || ""}
                              placeholder="Search for person..."
                              className="h-8 text-sm"
                              position="bottom"
                              loadOptions={async (query: string) => {
                                const people = await searchPeople(query);
                                return people.map((p: any) => ({
                                  label: p.name || 'Unnamed',
                                  value: p.id,
                                  imageUrl: p.thumbnailPath
                                }));
                              }}
                              onOptionSelect={(opt) => {
                                const newMatches = [...matches];
                                newMatches[idx] = { id: opt.value, name: opt.label, thumbnailPath: opt.imageUrl } as IPerson;
                                setMatches(newMatches);
                                if (!checked[idx]) toggleCheck(idx, true);
                              }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleMerge} disabled={loading || saving || !checked.some(c => c)}>
            {saving ? "Merging..." : `Merge ${checked.filter(Boolean).length} Contacts`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
