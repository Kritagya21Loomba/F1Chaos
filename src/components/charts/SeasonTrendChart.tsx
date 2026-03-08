import { useState, useRef, useEffect } from 'react';

interface SeasonPoint {
  year: number;
  color: string;
  avgVol: number;
  raceCount: number;
  totalInv: number;
}

interface Props {
  seasons: SeasonPoint[];
}

export default function SeasonTrendChart({ seasons }: Props) {
  if (!seasons.length) return null;
  const sorted = [...seasons].sort((a, b) => a.year - b.year);

  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Trigger entry animation on next tick
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // SVG viewport
  const W = 600;
  const H = 260;
  const padL = 64;
  const padR = 48;
  const padT = 48;
  const padB = 56;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  // Y axis: give meaningful headroom both above and below the data so the
  // chart clearly does NOT imply a ceiling.
  const vals = sorted.map(s => s.avgVol);
  const dataMin = Math.min(...vals);
  const dataMax = Math.max(...vals);
  const spread  = dataMax - dataMin || 0.5;
  const yMin    = Math.max(0, dataMin - spread * 0.8);
  const yMax    = dataMax + spread * 1.8;

  const toY = (v: number) =>
    padT + plotH * (1 - (v - yMin) / (yMax - yMin));
  const toX = (i: number) =>
    padL + (sorted.length > 1 ? (i / (sorted.length - 1)) * plotW : plotW / 2);

  // Y axis gridlines & ticks
  const numTicks = 5;
  const tickStep = (yMax - yMin) / numTicks;
  const ticks = Array.from({ length: numTicks + 1 }, (_, i) =>
    +(yMin + i * tickStep).toFixed(3)
  );

  // Line path between dots
  const linePath = sorted
    .map((s, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(s.avgVol)}`)
    .join(' ');

  // Approximate total path length for dash animation
  let pathLen = 0;
  for (let i = 1; i < sorted.length; i++) {
    const dx = toX(i) - toX(i - 1);
    const dy = toY(sorted[i].avgVol) - toY(sorted[i - 1].avgVol);
    pathLen += Math.sqrt(dx * dx + dy * dy);
  }
  const dashLen = Math.ceil(pathLen) + 10;

  // Deltas between consecutive seasons
  const deltas = sorted.slice(1).map((s, i) => {
    const prev  = sorted[i];
    const diff  = +(s.avgVol - prev.avgVol).toFixed(4);
    const pct   = Math.round(((s.avgVol / prev.avgVol) - 1) * 100);
    const mid_x = (toX(i) + toX(i + 1)) / 2;
    const mid_y = (toY(prev.avgVol) + toY(s.avgVol)) / 2 + 14;
    return { diff, pct, mid_x, mid_y, isPos: diff >= 0 };
  });

  const lastIdx = sorted.length - 1;

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        aria-label="Average volatility trend across seasons"
      >
        {/* Y-axis gridlines */}
        {ticks.map(t => (
          <g key={t}>
            <line
              x1={padL} y1={toY(t)} x2={padL + plotW} y2={toY(t)}
              stroke="#1e1e2e" strokeWidth={1}
            />
            <text
              x={padL - 8} y={toY(t) + 4}
              textAnchor="end"
              fontSize={10}
              fill="#4a4a6a"
              fontFamily="monospace"
            >
              {t.toFixed(2)}
            </text>
          </g>
        ))}

        {/* Y-axis label */}
        <text
          x={14}
          y={padT + plotH / 2}
          textAnchor="middle"
          fontSize={10}
          fill="#4a4a6a"
          transform={`rotate(-90, 14, ${padT + plotH / 2})`}
          letterSpacing="0.08em"
        >
          AVG VOLATILITY
        </text>

        {/* Y-axis line + upward arrow */}
        <line
          x1={padL} y1={padT} x2={padL} y2={padT + plotH}
          stroke="#2a2a3f" strokeWidth={1}
        />
        <polygon
          points={`${padL - 4},${padT + 4} ${padL + 4},${padT + 4} ${padL},${padT - 6}`}
          fill="#2a2a3f"
        />

        {/* Background trend line (dark) */}
        <path
          d={linePath}
          fill="none"
          stroke="#2a2a3f"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Animated gradient line on top */}
        {sorted.slice(1).map((s, i) => {
          const x1 = toX(i);   const y1 = toY(sorted[i].avgVol);
          const x2 = toX(i + 1); const y2 = toY(s.avgVol);
          const gradId = `grad-${i}`;
          const segLen = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
          const isHovered   = hoveredYear === sorted[i].year || hoveredYear === s.year;
          const isDeemph    = hoveredYear !== null && !isHovered;
          return (
            <g key={i}>
              <defs>
                <linearGradient id={gradId} x1={x1} y1={y1} x2={x2} y2={y2} gradientUnits="userSpaceOnUse">
                  <stop offset="0%"   stopColor={sorted[i].color} stopOpacity={0.85} />
                  <stop offset="100%" stopColor={s.color}          stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={`url(#${gradId})`}
                strokeWidth={isHovered ? 4 : 3}
                strokeLinecap="round"
                opacity={isDeemph ? 0.2 : 1}
                style={{ transition: 'opacity 0.25s, stroke-width 0.2s' }}
                strokeDasharray={`${segLen} ${segLen}`}
                strokeDashoffset={mounted ? 0 : segLen}
              />
            </g>
          );
        })}

        {/* Delta labels mid-segment */}
        {deltas.map((d, i) => {
          const isActive = hoveredYear === sorted[i].year || hoveredYear === sorted[i + 1].year;
          const isDeemph = hoveredYear !== null && !isActive;
          return (
            <g
              key={i}
              opacity={isDeemph ? 0.15 : 1}
              style={{ transition: 'opacity 0.25s' }}
            >
              <rect
                x={d.mid_x - 26} y={d.mid_y - 11}
                width={52} height={18}
                rx={4}
                fill="#12121a"
                stroke={d.isPos ? '#39d35344' : '#e1060044'}
              />
              <text
                x={d.mid_x} y={d.mid_y + 1}
                textAnchor="middle"
                fontSize={10}
                fontFamily="monospace"
                fontWeight={600}
                fill={d.isPos ? '#39d353' : '#e10600'}
              >
                {d.isPos ? '+' : ''}{d.pct}%
              </text>
            </g>
          );
        })}

        {/* Season dots + labels */}
        {sorted.map((s, i) => {
          const cx       = toX(i);
          const cy       = toY(s.avgVol);
          const isHover  = hoveredYear === s.year;
          const isDeemph = hoveredYear !== null && !isHover;

          // Fix: prevent first label from overlapping Y-axis, last from being clipped
          const anchor = i === 0 ? 'start' : i === lastIdx ? 'end' : 'middle';
          const labelX = i === 0 ? cx + 10 : i === lastIdx ? cx - 10 : cx;

          // Animated dot timing
          const delay = `${0.3 + i * 0.2}s`;

          return (
            <g
              key={s.year}
              style={{
                cursor: 'pointer',
                opacity: isDeemph ? 0.3 : 1,
                transition: 'opacity 0.25s',
              }}
              onMouseEnter={() => setHoveredYear(s.year)}
              onMouseLeave={() => setHoveredYear(null)}
            >
              {/* Extended hit area */}
              <circle cx={cx} cy={cy} r={24} fill="transparent" />

              {/* Outer glow — expands on hover */}
              <circle
                cx={cx} cy={cy}
                r={isHover ? 20 : 14}
                fill={s.color}
                fillOpacity={isHover ? 0.18 : 0.1}
                style={{
                  transition: 'r 0.2s, fill-opacity 0.2s',
                  opacity: mounted ? 1 : 0,
                }}
              />

              {/* Outer ring */}
              <circle
                cx={cx} cy={cy}
                r={isHover ? 10 : 8}
                fill="#12121a"
                stroke={s.color}
                strokeWidth={isHover ? 3 : 2.5}
                style={{
                  transition: 'r 0.2s, stroke-width 0.2s',
                  opacity: mounted ? 1 : 0,
                }}
              />

              {/* Inner dot */}
              <circle
                cx={cx} cy={cy}
                r={isHover ? 4.5 : 3.5}
                fill={s.color}
                style={{
                  transition: 'r 0.2s',
                  opacity: mounted ? 1 : 0,
                }}
              />

              {/* Value label above dot — textAnchor adjusted for edge dots */}
              <text
                x={labelX}
                y={cy - 22}
                textAnchor={anchor}
                fontSize={isHover ? 16 : 15}
                fontFamily="monospace"
                fontWeight={700}
                fill={s.color}
                style={{
                  transition: 'font-size 0.2s',
                  opacity: mounted ? 1 : 0,
                }}
              >
                {s.avgVol}
              </text>

              {/* Year label below X axis */}
              <text
                x={cx} y={H - padB + 22}
                textAnchor="middle"
                fontSize={12}
                fontWeight={700}
                fill={s.color}
                letterSpacing="0.06em"
                style={{ opacity: mounted ? 1 : 0 }}
              >
                {s.year}
              </text>

              {/* Race count sub-label */}
              <text
                x={cx} y={H - padB + 37}
                textAnchor="middle"
                fontSize={9}
                fill="#4a4a6a"
                letterSpacing="0.08em"
                style={{ opacity: mounted ? 1 : 0 }}
              >
                {s.raceCount} RACES
              </text>
            </g>
          );
        })}

        {/* "higher = more chaos" annotation */}
        <text
          x={padL + plotW + 6}
          y={padT - 2}
          fontSize={9}
          fill="#4a4a6a"
          letterSpacing="0.06em"
        >
          more chaos
        </text>
      </svg>

      {/* Hover tooltip card */}
      {hoveredYear !== null && (() => {
        const s = sorted.find(x => x.year === hoveredYear)!;
        const idx = sorted.indexOf(s);
        const cx = toX(idx);
        // Estimate tooltip x in % of SVG width
        const svgPct  = cx / W;
        return (
          <div
            style={{
              position: 'absolute',
              // anchor below dot: approximate using SVG coordinate ratio
              left: `calc(${svgPct * 100}% + ${idx === lastIdx ? '-130px' : idx === 0 ? '12px' : '-65px'})`,
              top: '4px',
              background: '#12121a',
              border: `1px solid ${s.color}44`,
              borderRadius: 10,
              padding: '12px 16px',
              minWidth: 160,
              pointerEvents: 'none',
              zIndex: 200,
              boxShadow: `0 4px 24px ${s.color}22`,
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: 'monospace', marginBottom: 8 }}>
              {s.year}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                <span style={{ fontSize: 11, color: '#7070a0', letterSpacing: '0.06em' }}>AVG VOL</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#e8e8f0', fontFamily: 'monospace' }}>{s.avgVol}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                <span style={{ fontSize: 11, color: '#7070a0', letterSpacing: '0.06em' }}>RACES</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#e8e8f0', fontFamily: 'monospace' }}>{s.raceCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                <span style={{ fontSize: 11, color: '#7070a0', letterSpacing: '0.06em' }}>TOTAL INV</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#e8e8f0', fontFamily: 'monospace' }}>{s.totalInv.toLocaleString()}</span>
              </div>
            </div>
            <a
              href={`/${s.year}`}
              style={{ display: 'block', marginTop: 10, fontSize: 11, color: s.color, textDecoration: 'none', letterSpacing: '0.04em' }}
            >
              Explore {s.year} season →
            </a>
          </div>
        );
      })()}

      <style>{`
        @keyframes dash-in {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
