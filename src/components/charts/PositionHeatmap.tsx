import React, { useMemo, useState } from 'react';

interface LapRow {
  lap: number;
  [code: string]: any;
}

interface Driver {
  code: string;
  name: string;
  team: string;
  status: string;
}

interface Props {
  matrix: LapRow[];
  drivers: Driver[];
  labelEvery?: number;
}

// ── Team colours ──────────────────────────────────────────────────────────────

const TEAM_COLORS: Record<string, string> = {
  'McLaren':         '#FF8000',
  'Ferrari':         '#E8002D',
  'Red Bull Racing': '#3671C6',
  'Red Bull':        '#3671C6',
  'Mercedes':        '#27F4D2',
  'Aston Martin':    '#358C75',
  'Alpine':          '#FF87BC',
  'Williams':        '#64C4FF',
  'Racing Bulls':    '#6692FF',
  'RB':              '#6692FF',
  'Haas F1 Team':    '#B6BABD',
  'Haas':            '#B6BABD',
  'Audi':            '#52E252',
  'Sauber':          '#52E252',
  'Cadillac':        '#C0A020',
};

function teamColor(team: string): string {
  for (const [key, color] of Object.entries(TEAM_COLORS)) {
    if (team.includes(key) || key.includes(team)) return color;
  }
  return '#7070a0';
}

// ── Position → cell colour (green P1 → yellow mid → red last) ─────────────────

function posColor(pos: number, total: number): string {
  const t = (pos - 1) / Math.max(total - 1, 1);
  if (t < 0.5) {
    const r = Math.round(57  + (230 - 57)  * (t * 2));
    const g = Math.round(211 - (211 - 190) * (t * 2));
    return `rgb(${r},${g},53)`;
  } else {
    const r = Math.round(230 + (225 - 230) * ((t - 0.5) * 2));
    const g = Math.round(190 * (1 - (t - 0.5) * 2));
    return `rgb(${r},${g},0)`;
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PositionHeatmap({ matrix, drivers, labelEvery = 5 }: Props) {
  const total = drivers.length;
  const laps  = matrix.map(r => r.lap);

  const [tooltip, setTooltip] = useState<{
    code: string; lap: number; pos: number | null; dnf: boolean;
    x: number; y: number;
  } | null>(null);

  // Build lookup: code → lap → {pos, dnf}
  const lookup = useMemo(() => {
    const m: Record<string, Record<number, { pos: number | null; dnf: boolean }>> = {};
    for (const driver of drivers) {
      m[driver.code] = {};
      for (const row of matrix) {
        const v = row[driver.code];
        m[driver.code][row.lap] = v ?? { pos: null, dnf: false };
      }
    }
    return m;
  }, [matrix, drivers]);

  const driverMap = useMemo(
    () => Object.fromEntries(drivers.map(d => [d.code, d])),
    [drivers]
  );

  // Column width — auto-fit to look clean at 320–1400px viewport
  // Fixed narrow cells; container is horizontally scrollable
  const CELL_W   = 13;   // px per lap column
  const CELL_H   = 26;   // px per driver row
  const LABEL_W  = 44;   // px for left driver-code column
  const HEAD_H   = 20;   // px for top lap-number row

  const totalW = LABEL_W + laps.length * CELL_W;

  return (
    <div>
      {/* Colour legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: '#7070a0' }}>Position:</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {Array.from({ length: 20 }, (_, i) => i + 1).map(p => (
            <div
              key={p}
              style={{
                width: 16, height: 14,
                background: posColor(p, total > 0 ? total : 20),
                opacity: 0.9,
              }}
            />
          ))}
        </div>
        <span style={{ fontSize: 10, color: '#505070' }}>P1 → P{total}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 12 }}>
          <div style={{ width: 16, height: 14, background: '#1a1a26', border: '1px solid #2a2a3f' }} />
          <span style={{ fontSize: 10, color: '#505070' }}>DNF / no data</span>
        </div>
      </div>

      {/* Scrollable grid */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ minWidth: totalW, position: 'relative' }}>

          {/* Top row: lap numbers */}
          <div style={{ display: 'flex', height: HEAD_H, paddingLeft: LABEL_W }}>
            {laps.map(lap => {
              const show = lap === 1 || lap % labelEvery === 0 || lap === laps[laps.length - 1];
              return (
                <div
                  key={lap}
                  style={{
                    width: CELL_W, flexShrink: 0,
                    fontSize: 9, fontFamily: 'monospace',
                    color: show ? '#7070a0' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    userSelect: 'none',
                  }}
                >
                  {lap}
                </div>
              );
            })}
          </div>

          {/* Driver rows */}
          {drivers.map((driver, dIdx) => {
            const color = teamColor(driver.team);
            return (
              <div
                key={driver.code}
                style={{
                  display: 'flex',
                  height: CELL_H,
                  marginBottom: dIdx < drivers.length - 1 ? 1 : 0,
                }}
              >
                {/* Driver code label */}
                <div style={{
                  width: LABEL_W, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  paddingRight: 8,
                  fontSize: 10, fontFamily: 'monospace', fontWeight: 700,
                  color,
                  letterSpacing: '0.03em',
                }}>
                  {driver.code}
                </div>

                {/* Lap cells */}
                {laps.map(lap => {
                  const cell = lookup[driver.code]?.[lap];
                  const pos  = cell?.pos ?? null;
                  const dnf  = cell?.dnf ?? false;
                  const bg   = dnf ? '#141420' : pos ? posColor(pos, total) : '#141420';

                  return (
                    <div
                      key={lap}
                      onMouseEnter={(e) => {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setTooltip({
                          code: driver.code, lap, pos, dnf,
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      style={{
                        width: CELL_W, flexShrink: 0,
                        height: '100%',
                        background: bg,
                        borderLeft: '1px solid #0a0a0f',
                        opacity: dnf ? 0.25 : 1,
                        cursor: 'default',
                      }}
                    />
                  );
                })}
              </div>
            );
          })}

          {/* Bottom lap axis tick line */}
          <div style={{ marginLeft: LABEL_W, borderTop: '1px solid #2a2a3f', marginTop: 4 }} />
          <div style={{
            textAlign: 'center', marginTop: 5, fontSize: 11, color: '#505070',
            marginLeft: LABEL_W,
          }}>
            Lap
          </div>
        </div>
      </div>

      {/* Tooltip — fixed so it escapes overflow:hidden */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x,
          top: tooltip.y,
          transform: 'translate(-50%, calc(-100% - 6px))',
          background: '#12121a',
          border: '1px solid #2a2a3f',
          borderRadius: 7,
          padding: '8px 12px',
          fontSize: 12,
          pointerEvents: 'none',
          zIndex: 9999,
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: teamColor(driverMap[tooltip.code]?.team ?? ''),
            }} />
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#e8e8f0' }}>
              {tooltip.code}
            </span>
            <span style={{ color: '#505070', fontSize: 10 }}>
              {driverMap[tooltip.code]?.name}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: '#505070', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Lap</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 600, color: '#e8e8f0' }}>{tooltip.lap}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#505070', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Position</div>
              <div style={{
                fontFamily: 'monospace', fontWeight: 700,
                color: tooltip.dnf ? '#505070'
                  : tooltip.pos === 1 ? '#ffd700'
                  : tooltip.pos && tooltip.pos <= 3 ? '#4caf50'
                  : '#e8e8f0',
              }}>
                {tooltip.dnf ? 'Retired' : tooltip.pos ? `P${tooltip.pos}` : '—'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
