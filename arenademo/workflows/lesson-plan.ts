// VERCEL PRIMITIVE: Workflows — durable function that survives restarts.
// Steps: generateLesson → durable sleep → deliverLesson. Status is exposed via /api/save-result.
import { sleep } from "workflow";
import { gateway } from "@ai-sdk/gateway";
import { generateText } from "ai";

export type LessonInput = {
  userPnlPct: number;
  oraclePnlPct: number;
  spyPnlPct: number;
  tradeCount: number;
};

export type LessonPayload = {
  bullets: string[];
  headline: string;
};

export async function lessonPlanWorkflow(runId: string, input: LessonInput) {
  "use workflow";

  await markStatus(runId, "generating");
  const lesson = await generateLesson(input);

  await markStatus(runId, "sleeping");
  // Demonstrates durable sleep — in production this could be 7 days.
  await sleep("5s");

  await markStatus(runId, "delivering");
  await deliverLesson(runId, lesson);

  await markStatus(runId, "done", lesson);

  return lesson;
}

async function generateLesson(input: LessonInput): Promise<LessonPayload> {
  "use step";
  console.log("[WORKFLOW] step generateLesson started");

  // VERCEL PRIMITIVE: AI Gateway — claude-sonnet-4-5 for the strategic lesson plan.
  const SONNET = "anthropic/claude-sonnet-4-5";
  const prompt = `A user just finished a 30-second Arena trading duel.
- Their P&L (1-yr backtest): ${input.userPnlPct.toFixed(2)}%
- The Oracle's P&L: ${input.oraclePnlPct.toFixed(2)}%
- S&P 500 benchmark: ${input.spyPnlPct.toFixed(2)}%
- Trades they made: ${input.tradeCount}

Write a SHORT personalized lesson plan in exactly this JSON shape (no prose around it):
{
  "headline": "one short, punchy line (max 8 words)",
  "bullets": ["three", "concrete next steps", "each under 14 words"]
}

Tone: clear, kind, faintly stoic. No emojis. No exclamation marks. No references to real people.`;

  try {
    const { text } = await generateText({
      model: gateway(SONNET),
      prompt,
      maxOutputTokens: 240,
    });

    const parsed = extractJson(text);
    if (parsed && Array.isArray(parsed.bullets) && typeof parsed.headline === "string") {
      console.log("[WORKFLOW] step generateLesson complete");
      return {
        headline: String(parsed.headline).slice(0, 80),
        bullets: parsed.bullets.slice(0, 3).map((b: unknown) => String(b).slice(0, 140)),
      };
    }
  } catch (err) {
    console.error("[WORKFLOW] generateLesson AI call failed, using fallback", err);
  }

  return {
    headline: "Slow hands, steady gains.",
    bullets: [
      "Pre-commit a max number of trades before you start.",
      "Write the thesis in one sentence before clicking buy.",
      "Compare your return to SPY weekly, not daily.",
    ],
  };
}

function extractJson(text: string): { headline?: string; bullets?: unknown[] } | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

async function deliverLesson(runId: string, lesson: LessonPayload) {
  "use step";
  console.log("[WORKFLOW] step deliverLesson complete for", runId, lesson.headline);
  // The step "delivers" by writing into the in-memory store via markStatus().
  // In a real app this could be: send an email, write to DB, push notification, etc.
}

async function markStatus(runId: string, status: string, payload?: LessonPayload) {
  "use step";
  // Lazy import to avoid bundling server-only state into the workflow function.
  const { setWorkflowStatus } = await import("@/lib/workflow-store");
  setWorkflowStatus(runId, status, payload);
}
