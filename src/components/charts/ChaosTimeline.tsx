import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, Legend,
} from 'recharts';

interface TimelineEntry {
  lap: number;
  inversions: number;
  on_track_overtakes: number;
  pit_passes: number;
  sc_vsc_moves: number;
  dnf_moves: number;
  pit_stops: number;
  safety_car: boolean;
  vsc: boolean;
  red_flag: boolean;
}

interface Props {
  data: TimelineEntry[];
  color?: string;
  height?: number;
}

const COLORS = {
  on_track: '#39d353',
  pit: '#ff8700',
  sc: '#ffdd00',
  dnf: '#ff4040',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const entry: TimelineEntry = payload[0]?.payload;
  if (!entry) return null;

  const flags: string[] = [];
  if (entry.safety_car) flags.push('SAFETY CAR');
  if (entry.vsc) flags.push('VSC');
  if (entry.red_flag) flags.push('RED FLAG');

  return (
    <div style={{
      background: '#12121a', border: '1px solid #2a2a3f', borderRadius: 6,
      padding: '10px 14px', fontSize: 12, minWidth: 180,
    }}>
      <div style={{ color: '#7070a0', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
        <span>Lap {label}</span>
        {flags.length > 0 && (
          <span style={{
            color: entry.red_flag ? '#ff4040' : '#ffdd00',
            fontWeight: 700,
            fontSize: 10,
            letterSpacing: '0.08em',
          }}>{flags.join(' | ')}</span>
        )}
      </div>
      <div style={{ fontFamily: 'monospace', fontWeight: 700, marginBottom: 2 }}>
        {entry.inversions} inversions
      </div>
      {entry.on_track_overtakes > 0 && (
        <div style={{ color: COLORS.on_track, fontSize: 11 }}>
          {entry.on_track_overtakes} on-track overtake{entry.on_track_overtakes !== 1 ? 's' : ''}
        </div>
      )}
      {entry.pit_passes > 0 && (
        <div style={{ color: COLORS.pit, fontSize: 11 }}>
          {entry.pit_passes} pit-cycle pass{entry.pit_passes !== 1 ? 'es' : ''}
        </div>
      )}
      {entry.pit_stops > 0 && (
        <div style={{ color: '#7070a0', fontSize: 11 }}>
          {entry.pit_stops} pit stop{entry.pit_stops !== 1 ? 's' : ''}
        </div>
      )}
      {entry.sc_vsc_moves > 0 && (
        <div style={{ color: COLORS.sc, fontSize: 11 }}>
          {entry.sc_vsc_moves} SC/VSC move{entry.sc_vsc_moves !== 1 ? 's' : ''}
        </div>
      )}
      {entry.dnf_moves > 0 && (
        <div style={{ color: COLORS.dnf, fontSize: 11 }}>
          {entry.dnf_moves} DNF-induced move{entry.dnf_moves !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

export default function ChaosTimeline({ data, color = '#ff8700', height = 360 }: Props) {
  if (!data || data.length === 0) return null;

  // Build stacked data
  const chartData = data.map(d => ({
    ...d,
    otk: d.on_track_overtakes,
    pit: d.pit_passes,
    sc: d.sc_vsc_moves,
    dnf: d.dnf_moves,
  }));

  // Find SC/VSC laps for reference bands
  const scLaps = data.filter(d => d.safety_car).map(d => d.lap);
  const vscLaps = data.filter(d => d.vsc).map(d => d.lap);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 16, right: 24, bottom: 40, left: 16 }}>
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
          label={{ value: 'Overtakes', angle: -90, position: 'insideLeft', offset: 12, style: { fill: '#7070a0', fontSize: 12 } }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
          formatter={(v: string) => {
            const labels: Record<string, string> = { otk: 'On-track', pit: 'Pit cycle', sc: 'SC/VSC', dnf: 'DNF' };
            return labels[v] ?? v;
          }}
        />
        {/* SC/VSC reference lines */}
        {scLaps.map(lap => (
          <ReferenceLine key={`sc-${lap}`} x={lap} stroke="#ffdd00" strokeDasharray="3 3" strokeOpacity={0.4} />
        ))}
        {vscLaps.map(lap => (
          <ReferenceLine key={`vsc-${lap}`} x={lap} stroke="#ffdd00" strokeDasharray="6 3" strokeOpacity={0.3} />
        ))}
        <Bar dataKey="otk" stackId="a" fill={COLORS.on_track} name="otk" />
        <Bar dataKey="pit" stackId="a" fill={COLORS.pit} name="pit" />
        <Bar dataKey="sc" stackId="a" fill={COLORS.sc} name="sc" />
        <Bar dataKey="dnf" stackId="a" fill={COLORS.dnf} name="dnf" />
      </BarChart>
    </ResponsiveContainer>
  );
}
