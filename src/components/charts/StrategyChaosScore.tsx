interface StrategyScore {
  undercuts: number;
  overcuts: number;
  pit_cycle_passes: number;
  failed_strategies: number;
  strategy_chaos_score: number;
}

interface Props {
  data: StrategyScore;
}

export default function StrategyChaosScore({ data }: Props) {
  if (!data || data.strategy_chaos_score === 0) {
    return (
      <div style={{ color: '#7070a0', textAlign: 'center', padding: '40px 0', fontSize: 13 }}>
        No strategy data available.
        <br />
        <span style={{ fontSize: 11 }}>Re-ingest with updated fetch_race_data.py to populate pit strategy metrics.</span>
      </div>
    );
  }

  const items = [
    { label: 'Undercuts', value: data.undercuts, color: '#39d353', desc: 'Pitted early, gained on exit' },
    { label: 'Overcuts', value: data.overcuts, color: '#ff8700', desc: 'Stayed out, gained via track position' },
    { label: 'Pit-Cycle Passes', value: data.pit_cycle_passes, color: '#58a6ff', desc: 'Positions gained through pit windows' },
    { label: 'Failed Strategies', value: data.failed_strategies, color: '#ff4040', desc: 'Net position loss from pit strategy' },
  ];

  return (
    <div>
      {/* Score header */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 42, fontWeight: 800, fontFamily: 'monospace', color: '#ff8700' }}>
          {data.strategy_chaos_score}
        </div>
        <div style={{ fontSize: 11, color: '#7070a0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Strategy Chaos Score
        </div>
      </div>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {items.map(item => (
          <div key={item.label} style={{
            background: '#12121a', borderRadius: 6, padding: '12px 14px',
            border: '1px solid #1a1a2e',
          }}>
            <div style={{ fontSize: 10, color: '#7070a0', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
              {item.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'monospace', color: item.color }}>
              {item.value}
            </div>
            <div style={{ fontSize: 10, color: '#50506a', marginTop: 2 }}>
              {item.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
