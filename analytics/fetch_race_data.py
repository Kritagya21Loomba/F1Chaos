"""
F1 Race Chaos Analyzer -- FastF1 Ingestion
Fetches live race data and converts it to the project's raw JSON schema.

Extracts:
  - Per-lap positions (existing)
  - Pit stop events per driver (new)
  - Safety Car / VSC lap ranges (new)
  - Per-lap track status (new)

Usage:
  python analytics/fetch_race_data.py --year 2025 --round 1
  python analytics/fetch_race_data.py --year 2025 --round 1 --no-cache
  python analytics/fetch_race_data.py --year 2026 --race "Australia"
"""
import argparse
import json
import os
import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")  # suppress pandas/fastf1 DeprecationWarnings

try:
    import fastf1
    import pandas as pd
except ImportError:
    print("ERROR: FastF1 is not installed.")
    print("Run:  pip install -r requirements.txt")
    sys.exit(1)


# ── Cache setup ───────────────────────────────────────────────────────────────

CACHE_DIR = Path("cache/fastf1")


def enable_cache():
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    fastf1.Cache.enable_cache(str(CACHE_DIR))
    print(f"  FastF1 cache: {CACHE_DIR.resolve()}")


# ── Status helpers ────────────────────────────────────────────────────────────

def classified_as_finisher(classified_pos) -> bool:
    """
    True when the driver is classified (finished or lapped but still running).
    ClassifiedPosition is numeric (1..N) for all classified results;
    non-numeric values ('R', 'D', 'W', 'NS', 'EX', 'F') mean not classified.
    """
    try:
        float(classified_pos)
        return True
    except (TypeError, ValueError):
        return False


def clean_status(row) -> str:
    """
    Determine FINISHED vs DNF from the results row.
    Uses ClassifiedPosition as the primary indicator so that 'Lapped',
    '+N Lap', etc. are all correctly treated as classified finishers.
    """
    if classified_as_finisher(row.get("ClassifiedPosition")):
        return "FINISHED"
    return "DNF"


# ── Grid position helper ──────────────────────────────────────────────────────

# ── Grid position helper ──────────────────────────────────────────────────────

def load_qualifying_grid(year, round_or_name) -> "dict[str, int] | None":
    """
    Load the qualifying session and return {driver_code: grid_position}.

    Drivers who didn't set a qualifying time (e.g. crash, mechanical) are
    assigned consecutive positions after the last classified qualifier, in the
    order FastF1 returns them.  Drivers absent from qualifying entirely (pit
    lane starters who skipped quali) are appended last.

    Returns None if the qualifying session cannot be loaded.
    """
    try:
        q = fastf1.get_session(year, round_or_name, "Q")
        q.load(laps=False, telemetry=False, weather=False, messages=False)
    except Exception:
        return None

    results = q.results[["Abbreviation", "Position"]].copy()
    results["_pos"] = pd.to_numeric(results["Position"], errors="coerce")

    classified = results[results["_pos"].notna()].sort_values("_pos")
    no_time    = results[results["_pos"].isna()]

    grid: dict[str, int] = {}
    for _, row in classified.iterrows():
        grid[str(row["Abbreviation"])] = int(row["_pos"])

    next_pos = max(grid.values()) + 1 if grid else 1
    for _, row in no_time.iterrows():
        grid[str(row["Abbreviation"])] = next_pos
        next_pos += 1

    print(f"  Qualifying grid loaded ({len(grid)} drivers)")
    return grid


def parse_grid(
    results_df: "pd.DataFrame",
    quali_grid: "dict[str, int] | None",
) -> list[str]:
    """
    Return driver abbreviations in grid (start) order.

    Priority:
    1. GridPosition from race results when valid (> 0).
    2. quali_grid dict built from the qualifying session.
    3. Order of appearance in results_df as a last resort.

    Drivers missing from quali_grid (pit-lane starters who skipped qualifying)
    are appended at the end in the order they appear in results_df.
    """
    df = results_df.copy()
    gp = pd.to_numeric(df["GridPosition"], errors="coerce")
    valid_gp = gp[gp > 0]

    # ── Path 1: race results carry valid grid positions ───────────────────────
    if not valid_gp.empty:
        max_gp = float(valid_gp.max())
        df["_grid"] = gp.where(gp > 0, other=max_gp + df.index.to_series().rank())
        return df.sort_values("_grid")["Abbreviation"].tolist()

    # ── Path 2: qualifying session data ──────────────────────────────────────
    if quali_grid:
        all_codes = df["Abbreviation"].tolist()
        next_pos  = max(quali_grid.values()) + 1

        assigned: dict[str, int] = {}
        for code in all_codes:
            if code in quali_grid:
                assigned[code] = quali_grid[code]
            else:
                # Pit-lane starter not in qualifying at all
                assigned[code] = next_pos
                next_pos += 1

        return sorted(all_codes, key=lambda c: assigned[c])

    # ── Path 3: fallback — results order as-is ────────────────────────────────
    print("  WARN: No grid position data available; using results row order.")
    return df["Abbreviation"].tolist()


# ── Finish order helper ───────────────────────────────────────────────────────

def parse_finish(results_df: "pd.DataFrame") -> list[str]:
    """
    Return codes in classified finish order.
    DNF drivers come last, ordered by lap they retired (most laps first).
    """
    df = results_df.copy()
    df["_pos"] = pd.to_numeric(df["ClassifiedPosition"], errors="coerce")

    finished = df[df["_pos"].notna()].sort_values("_pos")
    dnf_rows  = df[df["_pos"].isna()]

    order = list(finished["Abbreviation"])
    # DNF drivers: append with _DNF suffix
    for _, row in dnf_rows.iterrows():
        order.append(row["Abbreviation"] + "_DNF")
    return order


# ── Per-lap position builder ──────────────────────────────────────────────────

def build_lap_records(
    laps_df: "pd.DataFrame",
    all_codes: list[str],
    dnf_lap_map: dict[str, int],
    total_laps: int,
) -> list[dict]:
    """
    Convert FastF1 laps DataFrame into the per-lap positions schema.

    FastF1 `Position` column = running race position at the end of that lap.
    Missing entries for DNF drivers are forward-filled with last known position.
    """
    # Build lookup: {lap_number: {code: position}}
    lap_lookup: dict[int, dict[str, int]] = {}
    for _, row in laps_df.iterrows():
        ln = int(row["LapNumber"])
        code = str(row["Driver"])
        pos = row.get("Position", None)
        if pd.notna(pos):
            lap_lookup.setdefault(ln, {})[code] = int(pos)

    last_known: dict[str, int] = {}
    records: list[dict] = []

    for lap_num in range(1, total_laps + 1):
        this_lap = lap_lookup.get(lap_num, {})

        # Update rolling last-known position for every driver with data this lap
        for code, pos in this_lap.items():
            last_known[code] = pos

        # Build position map for this lap
        pos_map: dict[str, int] = {}
        for code in all_codes:
            dnf_lap = dnf_lap_map.get(code)
            has_retired = dnf_lap is not None and lap_num >= dnf_lap

            if has_retired:
                # Use retired position; key includes _DNF suffix
                fallback = last_known.get(code, len(all_codes))
                pos_map[code + "_DNF"] = fallback
            elif code in this_lap:
                pos_map[code] = this_lap[code]
            elif code in last_known:
                # Data gap (rare): use last known
                pos_map[code] = last_known[code]
            else:
                # No data at all yet for this driver (very early DNF)
                pos_map[code] = len(all_codes) + all_codes.index(code)

        # Sort entries by position value
        sorted_entries = sorted(pos_map.items(), key=lambda kv: kv[1])
        records.append({
            "lap": lap_num,
            "positions": [code for code, _ in sorted_entries],
        })

    return records


# ── DNF lap detection ─────────────────────────────────────────────────────────

def detect_dnf_laps(
    laps_df: "pd.DataFrame",
    dnf_codes: list[str],
    total_laps: int,
) -> dict[str, int]:
    """
    For each DNF driver, find the lap on which they effectively stopped.
    We use their max LapNumber as the last completed lap; DNF starts on lap+1
    (so positional data uses their last-known place from that lap onward).
    """
    result: dict[str, int] = {}
    for code in dnf_codes:
        driver_laps = laps_df[laps_df["Driver"] == code]["LapNumber"]
        if driver_laps.empty:
            result[code] = 1       # retired before even completing lap 1
        else:
            last_lap = int(driver_laps.max())
            # DNF becomes visible from the *next* lap (they don't appear there)
            result[code] = min(last_lap + 1, total_laps)
    return result


# ── Pit stop extraction ───────────────────────────────────────────────────────

def extract_pit_stops(laps_df: "pd.DataFrame", all_codes: list[str]) -> list[dict]:
    """
    Extract pit stop events from FastF1 laps data.
    Returns a list of {driver, lap, stint, compound, pit_duration_s} dicts.
    Pit duration is computed as PitOutTime - PitInTime when both are available.
    """
    pit_stops: list[dict] = []
    for code in all_codes:
        driver_laps = laps_df[laps_df["Driver"] == code].sort_values("LapNumber")
        for _, row in driver_laps.iterrows():
            pit_in = row.get("PitInTime")
            pit_out = row.get("PitOutTime")
            has_pit_in = pd.notna(pit_in)
            has_pit_out = pd.notna(pit_out)

            if not has_pit_in and not has_pit_out:
                continue

            lap_num = int(row["LapNumber"])
            stint = int(row["Stint"]) if pd.notna(row.get("Stint")) else None
            compound = str(row.get("Compound", "")) if pd.notna(row.get("Compound")) else None

            # Pit duration: time spent stationary in pit box (approximate)
            duration_s = None
            if has_pit_in and has_pit_out:
                delta = pit_out - pit_in
                duration_s = round(delta.total_seconds(), 2)

            pit_stops.append({
                "driver": code,
                "lap": lap_num,
                "is_in_lap": has_pit_in,
                "is_out_lap": has_pit_out,
                "stint": stint,
                "compound": compound,
                "pit_duration_s": duration_s,
            })
    return pit_stops


# ── Track status / SC / VSC extraction ────────────────────────────────────────

# FastF1 track status codes
_TRACK_STATUS = {
    "1": "AllClear",
    "2": "Yellow",
    "4": "SC",
    "5": "Red",
    "6": "VSC",
    "7": "VSCEnding",
}


def extract_sc_vsc_laps(
    laps_df: "pd.DataFrame",
    total_laps: int,
) -> dict:
    """
    Extract per-lap track status from the TrackStatus column in FastF1 laps.
    TrackStatus is a string of concatenated single-digit codes (e.g. '16' = Clear+VSC).

    Returns:
      {
        "sc_laps":  [list of lap numbers with Safety Car active],
        "vsc_laps": [list of lap numbers with VSC active],
        "red_flag_laps": [list of lap numbers with Red Flag],
        "yellow_laps": [list of lap numbers with Yellow Flag],
        "per_lap_status": [{"lap": N, "status": ["AllClear", ...]}]
      }
    """
    sc_laps = set()
    vsc_laps = set()
    red_flag_laps = set()
    yellow_laps = set()
    per_lap: dict[int, set[str]] = {lap: set() for lap in range(1, total_laps + 1)}

    has_track_status = "TrackStatus" in laps_df.columns

    if has_track_status:
        for _, row in laps_df.iterrows():
            lap_num = int(row["LapNumber"])
            ts = str(row.get("TrackStatus", ""))
            if not ts or ts == "nan":
                continue
            for ch in ts:
                label = _TRACK_STATUS.get(ch)
                if label:
                    per_lap.setdefault(lap_num, set()).add(label)
                    if ch == "4":
                        sc_laps.add(lap_num)
                    elif ch == "6":
                        vsc_laps.add(lap_num)
                    elif ch == "5":
                        red_flag_laps.add(lap_num)
                    elif ch == "2":
                        yellow_laps.add(lap_num)

    per_lap_list = []
    for lap in range(1, total_laps + 1):
        statuses = sorted(per_lap.get(lap, set()))
        per_lap_list.append({"lap": lap, "status": statuses if statuses else ["AllClear"]})

    return {
        "sc_laps": sorted(sc_laps),
        "vsc_laps": sorted(vsc_laps),
        "red_flag_laps": sorted(red_flag_laps),
        "yellow_laps": sorted(yellow_laps),
        "per_lap_status": per_lap_list,
    }


# ── Stint / tyre data extraction ─────────────────────────────────────────────

def extract_stint_data(laps_df: "pd.DataFrame", all_codes: list[str]) -> list[dict]:
    """
    Extract stint information per driver: stint number, compound, start/end laps.
    """
    stints: list[dict] = []
    for code in all_codes:
        driver_laps = laps_df[laps_df["Driver"] == code].sort_values("LapNumber")
        if driver_laps.empty:
            continue
        current_stint = None
        for _, row in driver_laps.iterrows():
            stint_num = int(row["Stint"]) if pd.notna(row.get("Stint")) else 0
            compound = str(row.get("Compound", "")) if pd.notna(row.get("Compound")) else "UNKNOWN"
            lap_num = int(row["LapNumber"])
            tyre_life = int(row["TyreLife"]) if pd.notna(row.get("TyreLife")) else None
            fresh = bool(row.get("FreshTyre", False)) if pd.notna(row.get("FreshTyre")) else None

            if current_stint is None or current_stint["stint"] != stint_num:
                if current_stint is not None:
                    stints.append(current_stint)
                current_stint = {
                    "driver": code,
                    "stint": stint_num,
                    "compound": compound,
                    "start_lap": lap_num,
                    "end_lap": lap_num,
                    "fresh_tyre": fresh,
                }
            else:
                current_stint["end_lap"] = lap_num
        if current_stint is not None:
            stints.append(current_stint)
    return stints


# ── Main fetch ────────────────────────────────────────────────────────────────

def fetch_race(
    year: int,
    round_or_name,
    use_cache: bool = True,
    grid_overrides: "dict[str, int] | None" = None,
) -> dict:
    """
    Fetch a race session and return the raw JSON dict matching the project schema.
    `round_or_name` can be an int (round number) or a string (e.g. "Australia").
    `grid_overrides` is an optional {driver_code: grid_position} dict that takes
    precedence over both the race session and qualifying session data.  Use this
    to correct back-of-grid draw order when FastF1 cannot determine it.
      Example: --grid-override '{"VER": 20, "STR": 21, "SAI": 22}'
    """
    if use_cache:
        enable_cache()

    print(f"\n  Loading session: {year} {round_or_name} Race ...")
    try:
        session = fastf1.get_session(year, round_or_name, "R")
        session.load(laps=True, telemetry=False, weather=False, messages=True)
    except Exception as exc:
        print(f"\n  ERROR: Could not load session — {exc}")
        print("  The race may not have happened yet, or FastF1 data is unavailable.")
        return None

    try:
        results = session.results
        laps_df = session.laps
        event   = session.event
    except Exception as exc:
        print(f"\n  ERROR: Session data not available — {exc}")
        print("  The race may not have happened yet.")
        return None

    total_laps = int(laps_df["LapNumber"].max()) if not laps_df.empty else 0
    if total_laps == 0:
        print("  ERROR: No lap data returned. Race may be incomplete.")
        return None

    # ── Drivers ───────────────────────────────────────────────────────────────
    drivers_list = []
    for _, row in results.iterrows():
        drivers_list.append({
            "code":   str(row["Abbreviation"]),
            "name":   str(row.get("FullName", row.get("BroadcastName", ""))),
            "team":   str(row.get("TeamName", "")),
            "status": clean_status(row),
        })

    all_codes   = [d["code"] for d in drivers_list]
    dnf_codes   = [d["code"] for d in drivers_list if d["status"] == "DNF"]

    # ── Grid & finish orders ──────────────────────────────────────────────────
    # Use qualifying session to get true grid positions if the race session
    # doesn't carry them (GridPosition = -1, seen in 2026+ FastF1 data).
    gp_col = pd.to_numeric(results["GridPosition"], errors="coerce")
    if not (gp_col > 0).any():
        print("  Race GridPosition unavailable — loading qualifying session ...")
        quali_grid = load_qualifying_grid(year, round_or_name)
    else:
        quali_grid = None

    # Apply manual overrides (highest priority — corrects back-of-grid draw order
    # that FastF1 cannot determine from timing data alone).
    if grid_overrides:
        if quali_grid is None:
            quali_grid = {}
        quali_grid.update(grid_overrides)
        print(f"  Grid overrides applied: {grid_overrides}")

    start_order  = parse_grid(results, quali_grid)
    finish_order = parse_finish(results)

    # ── DNF lap map ───────────────────────────────────────────────────────────
    dnf_lap_map = detect_dnf_laps(laps_df, dnf_codes, total_laps)
    print(f"  DNF drivers  : {dnf_lap_map if dnf_lap_map else 'none'}")

    # ── Per-lap records ───────────────────────────────────────────────────────
    print(f"  Building {total_laps} laps x {len(all_codes)} drivers ...")
    lap_records = build_lap_records(laps_df, all_codes, dnf_lap_map, total_laps)

    # ── Pit stops ─────────────────────────────────────────────────────────────
    pit_stops = extract_pit_stops(laps_df, all_codes)
    print(f"  Pit stops    : {len(pit_stops)} events")

    # ── SC / VSC / track status ───────────────────────────────────────────────
    track_status = extract_sc_vsc_laps(laps_df, total_laps)
    print(f"  SC laps      : {track_status['sc_laps'] or 'none'}")
    print(f"  VSC laps     : {track_status['vsc_laps'] or 'none'}")

    # ── Stint data ────────────────────────────────────────────────────────────
    stint_data = extract_stint_data(laps_df, all_codes)
    print(f"  Stints       : {len(stint_data)} total")

    # ── Assemble output ───────────────────────────────────────────────────────
    race_id = f"{year}_au"
    gp_name = str(event.get("EventName", "Australian Grand Prix"))
    circuit = str(event.get("Location",  "Albert Park"))
    rnd     = int(event.get("RoundNumber", 1))

    payload = {
        "race_id":      race_id,
        "year":         year,
        "round":        rnd,
        "grand_prix":   gp_name,
        "circuit":      circuit,
        "total_laps":   total_laps,
        "drivers":      drivers_list,
        "start_order":  start_order,
        "finish_order": finish_order,
        "laps":         lap_records,
        "pit_stops":    pit_stops,
        "track_status": track_status,
        "stints":       stint_data,
    }

    print(f"  Session      : {gp_name} {year}")
    print(f"  Circuit      : {circuit}")
    print(f"  Total laps   : {total_laps}")
    print(f"  Drivers      : {len(all_codes)}")
    return payload


# ── CLI entry point ───────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Fetch F1 race data via FastF1 and write project JSON."
    )
    parser.add_argument("--year",    type=int, required=True,  help="Season year, e.g. 2025")
    parser.add_argument("--round",   type=int, help="Round number (1-based)")
    parser.add_argument("--race",    type=str, default="Australia",
                        help='Race name or partial match, e.g. "Australia"')
    parser.add_argument("--no-cache", dest="use_cache", action="store_false",
                        help="Disable FastF1 disk cache")
    parser.add_argument("--out", type=str,
                        help="Override output path (default: data/{year}_au.json)")
    parser.add_argument(
        "--grid-override", dest="grid_override", type=str, default=None,
        help=(
            'JSON dict of manual grid positions, e.g. \'{"VER":20,"STR":21,"SAI":22}\'. '
            "Use this to correct back-of-grid draw order that FastF1 cannot determine."
        ),
    )
    args = parser.parse_args()

    grid_overrides = None
    if args.grid_override:
        try:
            import json as _json
            raw = _json.loads(args.grid_override)
            grid_overrides = {str(k): int(v) for k, v in raw.items()}
        except (ValueError, TypeError) as exc:
            print(f"ERROR: --grid-override must be valid JSON, e.g. '{{\"VER\":20}}' ({exc})")
            sys.exit(1)

    round_or_name = args.round if args.round else args.race
    data = fetch_race(args.year, round_or_name, use_cache=args.use_cache,
                      grid_overrides=grid_overrides)

    if data is None:
        sys.exit(1)

    out_path = args.out or f"data/{args.year}_au.json"
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"\n  Written: {out_path}")
    print("  Run `python analytics/compute_inversions.py` to regenerate metrics.\n")


if __name__ == "__main__":
    main()
