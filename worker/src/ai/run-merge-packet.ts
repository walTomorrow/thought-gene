import type { MergePacket } from "../../../shared/merge";
import { getMergeMaxTokens } from "./ai-max-tokens";
import { DEFAULT_AI_MODEL, type WorkerEnv } from "../types/env";
import {
  extractWorkersAiJsonValue,
  extractWorkersAiText,
} from "./workers-ai-response";

export type MergeContextInput = {
  projectName: string;
  projectSummary: string | null;
  parentTitle: string;
  parentPurpose: string;
  parentMessagesTail: string;
  childTitle: string;
  childPurpose: string;
  childMessages: string;
  priorMergeSummaries: string;
  mergeSequence: number;
};

const MERGE_PACKET_SCHEMA = `{
  "version": 1,
  "meta": {
    "childBranchId": "string",
    "childTitle": "string",
    "childPurpose": "string",
    "parentBranchId": "string",
    "parentTitle": "string",
    "generatedAt": "ISO-8601 string",
    "mergeSequence": number,
    "priorMergeIds": ["optional string ids"]
  },
  "executiveSummary": "string",
  "decisions": [{ "id": "uuid", "title": "string", "body": "string", "confidence": "high|medium|low", "sourceHint": "optional" }],
  "implementationDetails": [],
  "assumptions": [],
  "openQuestions": [],
  "deferredWork": [],
  "risks": [],
  "nextSteps": [],
  "rejectedOptions": [],
  "parentContinuityNote": "optional string"
}`;

function buildMergePrompt(context: MergeContextInput): string {
  return [
    "You are generating a parent-facing merge packet for Thought Gene.",
    "The parent branch must continue the project WITHOUT reading the child branch conversation.",
    "Do not invent decisions. If the child branch did not reach conclusions, say so in openQuestions.",
    "Prefer concrete implementation details over vague summaries.",
    "If prior merges exist, emphasize NEW or CHANGED information since the last merge.",
    "Return ONLY valid JSON matching this schema (no markdown fences):",
    MERGE_PACKET_SCHEMA,
    "",
    `## Project`,
    `name: ${context.projectName}`,
    `summary: ${context.projectSummary ?? "none"}`,
    "",
    `## Parent branch (recipient)`,
    `title: ${context.parentTitle}`,
    `purpose: ${context.parentPurpose}`,
    "recent messages:",
    context.parentMessagesTail || "(none)",
    "",
    `## Child branch (source)`,
    `title: ${context.childTitle}`,
    `purpose: ${context.childPurpose}`,
    `merge sequence: ${context.mergeSequence}`,
    "",
    "## Prior confirmed merges from this child",
    context.priorMergeSummaries || "(none)",
    "",
    "## Child conversation",
    context.childMessages,
    "",
    "Limit each array to at most 8 items. Merge related points.",
  ].join("\n");
}

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) {
    return fenceMatch[1].trim();
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

/**
 * Calls Workers AI to generate a structured merge packet JSON object.
 */
export async function runMergePacketModel(
  env: WorkerEnv,
  context: MergeContextInput,
): Promise<MergePacket> {
  const model = env.CLOUDFLARE_AI_MODEL || DEFAULT_AI_MODEL;
  const prompt = buildMergePrompt(context);

  const result = await env.AI.run(model, {
    messages: [
      {
        role: "system",
        content:
          "You extract structured merge packets from branch conversations. Output JSON only.",
      },
      { role: "user", content: prompt },
    ],
    max_tokens: getMergeMaxTokens(env),
  });

  const structured = extractWorkersAiJsonValue(result);
  let parsed: MergePacket;

  if (structured && typeof structured === "object") {
    parsed = structured as MergePacket;
  } else {
    const raw = extractWorkersAiText(result);
    if (!raw) {
      throw new Error("Workers AI returned an empty merge packet.");
    }

    try {
      parsed = JSON.parse(extractJsonObject(raw)) as MergePacket;
    } catch {
      throw new Error("Workers AI returned invalid merge packet JSON.");
    }
  }

  const summary =
    typeof parsed.executiveSummary === "string"
      ? parsed.executiveSummary.trim()
      : "";

  if (!summary) {
    throw new Error("Workers AI returned an incomplete merge packet.");
  }

  return parsed;
}
