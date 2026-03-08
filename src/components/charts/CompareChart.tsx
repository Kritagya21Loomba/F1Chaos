import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface Props {
  au25: { lap: number; inversions?: number; cumulative?: number }[];
  au26: { lap: number; inversions?: number; cumulative?: number }[];
  dataKey?: 'inversions' | 'cumulative';
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
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
};

export default function CompareChart({ au25, au26, dataKey = 'inversions', height = 320 }: Props) {
  // Merge by lap number
  const maxLaps = Math.max(au25.length, au26.length);
  const merged = Array.from({ length: maxLaps }, (_, i) => ({
    lap: i + 1,
    au25: au25[i]?.[dataKey] ?? null,
    au26: au26[i]?.[dataKey] ?? null,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={merged} margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
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
          width={40}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          formatter={(v) => v === 'au25' ? 'AU 2025' : 'AU 2026'}
        />
        <Line
          type="monotone"
          dataKey="au25"
          name="au25"
          stroke="#ff8700"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="au26"
          name="au26"
          stroke="#39d353"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
