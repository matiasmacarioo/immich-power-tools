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
    strokeWidth: isHovered ? (style.strokeWidth || 3.5) : 1.5,
    strokeDasharray: (isDashed && !isHovered) ? '5,5' : undefined,
    opacity: style?.opacity !== undefined ? style.opacity : 1,
    transition: 'stroke 750ms cubic-bezier(0.4, 0, 0.2, 1), stroke-width 750ms cubic-bezier(0.4, 0, 0.2, 1), opacity 750ms cubic-bezier(0.4, 0, 0.2, 1)',
  };

  return (
    <>
      {/* Base/Background Path (Muted or Default) */}
      <BaseEdge 
        id={`${id}-base`} 
        path={edgePath} 
        style={{ 
          ...edgeStyle, 
          stroke: defaultColor, 
          opacity: isHovered ? 0.3 : (style?.opacity || 1), 
          strokeWidth: isHovered ? 2 : 1.5,
          strokeDasharray: isDashed ? '5,5' : undefined,
        }} 
        markerEnd={markerEnd} 
      />
      
      {/* Animated Foreground Path (Progressive Vibrant Color) */}
      <path
        id={id}
        style={{
          ...edgeStyle,
          stroke: relColor,
          fill: 'none',
          opacity: isHovered ? (style?.opacity || 1) : 0,
          pointerEvents: 'none',
        }}
        className={`react-flow__edge-path ${isHovered ? 'premium-draw keep-flowing' : ''}`}
        d={edgePath}
        markerEnd={markerEnd}
      />
    </>
  );
};

export default CustomEdge;
