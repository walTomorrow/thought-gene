# Implementation Guide

This document is the canonical engineering guide for Thought Gene. It explains what exists today, why it was built this way, and what comes next.

---

## Project Status

### Current branch

`feature/branch-management`

### Current milestone

**Branch management** — create and switch between persistent branches within the default project.

**Status:** Implemented. Users can create branches (title, purpose, parent relationship), switch between active branches, and each branch keeps its own D1 message history. Active branch selection persists in `localStorage` across refresh.

### Current goals

- List active branches for the default project
- Create new branches with title, purpose, and parent branch
- Switch branches and load per-branch message history from D1
- Keep chat UI presentational; orchestration in hooks and services

### Completed work

- All `feature/project-foundation` work (D1, workspace bootstrap, persisted chat)
- `GET /api/workspace?branchId=` — project, branch list, selected branch, messages
- `POST /api/branches` — create branch with title, purpose, parentBranchId
- Branch sidebar UI (`BranchList`, `CreateBranchForm`)
- `localStorage` for last-selected branch across refresh
- DB: `listActiveBranchesByProject`, `createBranch`
- Services: `branch-service`, evolved `workspace-service`

### Remaining work (future branches)

- Branch closure and `closed` branch handling
- Create branch from specific message (`source_message_id`)
- Branch context injection (`context_summary`, parent message seeding)
- AI-suggested branch metadata
- Multiple project UI
- Artifact extraction and project memory dashboard
- Markdown rendering and streaming responses
- Authentication and deployment hardening

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                        Browser (React)                       │
│  useWorkspace → GET /api/workspace?branchId=                 │
│  BranchList / CreateBranchForm → POST /api/branches            │
│  ChatPanel → useChat → POST /api/chat                        │
└─────────────────────────────┬───────────────────────────────┘
                              │ HTTP JSON
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Cloudflare Worker (Hono) — worker/src/          │
│  routes/ → services/ → db/ → D1                              │
│  routes/ → services/ → ai/run-chat.ts → Workers AI           │
└─────────────────────────────┬───────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌──────────────────────────┐    ┌─────────────────────────────┐
│     Cloudflare D1        │    │    Cloudflare Workers AI     │
│  projects, branches,     │    │  @cf/meta/llama-3.1-8b-      │
│  messages                │    │  instruct-fast               │
└──────────────────────────┘    └─────────────────────────────┘
```

Static assets (HTML, JS, CSS) are built by Vite and served through Cloudflare Assets. API routes matching `/api/*` are handled by the Worker first (`run_worker_first` in `wrangler.toml`).

### Frontend responsibilities

- Load workspace on mount (`useWorkspace`) with optional stored `branchId`
- Render branch list and create-branch form
- Switch branches and reload per-branch messages from D1
- Render chat UI and manage in-session message state (`useChat`)
- Send new user turns to `POST /api/chat` with real `projectId` / `branchId`
- Show loading and error states for workspace, branch switch, and chat
- Stay free of Workers AI, D1, or SQL logic

### Backend responsibilities

- Bootstrap default project + Main branch (`GET /api/workspace`)
- List active branches and resolve selected branch (`?branchId=`)
- Create branches (`POST /api/branches`) with title, purpose, parent
- Validate chat requests and persist messages per branch
- Call Workers AI with branch-scoped history from D1

### Cloudflare responsibilities

- Run the Worker at the edge
- Provide the Workers AI binding (no API token in Worker code)
- Provide D1 for relational storage
- Serve the built React SPA as static assets

### Data flow

**App startup**

1. `useWorkspace` reads `localStorage` for last `branchId` (if any).
2. Calls `GET /api/workspace?branchId=...`.
3. Worker get-or-creates **Default Project** and **Main** branch.
4. Worker returns project, active branch list, selected branch, and its messages.
5. UI renders branch sidebar + chat for selected branch.

**Create branch**

1. User enters title + purpose in `CreateBranchForm`.
2. `POST /api/branches` with `{ projectId, title, purpose, parentBranchId }`.
3. `parentBranchId` defaults to the currently selected branch.
4. Worker inserts new `active` branch row (no messages copied).
5. UI switches to the new branch (empty chat).

**Switch branch**

1. User clicks a branch in `BranchList`.
2. `GET /api/workspace?branchId=<id>` loads that branch's messages.
3. `localStorage` updated with selected `branchId`.
4. `ChatPanel` remounts (`key={branch.id}`) with new `initialMessages`.

**Send message**

1. User types a message and clicks Send.
2. `POST /api/chat` with `{ projectId, branchId, content }`.
3. Worker persists user message, loads **this branch's** history, calls Workers AI.
4. Worker persists assistant message and returns both records.
5. UI appends messages.

**Refresh:** Workspace reload uses stored `branchId` — same branch and history restored.

---

## API Contract

### `GET /api/workspace`

Optional query: `?branchId=<uuid>`

```ts
type WorkspaceResponse = {
  project: ProjectRecord;
  branches: BranchSummary[];
  branch: BranchRecord;        // selected branch
  messages: StoredMessage[];   // messages for selected branch only
};

type BranchSummary = {
  id: string;
  title: string;
  purpose: string;
  status: "active" | "ready_to_close" | "closed";
  parentBranchId: string | null;
  createdAt: string;
};
```

- Returns all **active** branches for the default project.
- If `branchId` is missing, invalid, or not active → falls back to **Main**.
- On first access, creates **Default Project** and **Main** branch if needed.

### `POST /api/branches`

```ts
type CreateBranchRequest = {
  projectId: string;
  title: string;
  purpose: string;
  parentBranchId?: string;   // defaults to Main if omitted at service layer
};

type CreateBranchResponse = {
  branch: BranchRecord;
};
```

Creates an `active` branch with `parent_branch_id` set. Does **not** set `source_message_id` or `context_summary`.

### `POST /api/chat`

D1 is the source of truth for history. The client sends **one new user message** per request.

**Request:**

```ts
type ChatRequest = {
  projectId: string;
  branchId: string;
  content: string;
};
```

**Response:**

```ts
type StoredMessage = {
  id: string;
  projectId: string;
  branchId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

type ChatResponse = {
  reply: string;
  userMessage: StoredMessage;
  assistantMessage: StoredMessage;
};
```

### Why the client no longer sends `messages[]`

The previous API accepted full client history. With D1 persistence, the server loads history from the database to avoid drift, duplicate IDs, and tampering. The client receives server-generated message IDs after each turn.

### Default project and branch bootstrap

| Entity | Default | How created |
|--------|---------|-------------|
| Project | name: `"Default Project"` | `getOrCreateDefaultProject()` on workspace load |
| Main branch | title: `"Main"`, purpose: `"Main project conversation"` | `getOrCreateMainBranch()` for that project |
| User branches | title + purpose from form | `POST /api/branches`; parent = current branch unless specified |

### Active branch persistence (client)

Key: `thought-gene:activeBranchId` in `localStorage`.

- Set after successful workspace load or branch create/switch.
- Cleared if server returns a different branch than requested (stale id).
- Falls back to Main when no stored id or invalid id.

Shared definitions: `shared/workspace.ts`, `shared/chat.ts`.

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

**Interaction:** Three tsconfig projects — app (`src/`), Node tooling (`vite.config.ts`), Worker (`worker/`). Shared types in `shared/`.

### Cloudflare D1

**What:** Serverless SQLite at the edge, bound to Workers.

**Why chosen:** MVP target storage for projects, branches, and messages.

**Problem it solves:** Persistent chat history and future project memory without operating a separate database.

**Interaction:** `env.DB` binding; SQL in `worker/src/db/`; migrations in `migrations/`.

### Vite

**What:** Frontend build tool and dev server with fast HMR.

**Why chosen:** Official Cloudflare Vite plugin integrates Worker + SPA in one dev command.

**Problem it solves:** Fast local iteration on React UI without a separate proxy setup.

**Interaction:** Builds the React app; `@cloudflare/vite-plugin` runs the Worker in the Workers runtime during dev.

### React

**What:** UI library for component-based interfaces.

**Why chosen:** MVP stack suggestion; large ecosystem; fits future dashboard panels.

**Problem it solves:** Composable chat UI that can grow with branch switchers and memory sidebars.

**Interaction:** `App.tsx` uses `useWorkspace` + `ChatPanel`; chat state in `useChat`.

### Cloudflare Workers

**What:** Serverless JavaScript/Wasm runtime at Cloudflare's edge.

**Why chosen:** MVP target platform; pairs with Workers AI and D1 storage.

**Problem it solves:** Single deployment target for API + static assets.

**Interaction:** Entry point `worker/src/index.ts` exports the Hono app; configured in `wrangler.toml`.

### Hono

**What:** Lightweight web framework for Workers and other runtimes.

**Why chosen:** Minimal API surface, good TypeScript bindings for `Bindings`, easy to add routes later.

**Problem it solves:** Structured routing without Express-style weight.

**Interaction:** `worker/src/app.ts` mounts `/api/workspace` and `/api/chat`.

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
3. Set `account_id` in `wrangler.toml` (quoted string)
4. Create D1 database: `pnpm wrangler d1 create thought-gene-db` and set `database_id` in `wrangler.toml`
5. Apply local migrations: `pnpm db:migrate:local`
6. Optionally copy `.dev.vars.example` → `.dev.vars` to override the AI model
7. Start dev server: `pnpm dev`
8. Open the URL Vite prints (typically `http://localhost:5173`)

One command runs both the React dev server and the Worker in the Workers runtime via `@cloudflare/vite-plugin`.

### How hot reload works

- **React components:** Vite HMR updates the browser without full reload.
- **Worker code:** The Cloudflare plugin reloads the Worker when files under `worker/` change.

### How Vite is used

- Dev: serves `index.html` and bundles `src/` on demand
- Build: outputs static assets to `dist/` for Cloudflare deployment

### How Wrangler is used

- Reads `wrangler.toml` for Worker name, AI binding, D1 binding, assets config, and vars
- Loads `.dev.vars` for local secret/var overrides
- Used directly for login; invoked by the Vite plugin during dev and build

### Request flow (browser → D1 → AI)

```text
GET /api/workspace
  → workspace-service → db/projects, db/branches, db/messages → D1

POST /api/chat
  → parseChatRequest
  → chat-service → insert user message → D1
  → load branch history → D1
  → runChatModel → Workers AI
  → insert assistant message → D1
  → JSON { reply, userMessage, assistantMessage }
```

---

## D1 Database

### Schema

Defined in `migrations/0001_initial.sql`:

| Table | Purpose |
|-------|---------|
| `projects` | Top-level workspace container |
| `branches` | Conversational workspaces (Main branch created automatically) |
| `messages` | Chat messages scoped to a branch |

Columns align with MVP types (`docs/mvp.md`). Branch lifecycle columns (`status`, `closure_summary`, etc.) exist but are unused until branch closure is built.

### D1 setup (required before first `pnpm dev`)

**1. Create the remote D1 database (one-time):**

```powershell
pnpm wrangler d1 create thought-gene-db
```

Copy the `database_id` UUID from the output.

**2. Update `wrangler.toml`:**

Replace `REPLACE_WITH_DATABASE_ID` with your UUID:

```toml
[[d1_databases]]
binding = "DB"
database_name = "thought-gene-db"
database_id = "your-uuid-here"
migrations_dir = "migrations"
```

**3. Apply migrations locally:**

```powershell
pnpm db:migrate:local
```

This creates tables in `.wrangler/state/v3/d1/` for local development.

**4. (Optional) Apply migrations to remote before deploy:**

```powershell
pnpm db:migrate:remote
```

### Migration workflow

| Command | Purpose |
|---------|---------|
| `pnpm db:migrate:local` | Apply pending migrations to local D1 |
| `pnpm db:migrate:remote` | Apply pending migrations to remote D1 |

Add new SQL files as `migrations/0002_description.sql` — never edit applied migrations.

### Worker layer responsibilities

| Layer | Path | Role |
|-------|------|------|
| Routes | `worker/src/routes/` | HTTP only |
| Services | `worker/src/services/` | Orchestration |
| DB | `worker/src/db/` | SQL queries only |
| AI | `worker/src/ai/` | Model calls only |

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

# wrangler.toml — set account_id and database_id

pnpm wrangler d1 create thought-gene-db
pnpm db:migrate:local

# Optional model override:
copy .dev.vars.example .dev.vars

pnpm dev
```

### Local testing (verified workflow)

Use this checklist after setup (see Local setup checklist and D1 Database sections above).

**Prerequisites**

- `account_id` and `database_id` set in `wrangler.toml`
- `pnpm db:migrate:local` completed successfully
- `pnpm wrangler login` completed
- `pnpm dev` running

**1. Workspace bootstrap**

- Open `http://localhost:5173`
- Header should show **Default Project · Main**
- Empty chat shows “Send a message to start the conversation” (first visit)

Optional API check:

```powershell
curl http://localhost:5173/api/workspace
```

Expect JSON with `project`, `branch`, and `messages` arrays. On first load, `messages` is `[]`; after chatting, it contains persisted rows.

Expect JSON with `project`, `branches`, `branch`, and `messages`. On first load, `branches` includes Main; `messages` is `[]` until you chat.

**2. Branch creation**

- In the sidebar, enter a title (e.g. `Data Storage`) and purpose
- Click **Create branch**
- UI switches to the new branch with an empty chat
- Main branch should still appear in the branch list

Optional API check:

```powershell
curl -X POST http://localhost:5173/api/branches `
  -H "Content-Type: application/json" `
  -d "{\"projectId\":\"YOUR_PROJECT_ID\",\"title\":\"API Design\",\"purpose\":\"Explore API shape for MVP\"}"
```

**3. Branch switching + isolated history**

- On **Main**, send a message (e.g. “This is the main thread”)
- Switch to another branch; send a different message
- Switch back to **Main** — only Main's messages should appear
- Refresh the browser — same active branch and history should reload

**4. Chat + Workers AI**

- Send messages in any branch; confirm assistant replies
- Multi-turn context is scoped to the **current branch only**

**5. Persistence across refresh**

- Select a non-Main branch, send messages, refresh
- Confirm you return to that branch with its history (`localStorage`)

**6. D1 row count (optional)**

```powershell
pnpm wrangler d1 execute thought-gene-db --local --command "SELECT branch_id, COUNT(*) AS count FROM messages GROUP BY branch_id;"
```

Each branch with chat activity should have its own row count.

**7. curl chat turn (optional)**

Use `projectId` and `branchId` from the workspace response:

```powershell
curl -X POST http://localhost:5173/api/chat `
  -H "Content-Type: application/json" `
  -d "{\"projectId\":\"YOUR_PROJECT_ID\",\"branchId\":\"YOUR_BRANCH_ID\",\"content\":\"Say hello in one sentence.\"}"
```

Expected: `{ "reply", "userMessage", "assistantMessage" }` with server-generated message IDs.

**Verified observations (local)**

| Check | Result |
|-------|--------|
| Default Project + Main branch in UI | Pass (project-foundation) |
| Messages saved to D1 on send | Pass (project-foundation) |
| Browser refresh preserves history | Pass (project-foundation) |
| Create branch with title + purpose | Pass (branch-management) |
| Switch branches loads correct history | Pass (branch-management) |
| Per-branch messages isolated in D1 | Pass (branch-management) |

---

## Current File Structure

```text
thought-gene/
├── migrations/
│   └── 0001_initial.sql     # D1 schema: projects, branches, messages
├── shared/
│   ├── chat.ts              # Chat API types
│   └── workspace.ts         # Workspace API types
├── worker/src/
│   ├── db/                  # projects, branches, messages
│   ├── services/            # workspace, branch, chat services
│   ├── routes/
│   │   ├── workspace.ts     # GET /api/workspace
│   │   ├── branches.ts      # POST /api/branches
│   │   └── chat.ts          # POST /api/chat
│   ├── validation/
│   ├── ai/run-chat.ts
│   └── types/env.ts
├── src/
│   ├── api/
│   │   ├── workspace-client.ts
│   │   ├── branches-client.ts
│   │   └── chat-client.ts
│   ├── hooks/
│   │   ├── use-workspace.ts
│   │   └── use-chat.ts
│   ├── lib/branch-storage.ts
│   └── components/
│       ├── branches/        # BranchList, CreateBranchForm
│       └── chat/            # Presentational chat UI
├── wrangler.toml            # AI + D1 bindings
└── package.json             # db:migrate:local / db:migrate:remote scripts
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

### Decision: D1 as source of truth for chat history

**Why:** Refresh-safe persistence; server loads history for Workers AI; client sends one turn per request with real IDs.

**Alternatives:** Client-sent `messages[]` without storage. Rejected after persistence milestone.

### Decision: routes → services → db layering

**Why:** Keeps SQL out of HTTP handlers and AI logic out of DB modules; scales to branch closure and artifacts.

**Alternatives:** SQL inline in routes. Rejected — harder to test and extend.

### Decision: `GET /api/workspace` bootstrap with branch list

**Why:** Single endpoint returns project, active branches, selected branch, and messages — avoids N+1 fetches for single-project app.

**Alternatives:** Separate `GET /api/branches` and `GET /api/branches/:id/messages`. Deferred until multi-project or heavy branch lists.

### Decision: `localStorage` for active branch

**Why:** Minimal persistence of UI selection across refresh without server-side user preferences or URL routing.

**Alternatives:** URL `?branch=` query param. Deferred — better for deep links later.

### Decision: Manual branch creation only (title + purpose)

**Why:** Smallest path to multiple persistent conversations; matches this milestone scope.

**Alternatives:** Create from message, AI-suggested metadata. Deferred per MVP sequencing.

### Decision: New branches start with empty message history

**Why:** Clean per-branch conversations; parent relationship stored via `parent_branch_id` only.

**Alternatives:** Copy parent messages or inject `context_summary`. Deferred to branch-context milestone.

### Decision: Shared types in `shared/chat.ts` and `shared/workspace.ts`

**Why:** Frontend and Worker compile separately but must agree on request/response shapes. One source of truth reduces drift.

**Alternatives:** Duplicate types in `src/` and `worker/`. Rejected — easy to desync.

### Decision: Vite + Cloudflare Vite plugin (not separate Vite proxy + wrangler dev)

**Why:** One dev command, Worker runs in the real Workers runtime with AI binding available.

**Alternatives:** Standalone `wrangler dev` + manual proxy. Rejected — more wiring for this milestone.

### Decision: Hono routes split from AI logic

**Why:** `routes/chat.ts` handles HTTP; `ai/run-chat.ts` handles model invocation. Easier to test and extend (e.g. add branch context to prompts later).

**Alternatives:** Single file Worker. Rejected — mixes concerns early.

### Decision: `useWorkspace` + `useChat` hooks

**Why:** Workspace bootstrap separated from chat turns; components stay presentational.

**Alternatives:** fetch inside components. Rejected — harder to maintain.

### Decision: Plain text bubbles (no markdown library yet)

**Why:** MVP lists markdown as desirable but not required for proving AI connectivity; avoids extra dependency.

**Alternatives:** `react-markdown`. Deferred to a small follow-up when chat UX stabilizes.

### Decision: pnpm over npm

**Why:** Stricter dependency handling and user preference.

---

## Known Limitations

| Limitation | Notes |
|------------|-------|
| Single default project only | No project picker or multi-project UI |
| No branch closure UI | `closed` branches not listed; closure flow deferred |
| No create-from-message | `source_message_id` column unused |
| No branch context seeding | `context_summary` unused; new branches have empty chat |
| Active branch in localStorage only | No URL deep links; cleared if stale |
| All messages loaded per branch | No pagination |
| No auth | Single shared D1 workspace for all visitors |
| User message persisted before AI | If AI fails, user message remains without assistant reply |
| No streaming / markdown | Plain text responses |
| `database_id` setup required | Each developer runs `wrangler d1 create` and migrates locally |
| Deprecated model IDs | Update `CLOUDFLARE_AI_MODEL` if Workers AI returns 5028 |

### Future improvements

- Branch closure and closed-branch history
- Create branch from message (`source_message_id`)
- Branch context injection (`context_summary`, parent history seeding)
- Multiple projects UI
- Artifact extraction and project memory
- URL routing for branches
- Streaming and markdown rendering
- Auth and per-user workspaces

---

*Last updated: branch management on `feature/branch-management`.*
