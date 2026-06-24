import type { WorkerEnv } from "../types/env";

export const DEFAULT_CHAT_MAX_TOKENS = 2048;
export const DEFAULT_MERGE_MAX_TOKENS = 4096;

const ABSOLUTE_MAX_TOKENS = 8192;

function parseMaxTokens(value: string | undefined, fallback: number): number {
  if (!value?.trim()) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, ABSOLUTE_MAX_TOKENS);
}

export function getChatMaxTokens(env: WorkerEnv): number {
  return parseMaxTokens(env.CLOUDFLARE_AI_MAX_TOKENS, DEFAULT_CHAT_MAX_TOKENS);
}

export function getMergeMaxTokens(env: WorkerEnv): number {
  return parseMaxTokens(
    env.CLOUDFLARE_AI_MERGE_MAX_TOKENS,
    DEFAULT_MERGE_MAX_TOKENS,
  );
}
