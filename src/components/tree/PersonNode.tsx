import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Skull } from 'lucide-react';
import { TypewriterText } from '@/components/shared/TypewriterText';

const formatDateText = (dateStr: string | Date | null, formatDate: (d: Date, f: string) => string, lang: string): string => {
  if (!dateStr) return '';
  
  let date: Date;
  
  if (dateStr instanceof Date) {
    date = new Date(dateStr.getUTCFullYear(), dateStr.getUTCMonth(), dateStr.getUTCDate());
  } else {
    const dateOnlyMatch = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      date = new Date(Number(year), Number(month) - 1, Number(day));
    } else {
      date = new Date(dateStr);
      if (!Number.isNaN(date.getTime())) {
        date = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
      }
    }
  }

  if (Number.isNaN(date.getTime())) return '';
  
  if (date.getFullYear() === 1604) {
    return lang === 'es' ? formatDate(date, "d 'de' MMMM") : formatDate(date, 'MMMM d'); // 18 de octubre vs October 18
  }
  return formatDate(date, 'PPP');
}

const calculateAge = (dateStr: string | Date | null, deathDateStr?: string | Date | null): number | null => {
  if (!dateStr) return null;
  let birthDate: Date;
  if (dateStr instanceof Date) {
    birthDate = dateStr;
  } else {
    const dateOnlyMatch = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      birthDate = new Date(Number(year), Number(month) - 1, Number(day));
    } else {
      birthDate = new Date(dateStr);
    }
  }

  if (Number.isNaN(birthDate.getTime()) || birthDate.getFullYear() === 1604) return null;
  
  let endDate = new Date();
  if (deathDateStr) {
    if (deathDateStr instanceof Date) {
      endDate = deathDateStr;
    } else {
      const dateOnlyMatch = String(deathDateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (dateOnlyMatch) {
        const [, year, month, day] = dateOnlyMatch;
        endDate = new Date(Number(year), Number(month) - 1, Number(day));
      } else {
        endDate = new Date(deathDateStr);
      }
    }
  }

  let age = endDate.getFullYear() - birthDate.getFullYear();
  const m = endDate.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && endDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

const PersonNode = ({ id, data }: any) => {
  const { t, formatDate, lang } = useLanguage();
  const [isHovered, setIsHovered] = React.useState(false);

  const handleClick = (e: React.MouseEvent, type: string, pos: string) => {
    e.stopPropagation();
    if (data.onAddRelationClick) {
      const effectiveType = (pos === 'Top' && !data.hasChildren) ? 'Child' : type;
      const effectivePos = (pos === 'Top' && !data.hasChildren) ? 'Bottom' : pos;
      data.onAddRelationClick({ personId: id, relType: effectiveType, category: effectivePos, personName: data.label });
    }
  };

  const { fusedRightType, fusedLeftType, hoverColor, isDeceased, isHighlighted } = data;
  const isFusedRight = !!fusedRightType;
  const isFusedLeft = !!fusedLeftType;

  // IMPORTANT: Apply grayscale and low opacity if the card is not part of the highlighted family filter
  const isFaded = isHighlighted === false;

  let computedRounded = data.roundedClass || 'rounded-xl';
  if (isFusedRight && isFusedLeft) computedRounded = 'rounded-none border-x-0';
  else if (isFusedRight) computedRounded = 'rounded-l-xl rounded-r-none border-r-0';
  else if (isFusedLeft) computedRounded = 'rounded-r-xl rounded-l-none border-l-0';

  const isEntering = !!hoverColor;
  const colorTrans = `border-color 200ms ease ${isEntering ? '250ms' : '0ms'}`;
  const radiusTrans = `border-radius 250ms ease`;
  const bgTrans = `background-color 200ms ease`;
  const filterTrans = `filter 400ms ease, opacity 400ms ease`;

  const mainStyle = {
    borderColor: hoverColor || 'var(--border)',
    zIndex: hoverColor ? 10 : 1,
    transition: `${colorTrans}, ${radiusTrans}, ${bgTrans}, ${filterTrans}`,
    filter: isFaded ? 'grayscale(1)' : undefined,
    opacity: isFaded ? 0.3 : 1,
    pointerEvents: isFaded ? 'none' : 'auto' as any,
  };

  const targetWidth = fusedRightType === 'Spouse' ? '22px' : '42px';

  const bridgeStyle = {
    left: 'calc(100% - 1px)',
    width: isFusedRight ? targetWidth : '0px',
    opacity: isFusedRight ? (isFaded ? 0.3 : 1) : 0,
    borderTopWidth: '1px',
    borderBottomWidth: '1px',
    borderColor: hoverColor || 'var(--border)',
    transition: `width 250ms ease, opacity 250ms ease, ${colorTrans}`,
  };

  const age = calculateAge(data.birthDate, data.deathDate);

  return (
    <div
      className={`flex items-center justify-center gap-3 h-[68px] bg-card border p-2 shadow-sm w-[260px] relative ${computedRounded} ${isDeceased ? 'border-dashed grayscale-[0.1]' : ''}`}
      style={mainStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="absolute top-[-1px] bottom-[-1px] bg-card -z-10" style={bridgeStyle} />

      <Handle type="target" position={Position.Top} id="t-top" className="w-3 h-3 bg-transparent border-transparent" />
      <Handle type="target" position={Position.Bottom} id="t-bottom" className="w-3 h-3 bg-transparent border-transparent" />
      <Handle type="target" position={Position.Left} id="t-left" className="w-3 h-3 bg-transparent border-transparent" />
      <Handle type="target" position={Position.Right} id="t-right" className="w-3 h-3 bg-transparent border-transparent" />

      <Handle type="source" position={Position.Top} id="s-top" className="w-3 h-3 bg-primary cursor-pointer hover:scale-150 transition-transform" onClick={(e) => handleClick(e, 'Parent', 'Top')} />
      <Handle type="source" position={Position.Bottom} id="s-bottom" className="w-3 h-3 bg-primary cursor-pointer hover:scale-150 transition-transform" onClick={(e) => handleClick(e, 'Child', 'Bottom')} />
      <Handle type="source" position={Position.Left} id="s-left" className="w-3 h-3 bg-primary cursor-pointer hover:scale-150 transition-transform" onClick={(e) => handleClick(e, 'Side', 'Side')} />
      <Handle type="source" position={Position.Right} id="s-right" className="w-3 h-3 bg-primary cursor-pointer hover:scale-150 transition-transform" onClick={(e) => handleClick(e, 'Side', 'Side')} />

      <div className="relative shrink-0">
        {data.imageUrl ? (
          <img src={data.imageUrl} alt={data.label} className={`w-10 h-10 rounded-full object-cover bg-muted border ${isDeceased ? '' : ''}`} />
        ) : (
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs border">?</div>
        )}
        {isDeceased && (
          <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 border shadow-sm">
            <Skull size={10} className="text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex flex-col overflow-hidden items-start -mt-0.5 max-w-[180px] justify-center h-full">
        <span className={`font-semibold text-sm truncate w-full text-left ${isDeceased ? 'text-muted-foreground italic' : ''}`}>
          <TypewriterText text={isHovered && data.alias ? data.alias : data.label} />
        </span>
        {data.birthDate && (
          <span className="text-[10px] text-muted-foreground/80 truncate w-full whitespace-nowrap -mt-0.5">
            <TypewriterText 
              text={isHovered && age !== null 
                ? (lang === 'es' ? `${age} años` : `${age} years old`) 
                : formatDateText(data.birthDate, formatDate, lang)} 
            />
          </span>
        )}
        
        {/* Animated Container for Status/Badges to prevent jumping */}
        <div className={`overflow-hidden transition-all duration-300 ease-in-out flex flex-col items-start ${isDeceased || data.hoverBadge ? 'max-h-8 opacity-100' : 'max-h-0 opacity-0'}`}>
          {isDeceased && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 leading-none">
              <TypewriterText text={data.deathDate ? `${t('Deceased')} (${formatDateText(data.deathDate, formatDate, lang)})` : t('Deceased')} />
            </span>
          )}
          {data.hoverBadge && (
            <span
              className="text-[10px] font-bold uppercase tracking-wide leading-none pt-0.5"
              style={{ color: data.hoverColor }}
            >
              <TypewriterText text={data.hoverBadge} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonNode;
