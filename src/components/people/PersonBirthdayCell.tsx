import React, { useState, useEffect } from 'react';
import { IPerson } from '@/types/person';
import { updatePerson } from '@/handlers/api/people.handler';
import { useToast } from '../ui/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { CalendarIcon, Check, X, Trash2, HelpCircle, Heart, Skull, Baby, User, UserPlus, UserMinus } from 'lucide-react';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';

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

const GENDERS = [
  { value: 'male', label: 'Male', labelEs: 'Hombre', icon: '♂' },
  { value: 'female', label: 'Female', labelEs: 'Mujer', icon: '♀' },
  { value: 'other', label: 'Other', labelEs: 'Otro', icon: '?' },
];

const DAYS = Array.from({ length: 31 }, (_, i) => (i + 1).toString());

export default function PersonBirthdayCell({ person, onSaved, initialEditing = false }: IProps) {
  const { lang, formatDate, t } = useLanguage();
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
  const initialDeath = parseDateRobust(person.deathDate);
  const [day, setDay] = useState<string>(initial ? initial.day : '1');
  const [month, setMonth] = useState<string>(initial ? initial.month : '0');
  const [year, setYear] = useState<string>(initial ? (initial.year === '1604' ? '' : initial.year) : '');
  const [name, setName] = useState<string>(person.name);
  const [alias, setAlias] = useState<string>(person.alias || '');
  const [isDeceased, setIsDeceased] = useState<boolean>(person.isDeceased || false);
  const [gender, setGender] = useState<'male' | 'female' | 'other' | null>(person.gender || null);
  const [deathDay, setDeathDay] = useState<string>(initialDeath ? initialDeath.day : '1');
  const [deathMonth, setDeathMonth] = useState<string>(initialDeath ? initialDeath.month : '0');
  const [deathYear, setDeathYear] = useState<string>(initialDeath ? (initialDeath.year === '1604' ? '' : initialDeath.year) : '');

  useEffect(() => {
    if (!isEditing) {
      const d = parseDateRobust(person.birthDate);
      if (d) {
        setDay(d.day);
        setMonth(d.month);
        setYear(d.year === '1604' ? '' : d.year);
      }
      const dd = parseDateRobust(person.deathDate);
      if (dd) {
        setDeathDay(dd.day);
        setDeathMonth(dd.month);
        setDeathYear(dd.year === '1604' ? '' : dd.year);
      }
      setName(person.name);
      setAlias(person.alias || '');
      setIsDeceased(person.isDeceased || false);
      setGender(person.gender || null);
    }
  }, [person.birthDate, person.deathDate, person.name, person.alias, person.isDeceased, person.gender, isEditing]);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Validate year
      let yNum = parseInt(year);
      if (isNaN(yNum) || yNum < 1) yNum = 1604;
      
      const bday = `${yNum}-${(Number(month) + 1).toString().padStart(2, '0')}-${day.padStart(2, '0')}`;
      
      // If result is 1604-01-01 and person had no bday before, skip updating bday
      const skipBday = bday === '1604-01-01' && !person.birthDate;

      const dday = `${deathYear.padStart(4, '0')}-${(Number(deathMonth) + 1).toString().padStart(2, '0')}-${deathDay.padStart(2, '0')}`;

      await Promise.all([
        updatePerson(person.id, { 
          birthDate: skipBday ? undefined : bday,
          name: name,
        }),
        fetch(`/api/person-states/${person.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            alias: alias || null,
            isDeceased: isDeceased,
            deathDate: isDeceased ? dday : null,
            gender: gender
          })
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
        <span className="text-sm flex-1 truncate font-medium">
          {label}
          {person.birthDate && (
            <span className="ml-1 opacity-60 text-xs">
              {(() => {
                const birth = parseDateRobust(person.birthDate)!;
                const death = isDeceased ? parseDateRobust(person.deathDate) : null;
                const end = death ? new Date(Number(death.year), Number(death.month), Number(death.day)) : new Date();
                const start = new Date(Number(birth.year), Number(birth.month), Number(birth.day));
                
                if (birth.year === '1604') return '';
                
                let age = end.getFullYear() - start.getFullYear();
                const m = end.getMonth() - start.getMonth();
                if (m < 0 || (m === 0 && end.getDate() < start.getDate())) {
                  age--;
                }
                return `(${age} ${lang === 'es' ? 'años' : 'years old'})`;
              })()}
            </span>
          )}
        </span>
        {isDeceased && <Skull size={12} className="text-muted-foreground" />}
        {!isDeceased && person.gender && (
          <span className={`text-[10px] font-bold ${person.gender === 'male' ? 'text-blue-500' : person.gender === 'female' ? 'text-pink-500' : 'text-muted-foreground'}`}>
            {GENDERS.find(g => g.value === person.gender)?.icon}
          </span>
        )}
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
        
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold text-muted-foreground px-1">{t('Gender')}</label>
          <div className="flex gap-1">
            {GENDERS.map(g => (
              <Button
                key={g.value}
                variant={gender === g.value ? 'default' : 'outline'}
                size="sm"
                className={`flex-1 h-7 text-[10px] gap-1 ${gender === g.value ? 'font-bold' : 'font-normal opacity-70'}`}
                onClick={() => setGender(g.value as any)}
              >
                <span className="text-xs">{g.icon}</span>
                {lang === 'es' ? g.labelEs : g.label}
              </Button>
            ))}
            {gender && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0" 
                onClick={() => setGender(null)}
                title={lang === 'es' ? 'Limpiar' : 'Clear'}
                aria-label={lang === 'es' ? 'Limpiar' : 'Clear'}
              >
                <X size={12} />
              </Button>
            )}
          </div>
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

      <div className="flex flex-col gap-2 pt-1 border-t">
        <div className="flex items-center justify-between px-1">
          <Label htmlFor="deceased-switch" className="text-xs font-semibold">{t('Is Deceased')}</Label>
          <Switch 
            id="deceased-switch" 
            checked={isDeceased} 
            onCheckedChange={setIsDeceased} 
          />
        </div>

        {isDeceased && (
          <div className="flex gap-1.5 items-end animate-in fade-in slide-in-from-top-1 duration-200">
            {/* Death Day */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground px-1">{lang === 'es' ? 'Día' : 'Day'}</label>
              <Select value={deathDay} onValueChange={setDeathDay}>
                <SelectTrigger className="h-8 w-14 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[250px] min-w-[3rem]">
                  {DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Death Month */}
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground px-1">{lang === 'es' ? 'Mes' : 'Month'}</label>
              <Select value={deathMonth} onValueChange={setDeathMonth}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue>{MONTHS[Number(deathMonth)][lang === 'es' ? 'labelEs' : 'label']}</SelectValue>
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

            {/* Death Year */}
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground px-1">{lang === 'es' ? 'Año' : 'Year'}</label>
              <Input 
                className="h-8 text-xs font-mono tracking-wider"
                value={deathYear}
                onChange={(e) => setDeathYear(e.target.value)}
                placeholder={lang === 'es' ? 'Año' : 'Year'}
                maxLength={4}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 mt-1 border-t pt-2">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
          onClick={handleClear}
          disabled={loading}
          title={lang === 'es' ? 'Eliminar fecha' : 'Delete date'}
          aria-label={lang === 'es' ? 'Eliminar fecha' : 'Delete date'}
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
