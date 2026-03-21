import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from '@xyflow/react';
import { getEdgeColor, isDashedEdge } from './edgeColors';
import { TypewriterText } from '../shared/TypewriterText';
import { useLanguage } from '@/contexts/LanguageContext';

const CustomEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, data }: any) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 16,
  });

  const isHovered = !!style?.stroke;
  const isDashed = isDashedEdge(data?.type);
  const color = getEdgeColor(data?.type);

  const edgeStyle = {
    ...style,
    stroke: isHovered ? style.stroke : color,
    strokeWidth: isHovered ? 3 : 2,
    strokeDasharray: isDashed ? '5,5' : undefined,
    transition: 'stroke 200ms ease, stroke-width 200ms ease',
  };

  const { formatDate, lang } = useLanguage();
  const marriageDateStr = data?.marriageDate;
  let formattedMarriageDate = '';
  if (marriageDateStr) {
    const match = String(marriageDateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      formattedMarriageDate = formatDate(d, 'PP');
    }
  }

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={edgeStyle} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'none',
          }}
          className={`flex flex-col items-center bg-background/90 backdrop-blur-md px-2 py-0.5 rounded-xl border shadow-sm text-[9px] font-medium z-10 transition-opacity duration-200 ${['Sibling', 'Step-Sibling', 'Half-Sibling', 'Cousin'].includes(data?.type) && !marriageDateStr ? 'hidden' : ''} ${isHovered ? 'shadow-lg border-primary/50' : 'opacity-100'}`}
        >
          <span className="text-muted-foreground"><TypewriterText text={data?.label} /></span>
          {marriageDateStr && (
            <span className="text-[8px] opacity-70 border-t mt-0.5 pt-0.5">
              <TypewriterText text={formattedMarriageDate} />
            </span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default CustomEdge;
