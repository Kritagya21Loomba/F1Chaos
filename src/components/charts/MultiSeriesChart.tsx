import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  data: { lap: number; value: number }[];
}

interface Props {
  series: ChartSeries[];
  yLabel?: string;
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

export default function MultiSeriesChart({ series, yLabel = 'Inversions', height = 320 }: Props) {
  const maxLaps = series.length ? Math.max(...series.map(s => s.data.length)) : 0;
  const merged = Array.from({ length: maxLaps }, (_, i) => {
    const point: Record<string, any> = { lap: i + 1 };
    series.forEach(s => { point[s.key] = s.data[i]?.value ?? null; });
    return point;
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={merged} margin={{ top: 16, right: 24, bottom: 40, left: 16 }}>
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
          width={56}
          label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 14, style: { fill: '#7070a0', fontSize: 12 } }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
          formatter={(v) => series.find(s => s.key === v)?.label ?? v}
        />
        {series.map(s => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.key}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            activeDot={{ r: 4, fill: s.color }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
