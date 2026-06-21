# Implementation Guide

This document is the canonical engineering guide for Thought Gene. It explains what exists today, why it was built this way, and what comes next.

---

## Project Status

### Current branch

`feature/project-chat`

### Current milestone

**Chat interface foundation** — a minimal end-to-end chat that sends a user message to Cloudflare Workers AI and displays the assistant reply.

**Status:** The local end-to-end chat loop is verified working (`pnpm dev` → browser → `POST /api/chat` → Workers AI → assistant reply).

### Current goals

- Provide a simple, understandable chat UI
- Route chat requests through a Cloudflare Worker API
- Call one Workers AI model per message
- Keep code modular so projects, branches, and memory can be added later

### Completed work

- pnpm + Vite + React + TypeScript scaffold
- Modular chat UI (message list, input, loading/error states)
- Hono Worker with `POST /api/chat`
- Workers AI integration via `[ai]` binding
- Message-oriented `POST /api/chat` API shape with placeholder project/branch IDs
- Shared types in `shared/chat.ts` (frontend + Worker aligned)
- Environment variable examples and `.gitignore`
- Local development workflow documented below
- Workers AI model updated after Cloudflare deprecated `@cf/meta/llama-3.1-8b-instruct` (see Workers AI Model Configuration)
- Local end-to-end chat verified with `@cf/meta/llama-3.1-8b-instruct-fast`

### Remaining work (future branches)

- Projects and main branch creation
- Branch creation, switching, and closure
- Artifact extraction and project memory
- Message persistence (D1)
- Markdown rendering and streaming responses
- Authentication and deployment hardening

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                        Browser (React)                       │
│  ChatPanel → useChat → chat-client → fetch("/api/chat")      │
└─────────────────────────────┬───────────────────────────────┘
                              │ HTTP POST JSON
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Cloudflare Worker (Hono) — worker/src/          │
│  app.ts → routes/chat.ts → ai/run-chat.ts                   │
└─────────────────────────────┬───────────────────────────────┘
                              │ env.AI.run(model, messages)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Cloudflare Workers AI                      │
│              (default: @cf/meta/llama-3.1-8b-instruct-fast)   │
└─────────────────────────────────────────────────────────────┘
```

Static assets (HTML, JS, CSS) are built by Vite and served through Cloudflare Assets. API routes matching `/api/*` are handled by the Worker first (`run_worker_first` in `wrangler.toml`).

### Frontend responsibilities

- Render chat UI and manage in-memory message state
- Send user messages to `/api/chat`
- Show loading and error states
- Stay free of Workers AI or Cloudflare-specific logic

### Backend responsibilities

- Validate incoming chat requests (`parseChatRequest`)
- Call Workers AI through the `AI` binding with the full message list
- Return JSON `{ reply }` or `{ error }`

### Cloudflare responsibilities

- Run the Worker at the edge
- Provide the Workers AI binding (no API token in Worker code)
- Serve the built React SPA as static assets

### Data flow

1. User types a message and clicks Send (or presses Enter).
2. `useChat` adds a user message to local state and calls `sendChatRequest`.
3. `chat-client.ts` sends `POST /api/chat` with a `ChatRequest` body (see below).
4. `parseChatRequest` validates the body and normalizes placeholder IDs.
5. `runChatModel` invokes `env.AI.run` with the full `messages` array.
6. Worker returns `{ reply: string }`.
7. `useChat` appends an assistant message to local state.

---

## Chat API Contract

### Request: `POST /api/chat`

```ts
type ChatMessageInput = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatRequest = {
  messages: ChatMessageInput[];
  projectId?: string;
  branchId?: string;
};
```

### Response

```ts
type ChatResponse = {
  reply: string;
};

type ChatErrorResponse = {
  error: string;
};
```

### Why `messages[]` instead of a single `message` string

The first version sent `{ message: string }`, which only supports stateless one-shot prompts. Real conversations (and the MVP) need **multi-turn context** within a branch.

Using `messages[]` now means:

- The frontend can send conversation history without an API redesign later.
- The Worker can pass the same array to Workers AI (`env.AI.run(model, { messages })`).
- Optional `projectId` / `branchId` can scope requests once projects and branches exist — the route already normalizes them via `DEFAULT_PROJECT_ID` and `DEFAULT_BRANCH_ID`.

The response stays `{ reply: string }` for now. Streaming can add a separate endpoint or content negotiation later without breaking this shape.

### Placeholder project and branch assumptions

There is still **one implicit conversation**. No project or branch UI exists.

| Constant | Value | Meaning |
|----------|-------|---------|
| `DEFAULT_PROJECT_ID` | `"default-project"` | Stand-in until project creation |
| `DEFAULT_BRANCH_ID` | `"main"` | Stand-in for the auto-created main branch |

The frontend attaches these IDs to every `ChatMessage` and every `ChatRequest`. The Worker defaults missing optional IDs to the same values in `parseChatRequest`. IDs are **not** used for AI context, persistence, or routing yet.

Shared definitions live in `shared/chat.ts` so frontend and Worker stay aligned.

---

## Technology Explanations

### pnpm

**What:** A fast, disk-efficient package manager for Node.js.

**Why chosen:** Stricter dependency resolution and smaller installs than npm; pinned via `packageManager` in `package.json`.

**Problem it solves:** Reproducible installs and clearer dependency trees for a growing monolith-style app.

**Interaction:** Installs React, Vite, Hono, Wrangler, and the Cloudflare Vite plugin. All scripts use `pnpm` (`pnpm dev`, `pnpm build`).

### TypeScript

**What:** Typed superset of JavaScript compiled to JavaScript.

**Why chosen:** Shared types between frontend and Worker (`ChatRequest`, `ChatResponse`), catch errors early, better IDE support.

**Problem it solves:** Safer refactors as projects/branches/artifacts are added.

**Interaction:** Three tsconfig projects — app (`src/`), Node tooling (`vite.config.ts`), Worker (`worker/`).

### Vite

**What:** Frontend build tool and dev server with fast HMR.

**Why chosen:** Official Cloudflare Vite plugin integrates Worker + SPA in one dev command.

**Problem it solves:** Fast local iteration on React UI without a separate proxy setup.

**Interaction:** Builds the React app; `@cloudflare/vite-plugin` runs the Worker in the Workers runtime during dev.

### React

**What:** UI library for component-based interfaces.

**Why chosen:** MVP stack suggestion; large ecosystem; fits future dashboard panels.

**Problem it solves:** Composable chat UI that can grow with branch switchers and memory sidebars.

**Interaction:** `App.tsx` renders `ChatPanel`; state lives in `useChat` hook.

### Cloudflare Workers

**What:** Serverless JavaScript/Wasm runtime at Cloudflare's edge.

**Why chosen:** MVP target platform; pairs with Workers AI and future D1 storage.

**Problem it solves:** Single deployment target for API + static assets.

**Interaction:** Entry point `worker/src/index.ts` exports the Hono app; configured in `wrangler.toml`.

### Hono

**What:** Lightweight web framework for Workers and other runtimes.

**Why chosen:** Minimal API surface, good TypeScript bindings for `Bindings`, easy to add routes later.

**Problem it solves:** Structured routing without Express-style weight.

**Interaction:** `worker/src/app.ts` mounts `/api/chat`; routes stay in separate files under `worker/src/routes/`.

### Workers AI

**What:** Cloudflare-managed inference for open models.

**Why chosen:** Native `[ai]` binding — no API key in Worker code for the happy path.

**Problem it solves:** LLM responses for chat without operating separate inference infrastructure.

**Interaction:** `run-chat.ts` calls `env.AI.run(model, { messages })`; model ID from `CLOUDFLARE_AI_MODEL` (see Workers AI Model Configuration below).

---

## Workers AI Model Configuration

### Current working model

```text
@cf/meta/llama-3.1-8b-instruct-fast
```

This is the **fast** variant of Meta Llama 3.1 8B Instruct. It replaced `@cf/meta/llama-3.1-8b-instruct`, which Cloudflare **deprecated on 2026-05-30**. Using the old ID returns error `5028` and the message: *"This model was deprecated… Please use an alternative model."*

The local chat app has been tested successfully with the `-fast` model.

### Where the model is specified

| Location | Committed? | Role |
|----------|------------|------|
| `wrangler.toml` → `[vars]` → `CLOUDFLARE_AI_MODEL` | Yes | **Primary default** for local dev and deployment |
| `.dev.vars` | No (gitignored) | **Local override** — wins over `wrangler.toml` during `pnpm dev` |
| `.dev.vars.example` | Yes | Template; copy to `.dev.vars` if you want a personal override |
| `.env.example` | Yes | Reference only — not loaded by Vite or Wrangler at runtime |
| `worker/src/types/env.ts` → `DEFAULT_AI_MODEL` | Yes | **Code fallback** if `CLOUDFLARE_AI_MODEL` is unset at runtime |
| `worker/src/ai/run-chat.ts` | Yes | Reads `env.CLOUDFLARE_AI_MODEL \|\| DEFAULT_AI_MODEL` and passes it to `env.AI.run` |

The chat UI does **not** display the active model name. To see what is configured, check the files above.

### Configuration priority (highest wins)

```text
.dev.vars  →  wrangler.toml [vars]  →  DEFAULT_AI_MODEL in worker/src/types/env.ts
```

If you previously created `.dev.vars` with the deprecated model ID, update or delete that line — otherwise it will override the fixed value in `wrangler.toml`.

### How to change the model later

1. Pick an active chat model from the [Workers AI model catalog](https://developers.cloudflare.com/workers-ai/models/).
2. Update `CLOUDFLARE_AI_MODEL` in **`wrangler.toml`** (quoted string in TOML):

   ```toml
   CLOUDFLARE_AI_MODEL = "@cf/your-chosen-model-id"
   ```

3. Optionally mirror the same value in **`.dev.vars`** for a local-only override:

   ```dotenv
   CLOUDFLARE_AI_MODEL=@cf/your-chosen-model-id
   ```

4. Update **`DEFAULT_AI_MODEL`** in `worker/src/types/env.ts` so the code fallback stays aligned.
5. Update **`.dev.vars.example`** and **`.env.example`** so new developers see the current recommendation.
6. Restart the dev server: `pnpm dev`.

Cloudflare-recommended replacements for deprecated Llama 3.1 8B models include `@cf/zai-org/glm-4.7-flash`, `@cf/google/gemma-4-26b-a4b-it`, and `@cf/moonshotai/kimi-k2.6`. Choose based on latency, cost, and quality for your use case.

### Model availability can change

Cloudflare periodically **deprecates and replaces** Workers AI models. Model IDs are not stable forever.

- Watch the [Workers AI changelog](https://developers.cloudflare.com/workers-ai/changelog/) for deprecation notices.
- If chat suddenly fails with a `5028` or deprecation error, update `CLOUDFLARE_AI_MODEL` to a current model from the catalog.
- Keep example files and `DEFAULT_AI_MODEL` in sync when the project default changes.

---

## Development Workflow

### How local development works

1. Install dependencies: `pnpm install`
2. Log in to Cloudflare: `pnpm wrangler login`
3. Set `account_id` in `wrangler.toml` (see Environment Variables)
4. Optionally copy `.dev.vars.example` → `.dev.vars` to override the model
5. Start dev server: `pnpm dev`
6. Open the URL Vite prints (typically `http://localhost:5173`)

One command runs both the React dev server and the Worker in the Workers runtime via `@cloudflare/vite-plugin`.

### How hot reload works

- **React components:** Vite HMR updates the browser without full reload.
- **Worker code:** The Cloudflare plugin reloads the Worker when files under `worker/` change.

### How Vite is used

- Dev: serves `index.html` and bundles `src/` on demand
- Build: outputs static assets to `dist/` for Cloudflare deployment

### How Wrangler is used

- Reads `wrangler.toml` for Worker name, AI binding, assets config, and vars
- Loads `.dev.vars` for local secret/var overrides
- Used directly for login; invoked by the Vite plugin during dev and build

### Request flow (browser → AI model)

```text
Browser POST /api/chat
  → Cloudflare Assets routing (run_worker_first for /api/*)
  → Hono POST /api/chat
  → parseChatRequest(body)
  → runChatModel(env, messages)
  → env.AI.run(CLOUDFLARE_AI_MODEL, { messages })
  → JSON { reply } back to browser
```

---

## Environment Variables

### Required configuration

| Variable | Required | Where to set | Purpose |
|----------|----------|--------------|---------|
| `account_id` | Yes | `wrangler.toml` | Links Worker to your Cloudflare account (must be a quoted string in TOML) |
| `CLOUDFLARE_AI_MODEL` | No (has default) | `wrangler.toml` `[vars]` or `.dev.vars` | Workers AI model ID (current default: `@cf/meta/llama-3.1-8b-instruct-fast`) |

Workers AI uses the `[ai]` binding — **no `CLOUDFLARE_API_TOKEN` is required** for this milestone.

### Where values live locally

| File | Committed? | Purpose |
|------|------------|---------|
| `.env.example` | Yes | Documents variable names (reference only) |
| `.dev.vars.example` | Yes | Template for Wrangler local overrides |
| `.dev.vars` | **No** (gitignored) | Your local model override |
| `wrangler.toml` | Yes | Worker config; set `account_id` locally (can comment in docs-only commit and set per developer) |

**Note:** Each developer sets their own `account_id` in `wrangler.toml`. It is an account identifier, not a secret, but avoid committing personal IDs if the repo is public — use a local-only override pattern in a future improvement.

### Local setup checklist

```powershell
pnpm install
pnpm wrangler login

# Edit wrangler.toml — uncomment and set:
# account_id = "your_account_id_here"

# Optional model override:
copy .dev.vars.example .dev.vars

pnpm dev
```

### Testing the chat endpoint

**Browser:** Open the app at `http://localhost:5173`, send a message, and confirm an assistant reply. This end-to-end path is verified working with the current model configuration.

**curl (during `pnpm dev`):**

```powershell
curl -X POST http://localhost:5173/api/chat `
  -H "Content-Type: application/json" `
  -d "{\"messages\":[{\"role\":\"user\",\"content\":\"Say hello in one sentence.\"}],\"projectId\":\"default-project\",\"branchId\":\"main\"}"
```

Expected: `{"reply":"..."}`

---

## Current File Structure

```text
thought-gene/
├── shared/
│   └── chat.ts              # Shared API types, constants, role validation
├── docs/
│   ├── implementation.md    # This file
│   ├── mvp.md               # Product definition
│   └── ...
├── worker/src/
│   ├── index.ts             # Worker export (Hono app)
│   ├── app.ts               # Hono app, route mounting
│   ├── routes/chat.ts       # POST /api/chat handler
│   ├── validation/
│   │   └── parse-chat-request.ts  # Request validation + ID defaults
│   ├── ai/run-chat.ts       # Workers AI call + response parsing
│   └── types/env.ts         # WorkerEnv bindings
├── src/
│   ├── App.tsx              # Page shell
│   ├── api/chat-client.ts   # fetch wrapper for /api/chat
│   ├── hooks/use-chat.ts    # Chat state (messages, loading, errors)
│   ├── types/message.ts     # UI ChatMessage (extends shared types)
│   └── components/chat/     # Presentational UI components
├── tsconfig.json            # Solution-style root (see below)
├── tsconfig.app.json        # Frontend + shared
├── tsconfig.node.json       # Vite config
├── tsconfig.worker.json     # Worker + shared
├── wrangler.toml            # Cloudflare Worker + AI binding config
├── vite.config.ts           # Vite + Cloudflare plugin
├── package.json             # pnpm scripts and dependencies
├── .env.example             # Variable reference
└── .dev.vars.example        # Wrangler local override template
```

### Root configuration files

`tsconfig*.json`, `vite.config.ts`, `wrangler.toml`, and `package.json` live at the **repository root** on purpose:

- **Vite** and **Wrangler** expect config at the project root by convention.
- The Cloudflare Vite plugin discovers `wrangler.toml` next to `vite.config.ts`.
- Splitting `tsconfig.app.json`, `tsconfig.worker.json`, and `tsconfig.node.json` keeps frontend, Worker, and tooling type-checking separate while sharing `shared/` types.

Moving these into subfolders would fight tool defaults without a clear maintainability gain at this stage.

### Directory purposes

| Path | Purpose |
|------|---------|
| `shared/` | Types and constants used by both frontend and Worker |
| `src/` | React frontend — UI, hooks, client API |
| `worker/src/` | Cloudflare Worker — HTTP API, validation, AI calls |
| `docs/` | Product and engineering documentation |

---

## Design Decisions

### Decision: Vite instead of Next.js

**Why:** The Cloudflare Vite plugin runs the Worker in the real Workers runtime with one dev command. This milestone is a SPA + API, not SSR.

**Alternatives:** Next.js with OpenNext adapter. Rejected as heavier wiring for a minimal chat spike.

### Decision: Hono instead of a raw Worker `fetch` handler

**Why:** Structured routing, typed bindings, and room to add `/api/projects`, `/api/branches`, etc. without a growing if/else chain in one `fetch` function.

**Alternatives:** Single `export default { fetch() {} }` with manual URL matching. Rejected — harder to maintain as routes multiply.

### Decision: Workers AI binding instead of an external LLM API

**Why:** Native `[ai]` binding in `wrangler.toml` — no API token in Worker code for the happy path; aligns with MVP Cloudflare stack.

**Alternatives:** OpenAI/Anthropic REST from the Worker with `CLOUDFLARE_API_TOKEN` or provider keys. Deferred — more secrets and provider lock-in before product validation.

### Decision: Message-oriented API shape early (`messages[]` + optional IDs)

**Why:** Avoids a breaking API change when adding conversation history, branch context, and persistence. The Worker already forwards `messages` to Workers AI.

**Alternatives:** Keep `{ message: string }` until branches land. Rejected — would force a coordinated frontend/backend rewrite.

### Decision: Shared types in `shared/chat.ts`

**Why:** Frontend and Worker compile separately but must agree on request/response shapes. One source of truth reduces drift.

**Alternatives:** Duplicate types in `src/` and `worker/`. Rejected — easy to desync.

### Decision: Vite + Cloudflare Vite plugin (not separate Vite proxy + wrangler dev)

**Why:** One dev command, Worker runs in the real Workers runtime with AI binding available.

**Alternatives:** Standalone `wrangler dev` + manual proxy. Rejected — more wiring for this milestone.

### Decision: Hono routes split from AI logic

**Why:** `routes/chat.ts` handles HTTP; `ai/run-chat.ts` handles model invocation. Easier to test and extend (e.g. add branch context to prompts later).

**Alternatives:** Single file Worker. Rejected — mixes concerns early.

### Decision: `useChat` hook + `chat-client.ts`

**Why:** Components stay presentational; transport and state are reusable when branches load different message histories.

**Alternatives:** fetch inside components. Rejected — harder to swap for persistence layer later.

### Decision: In-memory messages only

**Why:** Persistence belongs with D1/project schema in a later branch; avoids premature data model lock-in.

**Alternatives:** localStorage or D1 now. Rejected — out of scope.

### Decision: Plain text bubbles (no markdown library yet)

**Why:** MVP lists markdown as desirable but not required for proving AI connectivity; avoids extra dependency.

**Alternatives:** `react-markdown`. Deferred to a small follow-up when chat UX stabilizes.

### Decision: pnpm over npm

**Why:** Stricter dependency handling and user preference.

---

## Known Limitations

| Limitation | Notes |
|------------|-------|
| No persistence | Messages lost on refresh |
| Placeholder IDs only | `default-project` / `main` — no real project or branch entities |
| IDs not used server-side yet | `projectId` / `branchId` normalized but not loaded from storage or injected into prompts |
| Single conversation UI | No branch switcher or project picker |
| No streaming | Full response returned at once; `{ reply }` response shape |
| No markdown rendering | Assistant text shown as plain pre-wrapped text |
| System role not shown | Type supports `system`; UI renders user and assistant only |
| `account_id` in wrangler.toml | Each developer must set locally |
| No automated tests | Manual smoke test only |
| Error detail from AI | Generic 500 message if model fails |
| Deprecated model IDs | Cloudflare retires models periodically (e.g. `@cf/meta/llama-3.1-8b-instruct` deprecated 2026-05-30); update `CLOUDFLARE_AI_MODEL` — see Workers AI Model Configuration |
| `useChat` depends on `messages` in callback | Acceptable for now; branch switch will need load/reset logic |

### Future improvements

- D1 message storage keyed by `projectId` / `branchId`
- Load history via `GET /api/.../messages` instead of only client memory
- Branch-scoped system prompts using normalized IDs in `runChatModel`
- Branch switcher in header; `useChat(projectId, branchId)`
- Streaming via SSE or a separate streaming endpoint
- Markdown rendering for assistant messages
- Structured logging and request IDs in Worker

---

*Last updated: Workers AI model documentation and verified local chat on `feature/project-chat`.*
