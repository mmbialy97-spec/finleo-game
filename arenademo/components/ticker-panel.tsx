"use client";

import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";
import { SYMBOLS, type Symbol } from "@/lib/ticker-data";

type Props = {
  prices: Record<Symbol, number>;
  startingPrices: Record<Symbol, number>;
  priceHistory: Array<Record<Symbol, number>>;
};

export function TickerPanel({ prices, startingPrices, priceHistory }: Props) {
  return (
    <div className="rounded-2xl border border-arena-border bg-arena-panel/80 p-5 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-arena-dim">Live tickers</div>
          <div className="mt-0.5 font-mono text-sm text-white/80">Synthetic feed · 500ms</div>
        </div>
        <div className="flex items-center gap-2 text-xs text-arena-dim">
          <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-arena-gain" />
          <span className="font-mono">LIVE</span>
        </div>
      </div>

      <div className="space-y-3">
        {SYMBOLS.map((sym) => {
          const price = prices[sym];
          const start = startingPrices[sym];
          const chg = ((price - start) / start) * 100;
          const positive = chg >= 0;
          return (
            <div
              key={sym}
              className="relative overflow-hidden rounded-xl border border-arena-border bg-black/40 p-4"
            >
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="font-mono text-lg font-semibold text-white">{sym}</div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-widest text-arena-dim">
                    {sym === "AAPL" ? "Apple" : sym === "NVDA" ? "Nvidia" : "Tesla"}
                  </div>
                </div>
                <div className="text-right">
                  <motion.div
                    key={price}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="tabular font-mono text-2xl text-white"
                  >
                    ${price.toFixed(2)}
                  </motion.div>
                  <div
                    className={`tabular mt-0.5 inline-flex items-center justify-end gap-0.5 text-xs ${
                      positive ? "text-arena-gain" : "text-arena-loss"
                    }`}
                  >
                    {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {positive ? "+" : ""}
                    {chg.toFixed(2)}%
                  </div>
                </div>
              </div>

              <Sparkline values={priceHistory.map((h) => h[sym])} positive={positive} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Sparkline({ values, positive }: { values: number[]; positive: boolean }) {
  if (values.length < 2) {
    return <div className="mt-3 h-10" />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 0.0001);
  const w = 280;
  const h = 40;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const color = positive ? "#22c55e" : "#ef4444";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 h-10 w-full">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
