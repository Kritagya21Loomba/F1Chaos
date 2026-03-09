import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LapEntry {
  lap: number;
  inversions: number;
}

interface NoSCSim {
  inversions_per_lap: LapEntry[];
  total_inversions: number;
  volatility_score: number;
  racing_laps: number;
  removed_laps: number[];
  sc_laps_removed: number;
}

interface Props {
  noScSim: NoSCSim;
  inversionsPerLap: LapEntry[];
  volatilityScore: number;
  totalLaps: number;
  totalLapInversions: number;
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const actual = payload.find((p: any) => p.dataKey === 'actual');
  const nosc   = payload.find((p: any) => p.dataKey === 'noSC');
  return (
    <div style={{
      background: '#12121a', border: '1px solid #2a2a3f', borderRadius: 8,
      padding: '10px 14px', fontSize: 12, pointerEvents: 'none',
    }}>
      <div style={{ color: '#7070a0', fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: '0.08em' }}>
        LAP {label}
      </div>
      {actual && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
          <div style={{ width: 12, height: 3, background: '#7070a0', borderRadius: 2 }} />
          <span style={{ color: '#a0a0b0' }}>Actual:</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#e8e8f0' }}>
            {actual.value ?? '—'}
          </span>
        </div>
      )}
      {nosc && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ width: 12, height: 3, background: '#ff8700', borderRadius: 2 }} />
          <span style={{ color: '#a0a0b0' }}>No SC:</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#ff8700' }}>
            {nosc.value != null ? nosc.value : 'SC/VSC lap (removed)'}
          </span>
        </div>
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export default function NoSCSimulator({
  noScSim,
  inversionsPerLap,
  volatilityScore,
  totalLaps,
  totalLapInversions,
}: Props) {
  // Merge actual + simulated into one chart series
  const chartData = useMemo(() => {
    const noScMap: Record<number, number> = {};
    for (const e of noScSim.inversions_per_lap) noScMap[e.lap] = e.inversions;
    return inversionsPerLap.map(e => ({
      lap:    e.lap,
      actual: e.inversions,
      noSC:   noScMap[e.lap] ?? null,  // null = SC/VSC lap, broken line
    }));
  }, [inversionsPerLap, noScSim]);

  if (noScSim.sc_laps_removed === 0) {
    return (
      <div style={{ padding: '24px 0', textAlign: 'center', color: '#7070a0', fontSize: 14 }}>
        No SC or VSC periods detected in this race — result would be identical.
      </div>
    );
  }

  const volDiff   = noScSim.volatility_score - volatilityScore;
  const pctChange = volatilityScore > 0
    ? ((Math.abs(volDiff) / volatilityScore) * 100).toFixed(1)
    : '0';
  const isHigher  = volDiff > 0;

  return (
    <div>
      {/* Summary cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))',
        gap: 12, marginBottom: 24,
      }}>
        {[
          {
            label: 'Actual Volatility',
            value: volatilityScore.toFixed(4),
            sub: 'full race, all laps',
            color: '#7070a0',
          },
          {
            label: 'No-SC Volatility',
            value: noScSim.volatility_score.toFixed(4),
            sub: `${noScSim.racing_laps} racing laps only`,
            color: isHigher ? '#4caf50' : '#ef5350',
          },
          {
            label: 'Difference',
            value: `${isHigher ? '+' : '-'}${pctChange}%`,
            sub: isHigher
              ? 'more chaotic without SC'
              : 'less chaotic without SC',
            color: isHigher ? '#4caf50' : '#ef5350',
          },
          {
            label: 'SC/VSC Laps',
            value: String(noScSim.sc_laps_removed),
            sub: 'laps removed from calc',
            color: '#ffcc00',
          },
        ].map(({ label, value, sub, color }) => (
          <div
            key={label}
            style={{
              background: '#12121a', border: '1px solid #1e1e2e',
              borderRadius: 8, padding: '12px 14px', textAlign: 'center',
            }}
          >
            <div style={{
              fontSize: 22, fontFamily: 'monospace', fontWeight: 700,
              color, marginBottom: 2,
            }}>
              {value}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#e8e8f0', marginBottom: 2 }}>
              {label}
            </div>
            <div style={{ fontSize: 10, color: '#505070' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 8, right: 24, bottom: 28, left: 8 }}>
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
            tick={{ fill: '#7070a0', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#2a2a3f', strokeWidth: 1 }} />
          <Legend
            verticalAlign="top"
            wrapperStyle={{ fontSize: 12, paddingBottom: 10 }}
            formatter={(value) => value === 'actual' ? 'Actual' : 'No SC/VSC (simulated)'}
          />
          {/* Highlight removed SC/VSC laps */}
          {noScSim.removed_laps.map(lap => (
            <ReferenceLine key={lap} x={lap} stroke="#ffcc0020" strokeDasharray="3 2" strokeWidth={2} />
          ))}
          {/* Actual inversions (grey dashed) */}
          <Line
            dataKey="actual"
            type="monotone"
            stroke="#7070a0"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            strokeDasharray="4 2"
          />
          {/* Simulated no-SC inversions (orange) */}
          <Line
            dataKey="noSC"
            type="monotone"
            stroke="#ff8700"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <div style={{ textAlign: 'center', fontSize: 11, color: '#505070', marginTop: 2 }}>
        Faint yellow lines mark removed SC/VSC laps · Orange = what the race chaos would have looked like
      </div>
    </div>
  );
}
