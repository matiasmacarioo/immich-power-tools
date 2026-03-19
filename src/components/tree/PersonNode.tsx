import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { useLanguage } from '@/contexts/LanguageContext';

const PersonNode = ({ id, data }: any) => {
  const { t } = useLanguage();

  const handleClick = (e: React.MouseEvent, type: string, pos: string) => {
    e.stopPropagation();
    if (data.onAddRelationClick) {
      // If this person has no children they're likely a leaf node — clicking the top handle
      // should offer "son/daughter" options (adding their parent) rather than "parent" options.
      const effectiveType = (pos === 'Top' && !data.hasChildren) ? 'Child' : type;
      const effectivePos  = (pos === 'Top' && !data.hasChildren) ? 'Bottom' : pos;
      data.onAddRelationClick({ personId: id, relType: effectiveType, category: effectivePos, personName: data.label });
    }
  };

  const { fusedRightType, fusedLeftType, hoverColor } = data;
  const isFusedRight = !!fusedRightType;
  const isFusedLeft = !!fusedLeftType;

  let computedRounded = data.roundedClass || 'rounded-xl';
  if (isFusedRight && isFusedLeft) computedRounded = 'rounded-none border-x-0';
  else if (isFusedRight) computedRounded = 'rounded-l-xl rounded-r-none border-r-0';
  else if (isFusedLeft) computedRounded = 'rounded-r-xl rounded-l-none border-l-0';

  const isEntering = !!hoverColor;
  const colorTrans = `border-color 200ms ease ${isEntering ? '250ms' : '0ms'}`;
  const radiusTrans = `border-radius 250ms ease`;
  const bgTrans = `background-color 200ms ease`;

  const mainStyle = {
    borderColor: hoverColor || 'var(--border)',
    zIndex: hoverColor ? 10 : 1,
    transition: `${colorTrans}, ${radiusTrans}, ${bgTrans}`,
  };

  const targetWidth = fusedRightType === 'Spouse' ? '22px' : '42px';

  const bridgeStyle = {
    left: 'calc(100% - 1px)',
    width: isFusedRight ? targetWidth : '0px',
    opacity: isFusedRight ? 1 : 0,
    borderTopWidth: '1px',
    borderBottomWidth: '1px',
    borderColor: hoverColor || 'var(--border)',
    transition: `width 250ms ease, opacity 250ms ease, ${colorTrans}`,
  };

  return (
    <div
      className={`flex items-center justify-center gap-3 bg-card border p-2 shadow-sm w-[220px] relative ${computedRounded}`}
      style={mainStyle}
    >
      <div className="absolute top-[-1px] bottom-[-1px] bg-card -z-10" style={bridgeStyle} />

      {/* Target handles */}
      <Handle type="target" position={Position.Top} id="t-top" className="w-3 h-3 bg-transparent border-transparent" />
      <Handle type="target" position={Position.Bottom} id="t-bottom" className="w-3 h-3 bg-transparent border-transparent" />
      <Handle type="target" position={Position.Left} id="t-left" className="w-3 h-3 bg-transparent border-transparent" />
      <Handle type="target" position={Position.Right} id="t-right" className="w-3 h-3 bg-transparent border-transparent" />

      {/* Source handles */}
      <Handle type="source" position={Position.Top} id="s-top" className="w-3 h-3 bg-primary cursor-pointer hover:scale-150 transition-transform" onClick={(e) => handleClick(e, 'Parent', 'Top')} />
      <Handle type="source" position={Position.Bottom} id="s-bottom" className="w-3 h-3 bg-primary cursor-pointer hover:scale-150 transition-transform" onClick={(e) => handleClick(e, 'Child', 'Bottom')} />
      <Handle type="source" position={Position.Left} id="s-left" className="w-3 h-3 bg-primary cursor-pointer hover:scale-150 transition-transform" onClick={(e) => handleClick(e, 'Side', 'Side')} />
      <Handle type="source" position={Position.Right} id="s-right" className="w-3 h-3 bg-primary cursor-pointer hover:scale-150 transition-transform" onClick={(e) => handleClick(e, 'Side', 'Side')} />

      {data.imageUrl ? (
        <img src={data.imageUrl} alt={data.label} className="w-10 h-10 rounded-full object-cover bg-muted flex-shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-muted flex flex-shrink-0 items-center justify-center text-xs">?</div>
      )}
      <div className="flex flex-col overflow-hidden items-start">
        <span className="font-semibold text-sm truncate max-w-[140px] text-left">{data.label}</span>
        {data.hoverBadge && (
          <span
            className="text-[10px] font-bold uppercase -mt-0.5 tracking-wide animate-in fade-in zoom-in duration-200"
            style={{ color: data.hoverColor }}
          >
            {data.hoverBadge}
          </span>
        )}
      </div>
    </div>
  );
};

export default PersonNode;
