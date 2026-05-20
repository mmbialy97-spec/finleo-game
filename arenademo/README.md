# Arena — Finelo Demo

A 30-second AI trading duel built to showcase **five Vercel primitives** in a single live demo.

> 60 seconds. 30 seconds. You vs. The Oracle. Real backtest. Real lesson.

## The five primitives

| # | Primitive | Where it shows up | Console log to look for |
|---|---|---|---|
| 1 | **Hosting** | The Next.js 16 app itself (`/` and `/duel`) | n/a |
| 2 | **Fluid Compute** | `app/api/duel/stream/route.ts` streams ticks + LLM tokens concurrently for 30s (`maxDuration = 60`) | `[FLUID] streaming duel started` |
| 3 | **AI Gateway** | All LLM calls go through `gateway()` from `@ai-sdk/gateway`. Haiku for fast banter, Sonnet for the strategic close. | `[AI GATEWAY] routed to anthropic/claude-haiku-4-5` |
| 4 | **Sandboxes** | `app/api/backtest/route.ts` spawns a `python3.13` Vercel Sandbox to replay 1-yr returns | `[SANDBOX] python execution started` |
| 5 | **Workflows** | `workflows/lesson-plan.ts` — `"use workflow"` with `generateLesson → sleep(5s) → deliverLesson` | `[WORKFLOW] step generateLesson complete` |

Every file that uses a primitive has an inline `// VERCEL PRIMITIVE: <name>` comment for the demo.

## Deploy steps (no CLI — GitHub UI → Vercel)

1. **Push to GitHub via web UI.** Either drag-and-drop this folder into a new repo, or use `git push` after creating a repo on github.com.
2. **Import in Vercel dashboard.** Go to vercel.com → *Add New… → Project* → pick your repo → *Import*. Framework should auto-detect as **Next.js**.
3. **Add the environment variable.** In *Project Settings → Environment Variables*, add:
   ```
   AI_GATEWAY_API_KEY = <your gateway key>
   ```
   That's the only env var needed. Sandbox SDK uses OIDC automatically on Vercel; the Workflow SDK needs no config.
4. **Deploy.** Vercel runs `npm run build` and you're live.

Open `https://<your-domain>.vercel.app/` → click *Enter the Arena*.

## What to point at in the Vercel dashboard during the demo

Open these tabs in advance, in order:

1. **Project → Overview**
   - Confirms **Hosting**. Show the deployment URL and "Production" status.
2. **Project → Observability → Functions** (or *Logs → Functions*)
   - Filter by the `/api/duel/stream` route.
   - **Fluid Compute** lights up when the duel starts — point to the long-lived in-flight invocation. Streaming requests > 10s are only possible with Fluid.
   - In the function logs, you'll see `[FLUID] streaming duel started`.
3. **AI Gateway** (top nav → *AI* → *Gateway*)
   - Open the **Logs** tab. While the duel runs, watch two requests land:
     - first row: `anthropic/claude-haiku-4-5` (banter)
     - second row: `anthropic/claude-sonnet-4-5` (strategic close)
   - Then after the user clicks *Save my result*, a third row appears: another `claude-sonnet-4-5` call for the lesson plan.
   - Narration line: *"Watch the routing — same SDK, two models, one bill, one dashboard."*
4. **Sandboxes** (top nav → *Sandboxes*)
   - Open the **Runs** tab. When the duel timer hits zero, a `python3.13` sandbox spins up. Point at the run, then to its logs — you can see the Python output.
   - Narration: *"This isn't a fake spinner — that's a real Firecracker micro-VM running Python with our trades as input."*
5. **Workflows** (project → *Workflows*, or run `npx workflow web` locally)
   - When the user clicks *Save my result*, a new run appears.
   - Point at the **step timeline**: `markStatus(generating) → generateLesson → markStatus(sleeping) → sleep(5s) → markStatus(delivering) → deliverLesson → markStatus(done)`.
   - The 5-second `sleep` is the wow moment — narrate: *"In production this could be 7 days. The function is fully suspended — zero compute — and resumes exactly where it left off."*

## Run locally

```bash
npm install
echo "AI_GATEWAY_API_KEY=..." > .env.local
npm run dev
```

Open http://localhost:3000.

**Workflow observability UI (optional, local):**
```bash
npx workflow web
```

Notes for local dev:
- The AI Gateway call requires `AI_GATEWAY_API_KEY`. Without it, the Oracle's commentary falls back to a hardcoded aphorism but the rest of the demo still works.
- The Sandbox call requires Vercel OIDC — when running locally without `vercel env pull`, the backtest gracefully returns the hardcoded fallback (`+2.3% / +6.7% / +8.1%`) and clearly logs which path executed. The demo never hangs.
- The Workflow runtime works on Vercel and locally via `next dev`. If `start()` fails for any reason, the save-result endpoint simulates the same step timeline so the UX is preserved.

## File map

```
app/
  layout.tsx                       Geist font, dark theme
  page.tsx                         Landing page
  globals.css
  duel/page.tsx                    Renders <DuelClient />
  api/
    duel/stream/route.ts           FLUID COMPUTE + AI GATEWAY (SSE)
    backtest/route.ts              SANDBOX (with 20s fallback)
    save-result/route.ts           WORKFLOW (POST starts, GET polls)
workflows/
  lesson-plan.ts                   WORKFLOW: generateLesson → sleep(5s) → deliverLesson
lib/
  ticker-data.ts                   Deterministic 60-tick synthetic feed
  personas.ts                      The Oracle character prompt
  workflow-store.ts                In-memory status store for polling
components/
  ticker-tape.tsx                  Landing ticker scroll
  ticker-panel.tsx                 Live ticker column with sparklines
  portfolio.tsx                    User cash + Buy/Sell controls
  oracle-panel.tsx                 Streamed Oracle commentary
  duel-client.tsx                  3-column duel screen
  results-screen.tsx               Post-duel modal + workflow progress
```

## Demo script (≤5 minutes)

1. **Land** on `/`. *"Finelo is Duolingo for trading — 1.5M users learning to invest. We built this 30-second arcade to show what's possible on Vercel."* Click **Enter the Arena**.
2. **Duel runs.** 30-second countdown. While it runs, switch to **AI Gateway → Logs** and **Functions → /api/duel/stream**.
   - Watch the haiku stream tokens token-by-token into the Oracle panel.
   - At t=20s, narrate the model switch as the Oracle takes a more strategic tone.
3. **Timer hits zero.** Loader: *"Running 1-year backtest…"* — flip to the **Sandboxes** tab and watch the `python3.13` micro-VM appear, then disappear.
4. **Results.** P&L for You / The Oracle / S&P 500, plus a one-line lesson. Click **Save my result**.
5. **Workflow.** Flip to **Workflows**. Watch the step timeline animate live. The 5-second `sleep` is your closer: *"In production this would be 7 days. Zero compute while it waits."*

Total walkthrough: ~3 minutes of running + ~2 minutes of dashboard narration.

## Hard guardrails

- No auth, no database, no user accounts.
- No real market data — all ticks are synthetic and deterministic.
- "The Oracle" is a fictional character. No real public figure is impersonated.
- The Sandbox call has a 20s timeout and a hardcoded fallback. The demo never hangs.
