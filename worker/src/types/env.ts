/**
 * Cloudflare Worker bindings and configuration available at runtime.
 */
export type WorkerEnv = {
  AI: Ai;
  DB: D1Database;
  CLOUDFLARE_AI_MODEL: string;
};

export const DEFAULT_AI_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
