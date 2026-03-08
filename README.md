# F1 Chaos Analyzer

**An independent, unofficial fan project by [Kritagya Loomba](https://www.linkedin.com/in/kritagyaloomba/)**

> Not affiliated with Formula 1, Formula One Management Ltd., the FIA, or any F1 team.
> "Formula 1" and "F1" are trademarks of Formula One Licensing BV.

A data engineering + computer science project that quantifies *how chaotic* a Formula 1 race was — not by eye, but through mathematically grounded algorithms. It covers every race from the 2024 and 2025 seasons and tracks the ongoing 2026 season, providing lap-by-lap volatility scores, cross-season comparisons, and driver movement analysis across 49+ races.

**Live site:** *(deploy URL)*
**Stack:** Astro · React · TypeScript · Python · FastF1

---

**For any queries/concerns contact: loombakritagya05@gmail.com. Make sure the subject is either F1Chaos-Concern/F1Chaos-Query**

## Table of Contents

- [F1 Chaos Analyzer](#f1-chaos-analyzer)
  - [Table of Contents](#table-of-contents)
  - [Motivation](#motivation)
  - [What is a Race Inversion?](#what-is-a-race-inversion)
  - [Why Inversions — Not Just Position Changes](#why-inversions--not-just-position-changes)
  - [The Algorithms](#the-algorithms)
    - [1. MergeSort Inversion Counter](#1-mergesort-inversion-counter)
    - [2. Fenwick Tree (Binary Indexed Tree)](#2-fenwick-tree-binary-indexed-tree)
    - [3. Volatility Score](#3-volatility-score)
    - [4. DNF Handling](#4-dnf-handling)
  - [Data Pipeline](#data-pipeline)
  - [Project Structure](#project-structure)
  - [Adding a New Race (2026 Season)](#adding-a-new-race-2026-season)
    - [Step 0 — Check availability](#step-0--check-availability)
    - [Step 1 — Fetch raw data](#step-1--fetch-raw-data)
    - [Step 2 — Compute metrics](#step-2--compute-metrics)
    - [Step 3 — Rebuild the site](#step-3--rebuild-the-site)
    - [Full sequence](#full-sequence)
  - [Tech Stack Detail](#tech-stack-detail)
  - [Disclaimer](#disclaimer)

---

## Motivation

After every F1 race the inevitable debate begins: *"Was that actually exciting, or did it just feel that way?"* Lap count, fastest laps, podium order — none of these capture the core question: **how much did the running order actually change throughout the race?**

A race where the top 3 swap back and forth 40 times is fundamentally different from one where the leader drives away unchallenged and everyone else stays put. The former is chaotic; the latter is processional. But both can end with the same winner and look superficially similar in a results table.

This project defines *chaos* precisely: the number of **order inversions** in the running positions across every lap of a race, normalised for grid size and race distance. The result is a single dimensionless score — the **volatility score** — that makes races objectively comparable across seasons, circuits, and years.

---

## What is a Race Inversion?

In mathematics and computer science, an **inversion** in a sequence is a pair of elements `(i, j)` such that `i` appears before `j` in a reference ordering, but `j` appears before `i` in the observed ordering.

For F1, the reference ordering is the **starting grid** and each observed ordering is the **lap-by-lap running position**.

**Example:**

Qualifying order: `VER, HAM, LEC, NOR`

After lap 5: `HAM, LEC, VER, NOR`

Inversions relative to the start:
- `HAM` is ahead of `VER` (inverted — HAM started behind VER) ✓
- `LEC` is ahead of `VER` (inverted — LEC started behind VER) ✓
- `HAM` is ahead of `NOR` → not inverted (HAM started ahead of NOR)
- Everything else → check in order

**Inversion count for this lap = 2**

The total across all laps and all driver pairs gives a raw measure of cumulative disorder introduced by the race.

---

## Why Inversions — Not Just Position Changes

A naive "chaos metric" might just sum up how many positions each driver gained or lost. But this has a critical flaw: it double-counts every overtake (one driver goes up, another goes down) and is blind to *who* is passing *whom*.

Inversions fix both problems:

| Property | Position-change sum | Inversion count |
|---|---|---|
| Counts each overtake once | No (double-counts) | Yes |
| Sensitive to who passes whom | No | Yes |
| Comparable across grid sizes | No | Yes (normalisable) |
| Mathematically grounded | No | Yes |

The inversion count is the standard measure from **comparison-based sorting theory**. A fully sorted array has 0 inversions. An array in complete reverse order has `n(n-1)/2` inversions — the theoretical maximum for `n` elements. This gives a natural upper bound: `grid_size × (grid_size - 1) / 2`, used internally to contextualise results.

---

## The Algorithms

### 1. MergeSort Inversion Counter

**Used for:** start-to-finish total inversions (one-time comparison of grid vs final result)

The classic O(n log n) algorithm. A naïve approach would compare every pair of drivers and check if their relative order flipped — O(n²). MergeSort achieves the same result in O(n log n) by counting cross-inversions during the merge step.

**How it works:**

During the merge phase of MergeSort, when an element from the *right* subarray is chosen before an element from the *left* subarray, it means every remaining element in the left half forms an inversion with it. That count is accumulated rather than iterated over.

```python
def merge_count(arr):
    if len(arr) <= 1:
        return arr, 0
    mid = len(arr) // 2
    left,  left_inv  = merge_count(arr[:mid])
    right, right_inv = merge_count(arr[mid:])
    merged, inversions = [], left_inv + right_inv
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            merged.append(left[i]); i += 1
        else:
            merged.append(right[j])
            inversions += len(left) - i   # all left[i..] are inverted with right[j]
            j += 1
    ...
    return merged, inversions
```

The driver codes are first mapped to their starting rank indices (integers), so the sort is over a sequence of integers — not strings — making the comparisons O(1).

---

### 2. Fenwick Tree (Binary Indexed Tree)

**Used for:** per-lap inversion counting across all 60–70 laps of a race

Counting inversions lap by lap with MergeSort would be correct but wasteful — the overhead of repeatedly building and merging arrays is significant when called thousands of times (49 races × ~60 laps = ~3,000 calls). The Fenwick Tree (also called Binary Indexed Tree or BIT) solves this more elegantly for the *online* case.

**How it works:**

For each lap, the running positions of active drivers are represented as a permutation of their starting ranks `[0, 1, ..., n-1]`. We traverse this sequence *in reverse* and for each rank `r`:

1. **Query** how many ranks smaller than `r` have already been seen (= inversions involving this driver)
2. **Update** the tree to mark `r` as seen

The Fenwick Tree supports both point-update and prefix-sum in **O(log n)** time using bitwise arithmetic on indices, giving a total per-lap complexity of **O(n log n)** but with extremely small constants — far faster in practice than mergesort for sequences of 15–20 elements.

```python
class FenwickTree:
    def update(self, i, delta=1):
        i += 1  # 1-indexed
        while i <= self.n:
            self.tree[i] += delta
            i += i & (-i)       # move to parent using lowest set bit

    def query(self, i):         # prefix sum [0..i]
        i += 1
        s = 0
        while i > 0:
            s += self.tree[i]
            i -= i & (-i)       # move to parent
        return s
```

The expression `i & (-i)` isolates the lowest set bit of `i`, which is the key to how BITs navigate their implicit tree structure in O(log n).

---

### 3. Volatility Score

The **raw inversion count** is not directly comparable between races — a 70-lap race with 20 drivers has a far larger inversion ceiling than a 57-lap race with 18 drivers (due to a DNF on lap 1, say). To make scores meaningful across the dataset, the raw total is normalised:

```
volatility_score = total_lap_inversions / (grid_size × total_laps)
```

Where:
- `total_lap_inversions` — sum of inversion counts across every lap of the race
- `grid_size` — number of drivers who started (excluding any pre-race DNS)
- `total_laps` — actual laps completed (the winner's lap count)

This gives a value in the range `[0, n-1/2]` theoretically, though in practice F1 volatility scores sit between roughly `0.5` and `3.5`. A score near `0` means the running order was almost identical to the starting grid throughout. A high score means constant positional churn. Crucially, **there is no ceiling** — future regulation changes or weather events could produce scores higher than anything seen so far.

**The cumulative inversion series** (total inversions from lap 1 to lap N) is also preserved, giving the site its "cumulative inversion curve" chart which shows whether chaos was front-loaded (opening lap chaos), back-loaded (late safety car restarts), or evenly distributed.

---

### 4. DNF Handling

Drivers who retire mid-race require careful treatment. A naïve implementation leaves them frozen at their last known position, which corrupts the inversion count for every lap after their retirement and misrepresents the finishing order for all drivers behind them.

**Solution:** DNF drivers are kept in the per-lap position data (marked `CODE_DNF`) but:

- They are **excluded from inversion calculations** — only active drivers in both the reference and observed sequence are counted.
- In the display position matrix, DNF entries are **sorted to the end** of each subsequent lap's position list, after all classified runners, so that active drivers receive correct sequential positions.

```python
active_entries = [e for e in lap["positions"] if not e.endswith("_DNF")]
dnf_entries    = [e for e in lap["positions"] if e.endswith("_DNF")]
for i, entry in enumerate(active_entries):
    pos_map[entry] = {"pos": i + 1, "dnf": False}
for i, entry in enumerate(dnf_entries):
    code = entry.replace("_DNF", "")
    pos_map[code]  = {"pos": len(active_entries) + i + 1, "dnf": True}
```

This ensures, for example, that if a driver retires while running P6, the driver who was at P7 correctly shows as P6 from that lap forward — not P7.

---

## Data Pipeline

```
FastF1 API
    │
    ▼
analytics/fetch_race_data.py        pulls session, laps, results, qualifying grid
    │  writes ──►  data/{year}_{slug}.json     (raw race schema)
    │
    ▼
analytics/compute_inversions.py     MergeSort + Fenwick Tree + normalisation
    │  writes ──►  public/metrics/{year}_{slug}.json   (computed metrics)
    │
    ▼
Astro (npm run build)               import.meta.glob picks up new metrics files
    │  writes ──►  dist/            (static HTML/CSS/JS, one page per race)
    │
    ▼
Static site host                    serve dist/
```

**Raw schema** (`data/*.json`) fields include: `race_id`, `year`, `round`, `grand_prix`, `circuit`, `total_laps`, `drivers`, `start_order`, `finish_order`, `laps` (per-lap positions array).

**Metrics schema** (`public/metrics/*.json`) adds: `volatility_score`, `total_lap_inversions`, `total_inversions`, `inversions_per_lap`, `cumulative_inversions`, `driver_movements`, `position_matrix`, `biggest_mover`, `most_overtaken`.

No server or database is involved — the site is entirely statically generated. Adding a new race's metrics file and rebuilding is all that is needed for it to appear everywhere on the site.

---

## Project Structure

```
F1Chaos/
├── analytics/
│   ├── fetch_race_data.py      FastF1 ingestion → raw JSON schema
│   ├── bulk_fetch.py           batch fetcher for full seasons
│   ├── compute_inversions.py   MergeSort + BIT metrics engine
│   └── check_race.py           availability checker (run before fetching)
│
├── data/                       raw race JSON (one file per race)
├── public/
│   ├── metrics/                computed metrics JSON (read by Astro at build time)
│   └── imgs/                   site logo + social icons
│
├── src/
│   ├── components/charts/      Recharts + pure-SVG React chart components
│   ├── data/races.ts           canonical slug ↔ URL map + season colours
│   ├── layouts/Base.astro      shared nav + footer layout
│   ├── pages/
│   │   ├── index.astro         home — season trend overview
│   │   ├── [year]/
│   │   │   ├── index.astro     season overview (all races in a year)
│   │   │   └── [race].astro    individual race page
│   │   └── compare/
│   │       ├── index.astro     cross-season comparison overview
│   │       └── [race].astro    circuit-specific year-over-year comparison
│   └── styles/global.css
│
└── cache/fastf1/               FastF1 disk cache (gitignored)
```

---

## Adding a New Race (2026 Season)

After each race weekend, the data pipeline is three commands. Run them from the project root with Python 3.11 (`py -3.11` on Windows if multiple Python versions are installed).

### Step 0 — Check availability

FastF1 typically uploads timing data a few hours after the race ends.

```bash
py -3.11 analytics/check_race.py --year 2026
```

| Status | Meaning |
|---|---|
| `INGESTED` | Already done — raw data + metrics both on disk |
| `FETCHED` | Raw data present but metrics need recomputing |
| `AVAILABLE` | FastF1 is ready — proceed to Step 1 |
| `NOT YET` | Race hasn't happened or FastF1 hasn't uploaded yet |

Wait until the target round shows `AVAILABLE` before proceeding.

### Step 1 — Fetch raw data

```bash
py -3.11 analytics/bulk_fetch.py --years 2026 --round <N>
```

Replace `<N>` with the round number (e.g. `--round 4` for Round 4). This calls FastF1, downloads lap positions, grid order, finish order, and DNF data, and writes to `data/2026_xxx.json`. The correct circuit slug is derived automatically from the circuit location name.

> **New circuit?** If a brand-new venue appears (e.g. a new street circuit) and the script writes `data/2026_unk.json`, add the location name → slug entry to the `LOCATION_SLUG` dict in `analytics/bulk_fetch.py` and re-run.

### Step 2 — Compute metrics

```bash
py -3.11 analytics/compute_inversions.py
```

Reads the new `data/2026_xxx.json`, runs the inversion algorithms, and writes `public/metrics/2026_xxx.json`. All existing races are skipped automatically (they are already up to date). Pass `--force` only if you want to recompute everything.

### Step 3 — Rebuild the site

```bash
npm run build
```

Astro picks up the new metrics file via `import.meta.glob`. The race appears automatically on the 2026 season page, the season trend chart, and on the compare page if the same circuit has data from 2024 or 2025. No code changes required.

### Full sequence

```bash
py -3.11 analytics/check_race.py --year 2026          # wait for AVAILABLE
py -3.11 analytics/bulk_fetch.py --years 2026 --round <N>
py -3.11 analytics/compute_inversions.py
npm run build
```

---

## Tech Stack Detail

| Layer | Technology | Why |
|---|---|---|
| Static site generator | [Astro](https://astro.build) | Zero JS by default; `import.meta.glob` loads all metrics files at build time with no manual imports needed |
| UI components | React + TypeScript | Chart interactivity (hover state, animations) requires client-side hydration; Astro's `client:visible` only hydrates when the component scrolls into view |
| Charts | [Recharts](https://recharts.org) + hand-rolled SVG | Recharts for standard chart types; custom SVG for the season trend slope chart (open-ended Y axis, gradient lines, animated draw-in) |
| Data fetching | [FastF1](https://docs.fastf1.dev) | The standard Python library for F1 lap timing data; handles caching, session loading, and qualifying results |
| Analytics | Python 3.11 | MergeSort + Fenwick Tree inversion algorithms; pure stdlib + pandas for data manipulation |
| Styling | CSS custom properties | Season colour variables (`--y2024-color`, `--y2025-color`, `--y2026-color`) propagate everywhere with no theme library needed |

---

## Disclaimer

F1 Chaos Analyzer is an **independent, unofficial fan project** created for educational and analytical purposes. It is not affiliated with, endorsed by, or connected to Formula 1, Formula One Management Ltd., the FIA, or any F1 team or driver. "Formula 1", "F1", and related marks are trademarks of Formula One Licensing BV. Race timing data is sourced via the FastF1 open-source library for non-commercial use.

© 2026 Kritagya Loomba — All rights reserved.
