import { Hono } from "hono";
import {
  confirmBranchMergeDraft,
  discardBranchMergeDraft,
  generateBranchMerge,
  listBranchMerges,
  updateBranchMerge,
} from "../services/merge-service";
import type { WorkerEnv } from "../types/env";
import {
  parseConfirmMergeRequest,
  parseGenerateMergeRequest,
  parseMergeProjectQuery,
  parseUpdateMergeRequest,
} from "../validation/parse-merge-request";

const mergeRoutes = new Hono<{ Bindings: WorkerEnv }>();

mergeRoutes.get("/branches/:childBranchId/merges", async (context) => {
  const childBranchId = context.req.param("childBranchId");
  const parsed = parseMergeProjectQuery(context.req.query("projectId"));
  if (!parsed.ok) {
    return context.json({ error: parsed.error }, 400);
  }

  try {
    const result = await listBranchMerges(
      context.env,
      childBranchId,
      parsed.value.projectId,
    );
    return context.json(result);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to list merges.";
    if (errorMessage.includes("not found")) {
      return context.json({ error: errorMessage }, 404);
    }
    return context.json({ error: errorMessage }, 500);
  }
});

mergeRoutes.post("/branches/:childBranchId/merges/generate", async (context) => {
  const childBranchId = context.req.param("childBranchId");
  let body: unknown;

  try {
    body = await context.req.json();
  } catch {
    return context.json({ error: "Request body must be valid JSON." }, 400);
  }

  const parsed = parseGenerateMergeRequest(body);
  if (!parsed.ok) {
    return context.json({ error: parsed.error }, 400);
  }

  try {
    const result = await generateBranchMerge(
      context.env,
      childBranchId,
      parsed.value.projectId,
      parsed.value.replaceDraft,
    );
    return context.json(result, 201);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate merge packet.";
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "DRAFT_EXISTS"
    ) {
      return context.json(
        { error: errorMessage, code: "DRAFT_EXISTS" },
        409,
      );
    }
    if (errorMessage.includes("not found")) {
      return context.json({ error: errorMessage }, 404);
    }
    if (
      errorMessage.includes("cannot be merged") ||
      errorMessage.includes("closed parent") ||
      errorMessage.includes("Only active")
    ) {
      return context.json({ error: errorMessage }, 400);
    }
    return context.json({ error: errorMessage }, 500);
  }
});

mergeRoutes.patch("/branches/:childBranchId/merges/:mergeId", async (context) => {
  const childBranchId = context.req.param("childBranchId");
  const mergeId = context.req.param("mergeId");
  let body: unknown;

  try {
    body = await context.req.json();
  } catch {
    return context.json({ error: "Request body must be valid JSON." }, 400);
  }

  const parsed = parseUpdateMergeRequest(body);
  if (!parsed.ok) {
    return context.json({ error: parsed.error }, 400);
  }

  try {
    const result = await updateBranchMerge(
      context.env,
      childBranchId,
      mergeId,
      parsed.value.projectId,
      parsed.value.packet,
    );
    return context.json(result);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update merge draft.";
    if (errorMessage.includes("not found")) {
      return context.json({ error: errorMessage }, 404);
    }
    if (errorMessage.includes("Only draft")) {
      return context.json({ error: errorMessage }, 400);
    }
    return context.json({ error: errorMessage }, 500);
  }
});

mergeRoutes.post(
  "/branches/:childBranchId/merges/:mergeId/confirm",
  async (context) => {
    const childBranchId = context.req.param("childBranchId");
    const mergeId = context.req.param("mergeId");
    let body: unknown;

    try {
      body = await context.req.json();
    } catch {
      return context.json({ error: "Request body must be valid JSON." }, 400);
    }

    const parsed = parseConfirmMergeRequest(body);
    if (!parsed.ok) {
      return context.json({ error: parsed.error }, 400);
    }

    try {
      const result = await confirmBranchMergeDraft(
        context.env,
        childBranchId,
        mergeId,
        parsed.value.projectId,
        parsed.value.closeChildAfter,
      );
      return context.json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to confirm merge.";
      if (errorMessage.includes("not found")) {
        return context.json({ error: errorMessage }, 404);
      }
      if (
        errorMessage.includes("Only draft") ||
        errorMessage.includes("closed parent") ||
        errorMessage.includes("Only active")
      ) {
        return context.json({ error: errorMessage }, 400);
      }
      return context.json({ error: errorMessage }, 500);
    }
  },
);

mergeRoutes.delete("/branches/:childBranchId/merges/:mergeId", async (context) => {
  const childBranchId = context.req.param("childBranchId");
  const mergeId = context.req.param("mergeId");
  const parsed = parseMergeProjectQuery(context.req.query("projectId"));
  if (!parsed.ok) {
    return context.json({ error: parsed.error }, 400);
  }

  try {
    await discardBranchMergeDraft(
      context.env,
      childBranchId,
      mergeId,
      parsed.value.projectId,
    );
    return context.json({ ok: true });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to discard merge draft.";
    if (errorMessage.includes("not found")) {
      return context.json({ error: errorMessage }, 404);
    }
    if (errorMessage.includes("Only draft")) {
      return context.json({ error: errorMessage }, 400);
    }
    return context.json({ error: errorMessage }, 500);
  }
});

export { mergeRoutes };
