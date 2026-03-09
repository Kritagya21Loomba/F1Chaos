import { useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RaceEntry {
  round: number;
  shortName: string;
  href: string;
  volatility: number;
  inversions: number;
  onTrackOvertakes: number;
  scInterventions: number;
}

interface Props {
  races: RaceEntry[];
  seasonColor: string;
}

type SortKey = 'volatility' | 'inversions' | 'onTrackOvertakes' | 'scInterventions';

// ── Main component ────────────────────────────────────────────────────────────

export default function SeasonChaosRankings({ races, seasonColor }: Props) {
  const [sortBy, setSortBy] = useState<SortKey>('volatility');

  const sorted = [...races].sort((a, b) => b[sortBy] - a[sortBy]);

  const maxVol = Math.max(...races.map(r => r.volatility), 0.0001);

  const COLS: { key: SortKey; label: string; desc: string }[] = [
    { key: 'volatility',       label: 'Volatility',   desc: 'Overall chaos score' },
    { key: 'inversions',       label: 'Inversions',   desc: 'Total lap inversions' },
    { key: 'onTrackOvertakes', label: 'On-Track',     desc: 'Real overtakes only' },
    { key: 'scInterventions',  label: 'SC/VSC',       desc: 'Safety car laps' },
  ];

  const medalColor = (idx: number) =>
    idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : '#404060';

  return (
    <div>
      {/* Sort controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{
          fontSize: 11, color: '#7070a0',
          letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: 4,
        }}>
          Rank by:
        </span>
        {COLS.map(col => (
          <button
            key={col.key}
            onClick={() => setSortBy(col.key)}
            title={col.desc}
            style={{
              padding: '5px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600,
              border: `1px solid ${sortBy === col.key ? seasonColor : '#2a2a3f'}`,
              background: sortBy === col.key ? `${seasonColor}22` : '#1a1a26',
              color: sortBy === col.key ? seasonColor : '#7070a0',
              cursor: 'pointer', letterSpacing: '0.05em', transition: 'all 0.15s',
            }}
          >
            {col.label}
          </button>
        ))}
      </div>

      {/* Header row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '36px 1fr 90px 90px 70px 70px',
        gap: 8,
        padding: '4px 12px',
        marginBottom: 6,
        fontSize: 10,
        color: '#505070',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}>
        <div style={{ textAlign: 'center' }}>#</div>
        <div>Race</div>
        <div style={{ textAlign: 'right' }}>Volatility</div>
        <div style={{ textAlign: 'right' }}>Inversions</div>
        <div style={{ textAlign: 'right' }}>On-Track</div>
        <div style={{ textAlign: 'right' }}>SC/VSC</div>
      </div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {sorted.map((race, idx) => {
          const volPct  = (race.volatility / maxVol) * 100;
          const isTop3  = idx < 3;
          const rankCol = medalColor(idx);

          return (
            <a
              key={race.round}
              href={race.href}
              style={{
                display: 'grid',
                gridTemplateColumns: '36px 1fr 90px 90px 70px 70px',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                background: isTop3 ? `${seasonColor}0d` : '#12121a',
                border: `1px solid ${isTop3 ? `${seasonColor}30` : '#1e1e2e'}`,
                borderRadius: 8,
                textDecoration: 'none',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = `${seasonColor}18`)}
              onMouseLeave={e => (e.currentTarget.style.background = isTop3 ? `${seasonColor}0d` : '#12121a')}
            >
              {/* Rank */}
              <div style={{
                fontFamily: 'monospace', fontWeight: 700, fontSize: 14,
                color: rankCol, textAlign: 'center',
              }}>
                {idx + 1}
              </div>

              {/* Race name + bar */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#e8e8f0', marginBottom: 4 }}>
                  R{race.round} — {race.shortName}
                </div>
                <div style={{ height: 3, background: '#1e1e2e', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${volPct}%`,
                    background: sortBy === 'volatility' ? seasonColor : '#3a3a5f',
                    borderRadius: 2, transition: 'width 0.3s',
                  }} />
                </div>
              </div>

              {/* Volatility */}
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontFamily: 'monospace', fontWeight: 700, fontSize: 13,
                  color: sortBy === 'volatility' ? seasonColor : '#e8e8f0',
                }}>
                  {race.volatility.toFixed(4)}
                </div>
              </div>

              {/* Inversions */}
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontFamily: 'monospace', fontWeight: 600, fontSize: 12,
                  color: sortBy === 'inversions' ? '#ff8700' : '#a0a0c0',
                }}>
                  {race.inversions.toLocaleString()}
                </div>
              </div>

              {/* On-track overtakes */}
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontFamily: 'monospace', fontWeight: 600, fontSize: 12,
                  color: sortBy === 'onTrackOvertakes' ? '#4caf50' : '#a0a0c0',
                }}>
                  {race.onTrackOvertakes}
                </div>
              </div>

              {/* SC/VSC count */}
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontFamily: 'monospace', fontWeight: 600, fontSize: 12,
                  color: sortBy === 'scInterventions' ? '#ffcc00' : '#a0a0c0',
                }}>
                  {race.scInterventions}
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
