import { useState, useRef } from 'react';

interface RaceBar {
  round: number;
  shortName: string;
  circuit: string;
  volatility: number;
  inversions: number;
  href: string;
}

interface Props {
  races: RaceBar[];
  color: string;
}

export default function SeasonBarChart({ races, color }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; race: RaceBar } | null>(null);

  const sorted = [...races].sort((a, b) => a.round - b.round);
  const maxVol = Math.max(...sorted.map(r => r.volatility));

  const handleEnter = (e: React.MouseEvent, race: RaceBar) => {
    (e.currentTarget as HTMLElement).style.opacity = '1';
    (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
    if (!rootRef.current) return;
    const barRect  = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const rootRect = rootRef.current.getBoundingClientRect();
    setTooltip({
      x: barRect.left - rootRect.left + barRect.width / 2,
      y: barRect.top  - rootRect.top  - 4,
      race,
    });
  };

  const handleLeave = (e: React.MouseEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = '0.75';
    (e.currentTarget as HTMLElement).style.transform = 'none';
    setTooltip(null);
  };

  return (
    <div ref={rootRef} style={{ position: 'relative', width: '100%' }}>
      {/* Bars */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 140 }}>
        {sorted.map((race) => {
          const pct = maxVol > 0 ? (race.volatility / maxVol) * 100 : 0;
          return (
            <a
              key={race.round}
              href={race.href}
              style={{
                flex: 1,
                minWidth: 18,
                height: `${Math.max(pct, 3)}%`,
                background: color,
                opacity: 0.75,
                borderRadius: '3px 3px 0 0',
                display: 'block',
                transition: 'opacity 0.15s, transform 0.1s',
                textDecoration: 'none',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => handleEnter(e, race)}
              onMouseLeave={handleLeave}
            />
          );
        })}
      </div>

      {/* 3-letter race labels, always visible */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 4,
        marginTop: 6,
        borderTop: '1px solid #2a2a3f',
        paddingTop: 6,
      }}>
        {sorted.map((race) => (
          <a
            key={race.round}
            href={race.href}
            style={{
              flex: 1,
              minWidth: 18,
              fontSize: 9,
              color: '#7070a0',
              textAlign: 'center',
              textDecoration: 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              letterSpacing: '0.04em',
              flexShrink: 0,
            }}
            title={`R${race.round} — ${race.shortName}`}
          >
            {race.shortName.slice(0, 3).toUpperCase()}
          </a>
        ))}
      </div>

      {/* Styled tooltip */}
      {tooltip && (
        <div style={{
          position: 'absolute',
          left: tooltip.x,
          top: tooltip.y,
          transform: 'translate(-50%, -100%)',
          background: '#12121a',
          border: '1px solid #2a2a3f',
          borderRadius: 8,
          padding: '10px 14px',
          fontSize: 12,
          pointerEvents: 'none',
          zIndex: 50,
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}>
          <div style={{ color: '#7070a0', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
            Round {tooltip.race.round}
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#e8e8f0', marginBottom: 2 }}>
            {tooltip.race.shortName}
          </div>
          <div style={{ color: '#7070a0', fontSize: 11, marginBottom: 10 }}>
            {tooltip.race.circuit}
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <div>
              <div style={{ color, fontFamily: 'monospace', fontWeight: 700, fontSize: 18 }}>
                {tooltip.race.volatility}
              </div>
              <div style={{ color: '#7070a0', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Volatility
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 18, color: '#e8e8f0' }}>
                {tooltip.race.inversions.toLocaleString()}
              </div>
              <div style={{ color: '#7070a0', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Inversions
              </div>
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 10, color }}>Click to explore</div>
        </div>
      )}
    </div>
  );
}
