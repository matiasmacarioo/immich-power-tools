import React from 'react';
import { BaseEdge, getSmoothStepPath } from '@xyflow/react';
import { getEdgeColor, isDashedEdge } from './edgeColors';

const CustomEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, data }: any) => {
  const [edgePath] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 16,
  });

  const isHovered = !!data?.isHovered;
  const isDashed = isDashedEdge(data?.type);
  const relColor = getEdgeColor(data?.type);
  const isParentLine = data?.type === 'Parent' || data?.type === 'Step-Parent';
  const defaultColor = isParentLine ? '#555' : relColor;

  const edgeStyle = {
    ...style,
    stroke: isHovered ? (style.stroke || relColor) : defaultColor,
    strokeWidth: isHovered ? 3 : 1.5,
    strokeDasharray: isDashed ? '5,5' : undefined,
    opacity: style?.opacity || 1,
    transition: 'stroke 300ms ease, stroke-width 300ms ease, opacity 300ms ease',
  };

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={edgeStyle} markerEnd={markerEnd} />
    </>
  );
};

export default CustomEdge;
