interface OvertakeSummary {
  total: number;
  on_track: number;
  pit_cycle: number;
  sc_vsc: number;
  dnf: number;
}

interface Props {
  summary: OvertakeSummary;
}

const COLORS: Record<string, string> = {
  on_track: '#39d353',
  pit_cycle: '#ff8700',
  sc_vsc: '#ffdd00',
  dnf: '#ff4040',
};

const LABELS: Record<string, string> = {
  on_track: 'On-track',
  pit_cycle: 'Pit cycle',
  sc_vsc: 'SC / VSC',
  dnf: 'DNF-induced',
};

export default function OvertakeSummaryChart({ summary }: Props) {
  if (!summary || summary.total === 0) {
    return (
      <div style={{ color: '#7070a0', textAlign: 'center', padding: '40px 0', fontSize: 13 }}>
        No overtake data available.
      </div>
    );
  }

  const categories = ['on_track', 'pit_cycle', 'sc_vsc', 'dnf'] as const;
  const total = summary.total || 1;

  return (
    <div>
      {/* Total header */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 36, fontWeight: 800, fontFamily: 'monospace', color: '#e0e0f0' }}>
          {summary.total}
        </div>
        <div style={{ fontSize: 11, color: '#7070a0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Total position gains
        </div>
      </div>

      {/* Stacked bar */}
      <div style={{
        display: 'flex', height: 20, borderRadius: 4, overflow: 'hidden',
        marginBottom: 16,
      }}>
        {categories.map(cat => {
          const val = summary[cat] ?? 0;
          if (val === 0) return null;
          const pct = (val / total) * 100;
          return (
            <div
              key={cat}
              style={{
                width: `${pct}%`, backgroundColor: COLORS[cat],
                minWidth: val > 0 ? 2 : 0,
              }}
              title={`${LABELS[cat]}: ${val}`}
            />
          );
        })}
      </div>

      {/* Legend breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {categories.map(cat => {
          const val = summary[cat] ?? 0;
          const pct = total > 0 ? Math.round((val / total) * 100) : 0;
          return (
            <div key={cat} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', background: '#12121a', borderRadius: 6,
              border: '1px solid #1a1a2e',
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: 2,
                backgroundColor: COLORS[cat], flexShrink: 0,
              }} />
              <div>
                <div style={{ fontSize: 11, color: '#7070a0' }}>{LABELS[cat]}</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14 }}>
                  {val} <span style={{ fontSize: 10, color: '#7070a0', fontWeight: 400 }}>({pct}%)</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
