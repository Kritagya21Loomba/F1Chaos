interface Battle {
  driver_a: string;
  driver_b: string;
  position_swaps: number;
  laps_within_1: number;
  winner: string;
  intensity: number;
}

interface Props {
  battles: Battle[];
  drivers?: { code: string; name: string; team: string }[];
}

export default function DriverBattleIndex({ battles, drivers = [] }: Props) {
  if (!battles || battles.length === 0) {
    return (
      <div style={{ color: '#7070a0', textAlign: 'center', padding: '40px 0', fontSize: 13 }}>
        No significant driver battles detected.
      </div>
    );
  }

  const driverNames: Record<string, string> = {};
  const driverTeams: Record<string, string> = {};
  for (const d of drivers) {
    driverNames[d.code] = d.name;
    driverTeams[d.code] = d.team;
  }

  const maxIntensity = Math.max(...battles.map(b => b.intensity));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {battles.slice(0, 10).map((b, i) => {
        const barWidth = maxIntensity > 0 ? (b.intensity / maxIntensity) * 100 : 0;
        const isTeammate = driverTeams[b.driver_a] === driverTeams[b.driver_b] && driverTeams[b.driver_a];

        return (
          <div key={i} style={{
            background: '#12121a', borderRadius: 6, padding: '10px 14px',
            border: '1px solid #1a1a2e',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14, fontFamily: 'monospace' }}>
                  {b.driver_a}
                </span>
                <span style={{ color: '#7070a0', fontSize: 11 }}>vs</span>
                <span style={{ fontWeight: 700, fontSize: 14, fontFamily: 'monospace' }}>
                  {b.driver_b}
                </span>
                {isTeammate && (
                  <span style={{
                    fontSize: 9, color: '#7070a0', letterSpacing: '0.1em',
                    background: '#1a1a2e', padding: '1px 6px', borderRadius: 3,
                  }}>TEAMMATE</span>
                )}
              </div>
              <div style={{
                fontSize: 11, fontFamily: 'monospace',
                color: b.winner === b.driver_a ? '#39d353' : '#ff8700', fontWeight: 700,
              }}>
                {b.winner} wins
              </div>
            </div>

            {/* Intensity bar */}
            <div style={{
              height: 4, background: '#1a1a2e', borderRadius: 2, marginBottom: 6,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', width: `${barWidth}%`,
                background: `linear-gradient(90deg, #ff8700, #ff4040)`,
                borderRadius: 2, transition: 'width 0.3s ease',
              }} />
            </div>

            <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#7070a0' }}>
              <span>
                <strong style={{ color: '#e0e0f0' }}>{b.position_swaps}</strong> position swap{b.position_swaps !== 1 ? 's' : ''}
              </span>
              <span>
                <strong style={{ color: '#e0e0f0' }}>{b.laps_within_1}</strong> laps within 1 pos
              </span>
              <span>
                Intensity: <strong style={{ color: '#ff8700' }}>{b.intensity}</strong>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
