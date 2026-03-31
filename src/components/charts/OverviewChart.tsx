import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';

interface Props {
  inversionsPerLap: { lap: number; inversions: number }[];
  cumulativeInversions: { lap: number; cumulative: number }[];
  volatilityScore: number;
  totalLapInversions: number;
  color?: string;
  height?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#12121a', border: '1px solid #2a2a3f', borderRadius: 6,
      padding: '10px 14px', fontSize: 12, minWidth: 160
    }}>
      <div style={{ color: '#7070a0', marginBottom: 6, fontWeight: 600 }}>Lap {label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}>
          <span style={{ color: p.color }}>{p.name}:</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#e8e8f0' }}>
            {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function OverviewChart({ 
  inversionsPerLap, 
  cumulativeInversions, 
  volatilityScore,
  totalLapInversions,
  color = '#ff8700', 
  height = 280 
}: Props) {
  // Merge data by lap
  const data = inversionsPerLap.map((d, i) => ({
    lap: d.lap,
    inversions: d.inversions,
    cumulative: cumulativeInversions[i]?.cumulative ?? 0
  }));

  const avgInversions = data.length 
    ? Math.round(data.reduce((s, d) => s + d.inversions, 0) / data.length) 
    : 0;

  const maxCumulative = Math.max(...data.map(d => d.cumulative), 1);

  return (
    <div>
      {/* Quick stats row */}
      <div style={{ 
        display: 'flex', 
        gap: 24, 
        marginBottom: 16, 
        padding: '12px 16px',
        background: '#1a1a26',
        borderRadius: 8,
        flexWrap: 'wrap'
      }}>
        <div>
          <div style={{ fontSize: 10, color: '#7070a0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Volatility Score
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace', color }}>
            {volatilityScore}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#7070a0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Total Inversions
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace', color: '#e8e8f0' }}>
            {totalLapInversions.toLocaleString()}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#7070a0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Avg/Lap
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace', color: '#7070a0' }}>
            {avgInversions}
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 10, right: 24, bottom: 20, left: 16 }}>
          <defs>
            <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.15}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3f" />
          <XAxis
            dataKey="lap"
            tick={{ fill: '#7070a0', fontSize: 10 }}
            axisLine={{ stroke: '#2a2a3f' }}
            tickLine={false}
            label={{ value: 'Lap', position: 'bottom', offset: 0, style: { fill: '#7070a0', fontSize: 10 } }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: '#7070a0', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={40}
            label={{ value: 'Per Lap', angle: -90, position: 'insideLeft', offset: 10, style: { fill: '#7070a0', fontSize: 10 } }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: '#7070a0', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={50}
            domain={[0, maxCumulative * 1.05]}
            tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}
            label={{ value: 'Cumulative', angle: 90, position: 'insideRight', offset: 5, style: { fill: '#7070a0', fontSize: 10 } }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="top" 
            height={28}
            wrapperStyle={{ fontSize: 11 }}
          />
          <ReferenceLine
            yAxisId="left"
            y={avgInversions}
            stroke="#7070a0"
            strokeDasharray="4 4"
          />
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="cumulative"
            name="Cumulative"
            fill="url(#cumulativeGradient)"
            stroke={color}
            strokeWidth={1}
            strokeOpacity={0.5}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="inversions"
            name="Per Lap"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: color }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
