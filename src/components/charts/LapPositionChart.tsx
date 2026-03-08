import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PositionCell {
  pos: number | null;
  dnf: boolean;
}

interface LapRow {
  lap: number;
  [code: string]: PositionCell | number;
}

interface Driver {
  code: string;
  name: string;
  team: string;
  status: string;
}

interface Props {
  positionMatrix: LapRow[];
  drivers: Driver[];
  totalDrivers?: number;
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

// ── Custom tooltip ────────────────────────────────────────────────────────────
// No scrollbar: uses 2-column layout for 9+ drivers, 3-column for 17+.
// The tooltip never overflows — it grows wider, not taller.

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  const positions: Array<{ code: string; pos: number; color: string }> = [];
  for (const entry of payload) {
    if (entry.value != null) {
      positions.push({ code: entry.dataKey, pos: entry.value, color: entry.color });
    }
  }
  positions.sort((a, b) => a.pos - b.pos);

  const count   = positions.length;
  const numCols = count >= 17 ? 3 : count >= 9 ? 2 : 1;
  const compact = count >= 9;

  return (
    <div style={{
      background: '#12121a',
      border: '1px solid #2a2a3f',
      borderRadius: 8,
      padding: compact ? '8px 10px' : '10px 14px',
      fontSize: compact ? 11 : 12,
      pointerEvents: 'none',
    }}>
      <div style={{
        fontWeight: 700,
        marginBottom: compact ? 5 : 8,
        color: '#7070a0',
        fontSize: 11,
        letterSpacing: '0.08em',
      }}>
        LAP {label}
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${numCols}, minmax(90px, 1fr))`,
        gap: compact ? '1px 14px' : '2px 0',
      }}>
        {positions.map(({ code, pos, color }) => (
          <div key={code} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '1px 0' }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: color, flexShrink: 0,
            }} />
            <span style={{
              fontFamily: 'monospace', fontWeight: 600,
              color: '#e8e8f0', width: 28,
            }}>
              {code}
            </span>
            <span style={{ color: '#7070a0', fontFamily: 'monospace', fontSize: 10 }}>
              P{pos}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Driver filter pill ────────────────────────────────────────────────────────

const DriverPill = ({
  driver, selected, onToggle,
}: {
  driver: Driver;
  selected: boolean;
  onToggle: (code: string) => void;
}) => {
  const color = teamColor(driver.team);
  const isDnf = driver.status === 'DNF';

  return (
    <button
      onClick={() => onToggle(driver.code)}
      title={`${driver.name} (${driver.team})${isDnf ? ' — DNF' : ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '4px 10px',
        borderRadius: 20,
        border: `1.5px solid ${selected ? color : '#2a2a3f'}`,
        background: selected ? `${color}22` : 'transparent',
        color: selected ? color : '#505070',
        fontFamily: 'monospace',
        fontWeight: 600,
        fontSize: 11,
        cursor: 'pointer',
        transition: 'all 0.15s',
        opacity: isDnf && !selected ? 0.5 : 1,
        letterSpacing: '0.03em',
      }}
    >
      {selected && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: color, flexShrink: 0,
        }} />
      )}
      {driver.code}
      {isDnf && <span style={{ fontSize: 9, opacity: 0.7 }}>DNF</span>}
    </button>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export default function LapPositionChart({ positionMatrix, drivers, totalDrivers }: Props) {
  const allCodes = drivers.map(d => d.code);
  const driverMap = useMemo(
    () => Object.fromEntries(drivers.map(d => [d.code, d])),
    [drivers]
  );
  const maxPos = totalDrivers ?? drivers.length;

  // Default: all finished (non-DNF) drivers selected
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(drivers.filter(d => d.status !== 'DNF').map(d => d.code))
  );

  // ── Data transform ──────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    return positionMatrix.map(row => {
      const point: Record<string, number | null | undefined> = { lap: row.lap as number };
      for (const code of allCodes) {
        const cell = row[code] as PositionCell | null | undefined;
        if (!cell || cell.dnf) {
          point[code] = undefined; // breaks the line at retirement
        } else {
          point[code] = cell.pos;
        }
      }
      return point;
    });
  }, [positionMatrix, allCodes]);

  // ── Selection handlers ──────────────────────────────────────────────────────
  const toggle = (code: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const selectAll      = () => setSelected(new Set(allCodes));
  const selectNone     = () => setSelected(new Set());
  const selectFinished = () => setSelected(
    new Set(drivers.filter(d => d.status !== 'DNF').map(d => d.code))
  );
  const selectTop10 = () => {
    const top = drivers.filter(d => d.status !== 'DNF').slice(0, 10).map(d => d.code);
    setSelected(new Set(top));
  };

  const visibleCodes = allCodes.filter(c => selected.has(c));

  // ── Y-axis ticks (P1, P5, P10 …) ───────────────────────────────────────────
  const yTick = (v: number) => `P${v}`;

  const yTicks = useMemo(() => {
    const ticks = [1];
    const step = maxPos <= 12 ? 2 : 5;
    for (let i = step; i < maxPos; i += step) ticks.push(i);
    if (!ticks.includes(maxPos)) ticks.push(maxPos);
    return ticks;
  }, [maxPos]);

  return (
    <div>
      {/* ── Quick-select buttons ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#7070a0', letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: 4 }}>
          Quick select:
        </span>
        {[
          { label: 'All',       action: selectAll },
          { label: 'Finishers', action: selectFinished },
          { label: 'Top 10',    action: selectTop10 },
          { label: 'None',      action: selectNone },
        ].map(({ label, action }) => (
          <button
            key={label}
            onClick={action}
            style={{
              padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
              border: '1px solid #2a2a3f', background: '#1a1a26', color: '#e8e8f0',
              cursor: 'pointer', letterSpacing: '0.05em',
            }}
          >
            {label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#7070a0' }}>
          {visibleCodes.length} / {allCodes.length} drivers shown
        </span>
      </div>

      {/* ── Driver pills ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
        {drivers.map(driver => (
          <DriverPill
            key={driver.code}
            driver={driver}
            selected={selected.has(driver.code)}
            onToggle={toggle}
          />
        ))}
      </div>

      {/* ── Chart ────────────────────────────────────────────────────────── */}
      {visibleCodes.length === 0 ? (
        <div style={{
          height: 420, background: '#12121a', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#7070a0', fontSize: 14,
        }}>
          Select at least one driver above
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={460}>
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 24, bottom: 40, left: 16 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
            <XAxis
              dataKey="lap"
              type="number"
              domain={['dataMin', 'dataMax']}
              tick={{ fill: '#7070a0', fontSize: 11 }}
              axisLine={{ stroke: '#2a2a3f' }}
              tickLine={false}
            />
            <YAxis
              type="number"
              domain={[maxPos, 1]}
              reversed={false}
              ticks={yTicks}
              tickFormatter={yTick}
              tick={{ fill: '#7070a0', fontSize: 11, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
              width={40}
              label={{ value: 'Position', angle: -90, position: 'insideLeft', offset: 12, style: { fill: '#7070a0', fontSize: 12 } }}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: '#2a2a3f', strokeWidth: 1 }}
              allowEscapeViewBox={{ x: false, y: true }}
              wrapperStyle={{ zIndex: 100 }}
            />
            {visibleCodes.map(code => {
              const driver = driverMap[code];
              const color  = teamColor(driver?.team ?? '');
              const isDnf  = driver?.status === 'DNF';
              return (
                <Line
                  key={code}
                  dataKey={code}
                  type="monotone"
                  stroke={color}
                  strokeWidth={visibleCodes.length <= 3 ? 2.5 : visibleCodes.length <= 8 ? 2 : 1.5}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  strokeDasharray={isDnf ? '4 2' : undefined}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
