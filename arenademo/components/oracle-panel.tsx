"use client";

import { motion } from "framer-motion";
import { Brain } from "lucide-react";
import { SYMBOLS, type Symbol } from "@/lib/ticker-data";

export type OracleTrade = { side: "buy" | "sell"; sym: Symbol; price: number; at: number };

type Props = {
  text: string;
  model: string;
  trades: OracleTrade[];
  shares: Record<Symbol, number>;
  totalValue: number;
  startingCash: number;
};

export function OraclePanel({ text, model, trades, shares, totalValue, startingCash }: Props) {
  const pnl = totalValue - startingCash;
  const positive = pnl >= 0;
  const modelShort = model.split("/")[1] || model;

  return (
    <div className="flex flex-col rounded-2xl border border-arena-oracle/30 bg-gradient-to-b from-arena-panel/90 to-arena-panel/60 p-5 shadow-[0_0_60px_-30px_rgba(255,170,0,0.45)] backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-arena-oracle/40 bg-arena-oracle/10 animate-pulse-glow">
            <Brain className="h-4 w-4 text-arena-oracle" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-arena-oracle">The Oracle</div>
            <div className="font-mono text-[10px] text-arena-dim">{modelShort}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="tabular font-mono text-xl text-white">${totalValue.toFixed(2)}</div>
          <div className={`tabular text-xs ${positive ? "text-arena-gain" : "text-arena-loss"}`}>
            {positive ? "+" : ""}
            {pnl.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Holdings row */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        {SYMBOLS.map((sym) => (
          <div key={sym} className="rounded-md border border-arena-border bg-black/40 px-2 py-1.5 text-center">
            <div className="font-mono text-[10px] text-arena-dim">{sym}</div>
            <div className="tabular font-mono text-sm text-white/90">{shares[sym]}</div>
          </div>
        ))}
      </div>

      {/* Streaming commentary */}
      <div className="relative flex-1 overflow-hidden rounded-lg border border-arena-border bg-black/40">
        <div className="border-b border-arena-border px-3 py-1.5 text-[10px] uppercase tracking-widest text-arena-dim">
          Live commentary
        </div>
        <div className="max-h-64 overflow-y-auto px-4 py-3 text-sm leading-relaxed text-white/85">
          {text ? (
            <pre className="whitespace-pre-wrap font-sans">{text}<motion.span
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-arena-oracle align-middle"
            /></pre>
          ) : (
            <span className="text-arena-dim">The Oracle considers the tape…</span>
          )}
        </div>
      </div>

      {/* Trades */}
      <div className="mt-3 overflow-hidden rounded-lg border border-arena-border bg-black/30">
        <div className="border-b border-arena-border px-3 py-1.5 text-[10px] uppercase tracking-widest text-arena-dim">
          Oracle&apos;s trades
        </div>
        <div className="max-h-24 overflow-y-auto">
          {trades.length === 0 ? (
            <div className="px-3 py-3 text-center text-xs text-arena-dim">Studying the tape…</div>
          ) : (
            <ul className="divide-y divide-arena-border">
              {trades.slice().reverse().map((t, i) => (
                <li key={i} className="flex items-center justify-between px-3 py-1.5 text-xs">
                  <span className={t.side === "buy" ? "text-arena-oracle" : "text-arena-dim"}>
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
