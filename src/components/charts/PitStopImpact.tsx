interface PitImpactEntry {
  driver: string;
  in_lap: number;
  out_lap: number;
  compound: string | null;
  duration_s: number | null;
  pos_before: number | null;
  pos_after: number | null;
  net_position_change: number | null;
}

interface Props {
  data: PitImpactEntry[];
  drivers?: { code: string; name: string; team: string }[];
}

const COMPOUND_COLORS: Record<string, string> = {
  SOFT: '#ff3333',
  MEDIUM: '#ffcc00',
  HARD: '#cccccc',
  INTERMEDIATE: '#33cc33',
  WET: '#3399ff',
};

export default function PitStopImpact({ data, drivers = [] }: Props) {
  if (!data || data.length === 0) {
    return (
      <div style={{ color: '#7070a0', textAlign: 'center', padding: '40px 0', fontSize: 13 }}>
        No pit stop data available for this race.
        <br />
        <span style={{ fontSize: 11 }}>Re-ingest with the updated fetch_race_data.py to populate pit stop information.</span>
      </div>
    );
  }

  const driverNames: Record<string, string> = {};
  for (const d of drivers) driverNames[d.code] = d.name;

  // Sort by lap
  const sorted = [...data].sort((a, b) => a.in_lap - b.in_lap);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{
        width: '100%', borderCollapse: 'collapse', fontSize: 12,
        fontFamily: 'monospace',
      }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #2a2a3f' }}>
            <th style={thStyle}>Driver</th>
            <th style={thStyle}>Lap</th>
            <th style={thStyle}>Compound</th>
            <th style={thStyle}>Duration</th>
            <th style={thStyle}>Pos Before</th>
            <th style={thStyle}>Pos After</th>
            <th style={thStyle}>Net Change</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((ps, i) => {
            const nc = ps.net_position_change;
            const changeColor = nc === null ? '#7070a0' : nc > 0 ? '#39d353' : nc < 0 ? '#ff4040' : '#7070a0';
            const compoundColor = COMPOUND_COLORS[ps.compound ?? ''] ?? '#7070a0';

            return (
              <tr key={i} style={{ borderBottom: '1px solid #1a1a2e' }}>
                <td style={tdStyle}>
                  <span style={{ fontWeight: 700 }}>{ps.driver}</span>
                  {driverNames[ps.driver] && (
                    <span style={{ color: '#7070a0', marginLeft: 6, fontSize: 10 }}>
                      {driverNames[ps.driver]}
                    </span>
                  )}
                </td>
                <td style={tdStyle}>{ps.in_lap}</td>
                <td style={tdStyle}>
                  <span style={{
                    display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                    backgroundColor: compoundColor, marginRight: 6, verticalAlign: 'middle',
                  }} />
                  {ps.compound ?? '—'}
                </td>
                <td style={tdStyle}>
                  {ps.duration_s != null ? `${ps.duration_s.toFixed(1)}s` : '—'}
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  {ps.pos_before != null ? `P${ps.pos_before}` : '—'}
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  {ps.pos_after != null ? `P${ps.pos_after}` : '—'}
                </td>
                <td style={{ ...tdStyle, textAlign: 'center', color: changeColor, fontWeight: 700 }}>
                  {nc === null ? '—' : nc > 0 ? `+${nc}` : nc === 0 ? '0' : String(nc)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '8px 10px', color: '#7070a0',
  fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
};

const tdStyle: React.CSSProperties = {
  padding: '6px 10px', color: '#e0e0f0',
};
