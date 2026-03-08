// ── Race metadata & routing maps ─────────────────────────────────────────────

/** Map: URL-friendly path slug → data-file short slug */
export const URL_TO_DATA_SLUG: Record<string, string> = {
  'australia':      'au',
  'bahrain':        'bah',
  'saudi-arabia':   'sau',
  'japan':          'jap',
  'china':          'chn',
  'miami':          'mia',
  'imola':          'imo',
  'monaco':         'mon',
  'canada':         'can',
  'spain':          'esp',
  'austria':        'aut',
  'great-britain':  'gb',
  'hungary':        'hun',
  'belgium':        'bel',
  'netherlands':    'ned',
  'italy':          'ita',
  'azerbaijan':     'aze',
  'singapore':      'sin',
  'united-states':  'usa',
  'mexico':         'mex',
  'brazil':         'bra',
  'las-vegas':      'lv',
  'qatar':          'qat',
  'abu-dhabi':      'abu',
};

/** Reverse map: data-file slug → URL slug */
export const DATA_SLUG_TO_URL: Record<string, string> = Object.fromEntries(
  Object.entries(URL_TO_DATA_SLUG).map(([url, data]) => [data, url])
);

export interface RaceMeta {
  name: string;       // "Australian Grand Prix"
  shortName: string;  // "Australia"
  circuit: string;    // "Albert Park"
  country: string;
}

export const RACE_META: Record<string, RaceMeta> = {
  au:  { name: 'Australian Grand Prix',      shortName: 'Australia',     circuit: 'Albert Park',                    country: 'Australia'   },
  bah: { name: 'Bahrain Grand Prix',          shortName: 'Bahrain',       circuit: 'Bahrain International Circuit',  country: 'Bahrain'     },
  sau: { name: 'Saudi Arabian Grand Prix',    shortName: 'Saudi Arabia',  circuit: 'Jeddah Corniche Circuit',        country: 'Saudi Arabia'},
  jap: { name: 'Japanese Grand Prix',         shortName: 'Japan',         circuit: 'Suzuka Circuit',                 country: 'Japan'       },
  chn: { name: 'Chinese Grand Prix',          shortName: 'China',         circuit: 'Shanghai International Circuit', country: 'China'       },
  mia: { name: 'Miami Grand Prix',            shortName: 'Miami',         circuit: 'Miami International Autodrome',  country: 'USA'         },
  imo: { name: 'Emilia Romagna Grand Prix',   shortName: 'Imola',         circuit: 'Autodromo Enzo e Dino Ferrari',  country: 'Italy'       },
  mon: { name: 'Monaco Grand Prix',           shortName: 'Monaco',        circuit: 'Circuit de Monaco',              country: 'Monaco'      },
  can: { name: 'Canadian Grand Prix',         shortName: 'Canada',        circuit: 'Circuit Gilles Villeneuve',      country: 'Canada'      },
  esp: { name: 'Spanish Grand Prix',          shortName: 'Spain',         circuit: 'Circuit de Barcelona-Catalunya', country: 'Spain'       },
  aut: { name: 'Austrian Grand Prix',         shortName: 'Austria',       circuit: 'Red Bull Ring',                  country: 'Austria'     },
  gb:  { name: 'British Grand Prix',          shortName: 'Great Britain', circuit: 'Silverstone Circuit',            country: 'Great Britain'},
  hun: { name: 'Hungarian Grand Prix',        shortName: 'Hungary',       circuit: 'Hungaroring',                    country: 'Hungary'     },
  bel: { name: 'Belgian Grand Prix',          shortName: 'Belgium',       circuit: 'Spa-Francorchamps',              country: 'Belgium'     },
  ned: { name: 'Dutch Grand Prix',            shortName: 'Netherlands',   circuit: 'Circuit Zandvoort',              country: 'Netherlands' },
  ita: { name: 'Italian Grand Prix',          shortName: 'Italy',         circuit: 'Monza',                          country: 'Italy'       },
  aze: { name: 'Azerbaijan Grand Prix',       shortName: 'Azerbaijan',    circuit: 'Baku City Circuit',              country: 'Azerbaijan'  },
  sin: { name: 'Singapore Grand Prix',        shortName: 'Singapore',     circuit: 'Marina Bay Street Circuit',      country: 'Singapore'   },
  usa: { name: 'United States Grand Prix',    shortName: 'USA',           circuit: 'Circuit of the Americas',        country: 'USA'         },
  mex: { name: 'Mexico City Grand Prix',      shortName: 'Mexico',        circuit: 'Autodromo Hermanos Rodriguez',   country: 'Mexico'      },
  bra: { name: 'Sao Paulo Grand Prix',        shortName: 'Brazil',        circuit: 'Autodromo Jose Carlos Pace',     country: 'Brazil'      },
  lv:  { name: 'Las Vegas Grand Prix',        shortName: 'Las Vegas',     circuit: 'Las Vegas Strip Circuit',        country: 'USA'         },
  qat: { name: 'Qatar Grand Prix',            shortName: 'Qatar',         circuit: 'Lusail International Circuit',   country: 'Qatar'       },
  abu: { name: 'Abu Dhabi Grand Prix',        shortName: 'Abu Dhabi',     circuit: 'Yas Marina Circuit',             country: 'UAE'         },
};

/** Season accent colours */
export const SEASON_COLORS: Record<number, string> = {
  2024: '#58a6ff',
  2025: '#ff8700',
  2026: '#39d353',
};

/** CSS variable names per season */
export const SEASON_CSS_VAR: Record<number, string> = {
  2024: 'var(--y2024-color)',
  2025: 'var(--y2025-color)',
  2026: 'var(--y2026-color)',
};

export const ALL_YEARS = [2024, 2025, 2026] as const;
