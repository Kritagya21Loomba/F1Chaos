"""
F1 Race Chaos Analyzer -- Full Pipeline
Fetches race data via FastF1, then runs analytics in one command.

Usage:
  # Refresh both races (AU25 + AU26):
  python analytics/pipeline.py

  # Single race:
  python analytics/pipeline.py --year 2025
  python analytics/pipeline.py --year 2026

  # Skip fetch, just recompute metrics from existing data/:
  python analytics/pipeline.py --compute-only
"""
import argparse
import subprocess
import sys
from pathlib import Path

RACES = [
    {"year": 2025, "race": "Australia", "data_file": "data/2025_au.json"},
    {"year": 2026, "race": "Australia", "data_file": "data/2026_au.json"},
]

ANALYTICS_OUTPUT = [
    ("data/2025_au.json", "public/metrics/2025_au.json"),
    ("data/2026_au.json", "public/metrics/2026_au.json"),
]


def run(cmd: list[str]) -> bool:
    """Run a subprocess command. Returns True if it exited cleanly."""
    result = subprocess.run(cmd, check=False)
    return result.returncode == 0


def fetch_race(year: int, race: str, use_cache: bool) -> bool:
    cmd = [
        sys.executable, "analytics/fetch_race_data.py",
        "--year", str(year),
        "--race", race,
    ]
    if not use_cache:
        cmd.append("--no-cache")

    print(f"\n{'='*60}")
    print(f"  FETCH  {year} {race} Grand Prix")
    print(f"{'='*60}")
    return run(cmd)


def compute_metrics() -> bool:
    print(f"\n{'='*60}")
    print("  COMPUTE  analytics (all races)")
    print(f"{'='*60}\n")
    return run([sys.executable, "analytics/compute_inversions.py"])


def main():
    parser = argparse.ArgumentParser(description="F1 Chaos Analyzer pipeline")
    parser.add_argument("--year", type=int, choices=[2025, 2026],
                        help="Only process this year (default: both)")
    parser.add_argument("--compute-only", action="store_true",
                        help="Skip FastF1 fetch, just rerun analytics")
    parser.add_argument("--no-cache", dest="use_cache", action="store_false",
                        help="Disable FastF1 disk cache during fetch")
    args = parser.parse_args()

    races = [r for r in RACES if args.year is None or r["year"] == args.year]

    if not args.compute_only:
        results = {}
        for race_cfg in races:
            ok = fetch_race(race_cfg["year"], race_cfg["race"], args.use_cache)
            results[race_cfg["year"]] = ok
            if not ok:
                print(f"\n  [WARN] Fetch failed for {race_cfg['year']} -- "
                      "keeping existing data file (if any).")

    ok = compute_metrics()
    if not ok:
        print("\n  ERROR: Analytics compute failed.")
        sys.exit(1)

    print("\n  Pipeline complete.")
    print("  Next: rebuild the site with `npm run build`\n")


if __name__ == "__main__":
    main()
