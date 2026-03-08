import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';

interface Movement {
  code: string;
  positions_gained: number;
  dnf: boolean;
}

interface Props {
  data: Movement[];
  height?: number;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const gained = d.positions_gained;
  const label = gained > 0 ? `+${gained} positions gained` : gained < 0 ? `${gained} positions lost` : 'No change';
  return (
    <div style={{
      background: '#12121a', border: '1px solid #2a2a3f', borderRadius: 6,
      padding: '8px 12px', fontSize: 12,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.code}</div>
      <div style={{ fontFamily: 'monospace' }}>{label}</div>
      {d.dnf && <div style={{ color: '#7070a0', fontSize: 11, marginTop: 4 }}>DNF</div>}
    </div>
  );
};

export default function DriverMovementChart({ data, height = 420 }: Props) {
  // Sort by positions_gained descending
  const sorted = [...data].sort((a, b) => b.positions_gained - a.positions_gained);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={sorted}
        margin={{ top: 16, right: 24, bottom: 72, left: 16 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3f" vertical={false} />
        <XAxis
          type="category"
          dataKey="code"
          tick={{ fill: '#e8e8f0', fontSize: 11, fontFamily: 'monospace' }}
          axisLine={{ stroke: '#2a2a3f' }}
          tickLine={false}
          interval={0}
          angle={-45}
          textAnchor="end"
          height={68}
        />
        <YAxis
          type="number"
          tick={{ fill: '#7070a0', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={52}
          label={{ value: 'Positions Gained / Lost', angle: -90, position: 'insideLeft', offset: 14, style: { fill: '#7070a0', fontSize: 12 } }}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e1e2e' }} />
        <ReferenceLine y={0} stroke="#3a3a5f" strokeWidth={1.5} />
        <Bar dataKey="positions_gained" radius={[4, 4, 0, 0]}>
          {sorted.map((entry) => (
            <Cell
              key={entry.code}
              fill={
                entry.dnf
                  ? '#444460'
                  : entry.positions_gained > 0
                  ? '#39d353'
                  : entry.positions_gained < 0
                  ? '#e10600'
                  : '#7070a0'
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
