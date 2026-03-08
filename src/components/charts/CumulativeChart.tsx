import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface Props {
  data: { lap: number; cumulative: number }[];
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
      <div style={{ color: '#7070a0', marginBottom: 4 }}>After lap {label}</div>
      <div style={{ fontFamily: 'monospace', fontWeight: 700 }}>
        {payload[0].value} total inversions
      </div>
    </div>
  );
};

export default function CumulativeChart({ data, color = '#ff8700', height = 320 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 16, right: 24, bottom: 40, left: 16 }}>
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
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
          label={{ value: 'Cumulative Inversions', angle: -90, position: 'insideLeft', offset: 14, style: { fill: '#7070a0', fontSize: 12 } }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="cumulative"
          stroke={color}
          strokeWidth={2}
          fill={`url(#grad-${color.replace('#', '')})`}
          dot={false}
          activeDot={{ r: 4, fill: color }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
