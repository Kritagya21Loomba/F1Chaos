"""
F1 Race Chaos Analyzer -- Bulk Race Fetcher
Fetches all race sessions for given seasons via FastF1.

Usage:
  python analytics/bulk_fetch.py                     # 2024 + 2025
  python analytics/bulk_fetch.py --years 2024
  python analytics/bulk_fetch.py --years 2024 2025 --force
  python analytics/bulk_fetch.py --dry-run            # print plan, don't fetch
"""
import argparse
import json
import sys
import warnings
from pathlib import Path

# Ensure the analytics/ directory is on the path so fetch_race_data can be imported
sys.path.insert(0, str(Path(__file__).parent))

warnings.filterwarnings("ignore")

try:
    import fastf1
    import pandas as pd
except ImportError:
    print("ERROR: FastF1 is not installed. Run: pip install -r requirements.txt")
    sys.exit(1)

# ── Location → short race slug ─────────────────────────────────────────────────
# Must be unique per venue (not per country — Italy and USA have multiple rounds).

LOCATION_SLUG: dict[str, str] = {
    # ── Circuit slugs ──────────────────────────────────────────────────────
    "Sakhir":              "bah",
    "Jeddah":              "sau",
    "Melbourne":           "au",
    "Suzuka":              "jap",
    "Shanghai":            "chn",
    "Miami":               "mia",
    "Miami Gardens":       "mia",
    "Imola":               "imo",
    "Monaco":              "mon",
    "Montr\u00e9al":       "can",   # Montréal with accent
    "Montreal":            "can",
    "Barcelona":           "esp",
    "Spielberg":           "aut",
    "Silverstone":         "gb",
    "Budapest":            "hun",
    "Spa-Francorchamps":   "bel",
    "Zandvoort":           "ned",
    "Monza":               "ita",
    "Baku":                "aze",
    "Marina Bay":          "sin",
    "Austin":              "usa",
    "Mexico City":         "mex",
    "S\u00e3o Paulo":      "bra",   # São Paulo with accent
    "Sao Paulo":           "bra",
    "Las Vegas":           "lv",
    "Lusail":              "qat",
    "Yas Island":          "abu",
    # Madrid / Hanoi / other future venues can be added here
    "Madrid":              "mad",
}


def location_to_slug(location: str) -> str:
    """Return the slug for a circuit location, with a fallback."""
    slug = LOCATION_SLUG.get(location)
    if slug:
        return slug
    # Fallback: first 3 lowercase alphanum chars of the location
    cleaned = "".join(c for c in location.lower() if c.isalpha())
    return cleaned[:3] or "unk"


def race_id(year: int, location: str) -> str:
    return f"{year}_{location_to_slug(location)}"


# ── Schedule loading ────────────────────────────────────────────────────────────

def get_schedule(year: int) -> list[dict]:
    """Return list of race event dicts for a given year (testing excluded)."""
    sched = fastf1.get_event_schedule(year, include_testing=False)
    races = []
    for _, ev in sched.iterrows():
        races.append({
            "year":     year,
            "round":    int(ev["RoundNumber"]),
            "location": str(ev["Location"]),
            "country":  str(ev["Country"]),
            "name":     str(ev["EventName"]),
            "race_id":  race_id(year, str(ev["Location"])),
        })
    return races


# ── Single race fetch (delegates to fetch_race_data.py logic) ──────────────────

def fetch_one(race: dict, use_cache: bool = True) -> bool:
    """
    Fetch a single race and write to data/{race_id}.json.
    Returns True on success, False on failure.
    """
    from fetch_race_data import fetch_race

    rid = race["race_id"]
    out_path = Path(f"data/{rid}.json")

    data = fetch_race(
        year=race["year"],
        round_or_name=race["round"],
        use_cache=use_cache,
    )

    if data is None:
        return False

    # Override race_id with our canonical slug-based id
    data["race_id"] = rid

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print(f"    Written: {out_path}")
    return True


# ── Main ────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Bulk-fetch F1 race data for full seasons.")
    parser.add_argument(
        "--years", type=int, nargs="+", default=[2024, 2025],
        help="Season years to fetch (default: 2024 2025)",
    )
    parser.add_argument(
        "--force", action="store_true",
        help="Re-fetch even if data file already exists",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Print the fetch plan without downloading anything",
    )
    parser.add_argument(
        "--no-cache", dest="use_cache", action="store_false",
        help="Disable FastF1 disk cache",
    )
    parser.add_argument(
        "--round", type=int, default=None,
        help="Only fetch a specific round number (useful for debugging)",
    )
    args = parser.parse_args()

    # ── Build the full task list ───────────────────────────────────────────────
    all_races: list[dict] = []
    for year in sorted(args.years):
        print(f"\nLoading {year} schedule ...")
        races = get_schedule(year)
        if args.round:
            races = [r for r in races if r["round"] == args.round]
        all_races.extend(races)

    # ── Print plan ─────────────────────────────────────────────────────────────
    print(f"\n{'-'*64}")
    print(f"  PLAN  {len(all_races)} races across {args.years}")
    print(f"{'-'*64}")

    to_fetch, to_skip = [], []
    for race in all_races:
        exists = Path(f"data/{race['race_id']}.json").exists()
        if exists and not args.force:
            to_skip.append(race)
        else:
            to_fetch.append(race)

    for race in to_skip:
        print(f"  SKIP   {race['year']} R{race['round']:02d}  {race['name']:<40}  (data/{race['race_id']}.json exists)")

    for race in to_fetch:
        status = "FETCH" if not args.dry_run else "WOULD FETCH"
        print(f"  {status}  {race['year']} R{race['round']:02d}  {race['name']:<40}  -> data/{race['race_id']}.json")

    if args.dry_run:
        print(f"\n  Dry run complete. {len(to_fetch)} races would be fetched, {len(to_skip)} skipped.")
        return

    if not to_fetch:
        print(f"\n  Nothing to fetch. Use --force to re-fetch existing files.")
        return

    # ── Fetch ──────────────────────────────────────────────────────────────────
    print(f"\n{'-'*64}")
    print(f"  Fetching {len(to_fetch)} races ...")
    print(f"{'-'*64}")

    passed, failed = [], []
    for i, race in enumerate(to_fetch, 1):
        print(f"\n[{i}/{len(to_fetch)}]  {race['year']} R{race['round']:02d} — {race['name']}")
        ok = fetch_one(race, use_cache=args.use_cache)
        if ok:
            passed.append(race)
        else:
            failed.append(race)
            print(f"  [FAIL] {race['race_id']} — skipping, keeping any existing file")

    # ── Summary ────────────────────────────────────────────────────────────────
    print(f"\n{'='*64}")
    print(f"  DONE  {len(passed)} fetched  |  {len(failed)} failed  |  {len(to_skip)} skipped")
    if failed:
        print(f"\n  Failed races:")
        for r in failed:
            print(f"    {r['year']} R{r['round']:02d}  {r['name']}")
    print()
    print(f"  Next: python analytics/compute_inversions.py")
    print()


if __name__ == "__main__":
    main()
