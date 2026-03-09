import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface InvEntry {
  lap: number;
  inversions: number;
}

interface Props {
  raw: InvEntry[];
  pitAdjusted: InvEntry[];
  scNeutralized: InvEntry[];
  rawVolatility: number;
  pitAdjustedVolatility: number;
  scNeutralizedVolatility: number;
  scLaps?: number[];
  vscLaps?: number[];
  color?: string;
  height?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#12121a', border: '1px solid #2a2a3f', borderRadius: 6,
      padding: '8px 12px', fontSize: 12,
    }}>
      <div style={{ color: '#7070a0', marginBottom: 6 }}>Lap {label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color, fontFamily: 'monospace', fontWeight: 700, marginBottom: 2 }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </div>
      ))}
    </div>
  );
};

export default function AdjustedVolatility({
  raw, pitAdjusted, scNeutralized,
  rawVolatility, pitAdjustedVolatility, scNeutralizedVolatility,
  scLaps = [], vscLaps = [],
  color = '#ff8700', height = 440,
}: Props) {
  // Merge data into one array
  const maxLaps = Math.max(raw.length, pitAdjusted.length, scNeutralized.length);
  const merged = Array.from({ length: maxLaps }, (_, i) => ({
    lap: i + 1,
    raw: raw[i]?.inversions ?? null,
    pit_adj: pitAdjusted[i]?.inversions ?? null,
    sc_neutral: scNeutralized[i]?.inversions ?? null,
  }));

  const neutralizedSet = new Set([...scLaps, ...vscLaps]);

  const scores = [
    { label: 'Raw', value: rawVolatility, color: '#7070a0' },
    { label: 'Pit-adjusted', value: pitAdjustedVolatility, color: '#39d353' },
    { label: 'SC-neutralized', value: scNeutralizedVolatility, color: '#ffdd00' },
  ];

  return (
    <div>
      {/* Volatility score comparison */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {scores.map(s => (
          <div key={s.label} style={{
            flex: 1, background: '#12121a', borderRadius: 6, padding: '10px 14px',
            border: '1px solid #1a1a2e', textAlign: 'center',
          }}>
            <div style={{ fontSize: 10, color: '#7070a0', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'monospace', color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={merged} margin={{ top: 36, right: 24, bottom: 48, left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3f" />
          <XAxis
            dataKey="lap"
            tick={{ fill: '#7070a0', fontSize: 11 }}
            axisLine={{ stroke: '#2a2a3f' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#7070a0', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
            label={{ value: 'Inversions', angle: -90, position: 'insideLeft', offset: 12, style: { fill: '#7070a0', fontSize: 12 } }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} />
          <Line
            type="monotone" dataKey="raw" name="Raw"
            stroke="#7070a0" strokeWidth={1.5} strokeDasharray="4 3"
            dot={false} connectNulls
          />
          <Line
            type="monotone" dataKey="pit_adj" name="Pit-adjusted"
            stroke="#39d353" strokeWidth={2}
            dot={false} connectNulls
          />
          <Line
            type="monotone" dataKey="sc_neutral" name="SC-neutralized"
            stroke="#ffdd00" strokeWidth={2}
            dot={false} connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
