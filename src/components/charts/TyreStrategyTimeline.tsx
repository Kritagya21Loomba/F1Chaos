import React, { useState, useMemo } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Stint {
  driver: string;
  stint: number;
  compound: string;
  start_lap: number;
  end_lap: number;
  fresh_tyre: boolean;
}

interface PitEntry {
  driver: string;
  in_lap: number;
  out_lap: number;
  compound: string | null;
  duration_s: number | null;
  pos_before: number | null;
  pos_after: number | null;
  net_position_change: number | null;
}

interface Driver {
  code: string;
  name: string;
  team: string;
  status: string;
}

interface Props {
  stints: Stint[];
  pitImpact: PitEntry[];
  drivers: Driver[];
  totalLaps: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COMPOUND_COLORS: Record<string, string> = {
  SOFT:         '#e8002d',
  MEDIUM:       '#ffd700',
  HARD:         '#d8d8d8',
  INTERMEDIATE: '#39b54a',
  WET:          '#0067ff',
  UNKNOWN:      '#7070a0',
};

const TEAM_COLORS: Record<string, string> = {
  'McLaren':         '#FF8000',
  'Ferrari':         '#E8002D',
  'Red Bull Racing': '#3671C6',
  'Red Bull':        '#3671C6',
  'Mercedes':        '#27F4D2',
  'Aston Martin':    '#358C75',
  'Alpine':          '#FF87BC',
  'Williams':        '#64C4FF',
  'Racing Bulls':    '#6692FF',
  'RB':              '#6692FF',
  'Haas F1 Team':    '#B6BABD',
  'Haas':            '#B6BABD',
  'Audi':            '#52E252',
  'Sauber':          '#52E252',
  'Cadillac':        '#C0A020',
};

function teamColor(team: string): string {
  for (const [key, color] of Object.entries(TEAM_COLORS)) {
    if (team.includes(key) || key.includes(team)) return color;
  }
  return '#7070a0';
}

function compoundColor(c: string | null): string {
  return COMPOUND_COLORS[(c ?? '').toUpperCase()] ?? COMPOUND_COLORS.UNKNOWN;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TyreStrategyTimeline({ stints, pitImpact, drivers, totalLaps }: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(drivers.map(d => d.code))
  );
  const [tooltip, setTooltip] = useState<{
    driver: string;
    stint: Stint;
    pit: PitEntry | null;
    x: number;
    y: number;
  } | null>(null);

  const driverMap = useMemo(
    () => Object.fromEntries(drivers.map(d => [d.code, d])),
    [drivers]
  );

  // Build lookup: `DRIVER_inLap` → PitEntry
  const pitMap = useMemo(() => {
    const m: Record<string, PitEntry> = {};
    for (const p of pitImpact) {
      m[`${p.driver}_${p.in_lap}`] = p;
    }
    return m;
  }, [pitImpact]);

  // Group stints by driver
  const driverStints = useMemo(() => {
    const map: Record<string, Stint[]> = {};
    for (const s of stints) {
      (map[s.driver] = map[s.driver] ?? []).push(s);
    }
    return map;
  }, [stints]);

  // X-axis ticks
  const lapTicks = useMemo(() => {
    const ticks: number[] = [1];
    const step = totalLaps <= 30 ? 5 : totalLaps <= 60 ? 10 : 15;
    for (let i = step; i < totalLaps; i += step) ticks.push(i);
    if (ticks[ticks.length - 1] !== totalLaps) ticks.push(totalLaps);
    return [...new Set(ticks)];
  }, [totalLaps]);

  const toggle = (code: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const selectAll      = () => setSelected(new Set(drivers.map(d => d.code)));
  const selectNone     = () => setSelected(new Set());
  const selectFinished = () => setSelected(new Set(drivers.filter(d => d.status !== 'DNF').map(d => d.code)));

  const visibleDrivers = drivers.filter(d => selected.has(d.code));

  if (!stints.length) {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center', color: '#7070a0' }}>
        No stint data available for this race. Re-ingest with the updated fetch_race_data.py.
      </div>
    );
  }

  const ROW_H   = 30;
  const LABEL_W = 44;

  return (
    <div>
      {/* Quick-select */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#7070a0', letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: 4 }}>
          Quick select:
        </span>
        {[
          { label: 'All',       action: selectAll },
          { label: 'Finishers', action: selectFinished },
          { label: 'None',      action: selectNone },
        ].map(({ label, action }) => (
          <button
            key={label}
            onClick={action}
            style={{
              padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
              border: '1px solid #2a2a3f', background: '#1a1a26', color: '#e8e8f0',
              cursor: 'pointer', letterSpacing: '0.05em',
            }}
          >
            {label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#7070a0' }}>
          {visibleDrivers.length} / {drivers.length} drivers shown
        </span>
      </div>

      {/* Driver pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
        {drivers.map(driver => {
          const color  = teamColor(driver.team);
          const isDnf  = driver.status === 'DNF';
          const active = selected.has(driver.code);
          return (
            <button
              key={driver.code}
              onClick={() => toggle(driver.code)}
              title={`${driver.name} (${driver.team})${isDnf ? ' — DNF' : ''}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 20,
                border: `1.5px solid ${active ? color : '#2a2a3f'}`,
                background: active ? `${color}22` : 'transparent',
                color: active ? color : '#505070',
                fontFamily: 'monospace', fontWeight: 600, fontSize: 11, cursor: 'pointer',
                transition: 'all 0.15s', opacity: isDnf && !active ? 0.5 : 1,
                letterSpacing: '0.03em',
              }}
            >
              {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />}
              {driver.code}
              {isDnf && <span style={{ fontSize: 9, opacity: 0.7 }}>DNF</span>}
            </button>
          );
        })}
      </div>

      {/* Compound legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
        {Object.entries(COMPOUND_COLORS)
          .filter(([k]) => k !== 'UNKNOWN')
          .map(([name, color]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 20, height: 8, borderRadius: 4, background: color }} />
              <span style={{ fontSize: 11, color: '#7070a0' }}>
                {name.charAt(0) + name.slice(1).toLowerCase()}
              </span>
            </div>
          ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 8 }}>
          <div style={{ width: 20, height: 8, borderRadius: 4, background: '#888', opacity: 0.6, boxSizing: 'border-box', outline: '1.5px solid #555' }} />
          <span style={{ fontSize: 11, color: '#7070a0' }}>Used tyres</span>
        </div>
      </div>

      {/* Chart */}
      {visibleDrivers.length === 0 ? (
        <div style={{
          height: 120, background: '#12121a', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#7070a0', fontSize: 14,
        }}>
          Select at least one driver above
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {/* X-axis lap numbers */}
          <div style={{ display: 'flex', marginLeft: LABEL_W, marginBottom: 6, position: 'relative', height: 18 }}>
            {lapTicks.map(lap => (
              <div
                key={lap}
                style={{
                  position: 'absolute',
                  left: `${((lap - 1) / totalLaps) * 100}%`,
                  transform: 'translateX(-50%)',
                  fontSize: 10, color: '#505070', fontFamily: 'monospace',
                }}
              >
                {lap}
              </div>
            ))}
          </div>

          {/* Driver rows */}
          {visibleDrivers.map(driver => {
            const dStints = driverStints[driver.code] ?? [];
            const color   = teamColor(driver.team);
            return (
              <div key={driver.code} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                <div style={{
                  width: LABEL_W, flexShrink: 0, fontSize: 11,
                  fontFamily: 'monospace', fontWeight: 700, color,
                  textAlign: 'right', paddingRight: 8, letterSpacing: '0.04em',
                }}>
                  {driver.code}
                </div>
                <div style={{
                  flex: 1, position: 'relative',
                  height: ROW_H - 4, background: '#141420', borderRadius: 4,
                }}>
                  {dStints.map(stint => {
                    const left  = ((stint.start_lap - 1) / totalLaps) * 100;
                    const width = ((stint.end_lap - stint.start_lap + 1) / totalLaps) * 100;
                    const bgColor = compoundColor(stint.compound);
                    const isUsed  = !stint.fresh_tyre;
                    const pitBefore = pitMap[`${driver.code}_${stint.start_lap - 1}`] ?? null;

                    return (
                      <div
                        key={stint.stint}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.filter = 'brightness(1.25)';
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setTooltip({
                            driver: driver.code,
                            stint,
                            pit: pitBefore,
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                          });
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.filter = '';
                          setTooltip(null);
                        }}
                        style={{
                          position: 'absolute',
                          left: `${left}%`,
                          width: `calc(${width}% - 2px)`,
                          top: 2, bottom: 2,
                          background: bgColor,
                          opacity: isUsed ? 0.65 : 1,
                          borderRadius: 3,
                          cursor: 'pointer',
                          boxShadow: isUsed ? 'inset 0 0 0 1.5px rgba(0,0,0,0.4)' : undefined,
                          transition: 'filter 0.1s',
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* X-axis line + label */}
          <div style={{ marginLeft: LABEL_W, borderTop: '1px solid #2a2a3f', marginTop: 6 }} />
          <div style={{ textAlign: 'center', marginTop: 6, fontSize: 11, color: '#505070', marginLeft: LABEL_W }}>
            Lap
          </div>

          {/* Tooltip (fixed so it escapes overflow:hidden parents) */}
          {tooltip && (
            <div
              style={{
                position: 'fixed',
                left: tooltip.x,
                top: tooltip.y,
                transform: 'translate(-50%, calc(-100% - 8px))',
                background: '#12121a',
                border: '1px solid #2a2a3f',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 12,
                pointerEvents: 'none',
                zIndex: 9999,
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 24px rgba(0,0,0,0.65)',
                minWidth: 180,
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <div style={{
                  width: 22, height: 10, borderRadius: 3,
                  background: compoundColor(tooltip.stint.compound),
                  opacity: tooltip.stint.fresh_tyre ? 1 : 0.7,
                }} />
                <span style={{ fontWeight: 700, color: '#e8e8f0', fontSize: 13 }}>
                  {tooltip.driver} — {tooltip.stint.compound.charAt(0) + tooltip.stint.compound.slice(1).toLowerCase()}
                </span>
                {!tooltip.stint.fresh_tyre && (
                  <span style={{
                    fontSize: 10, color: '#7070a0',
                    border: '1px solid #3a3a5f', borderRadius: 4, padding: '1px 5px',
                  }}>
                    USED
                  </span>
                )}
              </div>

              {/* Stint info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px', marginBottom: 6 }}>
                <div>
                  <div style={{ color: '#7070a0', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Stint</div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 600, color: '#e8e8f0' }}>
                    L{tooltip.stint.start_lap}–L{tooltip.stint.end_lap}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#7070a0', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Laps on tyre</div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 600, color: '#e8e8f0' }}>
                    {tooltip.stint.end_lap - tooltip.stint.start_lap + 1}
                  </div>
                </div>
              </div>

              {/* Pit info (if available) */}
              {tooltip.pit && (
                <>
                  <div style={{ borderTop: '1px solid #2a2a3f', margin: '8px 0' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px' }}>
                    <div>
                      <div style={{ color: '#7070a0', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Pit lap</div>
                      <div style={{ fontFamily: 'monospace', fontWeight: 600, color: '#e8e8f0' }}>
                        L{tooltip.pit.in_lap}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#7070a0', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Duration</div>
                      <div style={{ fontFamily: 'monospace', fontWeight: 600, color: '#e8e8f0' }}>
                        {tooltip.pit.duration_s != null ? `${tooltip.pit.duration_s.toFixed(1)}s` : '—'}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#7070a0', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Pos before</div>
                      <div style={{ fontFamily: 'monospace', fontWeight: 600, color: '#e8e8f0' }}>
                        {tooltip.pit.pos_before != null ? `P${tooltip.pit.pos_before}` : '—'}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#7070a0', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Pos after</div>
                      <div style={{ fontFamily: 'monospace', fontWeight: 600, color: '#e8e8f0' }}>
                        {tooltip.pit.pos_after != null ? `P${tooltip.pit.pos_after}` : '—'}
                      </div>
                    </div>
                    {tooltip.pit.net_position_change != null && (
                      <div style={{ gridColumn: 'span 2' }}>
                        <div style={{ color: '#7070a0', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Net change</div>
                        <div style={{
                          fontFamily: 'monospace', fontWeight: 700, fontSize: 14,
                          color: tooltip.pit.net_position_change > 0
                            ? '#4caf50'
                            : tooltip.pit.net_position_change < 0
                              ? '#ef5350'
                              : '#7070a0',
                        }}>
                          {tooltip.pit.net_position_change > 0 ? '+' : ''}{tooltip.pit.net_position_change} pos
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
