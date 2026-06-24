/**
 * Cloudflare Worker bindings and configuration available at runtime.
 */
export type WorkerEnv = {
  AI: Ai;
  DB: D1Database;
  CLOUDFLARE_AI_MODEL: string;
  /** Optional override for chat max_tokens (Workers AI default is 256). */
  CLOUDFLARE_AI_MAX_TOKENS?: string;
  /** Optional override for merge packet max_tokens. */
  CLOUDFLARE_AI_MERGE_MAX_TOKENS?: string;
};

export const DEFAULT_AI_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
