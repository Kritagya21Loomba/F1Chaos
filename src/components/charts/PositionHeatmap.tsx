import React, { useMemo } from 'react';

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
  /** Only show every Nth lap label on x-axis */
  labelEvery?: number;
}

const TEAM_COLORS: Record<string, string> = {
  'McLaren':      '#ff8000',
  'Ferrari':      '#e8002d',
  'Red Bull':     '#3671c6',
  'Mercedes':     '#27f4d2',
  'Aston Martin': '#358c75',
  'Alpine':       '#ff87bc',
  'Williams':     '#64c4ff',
  'RB':           '#6692ff',
  'Haas':         '#b6babd',
  'Sauber':       '#52e252',
};

function posColor(pos: number, total: number): string {
  // Green (P1) -> Yellow (mid) -> Red (last)
  const t = (pos - 1) / (total - 1);
  if (t < 0.5) {
    const r = Math.round(57 + (230 - 57) * (t * 2));
    const g = Math.round(211 - (211 - 190) * (t * 2));
    // green→yellow
    return `rgb(${r},${g},53)`;
  } else {
    const r = Math.round(230 + (225 - 230) * ((t - 0.5) * 2));
    const g = Math.round(190 * (1 - (t - 0.5) * 2));
    return `rgb(${r},${g},0)`;
  }
}

export default function PositionHeatmap({ matrix, drivers, labelEvery = 5 }: Props) {
  const total = drivers.length;
  const codes = drivers.map(d => d.code);

  // Build lookup: lap → code → {pos, dnf}
  const lookup = useMemo(() => {
    const m: Record<number, Record<string, { pos: number; dnf: boolean }>> = {};
    for (const row of matrix) {
      m[row.lap] = {};
      for (const code of codes) {
        const v = row[code];
        m[row.lap][code] = v ?? { pos: null, dnf: false };
      }
    }
    return m;
  }, [matrix, codes]);

  const cellSize = 26;
  const headerCellW = 34;

  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <div style={{ minWidth: codes.length * cellSize + headerCellW + 4 }}>
        {/* column headers = driver codes */}
        <div style={{ display: 'flex', marginBottom: 2, paddingLeft: headerCellW }}>
          {codes.map(code => (
            <div
              key={code}
              title={drivers.find(d => d.code === code)?.name}
              style={{
                width: cellSize, flexShrink: 0,
                fontSize: 9, fontFamily: 'monospace', fontWeight: 600,
                color: '#7070a0', textAlign: 'center',
                borderLeft: '1px solid #1a1a26',
                overflow: 'hidden',
              }}
            >
              {code}
            </div>
          ))}
        </div>

        {/* rows = laps */}
        {matrix.map((row) => {
          const showLabel = row.lap === 1 || row.lap % labelEvery === 0 || row.lap === matrix.length;
          return (
            <div key={row.lap} style={{ display: 'flex', height: cellSize - 2, marginBottom: 1 }}>
              {/* lap label */}
              <div style={{
                width: headerCellW, flexShrink: 0,
                fontSize: 9, fontFamily: 'monospace', color: '#7070a0',
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6,
              }}>
                {showLabel ? row.lap : ''}
              </div>

              {/* cells */}
              {codes.map(code => {
                const cell = lookup[row.lap]?.[code];
                const pos = cell?.pos ?? null;
                const dnf = cell?.dnf ?? false;
                const bg = dnf ? '#1a1a26' : pos ? posColor(pos, total) : '#1a1a26';
                const textColor = dnf ? '#444460' : pos ? '#000' : '#444460';

                return (
                  <div
                    key={code}
                    title={`Lap ${row.lap} | ${code} | P${pos ?? '?'}${dnf ? ' (DNF)' : ''}`}
                    style={{
                      width: cellSize, flexShrink: 0,
                      background: bg,
                      borderLeft: '1px solid #0a0a0f',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontFamily: 'monospace', fontWeight: 600,
                      color: textColor,
                      opacity: dnf ? 0.35 : 1,
                    }}
                  >
                    {pos ?? (dnf ? 'R' : '')}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
