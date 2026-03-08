"""
F1 Race Chaos Analyzer — Analytics Engine
Computes inversion-based metrics from raw race JSON.

Algorithms:
  - MergeSort-based inversion counter: start→finish total inversions
  - Fenwick Tree (BIT): per-lap inversion counting
  - DNF-aware: skips _DNF entries in all calculations
"""
import json
import math
import sys
import os


# ── MergeSort Inversion Counter ───────────────────────────────────────────────

def merge_count(arr):
    """Return (sorted_arr, inversion_count) using merge sort."""
    if len(arr) <= 1:
        return arr, 0

    mid = len(arr) // 2
    left, left_inv = merge_count(arr[:mid])
    right, right_inv = merge_count(arr[mid:])

    merged = []
    inversions = left_inv + right_inv
    i = j = 0

    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            merged.append(left[i])
            i += 1
        else:
            merged.append(right[j])
            inversions += len(left) - i
            j += 1

    merged.extend(left[i:])
    merged.extend(right[j:])
    return merged, inversions


def count_inversions_between(order_a, order_b):
    """
    Count inversions between two orderings.
    Maps order_a elements to indices [0,1,2,...] then checks
    how many pairs in order_b are out of that relative order.
    DNF entries are excluded.
    """
    a_clean = [d for d in order_a if not d.endswith("_DNF")]
    b_clean = [d for d in order_b if not d.endswith("_DNF")]

    # Only consider drivers present in both
    common = [d for d in a_clean if d in b_clean]

    # Map driver to its rank in order_a
    rank = {d: i for i, d in enumerate(common)}

    # Get rank sequence as it appears in order_b
    seq = [rank[d] for d in b_clean if d in rank]

    _, inv = merge_count(seq)
    return inv


# ── Fenwick Tree (Binary Indexed Tree) ───────────────────────────────────────

class FenwickTree:
    def __init__(self, n):
        self.n = n
        self.tree = [0] * (n + 1)

    def update(self, i, delta=1):
        i += 1  # 1-indexed
        while i <= self.n:
            self.tree[i] += delta
            i += i & (-i)

    def query(self, i):
        i += 1  # 1-indexed
        s = 0
        while i > 0:
            s += self.tree[i]
            i -= i & (-i)
        return s

    def range_query(self, l, r):
        if l > r:
            return 0
        return self.query(r) - (self.query(l - 1) if l > 0 else 0)


def count_inversions_fenwick(seq):
    """Count inversions in seq using a Fenwick tree."""
    if not seq:
        return 0
    n = max(seq) + 1
    bit = FenwickTree(n)
    inv = 0
    for val in reversed(seq):
        inv += bit.query(val - 1) if val > 0 else 0
        bit.update(val)
    return inv


# ── Core Metrics Computation ──────────────────────────────────────────────────

def compute_metrics(raw):
    race_id     = raw["race_id"]
    year        = raw["year"]
    start_order = raw["start_order"]
    finish_order = raw["finish_order"]
    laps_data   = raw["laps"]
    drivers_info = raw["drivers"]
    total_laps  = raw.get("total_laps", len(laps_data))

    # Active (finished) drivers for rank mapping
    active_start = [d for d in start_order if not d.endswith("_DNF")]
    rank_in_start = {d: i for i, d in enumerate(active_start)}

    # DNF lookup: driver code → lap of retirement
    dnf_lap_map = {}
    for lap in laps_data:
        for pos in lap["positions"]:
            if pos.endswith("_DNF"):
                code = pos.replace("_DNF", "")
                if code not in dnf_lap_map:
                    dnf_lap_map[code] = lap["lap"]

    # ── Per-lap inversions (vs start_order reference) ─────────────────────────
    inversions_per_lap = []
    cumulative = 0
    cumulative_inversions = []

    for lap in laps_data:
        positions = lap["positions"]
        # Clean: only active drivers present in start ranking
        active = [d for d in positions if not d.endswith("_DNF") and d in rank_in_start]
        seq = [rank_in_start[d] for d in active]
        inv = count_inversions_fenwick(seq)
        inversions_per_lap.append({"lap": lap["lap"], "inversions": inv})
        cumulative += inv
        cumulative_inversions.append({"lap": lap["lap"], "cumulative": cumulative})

    # ── Start → Finish total inversions ──────────────────────────────────────
    total_inversions = count_inversions_between(start_order, finish_order)

    # Also use the max of the cumulative series as a measure of total turbulence
    total_lap_inversions = cumulative_inversions[-1]["cumulative"] if cumulative_inversions else 0

    grid_size = len(active_start)
    max_possible = grid_size * (grid_size - 1) // 2

    volatility_score = round(total_lap_inversions / (grid_size * total_laps), 4) if grid_size * total_laps > 0 else 0

    # ── Driver movement ───────────────────────────────────────────────────────
    # start position (0-indexed, lower = better)
    start_pos = {d: i for i, d in enumerate(start_order)}

    # finish position
    finish_pos = {}
    for i, d in enumerate(finish_order):
        code = d.replace("_DNF", "")
        finish_pos[code] = i

    driver_movements = []
    for driver in drivers_info:
        code = driver["code"]
        dnf = driver["status"] == "DNF"
        s = start_pos.get(code, None)
        f = finish_pos.get(code, None)

        if s is not None and f is not None:
            delta = s - f   # positive = gained positions (moved forward)
            driver_movements.append({
                "code": code,
                "name": driver["name"],
                "team": driver["team"],
                "start_pos": s + 1,   # 1-indexed for display
                "finish_pos": f + 1,
                "positions_gained": delta,
                "dnf": dnf,
                "dnf_lap": dnf_lap_map.get(code),
            })

    driver_movements.sort(key=lambda x: x["finish_pos"])

    # ── Biggest mover & most overtaken ───────────────────────────────────────
    finished = [d for d in driver_movements if not d["dnf"]]
    if finished:
        biggest_mover = max(finished, key=lambda d: d["positions_gained"])
        most_overtaken = min(finished, key=lambda d: d["positions_gained"])
    else:
        biggest_mover = most_overtaken = None

    # ── Position matrix (for heatmap) ─────────────────────────────────────────
    all_codes = [d["code"] for d in drivers_info]
    position_matrix = []
    for lap in laps_data:
        row = {"lap": lap["lap"]}
        pos_map = {}
        # Separate active (classified) and DNF entries so that DNF drivers
        # are placed AFTER all active runners, not in their last race slot.
        # This ensures active drivers show correct positions (e.g. if HAD_DNF
        # was at P6, VER behind him correctly shows P6 not P7).
        active_entries = [e for e in lap["positions"] if not e.endswith("_DNF")]
        dnf_entries    = [e for e in lap["positions"] if e.endswith("_DNF")]
        for i, entry in enumerate(active_entries):
            pos_map[entry] = {"pos": i + 1, "dnf": False}
        for i, entry in enumerate(dnf_entries):
            code = entry.replace("_DNF", "")
            pos_map[code] = {"pos": len(active_entries) + i + 1, "dnf": True}
        for code in all_codes:
            if code in pos_map:
                row[code] = pos_map[code]
            else:
                row[code] = None
        position_matrix.append(row)

    # ── Assemble output ───────────────────────────────────────────────────────
    return {
        "race_id": race_id,
        "year": year,
        "round": raw.get("round", 0),
        "grand_prix": raw.get("grand_prix", ""),
        "circuit": raw.get("circuit", ""),
        "total_laps": total_laps,
        "grid_size": grid_size,
        "total_inversions": total_inversions,
        "total_lap_inversions": total_lap_inversions,
        "volatility_score": volatility_score,
        "max_possible_inversions": max_possible,
        "biggest_mover": biggest_mover,
        "most_overtaken": most_overtaken,
        "dnf_count": len(dnf_lap_map),
        "drivers": drivers_info,
        "driver_movements": driver_movements,
        "inversions_per_lap": inversions_per_lap,
        "cumulative_inversions": cumulative_inversions,
        "position_matrix": position_matrix,
    }


# ── Entry Point ───────────────────────────────────────────────────────────────

def process_file(input_path, output_path):
    print(f"  Reading  : {input_path}")
    with open(input_path) as f:
        raw = json.load(f)
    metrics = compute_metrics(raw)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"  Written  : {output_path}")
    print(f"  Inversions (start->finish): {metrics['total_inversions']}")
    print(f"  Total lap inversions     : {metrics['total_lap_inversions']}")
    print(f"  Volatility score         : {metrics['volatility_score']}")
    print()


if __name__ == "__main__":
    import argparse
    from pathlib import Path as _Path
    import glob as _glob

    parser = argparse.ArgumentParser(
        description="Compute inversion metrics for all races in data/."
    )
    parser.add_argument(
        "files", nargs="*",
        help="Specific data/*.json files to process (default: all data/*.json)",
    )
    parser.add_argument(
        "--force", action="store_true",
        help="Recompute even if metrics file is already newer than the data file",
    )
    args = parser.parse_args()

    # Collect files to process
    if args.files:
        candidates = [_Path(f) for f in args.files]
    else:
        candidates = sorted(_Path("data").glob("*.json"))

    if not candidates:
        print("  No data files found in data/. Run analytics/bulk_fetch.py first.")

    processed = skipped = errors = 0
    for inp in candidates:
        out = _Path("public/metrics") / inp.name
        if not inp.exists():
            print(f"  NOT FOUND: {inp}")
            errors += 1
            continue

        # Skip if metrics are already up-to-date (unless --force)
        if not args.force and out.exists() and out.stat().st_mtime >= inp.stat().st_mtime:
            print(f"  UP TO DATE : {inp.name}")
            skipped += 1
            continue

        try:
            process_file(str(inp), str(out))
            processed += 1
        except Exception as exc:
            print(f"  ERROR  {inp.name}: {exc}")
            errors += 1

    print(f"Processed: {processed}  Skipped (up-to-date): {skipped}  Errors: {errors}")

