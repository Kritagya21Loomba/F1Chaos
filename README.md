# F1 Chaos Analyzer

**An independent, unofficial fan project by [Kritagya Loomba](https://www.linkedin.com/in/kritagyaloomba/)**

> Not affiliated with Formula 1, Formula One Management Ltd., the FIA, or any F1 team.
> "Formula 1" and "F1" are trademarks of Formula One Licensing BV.

A data engineering and computer science project that quantifies *how chaotic* a Formula 1 race was — not by eye, but through mathematically grounded algorithms. It covers every race from the 2024 and 2025 seasons and tracks the ongoing 2026 season in real time, providing lap-by-lap volatility scores, cross-season comparisons, tyre strategy visualisations, driver momentum analysis, safety car simulations, and more across 49+ races.

**Live site:** *f1chaos.pages.dev/*
**Stack:** Astro · React · TypeScript · Python · FastF1
**For queries/concerns:** loombakritagya05@gmail.com — subject: `F1Chaos-Concern` or `F1Chaos-Query`

---

## Table of Contents

- [Motivation](#motivation)
- [What is a Race Inversion?](#what-is-a-race-inversion)
- [Why Inversions — Not Just Position Changes](#why-inversions--not-just-position-changes)
- [Core Algorithms](#core-algorithms)
  - [1. MergeSort Inversion Counter](#1-mergesort-inversion-counter)
  - [2. Fenwick Tree (Binary Indexed Tree)](#2-fenwick-tree-binary-indexed-tree)
  - [3. Volatility Score](#3-volatility-score)
  - [4. DNF Handling](#4-dnf-handling)
- [v2 Analytics Engine](#v2-analytics-engine)
  - [5. Pit-Adjusted Inversions](#5-pit-adjusted-inversions)
  - [6. SC-Neutralized Volatility](#6-sc-neutralized-volatility)
  - [7. Overtake Classification](#7-overtake-classification)
  - [8. DNF-Aware Movement](#8-dnf-aware-movement)
  - [9. Driver Battle Index](#9-driver-battle-index)
  - [10. Strategy Chaos Score](#10-strategy-chaos-score)
  - [11. Race Chaos Timeline](#11-race-chaos-timeline)
  - [12. No-SC Simulator](#12-no-sc-simulator)
  - [13. Momentum Tracker](#13-momentum-tracker)
- [Data Pipeline](#data-pipeline)
  - [Raw Schema (v2)](#raw-schema-v2)
  - [Metrics Schema (v2)](#metrics-schema-v2)
  - [FastF1 Data Availability](#fastf1-data-availability)
- [Frontend — All Visualisations](#frontend--all-visualisations)
- [Project Structure](#project-structure)
- [Adding a New Race (2026 Season)](#adding-a-new-race-2026-season)
- [Recomputing All Metrics](#recomputing-all-metrics)
- [Tech Stack Detail](#tech-stack-detail)
- [Disclaimer](#disclaimer)

---

## Motivation

After every F1 race the inevitable debate begins: *"Was that actually exciting, or did it just feel that way?"* Lap count, fastest laps, podium order — none of these capture the core question: **how much did the running order actually change throughout the race?**

A race where the top 3 swap back and forth 40 times is fundamentally different from one where the leader drives away unchallenged and everyone else stays put. The former is chaotic; the latter is processional. But both can end with the same winner and look superficially similar in a results table.

This project defines *chaos* precisely using the concept of **order inversions** from computer science: the number of driver pair relationships that are "out of order" relative to the starting grid, summed across every lap of the race and normalised for context. The result is a single dimensionless score — the **volatility score** — that makes races objectively comparable across seasons, circuits, and years.

The v2 extension goes further: it decomposes that chaos by *source* (genuine overtake vs pit-cycle shuffle vs safety car compression vs retirement), simulates counterfactual scenarios ("what if there was no safety car?"), and tracks momentum — who was charging and who was fading at each phase of the race.

---

## What is a Race Inversion?

In mathematics and computer science, an **inversion** in a sequence is a pair of elements `(i, j)` such that `i` appears before `j` in a reference ordering, but `j` appears before `i` in the observed ordering — i.e., a pair that is "out of order" relative to the reference.

For F1, the reference ordering is the **starting grid** and each observed ordering is the **running positions at a given lap**.

**Example:**

Starting grid: `VER (P1), HAM (P2), LEC (P3), NOR (P4)`

Running order after lap 12: `HAM (P1), LEC (P2), VER (P3), NOR (P4)`

Check each pair against the starting order:
- `(HAM, VER)` — HAM started P2, VER started P1. Now HAM is ahead of VER. **Inverted** ✓
- `(LEC, VER)` — LEC started P3, VER started P1. Now LEC is ahead of VER. **Inverted** ✓
- `(HAM, NOR)` — HAM started P2, NOR started P4. HAM is still ahead. Not inverted.
- `(LEC, NOR)` — LEC started P3, NOR started P4. LEC is still ahead. Not inverted.
- `(VER, NOR)` — VER started P1, NOR started P4. VER is still ahead. Not inverted.
- `(HAM, LEC)` — HAM started P2, LEC started P3. HAM is still ahead. Not inverted.

**Inversion count for this lap = 2.**

Sum this across all 60–70 laps of a race to get `total_lap_inversions` — the raw measure of cumulative disorder introduced by the race relative to its starting order. The more often cars are "out of their starting position" relative to each other, the higher the number.

---

## Why Inversions — Not Just Position Changes

A naive "chaos metric" might sum up how many positions each driver gained or lost. But this has critical flaws: it double-counts every overtake (one driver goes up, the same number of positions come from someone else going down), is sensitive to where in the order the overtake happens, and gives no natural upper bound for normalisation.

Inversions fix all three:

| Property | Sum of position changes | Inversion count |
|---|---|---|
| Counts each overtake once | No (double-counts) | Yes |
| Sensitive to who passes whom | No | Yes |
| Natural upper bound for normalisation | No | Yes: `n(n−1)/2` |
| Mathematically grounded in CS theory | No | Yes (sorting theory) |
| Comparable across different grid sizes | No | Yes (normalisable) |

The inversion count is the standard measure from **comparison-based sorting theory**. It answers the question: "how many adjacent swaps would a bubble sort need to reach the observed ordering from the reference?" — i.e., it is the *minimum edit distance* between two orderings under a swap-one-position-at-a-time model. A fully sorted sequence has 0 inversions. A completely reversed sequence has `n(n−1)/2` inversions — the theoretical maximum. For 20 drivers that maximum is 190 per lap; across a 70-lap race the ceiling is 13,300.

---

## Core Algorithms

### 1. MergeSort Inversion Counter

**Used for:** start-to-finish total inversions (single comparison of grid vs. final result)

**Time complexity:** O(n log n) — optimal for comparison-based inversion counting
**Space complexity:** O(n) auxiliary

The naïve approach compares every pair of drivers — O(n²) — and checks whether their relative order flipped. MergeSort achieves the same in O(n log n) by counting cross-inversions *during the merge step*, exploiting the already-sorted halves.

**How it works:**

The driver codes are first mapped to their starting rank indices (0-indexed integers). A rank mapping of `{VER: 0, HAM: 1, LEC: 2, NOR: 3}` turns the observed ordering `[HAM, LEC, VER, NOR]` into the sequence `[1, 2, 0, 3]`. The problem reduces to counting inversions in this integer sequence.

During the merge phase, whenever an element from the *right* subarray is placed before an element from the *left* subarray, every remaining element in the left half forms an inversion with it. That count is accumulated in O(1) rather than iterated over:

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
    merged.extend(left[i:]); merged.extend(right[j:])
    return merged, inversions
```

The key insight: when `right[j] < left[i]`, we know `right[j]` is also less than `left[i+1], left[i+2], ..., left[end]` — because `left` is already sorted. So all of them are inverted with `right[j]`, and `len(left) - i` counts them in constant time.

---

### 2. Fenwick Tree (Binary Indexed Tree)

**Used for:** per-lap inversion counting — called once per lap, ~60–70 times per race, across 49 races

**Time complexity:** O(n log n) per lap
**Space complexity:** O(n)

Calling MergeSort lap-by-lap would work but wastes memory re-allocating and re-merging arrays thousands of times. The Fenwick Tree (BIT — Binary Indexed Tree) solves the same problem more efficiently for the *online/repeated* case using a compact array with bitwise index arithmetic.

**How it works:**

For each lap, the running positions of active drivers are represented as a permutation of their starting ranks `[0, 1, ..., n-1]`. We traverse this sequence *in reverse order* and for each rank `r`:

1. **Query** the prefix sum `[0..r-1]` — how many lower ranks have already been seen = inversions involving this driver
2. **Update** the tree to mark rank `r` as seen

This is correct because traversing in reverse means "how many of the positions I haven't processed yet have a rank lower than mine" = "how many of the later-in-sequence elements are out of order with me".

```python
class FenwickTree:
    def __init__(self, n):
        self.n = n
        self.tree = [0] * (n + 1)   # 1-indexed internally

    def update(self, i, delta=1):
        i += 1                      # convert to 1-indexed
        while i <= self.n:
            self.tree[i] += delta
            i += i & (-i)           # jump to parent using lowest set bit

    def query(self, i):             # prefix sum [0..i]
        i += 1
        s = 0
        while i > 0:
            s += self.tree[i]
            i -= i & (-i)           # jump to parent
        return s
```

The expression `i & (-i)` isolates the lowest set bit of `i`. This is the BIT's core trick: a node at index `i` stores the sum for `i & (-i)` preceding elements. Both update and query traverse at most `log₂(n)` nodes because each step either adds or removes the lowest set bit, changing the bit length by at least 1.

**Concrete example with n=4:**
```
Index (1-based):  1    2    3    4
Covers range:    [1]  [1,2] [3]  [1,2,3,4]
```
`query(3)` = `tree[3] + tree[2]` — at step 1, `3 & (-3) = 1`, subtract 1: `i=2`. At step 2, `2 & (-2) = 2`, subtract 2: `i=0`, done.

For F1 with n=20 drivers, this is at most 5 steps per operation — negligible compared to iterating over all pairs.

---

### 3. Volatility Score

The **raw inversion count** is not directly comparable between races. A 70-lap race with 20 drivers has a far larger inversion ceiling than a 57-lap race with 17 active drivers (after 3 DNFs). Normalisation is required:

```
volatility_score = total_lap_inversions / (grid_size × total_laps)
```

Where:
- `total_lap_inversions` — sum of per-lap inversion counts across every lap
- `grid_size` — number of drivers who took the start (excluding pre-race DNS)
- `total_laps` — laps completed by the winner

This turns the raw count into a **rate** (inversions per driver per lap), making any two races directly comparable regardless of driver count or race distance. In practice, F1 volatility scores range from roughly `0.5` (very processional) to `3.5` (extremely chaotic). Theoretically there is no ceiling — a race with non-stop position swapping every lap could exceed these values.

The **cumulative inversion series** — `total inversions up to lap N` — is also preserved. Its slope over time reveals the *shape* of chaos: front-loaded (lap-1 chaos), back-loaded (late safety car restarts), or evenly distributed (constant fighting throughout).

---

### 4. DNF Handling

> **F1 context:** DNF = "Did Not Finish". Drivers who retire mid-race due to mechanical failure, accident, or driver/team decision.

DNF drivers require careful treatment. A naïve implementation leaves them frozen at their last position, which would:
1. Count them as "still racing" in inversions for every subsequent lap
2. Misrepresent the positions of all drivers behind them (a P7 driver becomes effectively P6 once P6 retires, but not if we keep P6 in the sequence)

**Solution:** DNF drivers are tracked with a `_DNF` suffix in position arrays:

```python
# Per-lap position storage
positions = ["VER", "HAM", "LEC_DNF", "NOR", ...]

# Inversion calculation — only active drivers
active = [d for d in positions if not d.endswith("_DNF")]
```

In the display position matrix, DNF entries are sorted *after* all active drivers so that the positions of classified runners are contiguous and P-numbered correctly. For example, if P6 retires, the driver formerly at P7 correctly shows as P6 from that lap onward.

The `dnf_lap_map` dictionary records the exact lap of retirement for each DNF driver, used downstream by the overtake classifier and DNF-aware movement modules to distinguish "free positions" from "earned overtakes".

---

## v2 Analytics Engine

The v2 engine extends the core inversion framework with eight additional analytical modules. All are computed during the same single-pass pipeline as the core metrics, and all degrade gracefully on older data that lacks the enhanced ingestion fields (pre-v2 skeleton is fully backward compatible via the `has_enhanced_data` flag).

The central challenge motivating the v2 work: **raw inversions lie**. A safety car bunches the entire field into a 5-second train, then restarts — producing a burst of inversions that had nothing to do with driver skill or genuine overtaking. A midfield driver pitting from P8 drops to P18, then as P1-P10 cycle through their stops, "overtakes" them all back — producing 10 inversions attributable entirely to strategy, not on-track moves. A retirement gifts 3-4 free positions to every driver behind them. The v2 engine disentangles all of these.

---

### 5. Pit-Adjusted Inversions

**The problem:** When a driver pits, they typically drop 10–15 positions on their in-lap (entering the pit lane) and re-emerge on their out-lap. This creates a spike of inversions in both laps that reflects the mechanics of F1 pit strategy rather than racing. A race where everyone pits twice shouldn't score dramatically higher than one where everyone pits once.

**The solution:** On any lap where a driver is "on a pit lap" (their in-lap or their out-lap), they are removed from that lap's inversion calculation entirely — as if they never existed for those 2 laps.

```python
def _compute_pit_adjusted_inversions(laps_data, rank_in_start, pit_laps, total_laps):
    for lap in laps_data:
        lap_num = lap["lap"]
        # Remove drivers who are on in-lap or out-lap
        non_pit = [d for d in active if lap_num not in pit_laps.get(d, set())]
        seq = [rank_in_start[d] for d in non_pit]
        inv = count_inversions_fenwick(seq)
        ...
```

**F1 context:** A pit stop takes roughly 20–25 seconds of stationary time plus the pit lane transit time (~18–20 seconds at most circuits). During this window the driver effectively "disappears" from the racing order and reappears in a completely different position. Whether that new position represents a genuine move depends entirely on what the other drivers do — which is the subject of the Strategy Chaos Score module.

---

### 6. SC-Neutralized Volatility

**The problem:** A Safety Car (SC) or Virtual Safety Car (VSC) period compresses the field together. The leader slows dramatically, the tail end catches up, and when racing resumes a burst of inversions occurs as cars sort themselves back out. This "compression chaos" tells us very little about the intrinsic overtaking ability of the circuit or the racecraft of the drivers.

**The solution:** SC/VSC laps are identified via the `TrackStatus` stream in FastF1, which emits per-lap status codes:

| Code | Meaning |
|------|---------|
| `'1'` | All Clear |
| `'2'` | Yellow flag (local) |
| `'4'` | Safety Car (full SC) |
| `'5'` | Red Flag |
| `'6'` | Virtual Safety Car |
| `'7'` | VSC Ending (transition lap) |

Laps where the status includes `'4'` or `'6'` are in the "neutralised" set. Rather than removing them entirely (which would change lap count and break the volatility denominator), they are **downweighted to 0.25×**:

```python
SC_WEIGHT = 0.25   # SC/VSC laps count at 25% weight
for entry in inversions_per_lap:
    weight = SC_WEIGHT if lap_num in neutralized_laps else 1.0
    weighted_inv = round(entry["inversions"] * weight, 2)
    weighted_total += weighted_inv
```

The resulting `sc_neutralized.volatility_score` measures the chaos the race *would have had* if SC/VSC periods contributed minimally. A race with many SC restarts will see its SC-neutralized score pull significantly below its raw score.

**F1 context:** The Virtual Safety Car (introduced 2015) allows stewards to neutralise the race without bunching the field as dramatically as a full SC. Under VSC, drivers maintain minimum lap times ~40% above normal pace. The VSC code '7' (VSC Ending) is treated as a VSC lap since drivers are still unable to race at full pace.

---

### 7. Overtake Classification

**The problem:** Not all position changes are equal. The inversion count treats a brutal overtake into Turn 1 exactly the same as a driver accidentally gaining a position because someone pitted. For a true picture of "genuine racing chaos" we need to know *why* each position change happened.

**The four categories:**

| Category | What it means | F1 example |
|----------|---------------|------------|
| `on_track` | Genuine racing move — not during SC/VSC, not pit-related, not DNF-induced | Overtake out of Eau Rouge, pass under braking into T1 |
| `pit_cycle` | Position gained/lost because of pit stop timing — driver pitted, or benefited from others pitting | Rising from P15 to P8 as the pit window closes |
| `sc_vsc` | Position change during a Safety Car or VSC period | Gaining 3 places as the pack bunches during a SC |
| `dnf` | Position gained because a competitor retired | Moving from P9 to P8 when P8 hits the barrier |

**Algorithm:** For each lap, compare each driver's position to the previous lap. If their position changed:

1. If they are on a pit lap → `pit_cycle`
2. If they gained positions and another driver *between their old and new position* was on a pit lap that lap → `pit_cycle` (they benefited from the pit window)
3. If the lap is in the neutralised set and the change would otherwise be `on_track` → `sc_vsc`
4. If a DNF occurred on this lap and the driver gained positions → `dnf`
5. Otherwise → `on_track`

This classification feeds into the overtake summary dashboard and the Race Chaos Timeline.

---

### 8. DNF-Aware Movement

**The problem (F1 context):** "Biggest mover" is one of the simplest and most popular F1 stats — a driver who starts P18 and finishes P6 gained 12 positions. But how many of those were *earned*? If 4 cars ahead retired during the race, the driver got 4 positions for free. The raw stat is misleading for races with high attrition.

**The solution — attrition-adjusted gain:**

For each non-DNF driver, count how many retiring drivers started *ahead* of them on the grid (i.e., would have been ahead at the finish in a no-DNF scenario). Subtract that from their raw positions-gained:

```python
start_pos = {d.replace("_DNF", ""): i for i, d in enumerate(start_order)}

for dm in driver_movements:
    s_pos = start_pos.get(code, 99)
    # DNFs that started ahead of this driver = free position gains
    free_gains = sum(1 for dc in dnf_codes if start_pos.get(dc, 99) < s_pos)
    adjusted = dm["positions_gained"] - free_gains
```

The `attrition_adjusted_biggest_mover` metric surfaces the driver who made the most *genuine* progress after accounting for retirements.

**Caveat:** This is a conservative estimate assuming all DNF drivers would have stayed ahead until the finish at their starting order. In reality, some would have lost positions — so the "free gains" figure is an upper bound on attrition benefit, not an exact figure.

---

### 9. Driver Battle Index

**The problem / motivation:** The question "who was fighting who?" is one of the hardest things to extract from raw positional data. Two drivers can be side-by-side for 20 laps without the position numbers reflecting that — if they're always within 1 second of each other but never actually swap, traditional position-change metrics show nothing.

**Algorithm — pairwise battle tracking:**

For every pair of drivers `(A, B)` in the race, track across all laps:

1. **`position_swaps`** — how many times their relative order flipped (A ahead → B ahead, or vice versa)
2. **`laps_within_1`** — how many laps they were exactly 1 position apart (i.e., direct racing neighbours)

A composite **intensity score** is computed:

```
intensity = position_swaps + (laps_within_1 × 0.5)
```

Position swaps are weighted 2× relative to proximity laps because an actual position change is a much stronger signal of racing contact than merely being adjacent. The top 15 battles by intensity are returned, along with which driver ultimately prevailed (higher final position = winner).

**Complexity note:** With n=20 drivers, there are `C(20,2) = 190` pairs. Tracking each pair across all laps is O(n² × L) where L is lap count — approximately 190 × 60 = 11,400 operations per race. This is entirely acceptable and runs in milliseconds.

**F1 context:** The battle index surfaces things like: a midfield battle that raged for 30 laps but never appeared in the headlines because the positions involved were P11 and P12; or a DRS-enabled train where the same two drivers swapped back and forth 8 times. The "winner" field shows who came out ahead at the end — useful for identifying the driver who ultimately "won" their private battle, even if the result went otherwise.

---

### 10. Strategy Chaos Score

**The problem:** Pit strategy is F1's chess game. A well-timed **undercut** (pitting slightly earlier than your rival, fitting fresh tyres, and lapping fast enough to emerge ahead when they pit) can change a race outcome entirely. So can an **overcut** (staying out, building a gap, and pitting later to emerge ahead). The question is: how much did strategy decisions disrupt the running order, as opposed to on-track speed?

**What it measures:**

| Metric | Definition |
|--------|-----------|
| `undercuts` | Pit-cycle passes where the pitting driver gained a position and pitted within 2 laps of the pass |
| `overcuts` | Pit-cycle passes where the driver who stayed out gained a position |
| `pit_cycle_passes` | Total position gains classified as `pit_cycle` |
| `failed_strategies` | Drivers who net-lost positions through pit stop interactions |
| `strategy_chaos_score` | `undercuts×2 + overcuts×1.5 + pit_passes + failed×0.5` |

The score is deliberately unscaled — it's a raw indicator of how much pit-stop strategic interaction shaped the race, not a normalised comparable. Races like Monaco (no overtaking, strategy is everything) tend to score much higher than their raw volatility would suggest.

**F1 context — the undercut explained:**

Imagine VER is P1 with HAM 2 seconds behind. HAM's team pits him 3 laps earlier than VER. On fresh medium tyres, HAM can run 0.8 seconds/lap faster than VER on worn mediums. After 3 laps, HAM has lapped VER's deficit of 2 seconds + gained ~2.4 seconds = now 0.4 seconds ahead. When VER pits, HAM emerges ahead. The undercut "stole" the position — not through overtaking but through strategy timing. The overcut works in reverse: VER stays out, builds a 5-second gap, pits late, and re-emerges ahead.

---

### 11. Race Chaos Timeline

**What it is:** A per-lap aggregation of all event types in the race, producing a complete "story" of where chaos came from at each moment. For each lap, the timeline stores:

```json
{
  "lap": 23,
  "inversions": 12,
  "on_track_overtakes": 3,
  "pit_passes": 2,
  "sc_vsc_moves": 0,
  "dnf_moves": 0,
  "pit_stops": 4,
  "safety_car": false,
  "vsc": false,
  "red_flag": false
}
```

This powers the **Race Chaos Timeline** stacked bar chart which shows, for each lap, how many of each overtake type occurred. It makes it immediately visually obvious whether a race's chaos came from:
- Green bars (on-track overtakes) → real racing
- Orange bars (pit passes) → strategy battles
- Yellow bars (SC/VSC moves) → neutralisation
- Red bars (DNF) → attrition

Safety car periods are highlighted with dashed reference lines.

---

### 12. No-SC Simulator

**The counterfactual question:** "If there had been no Safety Car or VSC, how chaotic would this race have been?"

**Algorithm:** The simplest possible counterfactual — remove all SC/VSC laps entirely from the inversion series and recompute volatility over the remaining "pure racing" laps:

```python
def _compute_no_sc_simulation(inversions_per_lap, neutralized_laps, total_laps, grid_size):
    filtered_per_lap = []
    filtered_total = 0
    for entry in inversions_per_lap:
        if entry["lap"] in neutralized_laps:
            continue                          # omit this lap entirely
        filtered_per_lap.append(entry)
        filtered_total += entry["inversions"]

    racing_laps = total_laps - len(neutralized_laps)
    no_sc_volatility = filtered_total / (grid_size * racing_laps)
    ...
```

The result: `no_sc_sim.volatility_score` answers the question with a concrete number. If the no-SC volatility is *higher* than the actual volatility, it means the race was more chaotic in its pure racing phases than the overall score suggested — the SC *dampened* the chaos. If it's *lower*, it means the SC periods were responsible for a disproportionate share of the inversions (restart shuffle), and the underlying "real" racing was less chaotic.

**Distinction from SC-neutralized volatility:** The SC-neutralized module (Module 6) downweights SC laps to 0.25× but keeps them in the series. The No-SC Simulator removes them entirely and recomputes over a shorter effective race. These are two different philosophical stances:
- SC-neutralized: "SC laps happened but we shouldn't weight them equally"
- No-SC simulator: "pretend the SC never happened at all"

**F1 context:** The impact of safety cars on race outcomes is one of F1's most contentious topics. A late SC can erase a 30-second lead built over 40 laps and hand a potential win to a randomly-positioned driver. The 2021 Abu Dhabi controversy is the most famous example. This module provides a data-driven answer to "would the result have been different without the SC?" — at least from a chaotic-running-order perspective.

---

### 13. Momentum Tracker

**What it measures:** Rolling position change over a sliding 5-lap window for each driver. For driver X at lap N:

```
momentum(X, N) = position(X, N-5) − position(X, N)
```

Positive = gaining positions over that window. Negative = losing positions. Zero = stable.

The window looks back from the earliest available lap (so lap 3 uses a window of 3, lap 1 has no previous reference so momentum is 0). DNF drivers have `null` momentum from the lap of retirement onward.

**Algorithm:**

```python
for i, entry in enumerate(positions):
    start_idx = max(0, i - window)
    start_pos = None
    for j in range(start_idx, i):              # scan back up to `window` laps
        if positions[j]["pos"] is not None:    # first valid position in window
            start_pos = positions[j]["pos"]
            break
    momentum_val = start_pos - entry["pos"]    # positive = moving forward
```

Because positions can be `None` for DNF drivers, the lookback scan skips null entries to find the most recent valid position.

**What it reveals:**

The momentum chart is grouped by driver with the same filter pills as the Lap Position tracker. The zero reference line divides "charging" (above) from "fading" (below). Some patterns it surfaces:
- A driver on a lightning undercut shows a sharp positive spike as they emerge ahead of many rivals
- A driver who stalls in traffic shows a prolonged negative period
- A driver on worn tyres shows a gradual drift negative as everyone around them overtakes
- Lap-1 carnage survivors show a brief extreme negative spike followed by recovery

**Peak momentum** — the single largest absolute momentum value across all laps — is surfaced as a top-5 callout at the top of the chart.

---

## Data Pipeline

```
FastF1 API
    │
    ▼
analytics/fetch_race_data.py        pulls: session, laps, results, qualifying grid,
    │                               pit stops, track status, stint data
    │  writes ──►  data/{year}_{slug}.json     (raw race schema v2)
    │
    ▼
analytics/compute_inversions.py     runs all 13 analytics modules
    │  writes ──►  public/metrics/{year}_{slug}.json   (metrics schema v2)
    │
    ▼
Astro (npm run build)               import.meta.glob picks up all metrics files at build time
    │  writes ──►  dist/            (static HTML/CSS/JS, one page per race)
    │
    ▼
Static site host                    serve dist/
```

No server, no database, no runtime API calls. The entire site is pre-baked into static HTML at build time. Adding a new race is three commands; it appears everywhere on the site automatically.

---

### Raw Schema (v2)

`data/{year}_{slug}.json` — produced by `fetch_race_data.py`

```jsonc
{
  "race_id":     "2025_bah",
  "year":        2025,
  "round":       2,
  "grand_prix":  "Bahrain Grand Prix",
  "circuit":     "Bahrain International Circuit",
  "total_laps":  57,

  "drivers": [
    { "code": "VER", "name": "Max Verstappen", "team": "Red Bull Racing", "status": "Finished" },
    { "code": "HAM", "name": "Lewis Hamilton",  "team": "Ferrari",          "status": "DNF"      }
    // ...20 drivers total
  ],

  "start_order":  ["VER", "PER", "LEC", ...],   // grid order (P1 first)
  "finish_order": ["VER", "PER", "SAI", ...],   // classified result (DNFs at end, "_DNF" suffix)

  "laps": [
    {
      "lap": 1,
      "positions": ["VER", "PER", "LEC", "NOR_DNF", ...]
      //                                  ^^^^ DNF suffix used for retired drivers
    }
    // ...one entry per lap
  ],

  // v2 enhanced fields (present when re-ingested with updated fetch_race_data.py)
  "pit_stops": [
    { "driver": "VER", "lap": 17, "compound": "HARD", "pit_duration_s": 22.4, "is_in_lap": true  },
    { "driver": "VER", "lap": 18, "compound": "HARD", "pit_duration_s": null, "is_in_lap": false }
    // both in-lap and out-lap entries are stored; is_in_lap distinguishes them
  ],

  "track_status": {
    "sc_laps":         [34, 35, 36, 37],    // laps under full Safety Car
    "vsc_laps":        [12, 13],            // laps under Virtual Safety Car
    "red_flag_laps":   [],                  // laps under red flag
    "per_lap_status":  [                    // raw status per lap
      { "lap": 1, "status": ["AllClear"] },
      { "lap": 12, "status": ["VSC"] },
      // ...
    ]
  },

  "stints": [
    { "driver": "VER", "stint": 1, "compound": "SOFT",   "start_lap": 1,  "end_lap": 17, "fresh_tyre": false },
    { "driver": "VER", "stint": 2, "compound": "HARD",   "start_lap": 18, "end_lap": 37, "fresh_tyre": true  },
    { "driver": "VER", "stint": 3, "compound": "SOFT",   "start_lap": 38, "end_lap": 57, "fresh_tyre": true  }
    // ...all drivers
  ]
}
```

**F1 context — tyre compounds:**
| Compound | Colour | Characteristics |
|----------|--------|-----------------|
| SOFT | Red | Fastest, least durable — typically 15–20 lap life |
| MEDIUM | Yellow | Balanced — typically 25–35 lap life |
| HARD | White/Grey | Slowest, most durable — can last 40+ laps |
| INTERMEDIATE | Green | Wet/damp conditions — grooved, sheds water |
| WET | Blue | Extreme wet — maximum water evacuation |

The `fresh_tyre` flag indicates whether the set was new or had been used in qualifying or a previous stint. Used tyres are less predictable and typically degrade faster.

---

### Metrics Schema (v2)

`public/metrics/{year}_{slug}.json` — produced by `compute_inversions.py`

```jsonc
{
  // ── Core (v1, backward compatible) ──────────────────────────────────────────
  "race_id":             "2025_bah",
  "year":                2025,
  "round":               2,
  "grand_prix":          "Bahrain Grand Prix",
  "circuit":             "Bahrain International Circuit",
  "total_laps":          57,
  "grid_size":           20,
  "total_inversions":    142,            // start→finish MergeSort count
  "total_lap_inversions": 1684,         // sum of per-lap Fenwick counts
  "volatility_score":    1.4772,        // normalised: total_lap_inversions / (grid × laps)
  "max_possible_inversions": 190,       // n(n-1)/2 for n=20
  "biggest_mover":       { "code": "NOR", "positions_gained": 8, ... },
  "most_overtaken":      { "code": "SAR", "positions_gained": -9, ... },
  "dnf_count":           2,
  "drivers":             [...],          // same as raw + status
  "driver_movements":    [...],          // start/finish positions + delta per driver
  "inversions_per_lap":  [{ "lap": 1, "inversions": 28 }, ...],
  "cumulative_inversions": [{ "lap": 1, "cumulative": 28 }, ...],
  "position_matrix":     [{ "lap": 1, "VER": {"pos": 1, "dnf": false}, ... }],

  // ── v2: Schema version + flag ────────────────────────────────────────────────
  "schema_version":   2,
  "has_enhanced_data": true,    // false for races fetched before v2 ingestion

  // ── v2: Pit-adjusted inversions ──────────────────────────────────────────────
  "pit_adjusted": {
    "inversions_per_lap":  [{ "lap": 1, "inversions": 24 }, ...],
    "cumulative_inversions": [...],
    "total_lap_inversions": 1410,
    "volatility_score":    1.2368
  },

  // ── v2: SC-neutralized volatility ────────────────────────────────────────────
  "sc_neutralized": {
    "inversions_per_lap":  [...],   // SC/VSC laps at 0.25× weight
    "total": 1598.25,
    "volatility_score": 1.4020
  },

  // ── v2: Overtake classification ───────────────────────────────────────────────
  "overtake_summary": {
    "total":     47,
    "on_track":  22,
    "pit_cycle": 18,
    "sc_vsc":     5,
    "dnf":        2
  },

  // ── v2: DNF-aware movement ────────────────────────────────────────────────────
  "dnf_aware_movements": [
    { "code": "NOR", "positions_gained": 8, "attrition_adjusted_gain": 6, "dnf": false },
    ...
  ],
  "attrition_adjusted_biggest_mover": { "code": "NOR", "attrition_adjusted_gain": 6, ... },

  // ── v2: Driver battles ────────────────────────────────────────────────────────
  "driver_battles": [
    {
      "driver_a": "ALO", "driver_b": "STR",
      "position_swaps": 4,
      "laps_within_1":  18,
      "winner": "ALO",
      "intensity": 13.0
    }
    // ...top 15 battles
  ],

  // ── v2: Pit stop impact ───────────────────────────────────────────────────────
  "pit_impact": [
    {
      "driver": "VER", "in_lap": 17, "out_lap": 18,
      "compound": "HARD", "duration_s": 22.4,
      "pos_before": 1, "pos_after": 4,
      "net_position_change": -3
    }
    // ...one entry per pit stop
  ],

  // ── v2: Strategy chaos score ──────────────────────────────────────────────────
  "strategy_score": {
    "undercuts": 3, "overcuts": 2, "pit_cycle_passes": 18,
    "failed_strategies": 4, "strategy_chaos_score": 28.0
  },

  // ── v2: Race chaos timeline ───────────────────────────────────────────────────
  "chaos_timeline": [
    {
      "lap": 23, "inversions": 12,
      "on_track_overtakes": 3, "pit_passes": 2, "sc_vsc_moves": 0, "dnf_moves": 0,
      "pit_stops": 4, "safety_car": false, "vsc": false, "red_flag": false
    }
    // ...one entry per lap
  ],

  // ── v2: No-SC simulator ───────────────────────────────────────────────────────
  "no_sc_sim": {
    "inversions_per_lap": [...],    // only racing laps, SC/VSC removed
    "total_inversions":   1320,
    "volatility_score":   1.3058,
    "racing_laps":        51,
    "removed_laps":       [34, 35, 36, 37],
    "sc_laps_removed":    4
  },

  // ── v2: Momentum tracker ──────────────────────────────────────────────────────
  "momentum": {
    "window": 5,
    "per_lap": [
      { "lap": 6, "VER": -1, "HAM": 3, "NOR": 0, ... }
      // ...one entry per lap; null for DNF drivers after retirement
    ],
    "peak_momentum": [
      { "code": "HAM", "peak_momentum": 9, "peak_lap": 38 }
      // ...top 10 by absolute peak
    ]
  },

  // ── v2: Track status summary ──────────────────────────────────────────────────
  "track_status": {
    "sc_laps":       [34, 35, 36, 37],
    "vsc_laps":      [],
    "red_flag_laps": [],
    "sc_count":      4,
    "vsc_count":     0
  },

  // ── v2: Stint data ────────────────────────────────────────────────────────────
  "stints": [
    { "driver": "VER", "stint": 1, "compound": "SOFT", "start_lap": 1, "end_lap": 17, "fresh_tyre": false }
    // ...one entry per driver stint
  ]
}
```

---

### FastF1 Data Availability

Not all enhanced features are available from FastF1 for all sessions. This document records what is and isn't available so future contributors know where limitations exist:

| Feature | FastF1 Source | Available? | Notes |
|---------|---------------|-----------|-------|
| Lap positions | `session.laps` `Position` col | ✓ Yes | Timing-stream positions per lap |
| Qualifying grid | `session.results` `GridPosition` | ✓ Yes | May need fallback to `Position` |
| Pit in/out laps | `session.laps` `PitInTime`/`PitOutTime` | ✓ Yes | NaT when driver didn't pit |
| Tyre compound | `session.laps` `Compound` | ✓ Yes | Standardised string (SOFT/MEDIUM etc.) |
| Stint number | `session.laps` `Stint` | ✓ Yes | Integer, increments per pit stop |
| Fresh/used tyre | `session.laps` `FreshTyre` | ✓ Yes | Boolean |
| Safety Car status | `session.track_status` `Status` col | ✓ Yes | Per-timestamp codes, collapsed to per-lap |
| VSC status | Same as above | ✓ Yes | Code '6' |
| Race control messages | `session.race_control_messages` | ✓ Yes | Needed to load (`messages=True` in session.load) |
| Driver status (DNF etc.) | `session.results` `Status` | ✓ Yes | Final classification only |
| Live gap to leader | Streaming API only | ✗ No | Not reliably available via standard FastF1 |
| DRS open/closed per lap | Telemetry only | ✗ No | Would require per-driver telemetry stream, 1 Hz |
| Overtake Mode position | Not in FastF1 | ✗ No | Specific to hybrid system — no public data feed |

---

## Frontend — All Visualisations

Each race page and season page renders the following interactive React components. All components receive their data as static props baked in at build time — no runtime API calls.

### Race Page (`/[year]/[race]`)

| Component | What it shows | Data source |
|-----------|---------------|-------------|
| **Inversions Per Lap** (`VolatilityChart`) | Line chart: inversions each lap vs. starting grid | `inversions_per_lap` |
| **Cumulative Inversion Curve** (`CumulativeChart`) | Running total of inversions — reveals chaos shape | `cumulative_inversions` |
| **Lap-by-Lap Position Tracker** (`LapPositionChart`) | Spaghetti chart of all driver positions — filterable by driver, team, status | `position_matrix`, `drivers` |
| **Driver Position Changes** (`DriverMovementChart`) | Horizontal bar chart: net positions gained/lost per driver | `driver_movements` |
| **Position Heatmap** (`PositionHeatmap`) | Grid: rows = laps, columns = drivers. Cell colour = position (green = P1, red = last) | `position_matrix` |
| **Race Chaos Timeline** (`ChaosTimeline`) | Stacked bar chart per lap: on-track / pit-cycle / SC-VSC / DNF overtakes | `chaos_timeline` |
| **Overtake Classification** (`OvertakeSummary`) | Summary cards breaking down the 4 overtake categories with percentages | `overtake_summary` |
| **Adjusted Volatility** (`AdjustedVolatility`) | 3-line chart: raw (dashed grey) + pit-adjusted (green) + SC-neutralized (yellow) | `inversions_per_lap`, `pit_adjusted`, `sc_neutralized` |
| **Driver Battle Index** (`DriverBattleIndex`) | Ranked cards: top 15 wheel-to-wheel battles by intensity score | `driver_battles` |
| **Tyre Strategy Timeline** (`TyreStrategyTimeline`) | Horizontal Gantt chart: each driver's tyre stints, coloured by compound. Hover for pit data. Driver-filterable. | `stints`, `pit_impact` |
| **What If No Safety Car?** (`NoSCSimulator`) | Dual-line chart: actual vs. simulated no-SC volatility. 4 summary cards. | `no_sc_sim`, `inversions_per_lap` |
| **Momentum Tracker** (`MomentumTracker`) | Line chart: rolling 5-lap momentum per driver. Zero reference line. Driver-filterable. Peak movers callout. | `momentum` |
| **Strategy Chaos Score** (`StrategyChaosScore`) | Score dashboard: undercuts, overcuts, pit-cycle passes, failed strategies | `strategy_score` |

### Season Page (`/[year]`)

| Component | What it shows |
|-----------|---------------|
| **Volatility by Round** (`SeasonBarChart`) | Bar chart: one bar per race, height = volatility. Click-through to race page. |
| **Season Chaos Rankings** (`SeasonChaosRankings`) | Sortable table: all races ranked by volatility / inversions / on-track overtakes / SC interventions. Gold/silver/bronze medals for top 3. |
| **All Races** (static grid) | Card grid with round number, circuit, volatility, inversions, winner. |

### Compare Page (`/compare/[circuit]`)

| Component | What it shows |
|-----------|---------------|
| **Season Trend Chart** (`SeasonTrendChart`) | Overlaid slopes comparing volatility across 2024/2025/2026 for the same circuit |
| **Multi-Race Bar** (`MultiSeriesChart`) | Side-by-side bars comparing inversions per year |

### Home Page (`/`)

- Season-level summary cards and trend overview across all three seasons.

---

### Driver Filter Pattern

The **Lap Position Tracker**, **Momentum Tracker**, and **Tyre Strategy Timeline** all use the same interactive filter pattern:

1. **Quick-select buttons** — All / Finishers / Top 10 / None (Finishers default for position/momentum; All for tyre timeline)
2. **Driver pills** — one pill per driver, coloured by team. Click to toggle. DNF drivers show a small DNF badge and are dimmed when deselected.
3. **Live driver count** — "X / 20 drivers shown" updates in real time.

This was deliberately built as a direct replication of the filter UX in `LapPositionChart.tsx` so all three charts feel like a consistent system.

**Team colours** used throughout:

| Team | Colour |
|------|--------|
| McLaren | `#FF8000` |
| Ferrari | `#E8002D` |
| Red Bull Racing | `#3671C6` |
| Mercedes | `#27F4D2` |
| Aston Martin | `#358C75` |
| Alpine | `#FF87BC` |
| Williams | `#64C4FF` |
| Racing Bulls / RB | `#6692FF` |
| Haas | `#B6BABD` |
| Audi / Sauber | `#52E252` |
| Cadillac | `#C0A020` |

---

## Project Structure

```
F1Chaos/
│
├── analytics/
│   ├── fetch_race_data.py      FastF1 ingestion (v2) — pit stops, track status, stints
│   ├── bulk_fetch.py           Batch fetcher: one or all seasons, optional --force re-fetch
│   ├── compute_inversions.py   Full analytics engine: all 13 modules (v1 + v2)
│   └── check_race.py           Availability checker (INGESTED / FETCHED / AVAILABLE / NOT YET)
│
├── data/                       Raw race JSON — one file per race (gitignored contents)
│   ├── 2024_bah.json
│   ├── 2025_bah.json
│   └── ...
│
├── public/
│   ├── metrics/                Computed metrics JSON — read by Astro at build time
│   │   ├── 2024_bah.json
│   │   └── ...
│   └── imgs/                   Site logo + social preview images
│
├── src/
│   ├── components/
│   │   └── charts/
│   │       ├── VolatilityChart.tsx         Inversions per lap (line)
│   │       ├── CumulativeChart.tsx         Cumulative inversion curve (line)
│   │       ├── LapPositionChart.tsx        Driver positions with filter pills (spaghetti)
│   │       ├── DriverMovementChart.tsx     Position changes (horizontal bars)
│   │       ├── PositionHeatmap.tsx         Position heatmap (grid)
│   │       ├── ChaosTimeline.tsx           Race chaos timeline (stacked bars) [v2]
│   │       ├── OvertakeSummary.tsx         Overtake category breakdown [v2]
│   │       ├── AdjustedVolatility.tsx      3-line volatility comparison [v2]
│   │       ├── DriverBattleIndex.tsx       Battle intensity ranked cards [v2]
│   │       ├── TyreStrategyTimeline.tsx    Tyre Gantt chart with pit data [v2]
│   │       ├── NoSCSimulator.tsx           What-if no-SC comparison chart [v2]
│   │       ├── MomentumTracker.tsx         Rolling momentum per driver [v2]
│   │       ├── StrategyChaosScore.tsx      Strategy breakdown dashboard [v2]
│   │       ├── SeasonBarChart.tsx          Season volatility bar chart
│   │       ├── SeasonChaosRankings.tsx     Sortable season rankings table [v2]
│   │       ├── SeasonTrendChart.tsx        Cross-year trend chart (compare pages)
│   │       ├── MultiSeriesChart.tsx        Multi-year bar comparison
│   │       └── LineChart.tsx               Generic internal recharts wrapper
│   │
│   ├── data/
│   │   └── races.ts            URL↔data slug maps, RACE_META, SEASON_COLORS
│   │
│   ├── layouts/
│   │   └── Base.astro          Shared nav + footer; season colour CSS variables
│   │
│   ├── pages/
│   │   ├── index.astro         Home page: high-level season overview
│   │   ├── [year]/
│   │   │   ├── index.astro     Season page: bar chart + chaos rankings + race cards
│   │   │   └── [race].astro    Race page: all 13 visualisation sections
│   │   └── compare/
│   │       ├── index.astro     Compare overview: filter by circuit
│   │       └── [race].astro    Circuit year-over-year comparison
│   │
│   └── styles/
│       └── global.css          Design system, card/chart/metric layout primitives
│
├── cache/fastf1/               FastF1 API disk cache (gitignored — ~2-5 GB)
├── dist/                       Built static site output (gitignored contents)
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

---

## Adding a New Race (2026 Season)

After each race weekend, adding it to the site takes four shell commands. Run them from the project root with Python 3.11 (`py -3.11` on Windows if multiple Python versions are installed).

### Step 0 — Check availability

FastF1 typically uploads timing data within a few hours of the race ending.

```bash
py -3.11 analytics/check_race.py --year 2026
```

| Status | Meaning |
|--------|---------|
| `INGESTED` | Raw data + metrics both on disk — nothing to do |
| `FETCHED` | Raw data present, metrics need recomputing |
| `AVAILABLE` | FastF1 is ready — proceed to Step 1 |
| `NOT YET` | Race hasn't happened or FastF1 hasn't uploaded yet — wait |

### Step 1 — Fetch raw data

```bash
py -3.11 analytics/bulk_fetch.py --years 2026 --round <N>
```

Replace `<N>` with the round number. This calls FastF1 and extracts:
- Lap-by-lap positions, qualifying grid, final classification, driver info
- **v2:** Pit stop timing, compound, duration; TrackStatus codes per lap; stint breakdown per driver

Output goes to `data/2026_xxx.json`. The correct circuit slug is derived from FastF1's circuit location name via the `LOCATION_SLUG` dictionary.

> **New circuit?** If a new venue appears and the script writes `data/2026_unk.json`, add the location name → slug entry to `LOCATION_SLUG` in `analytics/bulk_fetch.py` *and* add an entry for the URL slug in `src/data/races.ts` if you want a human-readable URL. Then re-run Step 1.

### Step 2 — Compute metrics

```bash
py -3.11 analytics/compute_inversions.py
```

Reads all `data/*.json` files that have no up-to-date metrics counterpart in `public/metrics/`. Runs all 13 analytics modules. Writes `public/metrics/2026_xxx.json`. Existing races are automatically skipped.

### Step 3 — Rebuild the site

```bash
npm run build
```

Astro's `import.meta.glob('../../../public/metrics/*.json', { eager: true })` picks up the new file at build time. The race appears automatically on:
- The 2026 season page (volatility bar + chaos rankings + race card)
- The compare page for its circuit (if 2024/2025 data exists)
- The home page season overview

No code changes needed.

### Full sequence

```bash
py -3.11 analytics/check_race.py --year 2026          # wait for AVAILABLE
py -3.11 analytics/bulk_fetch.py --years 2026 --round <N>
py -3.11 analytics/compute_inversions.py
npm run build
npm run preview                                       # local preview at localhost:4321
```

---

## Recomputing All Metrics

If the analytics engine is updated (e.g., a new module added), all metrics must be recomputed to pick up the new fields:

```bash
py -3.11 analytics/compute_inversions.py --force
```

`--force` ignores file modification timestamps and reprocesses every `data/*.json`. At ~49 races, this takes a few seconds. Always follow with `npm run build` to regenerate the static site from the updated metrics.

To re-fetch *and* recompute all races for a full season refresh (e.g., FastF1 corrected historical data):

```bash
py -3.11 analytics/bulk_fetch.py --years 2024 2025 2026 --force
py -3.11 analytics/compute_inversions.py --force
npm run build
```

---

## Tech Stack Detail

| Layer | Technology | Why |
|-------|------------|-----|
| Static site generator | [Astro](https://astro.build) | Zero JS by default; `import.meta.glob` loads all metrics files at build time with no manual imports; `client:load` hydration directive selectively activates only interactive components |
| UI components | React 18 + TypeScript | Chart interactivity (hover, filter state, animations) requires client-side rendering; TypeScript catches prop shape mismatches at build time |
| Charts | [Recharts](https://recharts.org) + custom CSS | Recharts for standard chart types (line, bar, composed); custom CSS Gantt for the Tyre Strategy Timeline (absolute-positioned divs, no SVG needed); custom SVG for season trend |
| Data fetching | [FastF1](https://docs.fastf1.dev) | The standard Python library for F1 lap timing and telemetry; manages disk caching, session loading, and race control message parsing |
| Analytics | Python 3.11, stdlib + pandas | MergeSort and Fenwick Tree for inversions; pandas DataFrames for lap/stint/status parsing; no external stats libraries |
| Styling | CSS custom properties | Season colours (`--y2024-color: #58a6ff`, `--y2025-color: #ff8700`, `--y2026-color: #39d353`) propagate to every component with no theme library |
| Build | Vite (bundled with Astro) | Tree-shakes unused Recharts components; chunks JS by route |

**Note on static generation vs server-side rendering:** All race data (~49 JSON files, ~150 KB each) is embedded directly into HTML pages at build time via `import.meta.glob`. This means page loads are instant with zero network requests — the trade-off is a rebuild is required for new race data. For a project updated ~weekly (after each GP), this is an acceptable constraint.

---

## Disclaimer

F1 Chaos Analyzer is an **independent, unofficial fan project** created for educational and analytical purposes. It is not affiliated with, endorsed by, or connected to Formula 1, Formula One Management Ltd., the FIA, or any F1 team or driver. "Formula 1", "F1", and related marks are trademarks of Formula One Licensing BV. Race timing data is sourced via the FastF1 open-source library for non-commercial use.

© 2026 Kritagya Loomba — All rights reserved.
