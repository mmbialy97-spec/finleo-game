// VERCEL PRIMITIVE: Sandboxes — post-duel backtest runs Python inside an isolated Firecracker micro-VM.
// CRITICAL FALLBACK: any failure OR >20s execution returns hardcoded plausible results.
// The demo MUST NOT hang.
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

import { Sandbox } from "@vercel/sandbox";
import type { Symbol } from "@/lib/ticker-data";

type ClientTrade = { side: "buy" | "sell"; sym: Symbol; price: number; at: number };

const FALLBACK = {
  userPnlPct: 2.3,
  oraclePnlPct: 6.7,
  spyPnlPct: 8.1,
  source: "fallback" as const,
  lesson: "Patience beats reflex — the Oracle stayed in its lane.",
};

export async function POST(request: Request) {
  let trades: ClientTrade[] = [];
  let oracleTrades: ClientTrade[] = [];
  try {
    const body = await request.json();
    trades = Array.isArray(body?.trades) ? body.trades : [];
    oracleTrades = Array.isArray(body?.oracleTrades) ? body.oracleTrades : [];
  } catch {
    /* fall through with empties */
  }

  const start = Date.now();
  try {
    const result = await Promise.race([
      runSandboxBacktest(trades, oracleTrades),
      timeoutAfter(20_000, "sandbox-timeout"),
    ]);
    console.log(`[SANDBOX] backtest completed via sandbox in ${Date.now() - start}ms`);
    return Response.json(result);
  } catch (err) {
    console.error(`[SANDBOX] backtest fallback engaged after ${Date.now() - start}ms`, err);
    return Response.json(makeFallback(trades, oracleTrades));
  }
}

function timeoutAfter(ms: number, label: string): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(label)), ms));
}

async function runSandboxBacktest(
  trades: ClientTrade[],
  oracleTrades: ClientTrade[],
): Promise<BacktestResult> {
  console.log("[SANDBOX] python execution started");

  // Create a Python 3.13 sandbox (no source — we write the script in directly).
  const sandbox = await Sandbox.create({
    runtime: "python3.13",
    resources: { vcpus: 2 },
    timeout: 30_000,
  });

  try {
    const payload = JSON.stringify({ trades, oracleTrades });
    await sandbox.writeFiles([
      { path: "/vercel/sandbox/script.py", content: PYTHON_SCRIPT },
      { path: "/vercel/sandbox/input.json", content: payload },
    ]);

    const cmd = await sandbox.runCommand({
      cmd: "python3",
      args: ["/vercel/sandbox/script.py", "/vercel/sandbox/input.json"],
    });

    const stdout = await cmd.stdout();
    const stderr = await cmd.stderr();
    if (cmd.exitCode !== 0) {
      console.error("[SANDBOX] python exit", cmd.exitCode, "stderr:", stderr);
      throw new Error(`python exit ${cmd.exitCode}`);
    }

    // The script prints a single JSON line.
    const lastLine = stdout.trim().split("\n").pop() ?? "{}";
    const parsed = JSON.parse(lastLine) as Omit<BacktestResult, "source">;
    return { ...parsed, source: "sandbox" };
  } finally {
    // Best-effort teardown.
    try {
      await sandbox.stop();
    } catch {
      /* ignore */
    }
  }
}

type BacktestResult = {
  userPnlPct: number;
  oraclePnlPct: number;
  spyPnlPct: number;
  source: "sandbox" | "fallback";
  lesson: string;
};

function makeFallback(trades: ClientTrade[], oracleTrades: ClientTrade[]): BacktestResult {
  // Mildly personalize the fallback so it doesn't look static if the user actually traded.
  const userActivity = trades.length;
  const oracleActivity = oracleTrades.length;
  const userTilt = (Math.min(userActivity, 6) - 2) * 0.4; // -0.8 .. +1.6
  const oracleTilt = (Math.min(oracleActivity, 4) - 1) * 0.3;
  return {
    ...FALLBACK,
    userPnlPct: +(FALLBACK.userPnlPct + userTilt).toFixed(2),
    oraclePnlPct: +(FALLBACK.oraclePnlPct + oracleTilt).toFixed(2),
  };
}

// Inlined Python: hardcoded 1-year monthly returns for AAPL/NVDA/TSLA/SPY.
// Replays user's trades and Oracle's trades, computes P&L as % of starting $10k.
const PYTHON_SCRIPT = `import json, sys

# Hardcoded 12-month returns (illustrative, NOT live data).
MONTHLY = {
    "AAPL": [0.014, 0.022, -0.008, 0.041, 0.012, -0.027, 0.033, 0.019, 0.008, -0.015, 0.028, 0.017],
    "NVDA": [0.062, 0.085, -0.041, 0.118, 0.073, -0.092, 0.054, 0.103, 0.044, -0.063, 0.081, 0.039],
    "TSLA": [-0.024, 0.045, -0.082, 0.066, -0.038, 0.057, -0.071, 0.094, -0.026, -0.044, 0.052, -0.011],
    "SPY":  [0.012, 0.018, -0.014, 0.029, 0.011, -0.018, 0.022, 0.016, 0.013, -0.009, 0.021, 0.014],
}

def compound(symbol):
    r = 1.0
    for m in MONTHLY[symbol]:
        r *= (1.0 + m)
    return r - 1.0

ONE_YEAR = {sym: compound(sym) for sym in MONTHLY}
START_CASH = 10000.0

def replay(trades):
    cash = START_CASH
    shares = {"AAPL": 0, "NVDA": 0, "TSLA": 0}
    for t in trades:
        sym = t.get("sym")
        side = t.get("side")
        price = float(t.get("price", 0))
        if sym not in shares or price <= 0:
            continue
        if side == "buy" and cash >= price:
            cash -= price
            shares[sym] += 1
        elif side == "sell" and shares[sym] > 0:
            shares[sym] -= 1
            cash += price
    # Mark-to-future: hold whatever shares remain through the 1-yr scenario.
    # Use the last trade price for each held symbol as the cost basis proxy.
    last_price = {}
    for t in reversed(trades):
        sym = t.get("sym")
        if sym in shares and sym not in last_price:
            last_price[sym] = float(t.get("price", 0))
    final_value = cash
    for sym, qty in shares.items():
        if qty <= 0:
            continue
        # Assume entry at the basis price; grow by the 1-yr return.
        basis = last_price.get(sym, 0)
        if basis <= 0:
            continue
        final_value += qty * basis * (1.0 + ONE_YEAR[sym])
    return (final_value - START_CASH) / START_CASH * 100.0

def lesson_for(user_pct, oracle_pct, spy_pct, n_trades):
    if n_trades >= 6 and user_pct < oracle_pct:
        return "Overtrading bled returns — slower hands tend to beat fast ones."
    if user_pct > spy_pct and user_pct > oracle_pct:
        return "Nicely played. Even broken clocks…well, you weren't broken."
    if user_pct < 0 and spy_pct > 0:
        return "Mr. Market wandered up while you wandered down. Boring beats heroic."
    if n_trades == 0:
        return "Not trading was a trade — and it was a fine one this time."
    return "Patience beats reflex. Time in the market beats timing it."

def main():
    with open(sys.argv[1], "r") as f:
        data = json.load(f)
    user_trades = data.get("trades", [])
    oracle_trades = data.get("oracleTrades", [])
    user_pct = replay(user_trades)
    oracle_pct = replay(oracle_trades)
    spy_pct = ONE_YEAR["SPY"] * 100.0
    result = {
        "userPnlPct": round(user_pct, 2),
        "oraclePnlPct": round(oracle_pct, 2),
        "spyPnlPct": round(spy_pct, 2),
        "lesson": lesson_for(user_pct, oracle_pct, spy_pct, len(user_trades)),
    }
    print(json.dumps(result))

if __name__ == "__main__":
    main()
`;
