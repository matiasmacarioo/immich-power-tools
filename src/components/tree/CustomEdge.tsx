import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from '@xyflow/react';
import { getEdgeColor, isDashedEdge } from './edgeColors';
import { TypewriterText } from '../shared/TypewriterText';

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
          className={`flex items-center bg-background/90 backdrop-blur-md px-2 py-0.5 rounded-full border shadow-sm text-[10px] font-medium z-10 transition-opacity duration-200 ${['Sibling', 'Spouse', 'Step-Sibling', 'Half-Sibling', 'Cousin'].includes(data?.type) ? 'hidden' : ''} ${isHovered ? 'opacity-0' : 'opacity-100'}`}
        >
          <span className="text-muted-foreground"><TypewriterText text={data?.label} /></span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default CustomEdge;
