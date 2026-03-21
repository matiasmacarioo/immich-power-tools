import React, { useState, useEffect } from 'react';
import { IPerson } from '@/types/person';
import { updatePerson } from '@/handlers/api/people.handler';
import { useToast } from '../ui/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { CalendarIcon, Check, X, Trash2, HelpCircle } from 'lucide-react';

interface IProps {
  person: IPerson;
  onSaved?: () => void;
  initialEditing?: boolean;
}

const MONTHS = [
  { label: 'January', labelEs: 'Enero', value: '0' },
  { label: 'February', labelEs: 'Febrero', value: '1' },
  { label: 'March', labelEs: 'Marzo', value: '2' },
  { label: 'April', labelEs: 'Abril', value: '3' },
  { label: 'May', labelEs: 'Mayo', value: '4' },
  { label: 'June', labelEs: 'Junio', value: '5' },
  { label: 'July', labelEs: 'Julio', value: '6' },
  { label: 'August', labelEs: 'Agosto', value: '7' },
  { label: 'September', labelEs: 'Septiembre', value: '8' },
  { label: 'October', labelEs: 'Octubre', value: '9' },
  { label: 'November', labelEs: 'Noviembre', value: '10' },
  { label: 'December', labelEs: 'Diciembre', value: '11' },
];

const DAYS = Array.from({ length: 31 }, (_, i) => (i + 1).toString());

export default function PersonBirthdayCell({ person, onSaved, initialEditing = false }: IProps) {
  const { lang, formatDate } = useLanguage();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(initialEditing);
  const [loading, setLoading] = useState(false);

  // Robust parsing: extract Y, M, D directly from string to avoid TZ shifts
  const parseDateRobust = (val: string | Date | null) => {
    if (!val) return null;
    
    if (val instanceof Date) {
      return {
        year: val.getUTCFullYear().toString(),
        month: val.getUTCMonth().toString(),
        day: val.getUTCDate().toString()
      };
    }

    const match = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    return {
      year: match[1],
      month: (Number(match[2]) - 1).toString(),
      day: Number(match[3]).toString()
    };
  };

  const initial = parseDateRobust(person.birthDate);
  const [day, setDay] = useState<string>(initial ? initial.day : '1');
  const [month, setMonth] = useState<string>(initial ? initial.month : '0');
  const [year, setYear] = useState<string>(initial ? (initial.year === '1604' ? '' : initial.year) : '');
  const [name, setName] = useState<string>(person.name);
  const [alias, setAlias] = useState<string>(person.alias || '');

  useEffect(() => {
    if (!isEditing) {
      const d = parseDateRobust(person.birthDate);
      if (d) {
        setDay(d.day);
        setMonth(d.month);
        setYear(d.year === '1604' ? '' : d.year);
      }
      setName(person.name);
      setAlias(person.alias || '');
    }
  }, [person.birthDate, person.name, person.alias, isEditing]);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Validate year
      let yNum = parseInt(year);
      if (isNaN(yNum) || yNum < 1) yNum = 1604;
      
      const bday = `${yNum}-${(Number(month) + 1).toString().padStart(2, '0')}-${day.padStart(2, '0')}`;
      
      // If result is 1604-01-01 and person had no bday before, skip updating bday
      const skipBday = bday === '1604-01-01' && !person.birthDate;

      await Promise.all([
        updatePerson(person.id, { 
          birthDate: skipBday ? undefined : bday,
          name: name,
        }),
        fetch(`/api/person-states/${person.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alias: alias || null })
        })
      ]);
      toast({ title: "Success", description: "Person updated" });
      setIsEditing(false);
      if (onSaved) onSaved();
    } catch (e) {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setLoading(true);
    try {
      await updatePerson(person.id, { birthDate: null });
      toast({ title: "Success", description: "Birthday removed" });
      setIsEditing(false);
      if (onSaved) onSaved();
    } catch (e) {
      toast({ title: "Error", description: "Failed to remove", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!isEditing) {
    const initial = parseDateRobust(person.birthDate);
    let label = '';
    if (!initial) {
      label = lang === 'es' ? 'Sin fecha' : 'No date';
    } else if (initial.year === '1604') {
      const localD = new Date(2000, Number(initial.month), Number(initial.day));
      label = lang === 'es' ? `${formatDate(localD, "d 'de' MMMM")} (Desconocido)` : `${formatDate(localD, "MMMM d")} (Unknown Year)`;
    } else {
      const localD = new Date(Number(initial.year), Number(initial.month), Number(initial.day));
      label = formatDate(localD, 'PPP');
    }

    return (
      <div 
        className="flex items-center gap-2 px-3 py-1.5 border rounded-md bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors"
        onClick={() => setIsEditing(true)}
      >
        <CalendarIcon size={14} className="text-muted-foreground" />
        <span className="text-sm flex-1 truncate font-medium">{label}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3 border rounded-xl bg-card shadow-lg animate-in fade-in zoom-in-95 duration-200">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold text-muted-foreground px-1">{lang === 'es' ? 'Nombre completo' : 'Full Name'}</label>
          <Input 
            className="h-8 text-xs" 
            value={name} 
            onChange={e => setName(e.target.value)} 
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold text-muted-foreground px-1">{lang === 'es' ? 'Apodo / Alias' : 'Nickname / Alias'}</label>
          <Input 
            className="h-8 text-xs italic" 
            value={alias} 
            onChange={e => setAlias(e.target.value)} 
            placeholder={lang === 'es' ? 'Ejem: El Negro, Pepito' : 'e.g. Buddy, Junior'}
          />
        </div>
      </div>

      <div className="flex gap-1.5 items-end pt-1 border-t">
        {/* Day Select */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold text-muted-foreground px-1">{lang === 'es' ? 'Día' : 'Day'}</label>
          <Select value={day} onValueChange={setDay}>
            <SelectTrigger className="h-8 w-14 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[250px] min-w-[3rem]">
              {DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Month Select */}
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-[10px] uppercase font-bold text-muted-foreground px-1">{lang === 'es' ? 'Mes' : 'Month'}</label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue>{MONTHS[Number(month)][lang === 'es' ? 'labelEs' : 'label']}</SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-[250px]">
              {MONTHS.map(m => (
                <SelectItem key={m.value} value={m.value}>
                  {m[lang === 'es' ? 'labelEs' : 'label']}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Year Input */}
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-[10px] uppercase font-bold text-muted-foreground px-1">{lang === 'es' ? 'Año' : 'Year'}</label>
          <Input 
            className="h-8 text-xs font-mono tracking-wider"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder={lang === 'es' ? 'Desconocido' : 'Unknown'}
            maxLength={4}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mt-1 border-t pt-2">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
          onClick={handleClear}
          disabled={loading}
          title={lang === 'es' ? 'Eliminar fecha' : 'Delete date'}
        >
          <Trash2 size={14} />
        </Button>
        <div className="flex gap-1.5">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-2 text-xs font-semibold" 
            onClick={() => setIsEditing(false)}
            disabled={loading}
          >
            {lang === 'es' ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            className="h-8 px-2 text-xs font-bold gap-1 shadow-sm" 
            onClick={handleSave}
            disabled={loading}
          >
            <Check size={14} strokeWidth={3} /> {lang === 'es' ? 'Guardar' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
