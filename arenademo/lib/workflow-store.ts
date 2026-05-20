// In-memory cross-request store for workflow status.
// Module-scoped global survives within a single server process. Good enough for a 5-minute demo.
// On Vercel this lives in a single Fluid Compute instance and is cleared on cold start.

import type { LessonPayload } from "@/workflows/lesson-plan";

export type WorkflowStatus = {
  runId: string;
  state: string; // "generating" | "sleeping" | "delivering" | "done" | "error"
  startedAt: number;
  updatedAt: number;
  lesson?: LessonPayload;
};

type Store = { runs: Map<string, WorkflowStatus> };

const globalKey = "__ARENA_WORKFLOW_STORE__" as const;
const g = globalThis as unknown as Record<string, Store | undefined>;

function getStore(): Store {
  if (!g[globalKey]) {
    g[globalKey] = { runs: new Map() };
  }
  return g[globalKey]!;
}

export function setWorkflowStatus(runId: string, state: string, lesson?: LessonPayload) {
  const store = getStore();
  const existing = store.runs.get(runId);
  const now = Date.now();
  store.runs.set(runId, {
    runId,
    state,
    startedAt: existing?.startedAt ?? now,
    updatedAt: now,
    lesson: lesson ?? existing?.lesson,
  });
}

export function getWorkflowStatus(runId: string): WorkflowStatus | null {
  return getStore().runs.get(runId) ?? null;
}
