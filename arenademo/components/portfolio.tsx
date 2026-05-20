"use client";

import { motion } from "framer-motion";
import { Minus, Plus, Wallet } from "lucide-react";
import { SYMBOLS, type Symbol } from "@/lib/ticker-data";

export type Trade = { side: "buy" | "sell"; sym: Symbol; price: number; at: number };

type Props = {
  cash: number;
  shares: Record<Symbol, number>;
  prices: Record<Symbol, number>;
  startingCash: number;
  totalValue: number;
  onBuy: (sym: Symbol) => void;
  onSell: (sym: Symbol) => void;
  locked: boolean;
  trades: Trade[];
};

export function Portfolio({
  cash,
  shares,
  prices,
  startingCash,
  totalValue,
  onBuy,
  onSell,
  locked,
  trades,
}: Props) {
  const pnl = totalValue - startingCash;
  const pnlPct = (pnl / startingCash) * 100;
  const positive = pnl >= 0;

  return (
    <div className="flex flex-col rounded-2xl border border-arena-user/30 bg-gradient-to-b from-arena-panel/90 to-arena-panel/60 p-5 shadow-[0_0_60px_-30px_rgba(0,240,255,0.45)] backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-arena-user" />
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-arena-user">You</div>
            <div className="font-mono text-sm text-white/80">$10,000 starting</div>
          </div>
        </div>
        <div className="text-right">
          <motion.div
            key={totalValue.toFixed(0)}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="tabular font-mono text-2xl text-white"
          >
            ${totalValue.toFixed(2)}
          </motion.div>
          <div className={`tabular mt-0.5 text-xs ${positive ? "text-arena-gain" : "text-arena-loss"}`}>
            {positive ? "+" : ""}
            {pnl.toFixed(2)} ({positive ? "+" : ""}
            {pnlPct.toFixed(2)}%)
          </div>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between rounded-lg border border-arena-border bg-black/40 px-3 py-2 text-xs">
        <span className="uppercase tracking-widest text-arena-dim">Cash</span>
        <span className="tabular font-mono text-white">${cash.toFixed(2)}</span>
      </div>

      <div className="space-y-2">
        {SYMBOLS.map((sym) => {
          const qty = shares[sym];
          const price = prices[sym];
          const canBuy = !locked && cash >= price;
          const canSell = !locked && qty > 0;
          return (
            <div key={sym} className="flex items-center justify-between rounded-lg border border-arena-border bg-black/30 px-3 py-2">
              <div>
                <div className="font-mono text-sm font-semibold text-white">{sym}</div>
                <div className="text-[10px] uppercase tracking-widest text-arena-dim">
                  {qty} share{qty === 1 ? "" : "s"} · ${(qty * price).toFixed(2)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSell(sym)}
                  disabled={!canSell}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-arena-border bg-black/60 text-arena-loss transition hover:border-arena-loss/60 hover:bg-arena-loss/10 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label={`Sell ${sym}`}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onBuy(sym)}
                  disabled={!canBuy}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-arena-user/40 bg-arena-user/10 text-arena-user transition hover:bg-arena-user/20 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label={`Buy ${sym}`}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex-1 overflow-hidden rounded-lg border border-arena-border bg-black/30">
        <div className="border-b border-arena-border px-3 py-1.5 text-[10px] uppercase tracking-widest text-arena-dim">
          Your trades
        </div>
        <div className="max-h-32 overflow-y-auto">
          {trades.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-arena-dim">
              Tap +/− to trade. 1 share at a time.
            </div>
          ) : (
            <ul className="divide-y divide-arena-border">
              {trades.slice().reverse().map((t, i) => (
                <li key={i} className="flex items-center justify-between px-3 py-1.5 text-xs">
                  <span className={t.side === "buy" ? "text-arena-user" : "text-arena-loss"}>
                    {t.side.toUpperCase()}
                  </span>
                  <span className="font-mono text-white/90">{t.sym}</span>
                  <span className="tabular text-arena-dim">${t.price.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
