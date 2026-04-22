import React, { useState } from 'react';

interface Metric {
  key: string;
  label: string;
  max: number;
}

interface Session {
  id: string;
  latest_metrics?: {
    [key: string]: number;
  };
}

interface RadarChartProps {
  sessions: Session[];
  metrics: Metric[];
}

const COLORS = [
  '#22c55e',  // Green
  '#3b82f6',  // Blue
  '#f97316',  // Orange
  '#a855f7'   // Purple
];

const RadarChart: React.FC<RadarChartProps> = ({ sessions, metrics }) => {
  const [hiddenModels, setHiddenModels] = useState<Set<number>>(new Set());
  const [hoveredPoint, setHoveredPoint] = useState<{
    sessionIndex: number;
    metricIndex: number;
    value: number;
    x: number;
    y: number;
  } | null>(null);

  const size = 400;
  const center = size / 2;
  const radius = 140;
  const angleStep = (2 * Math.PI) / metrics.length;

  // Calculate normalized values (0-1)
  const getNormalizedValue = (session: Session, metric: Metric) => {
    const value = session.latest_metrics?.[metric.key];
    if (value === undefined || value === null) return 0;
    return Math.min(Math.max(value / metric.max, 0), 1);
  };

  // Get point coordinates for a metric at a normalized distance
  const getPoint = (metricIndex: number, normalizedValue: number) => {
    const angle = metricIndex * angleStep - Math.PI / 2;
    const r = normalizedValue * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle)
    };
  };

  // Generate polygon path for a session
  const getPolygonPath = (session: Session) => {
    const points = metrics.map((metric, i) => {
      const value = getNormalizedValue(session, metric);
      return getPoint(i, value);
    });
    
    return points.reduce((path, point, i) => {
      if (i === 0) return `M ${point.x} ${point.y}`;
      return `${path} L ${point.x} ${point.y}`;
    }, '') + ' Z';
  };

  // Toggle model visibility
  const toggleModel = (index: number) => {
    setHiddenModels(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // Get all metrics for the hovered session
  const getHoveredSessionMetrics = () => {
    if (!hoveredPoint) return null;
    const session = sessions[hoveredPoint.sessionIndex];
    return session?.latest_metrics;
  };

  const handlePointEnter = (sessionIndex: number, metricIndex: number, x: number, y: number) => {
    const session = sessions[sessionIndex];
    const metric = metrics[metricIndex];
    const value = session?.latest_metrics?.[metric.key] || 0;
    
    setHoveredPoint({
      sessionIndex,
      metricIndex,
      value,
      x,
      y
    });
  };

  const handlePointLeave = () => {
    setHoveredPoint(null);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Legend - only show when multiple sessions exist */}
      {sessions.length > 1 && (
        <div className="flex items-center gap-4 flex-wrap justify-center">
          {sessions.map((session, index) => {
            const isHidden = hiddenModels.has(index);
            const color = COLORS[index % COLORS.length];
            
            return (
              <button
                key={session.id}
                onClick={() => toggleModel(index)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
                style={{
                  background: isHidden ? '#292524' : '#1c1917',
                  border: isHidden ? '1px solid #44403c' : `2px solid ${color}`,
                  opacity: isHidden ? 0.5 : 1
                }}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: color }}
                />
                <span className="text-sm font-medium" style={{ color: isHidden ? '#78716c' : '#e7e5e4' }}>
                  Run {session.id}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Radar Chart */}
      <div className="relative">
        <svg
          width={size}
          height={size}
          className="cursor-crosshair"
          onMouseLeave={handlePointLeave}
        >
          {/* Grid circles */}
          {[0.25, 0.5, 0.75, 1].map(level => (
            <g key={level}>
              <circle
                cx={center}
                cy={center}
                r={radius * level}
                fill="none"
                stroke="#44403c"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                opacity={0.8}
              />
              <text
                x={center + 3}
                y={center - radius * level}
                fontSize={9}
                fill="#a8a29e"
                fontWeight={500}
                textAnchor="start"
              >
                {Math.round(level * 100)}%
              </text>
            </g>
          ))}

          {/* Axis lines and labels */}
          {metrics.map((metric, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const endX = center + radius * Math.cos(angle);
            const endY = center + radius * Math.sin(angle);
            const labelX = center + (radius + 28) * Math.cos(angle);
            const labelY = center + (radius + 28) * Math.sin(angle);
            
            return (
              <g key={metric.key}>
                <line
                  x1={center}
                  y1={center}
                  x2={endX}
                  y2={endY}
                  stroke="#57534e"
                  strokeWidth={1.5}
                  opacity={0.6}
                />
                <text
                  x={labelX}
                  y={labelY}
                  fontSize={11}
                  fontWeight={600}
                  fill="#e7e5e4"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                >
                  {metric.label}
                </text>
              </g>
            );
          })}

          {/* Center point */}
          <circle
            cx={center}
            cy={center}
            r={4}
            fill="#a8a29e"
          />

          {/* Model polygons */}
          {sessions.map((session, index) => {
            if (hiddenModels.has(index)) return null;
            
            const color = COLORS[index % COLORS.length];
            const path = getPolygonPath(session);
            
            return (
              <g key={session.id}>
                {/* Fill */}
                <path
                  d={path}
                  fill={color}
                  fillOpacity={0.35}
                  stroke="none"
                />
                {/* Border */}
                <path
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth={3}
                  strokeLinejoin="round"
                />
                {/* Visible data points only (no hit areas here) */}
                {metrics.map((metric, i) => {
                  const value = getNormalizedValue(session, metric);
                  const point = getPoint(i, value);
                  const isHovered = hoveredPoint?.sessionIndex === index && hoveredPoint?.metricIndex === i;
                  
                  return (
                    <circle
                      key={`${session.id}-${i}`}
                      cx={point.x}
                      cy={point.y}
                      r={isHovered ? 10 : 7}
                      fill={color}
                      stroke="#0c0a09"
                      strokeWidth={2}
                      opacity={isHovered ? 1 : 0.9}
                      style={{ transition: 'all 0.2s ease' }}
                    />
                  );
                })}
              </g>
            );
          })}

          {/* Separate hit areas layer - all on top so none are blocked */}
          {sessions.map((session, sessionIndex) => {
            if (hiddenModels.has(sessionIndex)) return null;
            
            return (
              <g key={`hit-${session.id}`}>
                {metrics.map((metric, metricIndex) => {
                  const value = getNormalizedValue(session, metric);
                  const point = getPoint(metricIndex, value);
                  
                  return (
                    <circle
                      key={`hit-${session.id}-${metric.key}`}
                      cx={point.x}
                      cy={point.y}
                      r={12}
                      fill="transparent"
                      onMouseEnter={() => handlePointEnter(sessionIndex, metricIndex, point.x, point.y)}
                      onMouseLeave={handlePointLeave}
                      style={{ cursor: 'pointer' }}
                    />
                  );
                })}
              </g>
            );
          })}

          {/* Hover tooltip - Show all metrics */}
          {hoveredPoint && (() => {
            const sessionMetrics = getHoveredSessionMetrics();
            const metricLines = [
              { key: 'f1', label: 'F1' },
              { key: 'precision', label: 'Precision' },
              { key: 'recall', label: 'Recall' },
              { key: 'mAP50', label: 'mAP50' },
              { key: 'mAP50_95', label: 'mAP50-95' }
            ].filter(m => sessionMetrics && sessionMetrics[m.key] !== undefined);
            
            const tooltipWidth = 140;
            const lineHeight = 16;
            const headerHeight = sessions.length > 1 ? 18 : 0;
            const tooltipHeight = 12 + headerHeight + (metricLines.length * lineHeight);
            
            return (
              <g>
                <rect
                  x={hoveredPoint.x + 10}
                  y={hoveredPoint.y - tooltipHeight}
                  width={tooltipWidth}
                  height={tooltipHeight}
                  rx={4}
                  fill="#1c1917"
                  stroke="#44403c"
                  strokeWidth={1}
                />
                {sessions.length > 1 && (
                  <text
                    x={hoveredPoint.x + 80}
                    y={hoveredPoint.y - tooltipHeight + 14}
                    fontSize={10}
                    fontWeight={600}
                    fill="#fafaf9"
                    textAnchor="middle"
                  >
                    Run {sessions[hoveredPoint.sessionIndex].id}
                  </text>
                )}
                {metricLines.map((m, i) => {
                  const value = sessionMetrics?.[m.key] || 0;
                  const isHovered = metrics[hoveredPoint.metricIndex].key === m.key;
                  return (
                    <g key={m.key}>
                      <text
                        x={hoveredPoint.x + 18}
                        y={hoveredPoint.y - tooltipHeight + 14 + headerHeight + (i * lineHeight)}
                        fontSize={9}
                        fontWeight={isHovered ? 600 : 400}
                        fill={isHovered ? "#fafaf9" : "#a8a29e"}
                        textAnchor="start"
                      >
                        {m.label}:
                      </text>
                      <text
                        x={hoveredPoint.x + tooltipWidth - 10}
                        y={hoveredPoint.y - tooltipHeight + 14 + headerHeight + (i * lineHeight)}
                        fontSize={9}
                        fontWeight={isHovered ? 600 : 400}
                        fill={isHovered ? "#4ade80" : "#a8a29e"}
                        textAnchor="end"
                      >
                        {(value * 100).toFixed(1)}%
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })()}
        </svg>
      </div>
    </div>
  );
};

export default RadarChart;