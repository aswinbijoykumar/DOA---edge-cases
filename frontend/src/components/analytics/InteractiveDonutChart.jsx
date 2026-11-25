import React, { useState, useMemo } from 'react';

/**
 * InteractiveDonutChart
 * 
 * SVG-based donut chart featuring:
 * - Mathematical radial slice explode animation (12-14px outward along midpoint angle)
 * - Bi-directional synchronization with parent state
 * - Smooth cubic-bezier transitions
 * - Dynamic center metrics & hover tooltips
 * - Clean square aspect ratio
 */
export default function InteractiveDonutChart({
  title,
  subtitle,
  data = [], // [{ id, label, value, color }]
  activeId = null,
  onSelect = () => {},
  centerMetric,
  centerLabel,
  donutSize = 210,
  outerRadius = 78,
  innerRadius = 48,
  offsetDistance = 12,
  emptyMessage = "No data"
}) {
  const [hoveredId, setHoveredId] = useState(null);

  const total = useMemo(() => {
    return data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  }, [data]);

  // Compute angles for each slice
  const slices = useMemo(() => {
    if (total === 0) return [];

    let currentAngle = -Math.PI / 2; // Start from top (12 o'clock)
    
    return data.map((item) => {
      const val = Math.max(0, Number(item.value) || 0);
      const angleDelta = (val / total) * (2 * Math.PI);
      const startAngle = currentAngle;
      const endAngle = currentAngle + angleDelta;
      const midAngle = startAngle + angleDelta / 2;
      const percentage = total > 0 ? ((val / total) * 100).toFixed(1) : '0';

      currentAngle = endAngle;

      // Pop-out offset vector: (R_offset * cos(midAngle), R_offset * sin(midAngle))
      const dx = offsetDistance * Math.cos(midAngle);
      const dy = offsetDistance * Math.sin(midAngle);

      return {
        ...item,
        val,
        startAngle,
        endAngle,
        midAngle,
        percentage,
        dx,
        dy
      };
    });
  }, [data, total, offsetDistance]);

  const cx = donutSize / 2;
  const cy = donutSize / 2;

  // Helper to generate SVG arc path
  const generateArcPath = (startAngle, endAngle) => {
    const delta = endAngle - startAngle;
    const clampedEndAngle = delta >= 2 * Math.PI - 0.0001 ? startAngle + 2 * Math.PI - 0.0001 : endAngle;

    const x1_o = cx + outerRadius * Math.cos(startAngle);
    const y1_o = cy + outerRadius * Math.sin(startAngle);
    const x2_o = cx + outerRadius * Math.cos(clampedEndAngle);
    const y2_o = cy + outerRadius * Math.sin(clampedEndAngle);

    const x2_i = cx + innerRadius * Math.cos(clampedEndAngle);
    const y2_i = cy + innerRadius * Math.sin(clampedEndAngle);
    const x1_i = cx + innerRadius * Math.cos(startAngle);
    const y1_i = cy + innerRadius * Math.sin(startAngle);

    const largeArcFlag = clampedEndAngle - startAngle > Math.PI ? 1 : 0;

    return [
      `M ${x1_o} ${y1_o}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2_o} ${y2_o}`,
      `L ${x2_i} ${y2_i}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1_i} ${y1_i}`,
      'Z'
    ].join(' ');
  };

  // Active slice information
  const activeSlice = useMemo(() => {
    return slices.find(s => s.id === (hoveredId || activeId));
  }, [slices, hoveredId, activeId]);

  return (
    <div className="flex flex-col justify-between w-full aspect-square max-w-[340px] mx-auto bg-white/80 backdrop-blur-md border border-sky-100 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
      {/* Chart Header */}
      <div className="flex items-center justify-center w-full mb-1">
        <h4 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight text-center">
          {title}
        </h4>
      </div>

      {/* Donut SVG Canvas Container */}
      <div className="relative flex items-center justify-center my-auto w-full flex-1">
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-10 h-10 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center mb-1.5">
              <span className="text-xs font-bold">0</span>
            </div>
            <p className="text-xs font-semibold">{emptyMessage}</p>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${donutSize} ${donutSize}`}
            className="w-full max-w-[210px] h-auto overflow-visible"
          >
            <defs>
              {slices.map(slice => (
                <filter key={`glow-${slice.id}`} id={`glow-${slice.id}`} x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={slice.color} floodOpacity="0.45" />
                </filter>
              ))}
            </defs>

            {/* Slices Group */}
            <g>
              {slices.map((slice) => {
                const isSelected = activeId === slice.id;
                const isHovered = hoveredId === slice.id;
                const isPopped = isSelected || isHovered;
                const hasAnySelection = Boolean(activeId);
                const isDimmed = hasAnySelection && !isSelected;

                const transformStyle = isPopped
                  ? `translate(${slice.dx}px, ${slice.dy}px)`
                  : 'translate(0px, 0px)';

                return (
                  <path
                    key={slice.id}
                    d={generateArcPath(slice.startAngle, slice.endAngle)}
                    fill={slice.color}
                    stroke={isPopped ? '#ffffff' : '#f0f9ff'}
                    strokeWidth={isPopped ? '2.5' : '1.5'}
                    filter={isPopped ? `url(#glow-${slice.id})` : undefined}
                    opacity={isDimmed ? 0.45 : isPopped ? 1.0 : 0.92}
                    cursor="pointer"
                    style={{
                      transform: transformStyle,
                      transition: 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 320ms ease, filter 320ms ease'
                    }}
                    onClick={() => onSelect(slice.id)}
                    onMouseEnter={() => setHoveredId(slice.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  />
                );
              })}
            </g>

            {/* Center Hole Text Overlay */}
            <g className="pointer-events-none select-none">
              <text
                x={cx}
                y={cy - 2}
                textAnchor="middle"
                className="font-black text-2xl fill-slate-800 transition-all"
                style={{ fontSize: '24px', fontWeight: 800 }}
              >
                {activeSlice ? activeSlice.val : (centerMetric !== undefined ? centerMetric : total)}
              </text>
              <text
                x={cx}
                y={cy + 16}
                textAnchor="middle"
                className="text-[10px] font-bold uppercase tracking-wider fill-slate-500"
                style={{ fontSize: '10px', fontWeight: 700 }}
              >
                {activeSlice ? `${activeSlice.percentage}%` : (centerLabel || 'Total')}
              </text>
            </g>
          </svg>
        )}

        {/* Hover / Active Floating Tooltip */}
        {activeSlice && (
          <div className="absolute top-1 left-1/2 -translate-x-1/2 pointer-events-none z-10 bg-slate-900/90 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-lg border border-slate-700/80 backdrop-blur-md flex items-center gap-1.5 whitespace-nowrap animate-fade-in">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeSlice.color }} />
            <span>{activeSlice.label}:</span>
            <span className="font-bold text-teal-300">{activeSlice.val}</span>
            <span className="text-slate-400">({activeSlice.percentage}%)</span>
          </div>
        )}
      </div>
    </div>
  );
}
