"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Timer, Zap } from "lucide-react";
import { Portfolio, type Trade } from "@/components/portfolio";
import { OraclePanel, type OracleTrade } from "@/components/oracle-panel";
import { TickerPanel } from "@/components/ticker-panel";
import { ResultsScreen } from "@/components/results-screen";
import { SYMBOLS, type Symbol, STARTING_PRICES, TOTAL_TICKS, TICK_INTERVAL_MS } from "@/lib/ticker-data";

type Phase = "idle" | "duel" | "backtest" | "results";

export type BacktestResult = {
  userPnlPct: number;
  oraclePnlPct: number;
  spyPnlPct: number;
  source: "sandbox" | "fallback";
  lesson: string;
};

const STARTING_CASH = 10000;

export function DuelClient() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [prices, setPrices] = useState<Record<Symbol, number>>(STARTING_PRICES);
  const [priceHistory, setPriceHistory] = useState<Array<Record<Symbol, number>>>([STARTING_PRICES]);
  const [tickIndex, setTickIndex] = useState(0);
  const [oracleText, setOracleText] = useState("");
  const [currentModel, setCurrentModel] = useState<string>("anthropic/claude-haiku-4-5");
  const [userCash, setUserCash] = useState(STARTING_CASH);
  const [userShares, setUserShares] = useState<Record<Symbol, number>>({ AAPL: 0, NVDA: 0, TSLA: 0 });
  const [trades, setTrades] = useState<Trade[]>([]);
  const [oracleCash, setOracleCash] = useState(STARTING_CASH);
  const [oracleShares, setOracleShares] = useState<Record<Symbol, number>>({ AAPL: 0, NVDA: 0, TSLA: 0 });
  const [oracleTrades, setOracleTrades] = useState<OracleTrade[]>([]);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const pricesRef = useRef(prices);
  pricesRef.current = prices;
  const sharesRef = useRef(userShares);
  sharesRef.current = userShares;
  const cashRef = useRef(userCash);
  cashRef.current = userCash;
  const oraclePricesRef = useRef(prices);
  oraclePricesRef.current = prices;
  const tradesRef = useRef<Trade[]>([]);
  tradesRef.current = trades;
  const oracleTradesRef = useRef<OracleTrade[]>([]);
  oracleTradesRef.current = oracleTrades;

  const secondsLeft = useMemo(() => {
    const elapsed = tickIndex * TICK_INTERVAL_MS;
    return Math.max(0, Math.ceil((TOTAL_TICKS * TICK_INTERVAL_MS - elapsed) / 1000));
  }, [tickIndex]);

  // Trigger backtest once the duel ends.
  const runBacktest = useCallback(async (finalTrades: Trade[], finalOracleTrades: OracleTrade[]) => {
    setPhase("backtest");
    try {
      const res = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trades: finalTrades, oracleTrades: finalOracleTrades }),
      });
      const data: BacktestResult = await res.json();
      setResult(data);
    } catch (err) {
      console.error("[BACKTEST] client error, using local fallback", err);
      setResult({
        userPnlPct: 2.3,
        oraclePnlPct: 6.7,
        spyPnlPct: 8.1,
        source: "fallback",
        lesson: "Patience beats reflex.",
      });
    } finally {
      setPhase("results");
    }
  }, []);

  // Subtle bell when timer hits zero.
  const playBell = useCallback(() => {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.value = 0.0001;
      o.connect(g).connect(ctx.destination);
      const now = ctx.currentTime;
      g.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
      o.start(now);
      o.stop(now + 1);
    } catch {
      /* no-op */
    }
  }, []);

  // Open the SSE stream — this is the Fluid Compute streaming endpoint.
  const startDuel = useCallback(async () => {
    setPhase("duel");
    setTickIndex(0);
    setPrices(STARTING_PRICES);
    setPriceHistory([STARTING_PRICES]);
    setOracleText("");
    setUserCash(STARTING_CASH);
    setUserShares({ AAPL: 0, NVDA: 0, TSLA: 0 });
    setTrades([]);
    setOracleCash(STARTING_CASH);
    setOracleShares({ AAPL: 0, NVDA: 0, TSLA: 0 });
    setOracleTrades([]);
    setResult(null);

    const res = await fetch("/api/duel/stream", { method: "POST" });
    if (!res.body) {
      console.error("No stream body");
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      // Parse SSE: events delimited by blank lines.
      let idx;
      while ((idx = buf.indexOf("\n\n")) !== -1) {
        const raw = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const lines = raw.split("\n");
        let event = "message";
        let data = "";
        for (const line of lines) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) data += line.slice(5).trim();
        }
        if (!data) continue;
        try {
          const payload = JSON.parse(data);
          handleEvent(event, payload);
        } catch (e) {
          console.warn("bad SSE payload", e);
        }
      }
    }

    // Stream closed → run backtest.
    playBell();
    setTimeout(() => runBacktest(tradesRef.current, oracleTradesRef.current), 400);

    function handleEvent(event: string, payload: unknown) {
      if (event === "tick") {
        const p = payload as { index: number; prices: Record<Symbol, number> };
        setPrices(p.prices);
        setPriceHistory((h) => [...h, p.prices]);
        setTickIndex(p.index + 1);
      } else if (event === "oracle-text") {
        const p = payload as { delta: string };
        setOracleText((t) => t + p.delta);
      } else if (event === "model-switch") {
        const p = payload as { model: string };
        setCurrentModel(p.model);
        setOracleText((t) => t + "\n\n");
      } else if (event === "oracle-trade") {
        const p = payload as { side: "buy" | "sell"; sym: Symbol };
        const live = oraclePricesRef.current[p.sym];
        if (p.side === "buy") {
          setOracleCash((c) => Math.max(0, c - live));
          setOracleShares((s) => ({ ...s, [p.sym]: s[p.sym] + 1 }));
        } else {
          setOracleShares((s) => ({ ...s, [p.sym]: Math.max(0, s[p.sym] - 1) }));
          setOracleCash((c) => c + live);
        }
        const trade: OracleTrade = { side: p.side, sym: p.sym, price: live, at: Date.now() };
        setOracleTrades((arr) => [...arr, trade]);
      } else if (event === "end") {
        // server signals end of duel
      }
    }
  }, [playBell, runBacktest]);

  // Auto-start when the page mounts.
  useEffect(() => {
    if (phase === "idle") {
      startDuel();
    }
  }, [phase, startDuel]);

  const handleBuy = (sym: Symbol) => {
    const price = pricesRef.current[sym];
    if (cashRef.current < price) return;
    setUserCash((c) => +(c - price).toFixed(2));
    setUserShares((s) => ({ ...s, [sym]: s[sym] + 1 }));
    setTrades((arr) => [...arr, { side: "buy", sym, price, at: Date.now() }]);
  };

  const handleSell = (sym: Symbol) => {
    if (sharesRef.current[sym] <= 0) return;
    const price = pricesRef.current[sym];
    setUserShares((s) => ({ ...s, [sym]: s[sym] - 1 }));
    setUserCash((c) => +(c + price).toFixed(2));
    setTrades((arr) => [...arr, { side: "sell", sym, price, at: Date.now() }]);
  };

  const userPortfolioValue = userCash + SYMBOLS.reduce((acc, s) => acc + userShares[s] * prices[s], 0);
  const oraclePortfolioValue = oracleCash + SYMBOLS.reduce((acc, s) => acc + oracleShares[s] * prices[s], 0);

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-20" aria-hidden />

      {/* Top bar */}
      <div className="relative z-10 border-b border-arena-border bg-arena-panel/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-arena-border bg-black/60">
              <Zap className="h-4 w-4 text-arena-user" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-arena-dim">Arena</div>
              <div className="font-mono text-sm text-white/90">Live Duel</div>
            </div>
          </div>

          <CountdownPill seconds={secondsLeft} active={phase === "duel"} />

          <div className="hidden items-center gap-2 text-xs text-arena-dim md:flex">
            <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-arena-gain" />
            <span className="font-mono">AI Gateway · {currentModel.split("/")[1]}</span>
          </div>
        </div>
      </div>

      {/* 3-column grid */}
      <div className="relative z-10 mx-auto grid max-w-7xl gap-4 px-6 py-6 lg:grid-cols-3">
        <TickerPanel
          prices={prices}
          startingPrices={STARTING_PRICES}
          priceHistory={priceHistory}
        />
        <Portfolio
          cash={userCash}
          shares={userShares}
          prices={prices}
          startingCash={STARTING_CASH}
          totalValue={userPortfolioValue}
          onBuy={handleBuy}
          onSell={handleSell}
          locked={phase !== "duel"}
          trades={trades}
        />
        <OraclePanel
          text={oracleText}
          model={currentModel}
          trades={oracleTrades}
          shares={oracleShares}
          totalValue={oraclePortfolioValue}
          startingCash={STARTING_CASH}
        />
      </div>

      {/* Backtest overlay */}
      <AnimatePresence>
        {phase === "backtest" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
          >
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="relative">
                <div className="h-16 w-16 animate-spin rounded-full border-2 border-arena-border border-t-arena-user" />
                <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-arena-user" />
              </div>
              <div>
                <div className="font-mono text-xs uppercase tracking-[0.3em] text-arena-dim">Vercel Sandbox</div>
                <div className="mt-2 text-2xl font-medium text-white">Running 1-year backtest…</div>
                <div className="mt-2 max-w-md text-sm text-arena-dim">
                  Replaying your trades against real historical returns inside an isolated Python micro-VM.
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results overlay */}
      <AnimatePresence>
        {phase === "results" && result && (
          <ResultsScreen result={result} trades={trades} />
        )}
      </AnimatePresence>
    </main>
  );
}

function CountdownPill({ seconds, active }: { seconds: number; active: boolean }) {
  const pct = (seconds / 30) * 100;
  const urgent = seconds <= 5;
  return (
    <div className="flex items-center gap-3">
      <Timer className={`h-4 w-4 ${urgent ? "text-arena-loss" : "text-arena-user"}`} />
      <div className="relative h-2 w-48 overflow-hidden rounded-full border border-arena-border bg-black/60">
        <motion.div
          className={`absolute inset-y-0 left-0 ${urgent ? "bg-arena-loss" : "bg-arena-user"}`}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "linear" }}
        />
      </div>
      <div className={`tabular font-mono text-lg ${urgent ? "text-arena-loss" : "text-white"} ${active ? "" : "opacity-50"}`}>
        :{seconds.toString().padStart(2, "0")}
      </div>
    </div>
  );
}
