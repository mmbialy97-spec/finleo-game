"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Check, Loader2, RotateCcw, Trophy } from "lucide-react";
import type { BacktestResult } from "@/components/duel-client";
import type { Trade } from "@/components/portfolio";

type WorkflowState = {
  runId: string;
  state: string;
  lesson?: { headline: string; bullets: string[] };
};

type Props = {
  result: BacktestResult;
  trades: Trade[];
};

export function ResultsScreen({ result, trades }: Props) {
  const [wf, setWf] = useState<WorkflowState | null>(null);
  const [saving, setSaving] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };
  useEffect(() => () => stopPolling(), []);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/save-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPnlPct: result.userPnlPct,
          oraclePnlPct: result.oraclePnlPct,
          spyPnlPct: result.spyPnlPct,
          tradeCount: trades.length,
        }),
      });
      const { runId } = (await res.json()) as { runId: string };
      setWf({ runId, state: "queued" });
      pollRef.current = setInterval(async () => {
        try {
          const r = await fetch(`/api/save-result?runId=${runId}`, { cache: "no-store" });
          if (!r.ok) return;
          const data: WorkflowState = await r.json();
          setWf(data);
          if (data.state === "done" || data.state === "error") {
            stopPolling();
          }
        } catch {
          /* keep polling */
        }
      }, 1000);
    } catch (e) {
      console.error("save failed", e);
      setSaving(false);
    }
  }, [result, saving, trades.length]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/85 px-4 py-10 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-3xl rounded-2xl border border-arena-border bg-arena-panel/90 p-8 shadow-2xl"
      >
        <div className="mb-6 flex items-center gap-3">
          <Trophy className="h-6 w-6 text-arena-oracle" />
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-arena-dim">Backtest complete</div>
            <div className="font-mono text-2xl text-white">1-year replay</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-[10px] uppercase tracking-widest text-arena-dim">
              {result.source === "sandbox" ? "Vercel Sandbox" : "Local fallback"}
            </div>
            <div className="font-mono text-xs text-arena-dim">Python · 1yr returns</div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <PnlCard label="You" pct={result.userPnlPct} color="user" />
          <PnlCard label="The Oracle" pct={result.oraclePnlPct} color="oracle" />
          <PnlCard label="S&P 500" pct={result.spyPnlPct} color="benchmark" />
        </div>

        <div className="mt-6 rounded-xl border border-arena-border bg-black/40 p-5">
          <div className="text-[10px] uppercase tracking-widest text-arena-dim">Lesson learned</div>
          <div className="mt-1.5 text-lg text-white">{result.lesson}</div>
        </div>

        {/* Save my result / Workflow progress */}
        <div className="mt-6 rounded-xl border border-arena-user/30 bg-arena-user/5 p-5">
          {!wf ? (
            <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-medium text-white">Save your result</div>
                <div className="mt-0.5 text-xs text-arena-dim">
                  Kicks off a Vercel Workflow to build your personalized lesson plan.
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full border border-arena-user/40 bg-arena-user/10 px-5 py-2.5 text-sm font-medium text-arena-user transition hover:bg-arena-user/20 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
                Save my result
              </button>
            </div>
          ) : (
            <WorkflowProgress wf={wf} />
          )}
        </div>

        <div className="mt-6 flex items-center justify-between text-xs text-arena-dim">
          <span>Synthetic data · Fictional character · Demonstration only.</span>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 rounded-md border border-arena-border bg-black/40 px-3 py-1.5 text-arena-dim transition hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Replay
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PnlCard({ label, pct, color }: { label: string; pct: number; color: "user" | "oracle" | "benchmark" }) {
  const positive = pct >= 0;
  const ring =
    color === "user"
      ? "border-arena-user/40"
      : color === "oracle"
        ? "border-arena-oracle/40"
        : "border-arena-border";
  const tag =
    color === "user"
      ? "text-arena-user"
      : color === "oracle"
        ? "text-arena-oracle"
        : "text-arena-dim";
  return (
    <div className={`rounded-xl border ${ring} bg-black/40 p-5`}>
      <div className={`text-[10px] uppercase tracking-widest ${tag}`}>{label}</div>
      <div className={`tabular mt-2 font-mono text-3xl ${positive ? "text-arena-gain" : "text-arena-loss"}`}>
        {positive ? "+" : ""}
        {pct.toFixed(2)}%
      </div>
      <div className="mt-1 text-xs text-arena-dim">1-yr P&L</div>
    </div>
  );
}

const STEPS: Array<{ key: string; label: string; sub: string }> = [
  { key: "generating", label: "Generating lesson", sub: "AI Gateway · claude-sonnet-4-5" },
  { key: "sleeping", label: "Sleeping (durable persistence)", sub: "Workflow suspended · 5s" },
  { key: "delivering", label: "Delivering", sub: "Writing to your timeline" },
  { key: "done", label: "Delivered", sub: "Lesson ready" },
];

function WorkflowProgress({ wf }: { wf: WorkflowState }) {
  const activeIdx = Math.max(
    0,
    STEPS.findIndex((s) => s.key === wf.state),
  );
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium text-white">Lesson plan workflow</div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-arena-dim">
          run · {wf.runId.slice(0, 8)}
        </div>
      </div>

      <ol className="space-y-2">
        {STEPS.map((s, i) => {
          const status: "done" | "active" | "pending" =
            i < activeIdx ? "done" : i === activeIdx ? (wf.state === "done" ? "done" : "active") : "pending";
          return (
            <li
              key={s.key}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 transition ${
                status === "active"
                  ? "border-arena-user/40 bg-arena-user/5"
                  : "border-arena-border bg-black/30"
              }`}
            >
              <div className="mt-0.5">
                {status === "done" ? (
                  <Check className="h-4 w-4 text-arena-gain" />
                ) : status === "active" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-arena-user" />
                ) : (
                  <div className="h-4 w-4 rounded-full border border-arena-border" />
                )}
              </div>
              <div className="flex-1">
                <div className={`text-sm ${status === "pending" ? "text-arena-dim" : "text-white"}`}>{s.label}</div>
                <div className="text-[11px] text-arena-dim">{s.sub}</div>
              </div>
            </li>
          );
        })}
      </ol>

      {wf.lesson && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-lg border border-arena-gain/30 bg-arena-gain/5 p-4"
        >
          <div className="text-[10px] uppercase tracking-widest text-arena-gain">Your lesson plan</div>
          <div className="mt-1 text-base font-medium text-white">{wf.lesson.headline}</div>
          <ul className="mt-3 space-y-1.5 text-sm text-white/85">
            {wf.lesson.bullets.map((b, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-arena-gain">·</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
}
