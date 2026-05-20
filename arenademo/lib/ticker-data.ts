// Pre-generated synthetic 30-second tick data (60 ticks @ 500ms) for AAPL, NVDA, TSLA.
// Deterministic per session via a seedable PRNG so the demo is reproducible.

export type Symbol = "AAPL" | "NVDA" | "TSLA";

export const SYMBOLS: Symbol[] = ["AAPL", "NVDA", "TSLA"];

export const STARTING_PRICES: Record<Symbol, number> = {
  AAPL: 277.0,
  NVDA: 185.0,
  TSLA: 445.0,
};

export const TICK_INTERVAL_MS = 500;
export const TOTAL_TICKS = 60; // 30 seconds

// Simple seedable PRNG (Mulberry32) so the duel is identical run-to-run.
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export type Tick = {
  index: number;
  t: number; // ms since duel start
  prices: Record<Symbol, number>;
};

export function generateTicks(seed = 0xA11CE): Tick[] {
  const rand = mulberry32(seed);
  const ticks: Tick[] = [];
  const current: Record<Symbol, number> = { ...STARTING_PRICES };

  // Volatility (per-tick std dev as % of price) — modest realistic ranges.
  const vol: Record<Symbol, number> = {
    AAPL: 0.0018,
    NVDA: 0.0032,
    TSLA: 0.0045,
  };

  // Tiny drift to give each symbol a slight personality this session.
  const drift: Record<Symbol, number> = {
    AAPL: 0.00015,
    NVDA: 0.0006,
    TSLA: -0.0002,
  };

  for (let i = 0; i < TOTAL_TICKS; i++) {
    for (const sym of SYMBOLS) {
      // Box-Muller transform to get a gaussian step.
      const u1 = Math.max(rand(), 1e-9);
      const u2 = rand();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const pct = drift[sym] + z * vol[sym];
      current[sym] = +(current[sym] * (1 + pct)).toFixed(2);
    }
    ticks.push({
      index: i,
      t: i * TICK_INTERVAL_MS,
      prices: { ...current },
    });
  }

  return ticks;
}
