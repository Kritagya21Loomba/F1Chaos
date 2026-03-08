"""
F1 Race Chaos Analyzer — Data Availability Checker

Quickly probes FastF1 to tell you whether a race's data is ready to ingest,
already ingested, or not yet available.  No lap data is downloaded — only the
lightweight results endpoint is checked.

Statuses
--------
  INGESTED   raw data file + metrics file both present locally
  FETCHED    raw data present but metrics haven't been computed yet
  AVAILABLE  FastF1 has the data; ready to run bulk_fetch + compute_inversions
  NOT YET    race hasn't happened, or FastF1 hasn't uploaded the data yet

Usage
-----
  # Check one specific race
  python analytics/check_race.py --year 2026 --round 4

  # Check every race in a season
  python analytics/check_race.py --year 2026

  # Check multiple seasons at once
  python analytics/check_race.py --year 2025 2026
"""
import argparse
import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")

# ── FastF1 + pandas ───────────────────────────────────────────────────────────
try:
    import fastf1
    import pandas as pd
except ImportError:
    print("ERROR: FastF1 and pandas are required.  Run: pip install -r requirements.txt")
    sys.exit(1)

# Pull the slug map from bulk_fetch so we never have two copies to keep in sync
sys.path.insert(0, str(Path(__file__).parent))
from bulk_fetch import location_to_slug

CACHE_DIR = Path("cache/fastf1")


def enable_cache():
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    fastf1.Cache.enable_cache(str(CACHE_DIR))


# ── Status logic ──────────────────────────────────────────────────────────────

def check_one(year: int, round_num: int, location: str, event_date) -> tuple[str, str, str]:
    """
    Return (status, race_id, detail_message) for a single race round.

    Checks are done in this order (cheapest first):
      1. Local file presence  — no network required
      2. Event date           — future races are immediately "NOT YET"
      3. FastF1 results probe — lightweight load, no laps/telemetry
    """
    slug     = location_to_slug(location)
    race_id  = f"{year}_{slug}"
    raw_path     = Path(f"data/{race_id}.json")
    metrics_path = Path(f"public/metrics/{race_id}.json")

    # ── 1. Local files ────────────────────────────────────────────────────────
    if raw_path.exists() and metrics_path.exists():
        return "INGESTED", race_id, "raw + metrics files already on disk"
    if raw_path.exists():
        return "FETCHED", race_id, "raw data present — run compute_inversions.py"

    # ── 2. Is the race still in the future? ───────────────────────────────────
    now  = pd.Timestamp.now(tz="UTC")
    date = pd.Timestamp(event_date)
    if date.tzinfo is None:
        date = date.tz_localize("UTC")

    if date > now:
        days = (date - now).days
        return "NOT YET", race_id, f"race in {days} day(s)"

    # ── 3. Probe FastF1 for results (no lap data downloaded) ──────────────────
    try:
        session = fastf1.get_session(year, round_num, "R")
        session.load(laps=False, telemetry=False, weather=False, messages=False)
        if session.results is not None and len(session.results) > 0:
            return "AVAILABLE", race_id, "FastF1 data ready — run bulk_fetch.py"
        else:
            return "NOT YET", race_id, "race held but FastF1 data not uploaded yet"
    except Exception as exc:
        short = str(exc).split("\n")[0][:60]
        return "NOT YET", race_id, f"FastF1 probe failed: {short}"


# ── Formatting ────────────────────────────────────────────────────────────────

_COLOR = {
    "INGESTED":  "\033[32m",   # green
    "FETCHED":   "\033[33m",   # yellow
    "AVAILABLE": "\033[36m",   # cyan
    "NOT YET":   "\033[90m",   # dark grey
}
_RESET = "\033[0m"


def fmt(status: str) -> str:
    return f"{_COLOR.get(status, '')}{status:<10}{_RESET}"


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Check whether F1 race data is available to ingest.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--year", type=int, nargs="+", default=[2025],
        help="Season year(s) to check, e.g. --year 2026  or  --year 2025 2026",
    )
    parser.add_argument(
        "--round", type=int, default=None,
        help="Only check one specific round number",
    )
    parser.add_argument(
        "--no-cache", dest="use_cache", action="store_false",
        help="Disable FastF1 disk cache",
    )
    args = parser.parse_args()

    if args.use_cache:
        enable_cache()

    for year in sorted(args.year):
        print(f"\n  {year} season")
        print(f"  {'─' * 68}")

        try:
            sched = fastf1.get_event_schedule(year, include_testing=False)
        except Exception as exc:
            print(f"  ERROR loading {year} schedule: {exc}")
            continue

        for _, ev in sched.iterrows():
            rnd      = int(ev["RoundNumber"])
            location = str(ev["Location"])
            name     = str(ev["EventName"])
            ev_date  = ev["EventDate"]

            if args.round and rnd != args.round:
                continue

            status, race_id, detail = check_one(year, rnd, location, ev_date)
            print(f"  R{rnd:02d}  {name:<42} {fmt(status)}  {race_id:<12}  {detail}")

    print()


if __name__ == "__main__":
    main()
