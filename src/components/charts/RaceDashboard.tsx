import TabContainer from '../TabContainer';
import CollapsibleSection from '../CollapsibleSection';
import OverviewChart from './OverviewChart';
import VolatilityChart from './VolatilityChart';
import CumulativeChart from './CumulativeChart';
import DriverMovementChart from './DriverMovementChart';
import PositionHeatmap from './PositionHeatmap';
import LapPositionChart from './LapPositionChart';
import ChaosTimeline from './ChaosTimeline';
import OvertakeSummary from './OvertakeSummary';
import AdjustedVolatility from './AdjustedVolatility';
import DriverBattleIndex from './DriverBattleIndex';
import TyreStrategyTimeline from './TyreStrategyTimeline';
import NoSCSimulator from './NoSCSimulator';
import MomentumTracker from './MomentumTracker';
import StrategyChaosScore from './StrategyChaosScore';

interface RaceMetrics {
  volatility_score: number;
  total_lap_inversions: number;
  total_inversions: number;
  total_laps: number;
  grid_size: number;
  inversions_per_lap: { lap: number; inversions: number }[];
  cumulative_inversions: { lap: number; cumulative: number }[];
  position_matrix: number[][];
  drivers: { code: string; name: string; team: string; color?: string }[];
  driver_movements: any[];
  chaos_timeline?: any[];
  overtake_summary?: any;
  pit_adjusted?: any;
  sc_neutralized?: any;
  driver_battles?: any[];
  stints?: any[];
  pit_impact?: any[];
  no_sc_sim?: any;
  momentum?: any;
  strategy_score?: any;
  track_status?: any;
}

interface Props {
  metrics: RaceMetrics;
  color: string;
  year: number;
}

export default function RaceDashboard({ metrics: m, color, year }: Props) {
  const chaosTimeline = m.chaos_timeline ?? [];
  const overtakeSummary = m.overtake_summary ?? null;
  const pitAdjusted = m.pit_adjusted ?? null;
  const scNeutralized = m.sc_neutralized ?? null;
  const driverBattles = m.driver_battles ?? [];
  const stints = m.stints ?? [];
  const pitImpact = m.pit_impact ?? [];
  const noScSim = m.no_sc_sim ?? null;
  const momentum = m.momentum ?? null;
  const strategyScore = m.strategy_score ?? null;
  const trackStatus = m.track_status ?? {};

  // Check what features are available
  const hasStrategy = stints.length > 0 || driverBattles.length > 0 || (overtakeSummary && overtakeSummary.total > 0);
  const hasSimulations = (noScSim && noScSim.sc_laps_removed > 0) || (momentum && momentum.per_lap?.length > 0);

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      content: (
        <div>
          {/* Combined chart */}
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <OverviewChart
              inversionsPerLap={m.inversions_per_lap}
              cumulativeInversions={m.cumulative_inversions}
              volatilityScore={m.volatility_score}
              totalLapInversions={m.total_lap_inversions}
              color={color}
              height={260}
            />
          </div>

          {/* Chaos Timeline if available */}
          {chaosTimeline.length > 0 && (
            <CollapsibleSection
              title="Chaos Timeline"
              description="Lap-by-lap breakdown of overtaking activity by type"
              defaultOpen={true}
              accentColor={color}
            >
              <div style={{ height: 280 }}>
                <ChaosTimeline data={chaosTimeline} color={color} height={280} />
              </div>
            </CollapsibleSection>
          )}

          {/* Quick stats in collapsible */}
          {pitAdjusted && (
            <CollapsibleSection
              title="Adjusted Volatility"
              description="Compare raw, pit-adjusted, and SC-neutralized curves"
              defaultOpen={false}
              accentColor={color}
            >
              <AdjustedVolatility
                raw={m.inversions_per_lap}
                pitAdjusted={pitAdjusted.inversions_per_lap}
                scNeutralized={scNeutralized?.inversions_per_lap ?? m.inversions_per_lap}
                rawVolatility={m.volatility_score}
                pitAdjustedVolatility={pitAdjusted.volatility_score}
                scNeutralizedVolatility={scNeutralized?.volatility_score ?? m.volatility_score}
                scLaps={trackStatus.sc_laps ?? []}
                vscLaps={trackStatus.vsc_laps ?? []}
                color={color}
                height={320}
              />
            </CollapsibleSection>
          )}
        </div>
      )
    },
    {
      id: 'positions',
      label: 'Positions',
      content: (
        <div>
          {/* Lap Position Chart - main focus */}
          <div className="card" style={{ marginBottom: 20, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#e10600', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 4, height: 14, background: '#e10600', borderRadius: 2 }}></span>
              Lap-by-Lap Position Tracker
            </div>
            <LapPositionChart
              positionMatrix={m.position_matrix}
              drivers={m.drivers}
              totalDrivers={m.grid_size}
            />
          </div>

          {/* Grid of secondary visualizations */}
          <div className="tab-grid-2">
            <CollapsibleSection
              title="Position Heatmap"
              description="Visual grid showing position evolution across all laps"
              defaultOpen={true}
              accentColor={color}
            >
              <PositionHeatmap
                matrix={m.position_matrix}
                drivers={m.drivers}
                labelEvery={5}
              />
            </CollapsibleSection>

            <CollapsibleSection
              title="Driver Movement"
              description="Positions gained or lost from grid to finish"
              defaultOpen={true}
              accentColor={color}
            >
              <div style={{ height: 360 }}>
                <DriverMovementChart data={m.driver_movements} height={360} />
              </div>
            </CollapsibleSection>
          </div>
        </div>
      )
    },
    {
      id: 'chaos',
      label: 'Chaos Analysis',
      content: (
        <div>
          {/* Side by side volatility charts */}
          <div className="tab-grid-2" style={{ marginBottom: 20 }}>
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#e10600', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 4, height: 14, background: '#e10600', borderRadius: 2 }}></span>
                Inversions Per Lap
              </div>
              <div style={{ height: 240 }}>
                <VolatilityChart data={m.inversions_per_lap} color={color} height={240} />
              </div>
            </div>
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#e10600', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 4, height: 14, background: '#e10600', borderRadius: 2 }}></span>
                Cumulative Inversions
              </div>
              <div style={{ height: 240 }}>
                <CumulativeChart data={m.cumulative_inversions} color={color} height={240} />
              </div>
            </div>
          </div>

          {/* Chaos Timeline full width */}
          {chaosTimeline.length > 0 && (
            <div className="card" style={{ padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#e10600', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 4, height: 14, background: '#e10600', borderRadius: 2 }}></span>
                Race Chaos Timeline
              </div>
              <p style={{ fontSize: 12, color: '#7070a0', marginBottom: 16 }}>
                Green = on-track passes, Orange = pit-cycle, Yellow = SC/VSC, Red = DNF gains
              </p>
              <div style={{ height: 280 }}>
                <ChaosTimeline data={chaosTimeline} color={color} height={280} />
              </div>
            </div>
          )}

          {/* Adjusted volatility */}
          {pitAdjusted && (
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#e10600', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 4, height: 14, background: '#e10600', borderRadius: 2 }}></span>
                Adjusted Volatility Comparison
              </div>
              <AdjustedVolatility
                raw={m.inversions_per_lap}
                pitAdjusted={pitAdjusted.inversions_per_lap}
                scNeutralized={scNeutralized?.inversions_per_lap ?? m.inversions_per_lap}
                rawVolatility={m.volatility_score}
                pitAdjustedVolatility={pitAdjusted.volatility_score}
                scNeutralizedVolatility={scNeutralized?.volatility_score ?? m.volatility_score}
                scLaps={trackStatus.sc_laps ?? []}
                vscLaps={trackStatus.vsc_laps ?? []}
                color={color}
                height={320}
              />
            </div>
          )}
        </div>
      )
    },
    {
      id: 'strategy',
      label: 'Strategy',
      disabled: !hasStrategy,
      content: (
        <div>
          {/* Tyre Strategy full width */}
          {stints.length > 0 && (
            <div className="card" style={{ padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#e10600', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 4, height: 14, background: '#e10600', borderRadius: 2 }}></span>
                Tyre Strategy Timeline
              </div>
              <TyreStrategyTimeline
                stints={stints}
                pitImpact={pitImpact}
                drivers={m.drivers}
                totalLaps={m.total_laps}
              />
            </div>
          )}

          {/* Two column: Battles + Overtakes */}
          <div className="tab-grid-2">
            {driverBattles.length > 0 && (
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#e10600', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 4, height: 14, background: '#e10600', borderRadius: 2 }}></span>
                  Driver Battles
                </div>
                <DriverBattleIndex battles={driverBattles} drivers={m.drivers} />
              </div>
            )}

            {overtakeSummary && overtakeSummary.total > 0 && (
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#e10600', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 4, height: 14, background: '#e10600', borderRadius: 2 }}></span>
                  Overtake Classification
                </div>
                <OvertakeSummary summary={overtakeSummary} />
              </div>
            )}

            {strategyScore && (
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#e10600', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 4, height: 14, background: '#e10600', borderRadius: 2 }}></span>
                  Strategy Chaos Score
                </div>
                <StrategyChaosScore data={strategyScore} />
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      id: 'simulations',
      label: 'Simulations',
      disabled: !hasSimulations,
      content: (
        <div>
          <div className="tab-grid-2">
            {/* No SC Simulator */}
            {noScSim && noScSim.sc_laps_removed > 0 && (
              <div className={momentum && momentum.per_lap?.length > 0 ? '' : 'full-width'}>
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#e10600', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 4, height: 14, background: '#e10600', borderRadius: 2 }}></span>
                    What If No Safety Car?
                  </div>
                  <p style={{ fontSize: 12, color: '#7070a0', marginBottom: 16 }}>
                    Simulates volatility with SC/VSC laps removed
                  </p>
                  <NoSCSimulator
                    noScSim={noScSim}
                    inversionsPerLap={m.inversions_per_lap}
                    volatilityScore={m.volatility_score}
                    totalLaps={m.total_laps}
                    totalLapInversions={m.total_lap_inversions}
                  />
                </div>
              </div>
            )}

            {/* Momentum Tracker */}
            {momentum && momentum.per_lap?.length > 0 && (
              <div className={noScSim && noScSim.sc_laps_removed > 0 ? '' : 'full-width'}>
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#e10600', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 4, height: 14, background: '#e10600', borderRadius: 2 }}></span>
                    Momentum Tracker
                  </div>
                  <p style={{ fontSize: 12, color: '#7070a0', marginBottom: 16 }}>
                    Rolling {momentum.window}-lap position change per driver
                  </p>
                  <MomentumTracker
                    momentumPerLap={momentum.per_lap}
                    drivers={m.drivers}
                    window={momentum.window}
                    peakMomentum={momentum.peak_momentum}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )
    }
  ];

  return (
    <TabContainer 
      tabs={tabs.filter(t => !t.disabled || t.id === 'strategy' || t.id === 'simulations')} 
      defaultTab="overview" 
      accentColor={color} 
    />
  );
}
