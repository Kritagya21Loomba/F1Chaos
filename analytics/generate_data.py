"""
Generate realistic-looking F1 race data for AU25 and AU26.
These are approximations for demo/MVP purposes.
"""
import json
import random
import copy

TOTAL_LAPS = 58

# ── 2025 Australian GP ────────────────────────────────────────────────────────

AU25_DRIVERS = [
    {"code": "NOR", "name": "Lando Norris",       "team": "McLaren",      "status": "FINISHED"},
    {"code": "VER", "name": "Max Verstappen",      "team": "Red Bull",     "status": "FINISHED"},
    {"code": "LEC", "name": "Charles Leclerc",     "team": "Ferrari",      "status": "FINISHED"},
    {"code": "PIA", "name": "Oscar Piastri",       "team": "McLaren",      "status": "FINISHED"},
    {"code": "HAM", "name": "Lewis Hamilton",      "team": "Ferrari",      "status": "FINISHED"},
    {"code": "RUS", "name": "George Russell",      "team": "Mercedes",     "status": "FINISHED"},
    {"code": "SAI", "name": "Carlos Sainz",        "team": "Williams",     "status": "FINISHED"},
    {"code": "ANT", "name": "Kimi Antonelli",      "team": "Mercedes",     "status": "FINISHED"},
    {"code": "ALO", "name": "Fernando Alonso",     "team": "Aston Martin", "status": "FINISHED"},
    {"code": "STR", "name": "Lance Stroll",        "team": "Aston Martin", "status": "FINISHED"},
    {"code": "ALB", "name": "Alexander Albon",     "team": "Williams",     "status": "FINISHED"},
    {"code": "TSU", "name": "Yuki Tsunoda",        "team": "Red Bull",     "status": "FINISHED"},
    {"code": "GAS", "name": "Pierre Gasly",        "team": "Alpine",       "status": "FINISHED"},
    {"code": "HAD", "name": "Isack Hadjar",        "team": "RB",           "status": "FINISHED"},
    {"code": "LAW", "name": "Liam Lawson",         "team": "RB",           "status": "FINISHED"},
    {"code": "BEA", "name": "Oliver Bearman",      "team": "Haas",         "status": "FINISHED"},
    {"code": "DOO", "name": "Jack Doohan",         "team": "Alpine",       "status": "DNF"},
    {"code": "OCO", "name": "Esteban Ocon",        "team": "Haas",         "status": "DNF"},
    {"code": "HUL", "name": "Nico Hulkenberg",     "team": "Sauber",       "status": "FINISHED"},
    {"code": "BOR", "name": "Gabriel Bortoleto",   "team": "Sauber",       "status": "FINISHED"},
]

AU25_START = ["NOR", "VER", "LEC", "PIA", "HAM", "RUS", "SAI", "ANT",
              "ALO", "STR", "ALB", "TSU", "GAS", "HAD", "LAW", "BEA",
              "DOO", "OCO", "HUL", "BOR"]

AU25_FINISH = ["NOR", "LEC", "VER", "PIA", "HAM", "RUS", "SAI", "ANT",
               "ALO", "ALB", "STR", "TSU", "GAS", "LAW", "HAD", "BEA",
               "HUL", "BOR", "DOO_DNF", "OCO_DNF"]

# DNF laps
AU25_DNF = {"DOO": 30, "OCO": 46}

# ── 2026 Australian GP ────────────────────────────────────────────────────────

AU26_DRIVERS = [
    {"code": "NOR", "name": "Lando Norris",       "team": "McLaren",      "status": "FINISHED"},
    {"code": "VER", "name": "Max Verstappen",      "team": "Red Bull",     "status": "FINISHED"},
    {"code": "LEC", "name": "Charles Leclerc",     "team": "Ferrari",      "status": "FINISHED"},
    {"code": "PIA", "name": "Oscar Piastri",       "team": "McLaren",      "status": "FINISHED"},
    {"code": "HAM", "name": "Lewis Hamilton",      "team": "Ferrari",      "status": "FINISHED"},
    {"code": "RUS", "name": "George Russell",      "team": "Mercedes",     "status": "FINISHED"},
    {"code": "SAI", "name": "Carlos Sainz",        "team": "Williams",     "status": "DNF"},
    {"code": "ANT", "name": "Kimi Antonelli",      "team": "Mercedes",     "status": "FINISHED"},
    {"code": "ALO", "name": "Fernando Alonso",     "team": "Aston Martin", "status": "FINISHED"},
    {"code": "STR", "name": "Lance Stroll",        "team": "Aston Martin", "status": "FINISHED"},
    {"code": "ALB", "name": "Alexander Albon",     "team": "Williams",     "status": "FINISHED"},
    {"code": "TSU", "name": "Yuki Tsunoda",        "team": "Red Bull",     "status": "FINISHED"},
    {"code": "GAS", "name": "Pierre Gasly",        "team": "Alpine",       "status": "FINISHED"},
    {"code": "HAD", "name": "Isack Hadjar",        "team": "RB",           "status": "FINISHED"},
    {"code": "LAW", "name": "Liam Lawson",         "team": "RB",           "status": "FINISHED"},
    {"code": "BEA", "name": "Oliver Bearman",      "team": "Haas",         "status": "FINISHED"},
    {"code": "DOO", "name": "Jack Doohan",         "team": "Alpine",       "status": "FINISHED"},
    {"code": "OCO", "name": "Esteban Ocon",        "team": "Haas",         "status": "DNF"},
    {"code": "HUL", "name": "Nico Hulkenberg",     "team": "Sauber",       "status": "FINISHED"},
    {"code": "BOR", "name": "Gabriel Bortoleto",   "team": "Sauber",       "status": "FINISHED"},
]

AU26_START = ["PIA", "NOR", "HAM", "LEC", "VER", "RUS", "ANT", "SAI",
              "ALO", "ALB", "STR", "TSU", "GAS", "HAD", "LAW", "DOO",
              "BEA", "OCO", "HUL", "BOR"]

AU26_FINISH = ["NOR", "HAM", "PIA", "VER", "LEC", "ANT", "RUS", "ALO",
               "ALB", "STR", "TSU", "HAD", "GAS", "LAW", "DOO", "BEA",
               "HUL", "BOR", "SAI_DNF", "OCO_DNF"]

AU26_DNF = {"SAI": 22, "OCO": 41}


def generate_laps(start_order, finish_order, dnf_map, total_laps, seed, overtake_rate=0.3):
    """
    Interpolate lap positions from start → finish.
    Higher overtake_rate means more mid-race swapping.
    DNF drivers get _DNF suffix after their retirement lap.
    """
    random.seed(seed)
    drivers = [d for d in start_order]
    dnf_codes = {k: v for k, v in dnf_map.items()}

    # Target positions (finished drivers only, index 0 = P1)
    target = [d.rstrip("_DNF") for d in finish_order]

    laps = []
    current = list(start_order)

    for lap_num in range(1, total_laps + 1):
        # Progress factor 0→1 over race
        progress = lap_num / total_laps

        # Occasionally swap adjacent non-DNF drivers to simulate overtakes
        # More swaps per lap = more chaos
        num_swaps = int(len(current) * overtake_rate * random.random())
        for _ in range(num_swaps):
            i = random.randint(0, len(current) - 2)
            a = current[i].replace("_DNF", "")
            b = current[i + 1].replace("_DNF", "")
            # Only swap active drivers
            if "_DNF" not in current[i] and "_DNF" not in current[i + 1]:
                # Bias swaps toward finishing order
                a_target = target.index(a) if a in target else 99
                b_target = target.index(b) if b in target else 99
                # Swap if it moves toward final order, or randomly
                if a_target > b_target or random.random() < 0.25:
                    current[i], current[i + 1] = current[i + 1], current[i]

        # Apply DNFs
        for code, dnf_lap in dnf_codes.items():
            if lap_num >= dnf_lap:
                if code in current:
                    idx = current.index(code)
                    current[idx] = code + "_DNF"

        laps.append({
            "lap": lap_num,
            "positions": list(current)
        })

    return laps


def build_race(race_id, year, drivers, start_order, finish_order, dnf_map, seed, overtake_rate):
    laps = generate_laps(start_order, finish_order, dnf_map, TOTAL_LAPS, seed, overtake_rate)
    return {
        "race_id": race_id,
        "year": year,
        "round": 1,
        "grand_prix": "Australian Grand Prix",
        "circuit": "Albert Park",
        "total_laps": TOTAL_LAPS,
        "drivers": drivers,
        "start_order": start_order,
        "finish_order": finish_order,
        "laps": laps
    }


if __name__ == "__main__":
    import os

    os.makedirs("data", exist_ok=True)

    au25 = build_race(
        race_id="2025_au",
        year=2025,
        drivers=AU25_DRIVERS,
        start_order=AU25_START,
        finish_order=AU25_FINISH,
        dnf_map=AU25_DNF,
        seed=42,
        overtake_rate=0.20,   # lower = fewer overtakes
    )

    au26 = build_race(
        race_id="2026_au",
        year=2026,
        drivers=AU26_DRIVERS,
        start_order=AU26_START,
        finish_order=AU26_FINISH,
        dnf_map=AU26_DNF,
        seed=99,
        overtake_rate=0.45,   # higher = more overtakes (2026 regs)
    )

    with open("data/2025_au.json", "w") as f:
        json.dump(au25, f, indent=2)
    print("Written: data/2025_au.json")

    with open("data/2026_au.json", "w") as f:
        json.dump(au26, f, indent=2)
    print("Written: data/2026_au.json")
