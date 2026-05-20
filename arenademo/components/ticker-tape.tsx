"use client";

import { TrendingDown, TrendingUp } from "lucide-react";

const ITEMS: Array<{ sym: string; price: string; chg: number }> = [
  { sym: "AAPL", price: "277.14", chg: 0.42 },
  { sym: "NVDA", price: "185.02", chg: 1.21 },
  { sym: "TSLA", price: "445.88", chg: -0.83 },
  { sym: "MSFT", price: "498.20", chg: 0.18 },
  { sym: "AMZN", price: "232.55", chg: 0.66 },
  { sym: "META", price: "612.41", chg: -0.27 },
  { sym: "GOOGL", price: "188.93", chg: 0.51 },
  { sym: "AMD", price: "168.04", chg: 1.83 },
  { sym: "SPY", price: "612.18", chg: 0.12 },
  { sym: "QQQ", price: "548.06", chg: 0.31 },
];

function Row() {
  return (
    <div className="flex shrink-0 items-center gap-10 px-6 py-2.5">
      {ITEMS.map((it) => {
        const positive = it.chg >= 0;
        return (
          <div key={it.sym + it.price} className="flex items-center gap-2 text-xs">
            <span className="font-mono font-semibold text-white/90">{it.sym}</span>
            <span className="tabular text-arena-dim">${it.price}</span>
            <span
              className={`tabular inline-flex items-center gap-0.5 ${positive ? "text-arena-gain" : "text-arena-loss"}`}
            >
              {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {positive ? "+" : ""}
              {it.chg.toFixed(2)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function TickerTape() {
  return (
    <div className="relative overflow-hidden">
      <div className="flex w-max animate-ticker-scroll">
        <Row />
        <Row />
      </div>
      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-arena-bg to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-arena-bg to-transparent" />
    </div>
  );
}
