// VERCEL PRIMITIVE: Fluid Compute — long-lived streaming response with concurrent
// ticker emission + AI-Gateway-driven Oracle commentary. maxDuration > 10s requires Fluid.
export const maxDuration = 60;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// VERCEL PRIMITIVE: AI Gateway — every LLM call routes through gateway() from @ai-sdk/gateway.
import { gateway } from "@ai-sdk/gateway";
import { streamText } from "ai";
import { generateTicks, SYMBOLS, TICK_INTERVAL_MS, TOTAL_TICKS, type Symbol } from "@/lib/ticker-data";
import { ORACLE_SYSTEM_PROMPT } from "@/lib/personas";

const HAIKU = "anthropic/claude-haiku-4-5";
const SONNET = "anthropic/claude-sonnet-4-5";

const enc = new TextEncoder();
function sse(event: string, data: unknown) {
  return enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function POST() {
  console.log("[FLUID] streaming duel started");

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Per-session deterministic seed (could be from client; using time bucket for slight variety).
      const seed = 0xA11CE;
      const ticks = generateTicks(seed);

      let closed = false;
      const safeEnqueue = (chunk: Uint8Array) => {
        if (closed) return;
        try {
          controller.enqueue(chunk);
        } catch {
          closed = true;
        }
      };

      // Track latest prices so the Oracle's commentary task can see them.
      const livePrices: Record<Symbol, number> = { ...ticks[0].prices };

      // 1) Ticker emitter — every 500ms.
      const tickerTask = (async () => {
        const startedAt = Date.now();
        for (let i = 0; i < ticks.length; i++) {
          if (closed) return;
          const t = ticks[i];
          Object.assign(livePrices, t.prices);
          safeEnqueue(sse("tick", { index: t.index, t: t.t, prices: t.prices }));
          const target = startedAt + (i + 1) * TICK_INTERVAL_MS;
          const wait = target - Date.now();
          if (wait > 0) await sleep(wait);
        }
      })();

      // 2) Oracle commentary — model SWITCH at 20s (haiku → sonnet).
      const oracleTask = (async () => {
        // Phase A: Haiku for fast banter (0–20s).
        console.log(`[AI GATEWAY] routed to ${HAIKU}`);
        safeEnqueue(sse("model-switch", { model: HAIKU, phase: "banter" }));
        await streamOraclePhase({
          model: HAIKU,
          enqueue: safeEnqueue,
          getPrices: () => ({ ...livePrices }),
          isClosed: () => closed,
          maxMs: 18_000,
          tradeCadenceMs: 9_000,
          phase: "banter",
        });

        if (closed) return;

        // Phase B: Sonnet for strategic close (20–30s).
        console.log(`[AI GATEWAY] routed to ${SONNET}`);
        safeEnqueue(sse("model-switch", { model: SONNET, phase: "strategy" }));
        await streamOraclePhase({
          model: SONNET,
          enqueue: safeEnqueue,
          getPrices: () => ({ ...livePrices }),
          isClosed: () => closed,
          maxMs: 9_500,
          tradeCadenceMs: 9_000,
          phase: "strategy",
        });
      })();

      // Run both concurrently for the full duel duration.
      const overallTimeout = sleep(TOTAL_TICKS * TICK_INTERVAL_MS + 500);
      try {
        await Promise.race([Promise.all([tickerTask, oracleTask]), overallTimeout]);
      } catch (err) {
        console.error("[FLUID] duel stream error", err);
      }

      safeEnqueue(sse("end", { ok: true }));
      closed = true;
      try {
        controller.close();
      } catch {
        /* already closed */
      }
      console.log("[FLUID] streaming duel ended");
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

type PhaseOpts = {
  model: string;
  enqueue: (c: Uint8Array) => void;
  getPrices: () => Record<Symbol, number>;
  isClosed: () => boolean;
  maxMs: number;
  tradeCadenceMs: number;
  phase: "banter" | "strategy";
};

async function streamOraclePhase(opts: PhaseOpts) {
  const { model, enqueue, getPrices, isClosed, maxMs, tradeCadenceMs, phase } = opts;
  const started = Date.now();

  const prices = getPrices();
  const promptIntro =
    phase === "banter"
      ? `Opening of the round. Current prices: AAPL $${prices.AAPL.toFixed(2)}, NVDA $${prices.NVDA.toFixed(2)}, TSLA $${prices.TSLA.toFixed(2)}. React to the tape in 2 short pronouncements and announce ONE trade decision. Keep total under 280 characters.`
      : `Final 10 seconds. Current prices: AAPL $${prices.AAPL.toFixed(2)}, NVDA $${prices.NVDA.toFixed(2)}, TSLA $${prices.TSLA.toFixed(2)}. Deliver a brief strategic close — one sharp observation and ONE trade decision (or hold). Total under 220 characters.`;

  let textDone = false;
  let fullText = "";

  // Kick off the AI Gateway stream.
  const aiTask = (async () => {
    try {
      const result = streamText({
        model: gateway(model),
        system: ORACLE_SYSTEM_PROMPT,
        prompt: promptIntro,
        // Keep the tail short so we don't blow past the phase budget.
        maxOutputTokens: 220,
      });

      for await (const delta of result.textStream) {
        if (isClosed()) return;
        fullText += delta;
        enqueue(sse("oracle-text", { delta, model }));
      }
    } catch (err) {
      console.error(`[AI GATEWAY] ${model} stream failed, falling back`, err);
      const fallback =
        phase === "banter"
          ? `Mr. Market is restless. Patience tends to pay better than reflex. I will buy 1 share of AAPL.`
          : `The tape has shown its hand. I will hold what I have and let time do the work.`;
      // Drip the fallback so it still looks streamed.
      for (const ch of fallback) {
        if (isClosed()) return;
        enqueue(sse("oracle-text", { delta: ch, model }));
        await sleep(18);
      }
      fullText += fallback;
    } finally {
      textDone = true;
    }
  })();

  // Trade emitter — fires roughly every `tradeCadenceMs`, biased to recent text.
  const tradeTask = (async () => {
    // Wait a bit so commentary leads the trade.
    await sleep(Math.min(2500, maxMs / 3));
    if (isClosed()) return;
    const decision = chooseOracleTrade(getPrices(), fullText);
    if (decision) {
      enqueue(sse("oracle-trade", decision));
      console.log(`[AI GATEWAY] oracle trade (${phase})`, decision);
    }
    // In strategy phase, optionally one more trade.
    if (phase === "banter") {
      await sleep(tradeCadenceMs);
      if (isClosed()) return;
      const d2 = chooseOracleTrade(getPrices(), fullText);
      if (d2) {
        enqueue(sse("oracle-trade", d2));
        console.log(`[AI GATEWAY] oracle trade (${phase})`, d2);
      }
    }
  })();

  // Bound the phase even if the model is slow.
  const budget = sleep(maxMs);
  await Promise.race([Promise.all([aiTask, tradeTask]), budget]);
  // Ensure we don't leave aiTask dangling forever in the background.
  void aiTask.catch(() => {});
  void tradeTask.catch(() => {});
  // Token noting for callers in logs.
  console.log(`[AI GATEWAY] ${model} phase done in ${Date.now() - started}ms (textDone=${textDone})`);
}

function chooseOracleTrade(
  prices: Record<Symbol, number>,
  recentText: string,
): { side: "buy" | "sell"; sym: Symbol } | null {
  // Prefer a symbol the model just mentioned.
  const mentioned = SYMBOLS.find((s) => recentText.includes(s));
  // The Oracle is a contrarian: buys the laggard, sells the leader (vs equal-weight average).
  const avg = (prices.AAPL + prices.NVDA + prices.TSLA) / 3;
  const ranked = [...SYMBOLS].sort((a, b) => prices[a] / avg - prices[b] / avg);
  const laggard = ranked[0];
  const leader = ranked[ranked.length - 1];

  // "I will hold." → no trade ~25% of the time.
  if (/\bhold\b/i.test(recentText) && Math.random() < 0.5) return null;

  if (mentioned && /sell|trim|cut/i.test(recentText)) {
    return { side: "sell", sym: mentioned };
  }
  if (mentioned && /buy|add|accumulate/i.test(recentText)) {
    return { side: "buy", sym: mentioned };
  }
  // Default: contrarian buy on the laggard.
  return Math.random() < 0.85
    ? { side: "buy", sym: laggard }
    : { side: "sell", sym: leader };
}
