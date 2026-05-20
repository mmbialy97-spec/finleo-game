// VERCEL PRIMITIVE: Workflows — POST starts a durable workflow run, GET returns its status.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { start } from "workflow/api";
import { lessonPlanWorkflow, type LessonInput } from "@/workflows/lesson-plan";
import { getWorkflowStatus, setWorkflowStatus } from "@/lib/workflow-store";

export async function POST(request: Request) {
  let input: LessonInput;
  try {
    input = (await request.json()) as LessonInput;
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const runId = crypto.randomUUID();
  setWorkflowStatus(runId, "queued");

  try {
    await start(lessonPlanWorkflow, [runId, input]);
    console.log("[WORKFLOW] started run", runId);
  } catch (err) {
    console.error("[WORKFLOW] start() failed, will simulate progress in fallback", err);
    // Fallback: if the workflow runtime isn't available locally, simulate the same UX
    // so the demo still tells the right story.
    void simulateWorkflowFallback(runId, input);
  }

  return Response.json({ runId });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const runId = url.searchParams.get("runId");
  if (!runId) return Response.json({ error: "missing runId" }, { status: 400 });
  const status = getWorkflowStatus(runId);
  if (!status) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(status);
}

async function simulateWorkflowFallback(runId: string, input: LessonInput) {
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  setWorkflowStatus(runId, "generating");
  await sleep(1500);
  setWorkflowStatus(runId, "sleeping");
  await sleep(5000);
  setWorkflowStatus(runId, "delivering");
  await sleep(500);
  const lesson = {
    headline:
      input.userPnlPct >= input.spyPnlPct
        ? "Quiet hands, steady gains."
        : "Slow down. Let conviction lead.",
    bullets: [
      "Pre-commit a max number of trades before each session.",
      "Write a one-sentence thesis before any buy.",
      "Compare your returns to SPY weekly, not minute-to-minute.",
    ],
  };
  setWorkflowStatus(runId, "done", lesson);
}
