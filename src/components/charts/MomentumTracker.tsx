import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Driver {
  code: string;
  name: string;
  team: string;
  status: string;
}

interface MomentumRow {
  lap: number;
  [code: string]: number | null;
}

interface PeakEntry {
  code: string;
  peak_momentum: number;
  peak_lap: number;
}

interface Props {
  momentumPerLap: MomentumRow[];
  drivers: Driver[];
  window?: number;
  peakMomentum?: PeakEntry[];
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

// ── Custom tooltip ─────────────────────────────────────────────────────────────

const CustomTooltip = ({
  active, payload, label, driverMap,
}: any) => {
  if (!active || !payload?.length) return null;

  const entries = payload
    .filter((p: any) => p.value != null)
    .sort((a: any, b: any) => b.value - a.value);

  const count   = entries.length;
  const numCols = count >= 17 ? 3 : count >= 9 ? 2 : 1;
  const compact = count >= 9;

  return (
    <div style={{
      background: '#12121a', border: '1px solid #2a2a3f', borderRadius: 8,
      padding: compact ? '8px 10px' : '10px 14px',
      fontSize: compact ? 11 : 12, pointerEvents: 'none',
    }}>
      <div style={{
        fontWeight: 700, marginBottom: compact ? 5 : 8,
        color: '#7070a0', fontSize: 11, letterSpacing: '0.08em',
      }}>
        LAP {label}
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${numCols}, minmax(100px, 1fr))`,
        gap: compact ? '1px 14px' : '2px 0',
      }}>
        {entries.map(({ dataKey, value, color }: any) => (
          <div key={dataKey} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '1px 0' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#e8e8f0', width: 28 }}>
              {dataKey}
            </span>
            <span style={{
              fontFamily: 'monospace', fontSize: 10,
              fontWeight: 700,
              color: value > 0 ? '#4caf50' : value < 0 ? '#ef5350' : '#7070a0',
            }}>
              {value > 0 ? '+' : ''}{value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export default function MomentumTracker({
  momentumPerLap,
  drivers,
  window: windowSize = 5,
  peakMomentum = [],
}: Props) {
  const allCodes = drivers.map(d => d.code);
  const driverMap = useMemo(
    () => Object.fromEntries(drivers.map(d => [d.code, d])),
    [drivers]
  );

  // Default: top 10 finishers
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(drivers.filter(d => d.status !== 'DNF').slice(0, 10).map(d => d.code))
  );

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
  const selectFinished = () => setSelected(new Set(drivers.filter(d => d.status !== 'DNF').map(d => d.code)));
  const selectTop10    = () => setSelected(
    new Set(drivers.filter(d => d.status !== 'DNF').slice(0, 10).map(d => d.code))
  );

  const visibleCodes = allCodes.filter(c => selected.has(c));

  if (!momentumPerLap || momentumPerLap.length === 0) {
    return (
      <div style={{ padding: '24px 0', textAlign: 'center', color: '#7070a0' }}>
        No momentum data available.
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: '#7070a0', marginBottom: 14 }}>
        Rolling {windowSize}-lap position change per driver. Positive = gaining, Negative = losing positions.
      </div>

      {/* Peak movers callout */}
      {peakMomentum.length > 0 && (
        <div style={{
          display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap',
        }}>
          {peakMomentum.slice(0, 5).map(({ code, peak_momentum, peak_lap }) => {
            const driver = driverMap[code];
            const color  = teamColor(driver?.team ?? '');
            const isGain = peak_momentum > 0;
            return (
              <div
                key={code}
                style={{
                  background: '#12121a', border: `1px solid ${color}44`,
                  borderRadius: 8, padding: '8px 12px',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <div style={{ width: 6, height: 22, background: color, borderRadius: 3 }} />
                <div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 700, color, fontSize: 13 }}>
                    {code}
                    <span style={{
                      marginLeft: 6, fontSize: 14,
                      color: isGain ? '#4caf50' : '#ef5350',
                    }}>
                      {isGain ? '+' : ''}{peak_momentum}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: '#505070' }}>
                    peak at L{peak_lap}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick-select */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#7070a0', letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: 4 }}>
          Quick select:
        </span>
        {[
          { label: 'All',       action: selectAll },
          { label: 'Finishers', action: selectFinished },
          { label: 'Top 10',   action: selectTop10 },
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

      {/* Driver pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
        {drivers.map(driver => {
          const color  = teamColor(driver.team);
          const isDnf  = driver.status === 'DNF';
          const active = selected.has(driver.code);
          return (
            <button
              key={driver.code}
              onClick={() => toggle(driver.code)}
              title={`${driver.name} (${driver.team})${isDnf ? ' — DNF' : ''}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 20,
                border: `1.5px solid ${active ? color : '#2a2a3f'}`,
                background: active ? `${color}22` : 'transparent',
                color: active ? color : '#505070',
                fontFamily: 'monospace', fontWeight: 600, fontSize: 11, cursor: 'pointer',
                transition: 'all 0.15s', opacity: isDnf && !active ? 0.5 : 1,
                letterSpacing: '0.03em',
              }}
            >
              {active && (
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
              )}
              {driver.code}
              {isDnf && <span style={{ fontSize: 9, opacity: 0.7 }}>DNF</span>}
            </button>
          );
        })}
      </div>

      {/* Chart */}
      {visibleCodes.length === 0 ? (
        <div style={{
          height: 320, background: '#12121a', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#7070a0', fontSize: 14,
        }}>
          Select at least one driver above
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={420}>
          <LineChart
            data={momentumPerLap}
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
              label={{ value: 'Lap', position: 'insideBottom', offset: -8, style: { fill: '#7070a0', fontSize: 12 } }}
            />
            <YAxis
              tick={{ fill: '#7070a0', fontSize: 11, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
              width={40}
              label={{ value: 'Momentum', angle: -90, position: 'insideLeft', offset: 12, style: { fill: '#7070a0', fontSize: 12 } }}
            />
            {/* Zero reference line */}
            <ReferenceLine y={0} stroke="#3a3a5f" strokeWidth={1.5} />
            <Tooltip
              content={<CustomTooltip driverMap={driverMap} />}
              cursor={{ stroke: '#2a2a3f', strokeWidth: 1 }}
              allowEscapeViewBox={{ x: false, y: true }}
              wrapperStyle={{ zIndex: 100 }}
            />
            {visibleCodes.map(code => {
              const driver = driverMap[code];
              const color  = teamColor(driver?.team ?? '');
              return (
                <Line
                  key={code}
                  dataKey={code}
                  type="monotone"
                  stroke={color}
                  strokeWidth={visibleCodes.length <= 3 ? 2.5 : visibleCodes.length <= 8 ? 2 : 1.5}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  strokeDasharray={driver?.status === 'DNF' ? '4 2' : undefined}
                  connectNulls={true}
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
