import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

interface Props {
  data: { lap: number; inversions: number }[];
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
      <div style={{ color: '#7070a0', marginBottom: 4 }}>Lap {label}</div>
      <div style={{ fontFamily: 'monospace', fontWeight: 700 }}>
        {payload[0].value} inversions
      </div>
      <div style={{ color: '#7070a0', fontSize: 11, marginTop: 4 }}>
        An inversion = a driver ahead of someone who started ahead of them
      </div>
    </div>
  );
};

export default function VolatilityChart({ data, color = '#ff8700', height = 320 }: Props) {
  const avg = data.length ? Math.round(data.reduce((s, d) => s + d.inversions, 0) / data.length) : 0;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 16, right: 24, bottom: 40, left: 16 }}>
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
        <ReferenceLine
          y={avg}
          stroke="#7070a0"
          strokeDasharray="4 4"
          label={{ value: `avg ${avg}`, fill: '#7070a0', fontSize: 10, position: 'insideTopRight' }}
        />
        <Line
          type="monotone"
          dataKey="inversions"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: color }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
