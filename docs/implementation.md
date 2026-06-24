# Implementation Guide

This document is the canonical engineering guide for Thought Gene. It explains what exists today, why it was built this way, and what comes next.

---

## Project Status

### Current branch

`feature/branch-merges`

### Current milestone

**Branch merges** — generate, review, and confirm parent-facing merge packets from child branches.

**Status:** Implemented. Users can merge an active child branch into its parent: LLM generates a structured packet, user reviews/edits, confirm inserts a visible merge message in the parent chat, optionally closes the child, and the UI switches to the parent with the new message highlighted.

### Current goals

- Generate structured merge packets from child branch context (Workers AI)
- Review and edit packets before confirming
- Insert merge packet messages into the parent branch (`message_kind=merge_packet`)
- Track merge history per child branch (`branch_merges` table)
- One draft per child; replace or resume existing draft
- Block root merges and merges into closed parents
- Optionally close child after merge

### Completed work

- All `feature/branch-management` work (branch lifecycle)
- Migration `0002_branch_merges.sql` — `branch_merges` table; `messages.message_kind`, `messages.merge_id`
- Merge API routes (`generate`, `PATCH` draft, `confirm`, `DELETE` discard, `GET` history)
- `merge-service`, `merge-context`, `run-merge-packet`, `branch-merges` DB module
- UI: **Merge to parent**, `MergeReviewModal`, `MergeHistoryList`, merge packet bubbles
- `docs/branch-merges.md` specification

### Remaining work (future branches)

- Artifact promotion from merge/closure packets to project memory
- Create branch from specific message (`source_message_id`)
- Branch context injection (`context_summary`, parent message seeding)
- LLM-generated closure packets on branch close (`closure_summary`)
- Multiple project UI
- Markdown rendering for merge packets
- Authentication and deployment hardening

### Intentionally out of scope

The following are **not** part of `feature/branch-management` and were explicitly deferred:

| Area | Notes |
|------|-------|
| LLM closure packets on close | `closure_summary` stays null; merge uses separate `branch_merges` flow |
| Artifact / project memory promotion | Merge packets stay in parent chat only |
| `ready_to_close` workflow | Column exists in schema; no UI or API uses this status yet |
| Project memory dashboard | No summary or artifact views |
| RAG / vector search | No embeddings or retrieval |
| GitHub integration | No external repo linking |
| New D1 migrations | Lifecycle reuses `status` and `closed_at` from `0001_initial.sql` |
| Create branch from message | `source_message_id` column unused |
| Branch context seeding | `context_summary` unused; new branches start with empty chat |
| URL deep links for branches | Selection stored in `localStorage` only |
| Auth / per-user workspaces | Single shared default project for all visitors |

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                        Browser (React)                       │
│  useWorkspace → GET /api/workspace?branchId=                 │
│  BranchList (active) / ClosedBranchList / BranchDetailsPanel │
│  CreateBranchForm → POST /api/branches                         │
│  BranchDetailsPanel → PATCH, close, reopen, merge workflow      │
│  MergeReviewModal → generate / edit / confirm merge packets      │
│  ChatPanel → useChat → POST /api/chat (merge packets visible)  │
└─────────────────────────────┬───────────────────────────────┘
                              │ HTTP JSON
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Cloudflare Worker (Hono) — worker/src/          │
│  GET  /api/workspace                                         │
│  POST /api/branches · PATCH /api/branches/:id                │
│  POST /api/branches/:id/close · POST /api/branches/:id/reopen│
│  GET/POST/PATCH/DELETE /api/branches/:id/merges/...          │
│  POST /api/chat (rejects non-active branches → 400)          │
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
- Render **active** branch list (`BranchList`), **closed** branch list (`ClosedBranchList`), and branch details (`BranchDetailsPanel`)
- Create branches via `CreateBranchForm` (disabled while viewing a closed branch)
- Switch branches (active or closed) and reload per-branch messages from D1
- Edit title/purpose on **active** branches only; close non-root branches; reopen closed branches
- Render chat UI with read-only mode when `workspace.isReadOnly` (`ChatPanel` disables input and shows a banner)
- Send new user turns to `POST /api/chat` only from active branches (UI prevents send; server enforces as backup)
- Show loading and error states for workspace, branch switch, lifecycle actions, and chat
- Stay free of Workers AI, D1, or SQL logic

### Backend responsibilities

- Bootstrap default project + root branch (`GET /api/workspace`)
- List active and closed branches; resolve selected branch (`?branchId=`, including closed for read-only view)
- Create branches (`POST /api/branches`) with title, purpose, parent
- Update branch metadata (`PATCH /api/branches/:branchId`)
- Close and reopen branches (`POST .../close`, `POST .../reopen`); root branch cannot be closed
- Validate chat requests; reject messages to closed branches; persist messages per active branch
- Call Workers AI with branch-scoped history from D1

### Cloudflare responsibilities

- Run the Worker at the edge
- Provide the Workers AI binding (no API token in Worker code)
- Provide D1 for relational storage
- Serve the built React SPA as static assets

### Data flow

#### Frontend data flow

| Step | Hook / component | Action |
|------|------------------|--------|
| Mount | `useWorkspace` | Read `thought-gene:activeBranchId` from `localStorage`; call `GET /api/workspace?branchId=` |
| Render lists | `BranchList`, `ClosedBranchList` | `workspace.branches` (active) and `workspace.closedBranches` (closed) |
| Select branch | `useWorkspace.selectBranch` | Re-fetch workspace with new `branchId`; update `localStorage` |
| Create branch | `CreateBranchForm` → `useWorkspace.createBranch` | `POST /api/branches` with `parentBranchId` = current branch; reload workspace on new id |
| Edit branch | `BranchDetailsPanel` → `useWorkspace.updateBranch` | `PATCH /api/branches/:id`; reload workspace on same id |
| Close branch | `BranchDetailsPanel` → `useWorkspace.closeBranch` | `POST .../close`; reload workspace on **root** branch id |
| Reopen branch | `BranchDetailsPanel` → `useWorkspace.reopenBranch` | `POST .../reopen`; reload workspace on same id |
| Chat | `ChatPanel` → `useChat` | `initialMessages` from workspace; `readOnly={workspace.isReadOnly}` disables `ChatInput` |
| Stale branch id | `useWorkspace.loadWorkspace` | If requested `branchId` ≠ `data.branch.id`, clear `localStorage` (server fell back to root) |

`ChatPanel` uses `key={workspace.branch.id}` so switching branches resets in-memory chat state from server `messages`.

#### Backend data flow

| Route | Service | DB / AI |
|-------|---------|---------|
| `GET /api/workspace` | `workspace-service.loadWorkspace` | `getOrCreateDefaultProject`, `getOrCreateMainBranch`, `listActiveBranchesByProject`, `listClosedBranchesByProject`, `getBranchForProject`, `listMessagesByBranch` |
| `POST /api/branches` | `branch-service.createProjectBranch` | `createBranch` insert (`status='active'`) |
| `PATCH /api/branches/:id` | `branch-service.updateProjectBranch` | `updateBranch` (title/purpose only; no status check) |
| `POST /api/branches/:id/close` | `branch-service.closeProjectBranch` | `closeBranch` → `status='closed'`, `closed_at` set; root rejected |
| `POST /api/branches/:id/reopen` | `branch-service.reopenProjectBranch` | `reopenBranch` → `status='active'`, `closed_at` cleared |
| `POST /api/chat` | `chat-service.sendChatTurn` | Rejects if `branch.status !== 'active'`; then `insertMessage`, `listMessagesByBranch`, `runChatModel`, `insertMessage` |

#### User flows (step by step)

**App startup**

1. `useWorkspace` reads `localStorage` for last `branchId` (if any).
2. Calls `GET /api/workspace?branchId=...`.
3. Worker get-or-creates **Default Project** and **root branch** (`parent_branch_id IS NULL`; default title is `"Main"`).
4. Worker returns project, active branch list, closed branch list, selected branch, messages, and `isReadOnly`.
5. UI renders branch sidebar (active + closed sections), branch details, and chat for selected branch.

**Create branch**

1. User enters title + purpose in `CreateBranchForm`.
2. `POST /api/branches` with `{ projectId, title, purpose, parentBranchId }`.
3. `parentBranchId` defaults to the currently selected branch.
4. Worker inserts new `active` branch row (no messages copied).
5. UI switches to the new branch (empty chat).

**Switch branch**

1. User clicks a branch in `BranchList` (active) or `ClosedBranchList` (read-only).
2. `GET /api/workspace?branchId=<id>` loads that branch's messages.
3. `localStorage` updated with selected `branchId`.
4. `ChatPanel` remounts (`key={branch.id}`) with new `initialMessages`; input disabled when `isReadOnly`.

**Edit branch**

1. User edits title and/or purpose in `BranchDetailsPanel` (active branches only — inputs disabled when `isReadOnly`).
2. `PATCH /api/branches/:branchId` with `{ projectId, title, purpose }` (UI always sends both fields).
3. Worker updates the branch row (`updateBranch` in `worker/src/db/branches.ts`); UI refreshes workspace.
4. **Note:** The API accepts PATCH on closed branches (no status check), but the UI does not expose edit controls for closed branches.

**Close branch**

1. User clicks Close in `BranchDetailsPanel` (only for non-root active branches).
2. `POST /api/branches/:branchId/close` with `{ projectId }`.
3. Worker sets `status='closed'` and `closed_at`; `closure_summary` remains null (no LLM).
4. UI switches to the root branch; closed branch appears under **Closed branches**.

**Reopen branch**

1. User selects a closed branch, then clicks Reopen in `BranchDetailsPanel`.
2. `POST /api/branches/:branchId/reopen` with `{ projectId }`.
3. Worker sets `status='active'` and clears `closed_at`.
4. Branch returns to the active list; chat is enabled again.

**Send message**

1. User types a message and clicks Send.
2. `POST /api/chat` with `{ projectId, branchId, content }`.
3. Worker rejects if branch `status !== 'active'` (400: *Cannot send messages to a closed branch.*).
4. Worker persists user message, loads **this branch's** history, calls Workers AI.
5. Worker persists assistant message and returns both records.
6. UI appends messages.

**Refresh:** Workspace reload uses stored `branchId` — same branch and history restored (including closed branches if that was the last selection).

---

## Branch Lifecycle

This section documents branch listing, edit, close/reopen, and read-only behavior as implemented in `feature/branch-management`.

### How active branches are listed

- **Query:** `listActiveBranchesByProject` in `worker/src/db/branches.ts` selects rows where `project_id = ? AND status = 'active'`.
- **Sort order:** Root branch first (`ORDER BY CASE WHEN parent_branch_id IS NULL THEN 0 ELSE 1 END`), then `created_at ASC`.
- **API:** Returned as `WorkspaceResponse.branches` (`BranchSummary[]`).
- **UI:** Rendered by `BranchList` under the heading **Branches**. Closed branches never appear here.

Branches with `status = 'ready_to_close'` are **not** included in either active or closed lists today (that status is reserved for a future workflow).

### How closed branches are listed

- **Query:** `listClosedBranchesByProject` selects rows where `project_id = ? AND status = 'closed'`.
- **Sort order:** Most recently closed first (`ORDER BY closed_at DESC, created_at DESC`).
- **API:** Returned as `WorkspaceResponse.closedBranches` (`BranchSummary[]`), separate from `branches`.
- **UI:** Rendered by `ClosedBranchList` under **Closed branches**. The section is hidden when the list is empty (`return null`).
- **Selection:** Clicking a closed branch calls `selectBranch` → `GET /api/workspace?branchId=` — same as active branches. `getBranchForProject` returns closed rows; they are not filtered out.

### How branch edit works

| Layer | Behavior |
|-------|----------|
| UI | `BranchDetailsPanel` shows title/purpose fields and **Save changes** when the branch is active (`canEdit = !isReadOnly`). |
| Client | `useWorkspace.updateBranch` → `PATCH /api/branches/:branchId` with `{ projectId, title, purpose }` → reload workspace. |
| Validation | `parseUpdateBranchRequest` requires `projectId` and at least one of `title` or `purpose`. |
| Service | `updateProjectBranch` verifies the branch belongs to the project. |
| DB | `updateBranch` updates `title`, `purpose`, `updated_at` only — does not change `status`. |

### How branch close works

| Layer | Behavior |
|-------|----------|
| UI | **Close branch** button shown only when `!isReadOnly && !isRootBranch(branch)` (`isRootBranch` checks `parentBranchId === null`). |
| Client | `useWorkspace.closeBranch` → `POST /api/branches/:branchId/close` with `{ projectId }` → reload workspace on root branch id. |
| Service | `closeProjectBranch` verifies project ownership, delegates to `closeBranch`. |
| DB | Sets `status = 'closed'`, `closed_at = now()`, `updated_at = now()`. Does **not** set `closure_summary`. |
| Errors | Root branch → `"The root branch cannot be closed."` (400). Already closed → 400. Not found → 404. |

After close, the closed branch disappears from `branches` and appears in `closedBranches` on the next workspace load.

### How branch reopen works

| Layer | Behavior |
|-------|----------|
| UI | **Reopen branch** button shown when `isReadOnly` (viewing a closed branch). |
| Client | `useWorkspace.reopenBranch` → `POST /api/branches/:branchId/reopen` with `{ projectId }` → reload workspace on same id. |
| DB | Sets `status = 'active'`, `closed_at = NULL`, `updated_at = now()`. |
| Errors | Already active → 400. Not found → 404. |

### How closed branches become read-only

Read-only is derived from branch status, not a separate flag in D1:

1. **Server:** `workspace-service.loadWorkspace` sets `isReadOnly = selectedBranch.status === "closed"`.
2. **UI — chat:** `App` passes `readOnly={workspace.isReadOnly}` to `ChatPanel`, which disables `ChatInput` and shows *"Viewing closed branch — sending messages is disabled."*
3. **UI — sidebar:** `CreateBranchForm` is disabled when `workspace.isReadOnly`. `BranchDetailsPanel` disables title/purpose inputs and hides **Save changes**.
4. **UI — details:** `BranchDetailsPanel` shows *"This branch is closed. History is read-only."*
5. **Messages:** `listMessagesByBranch` still returns full history for closed branches — read-only applies to **sending**, not viewing.

### Why the root branch cannot be closed

Protection is **structural**, not based on the display title `"Main"`:

- **Shared helper:** `isRootBranch()` in `shared/workspace.ts` — `parentBranchId === null`.
- **DB helper:** `isRootBranchRecord()` in `worker/src/db/branches.ts` — same check before close.
- **Root lookup:** `findRootBranch` uses `WHERE parent_branch_id IS NULL`.

The default root branch is created with title `"Main"` via `createMainBranch`, but renaming it does not affect close protection. Only branches with a non-null `parent_branch_id` can be closed.

### How the app prevents sending messages to closed branches

Defense in depth — UI first, server authoritative:

| Layer | Mechanism |
|-------|-----------|
| UI | `ChatPanel` sets `inputDisabled = disabled \|\| isLoading \|\| readOnly` — no request is sent while viewing a closed branch. |
| API | `chat-service.sendChatTurn` loads the branch and throws if `branch.status !== "active"` with message *"Cannot send messages to a closed branch."* |
| Route | `routes/chat.ts` maps that error to **HTTP 400**. |

A direct `POST /api/chat` with a closed `branchId` bypasses the UI but is rejected server-side before any message insert or Workers AI call.

### Schema migration

**No new migration was required.** `migrations/0001_initial.sql` already defines:

- `branches.status` — `CHECK (status IN ('active', 'ready_to_close', 'closed'))`
- `branches.closed_at` — nullable timestamp set on close, cleared on reopen
- `branches.closure_summary` — exists but intentionally left `NULL`

This milestone only started **using** those columns; it did not change the schema.

---

## API Contract

### Routes summary

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/workspace?branchId=` | Bootstrap project, branch lists, messages, `isReadOnly` |
| `POST` | `/api/branches` | Create active branch |
| `PATCH` | `/api/branches/:branchId` | Update title and/or purpose |
| `POST` | `/api/branches/:branchId/close` | Close non-root branch |
| `POST` | `/api/branches/:branchId/reopen` | Reopen closed branch |
| `GET` | `/api/branches/:childBranchId/merges?projectId=` | Merge history + active draft |
| `POST` | `/api/branches/:childBranchId/merges/generate` | LLM generate draft packet |
| `PATCH` | `/api/branches/:childBranchId/merges/:mergeId` | Update draft packet JSON |
| `POST` | `/api/branches/:childBranchId/merges/:mergeId/confirm` | Insert parent merge message |
| `DELETE` | `/api/branches/:childBranchId/merges/:mergeId?projectId=` | Discard draft |
| `POST` | `/api/chat` | Send one user turn (active branches only) |

Types live in `shared/workspace.ts`, `shared/chat.ts`, and `shared/merge.ts`. See [docs/branch-merges.md](branch-merges.md).

### `GET /api/workspace`

Optional query: `?branchId=<uuid>`

```ts
type WorkspaceResponse = {
  project: ProjectRecord;
  branches: BranchSummary[];       // active only
  closedBranches: BranchSummary[]; // status === "closed"
  branch: BranchRecord;            // selected branch (active or closed)
  messages: StoredMessage[];       // messages for selected branch only
  isReadOnly: boolean;             // true when selected branch is closed
};

type BranchSummary = {
  id: string;
  title: string;
  purpose: string;
  status: "active" | "ready_to_close" | "closed";
  parentBranchId: string | null;
  createdAt: string;
  closedAt?: string | null;
};
```

- Returns **active** branches in `branches` and **closed** branches in `closedBranches`.
- If `branchId` is missing or unknown to the project → falls back to the **root branch** (`parent_branch_id IS NULL`).
- If `branchId` refers to a closed branch → loads it for read-only viewing (`isReadOnly: true`).
- On first access, creates **Default Project** and root branch if needed (default title `"Main"`).
- Root branch is identified structurally by `parentBranchId === null`, not by title. Use `isRootBranch()` from `shared/workspace.ts`.

Full `BranchRecord` shape (selected branch and mutation responses):

```ts
type BranchRecord = {
  id: string;
  projectId: string;
  parentBranchId: string | null;
  sourceMessageId: string | null;
  title: string;
  purpose: string;
  status: "active" | "ready_to_close" | "closed";
  contextSummary: string | null;
  closureSummary: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
};
```

### `POST /api/branches`

```ts
type CreateBranchRequest = {
  projectId: string;
  title: string;
  purpose: string;
  parentBranchId?: string;   // UI sends current branch; service defaults to root if omitted
};

type CreateBranchResponse = {
  branch: BranchRecord;
};
```

Creates an `active` branch with `parent_branch_id` set. Does **not** set `source_message_id` or `context_summary`.

### `PATCH /api/branches/:branchId`

```ts
type UpdateBranchRequest = {
  projectId: string;
  title?: string;
  purpose?: string;
};

type UpdateBranchResponse = {
  branch: BranchRecord;
};
```

At least one of `title` or `purpose` must be provided. Updates `title`, `purpose`, and `updated_at` only. No `status` check — closed branches can be updated via API, but the UI does not expose edit controls for them.

### `POST /api/branches/:branchId/close`

```ts
type BranchActionRequest = { projectId: string };
type BranchActionResponse = { branch: BranchRecord };
```

- Sets `status='closed'` and `closed_at` to the current time.
- **Root branch cannot be closed** (`parent_branch_id IS NULL` → 400, message: *"The root branch cannot be closed."*).
- `closure_summary` is not populated (no LLM closure packet in this milestone).
- Already closed → 400 (*"Branch is already closed."*).

### `POST /api/branches/:branchId/reopen`

Same request/response shape as close.

- Sets `status='active'` and clears `closed_at`.
- Returns 400 if the branch is already active (*"Branch is already active."*).

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
  messageKind: "chat" | "merge_packet";
  mergeId: string | null;
  createdAt: string;
};

type ChatResponse = {
  reply: string;
  userMessage: StoredMessage;
  assistantMessage: StoredMessage;
};
```

**Errors:**

| Condition | HTTP | Message |
|-----------|------|---------|
| Branch not found | 404 | *"Branch not found for this project."* |
| Branch `status !== 'active'` | 400 | *"Cannot send messages to a closed branch."* |
| Invalid body | 400 | Validation message from `parseChatRequest` |

### Why the client no longer sends `messages[]`

The previous API accepted full client history. With D1 persistence, the server loads history from the database to avoid drift, duplicate IDs, and tampering. The client receives server-generated message IDs after each turn.

### Default project and branch bootstrap

| Entity | Default | How created |
|--------|---------|-------------|
| Project | name: `"Default Project"` | `getOrCreateDefaultProject()` on workspace load |
| Root branch | title: `"Main"`, purpose: `"Main project conversation"`, `parent_branch_id IS NULL` | `getOrCreateMainBranch()` for that project (finds/creates by `parent_branch_id IS NULL`) |
| User branches | title + purpose from form | `POST /api/branches`; parent = current branch unless specified |

**Root branch identification:** The project root is the branch where `parentBranchId === null` (D1: `parent_branch_id IS NULL`). The default title is `"Main"`, but protection logic (e.g. cannot close) uses `isRootBranch()`, not the title string.

### Active branch persistence (client)

Key: `thought-gene:activeBranchId` in `localStorage`.

- Set after successful workspace load or branch create/switch.
- Cleared if server returns a different branch than requested (stale id).
- Falls back to root branch when no stored id or invalid id.

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

**Interaction:** `App.tsx` uses `useWorkspace` (branch lifecycle) + `ChatPanel`; chat state in `useChat`.

### Cloudflare Workers

**What:** Serverless JavaScript/Wasm runtime at Cloudflare's edge.

**Why chosen:** MVP target platform; pairs with Workers AI and D1 storage.

**Problem it solves:** Single deployment target for API + static assets.

**Interaction:** Entry point `worker/src/index.ts` exports the Hono app; configured in `wrangler.toml`.

### Hono

**What:** Lightweight web framework for Workers and other runtimes.

**Why chosen:** Minimal API surface, good TypeScript bindings for `Bindings`, easy to add routes later.

**Problem it solves:** Structured routing without Express-style weight.

**Interaction:** `worker/src/app.ts` mounts `/api/workspace`, `/api/branches`, and `/api/chat`.

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
  → workspace-service.loadWorkspace
  → db/projects, db/branches (active + closed lists), db/messages
  → D1

POST /api/branches
  → parseCreateBranchRequest → branch-service.createProjectBranch → db/branches.createBranch → D1

PATCH /api/branches/:branchId
  → parseUpdateBranchRequest → branch-service.updateProjectBranch → db/branches.updateBranch → D1

POST /api/branches/:branchId/close | /reopen
  → parseBranchActionRequest → branch-service → db/branches.closeBranch | reopenBranch → D1

POST /api/chat
  → parseChatRequest
  → chat-service.sendChatTurn
      → getBranchById (reject if status !== 'active')
      → insert user message → D1
      → load branch history → D1
      → runChatModel → Workers AI
      → insert assistant message → D1
  → JSON { reply, userMessage, assistantMessage }
```

---

## D1 Database

### Schema

Defined in `migrations/0001_initial.sql` and `migrations/0002_branch_merges.sql`:

| Table | Purpose |
|-------|---------|
| `projects` | Top-level workspace container |
| `branches` | Conversational workspaces; root branch has `parent_branch_id IS NULL` |
| `messages` | Chat and merge packet messages scoped to a branch |
| `branch_merges` | Merge draft/confirm lifecycle and packet JSON |

#### `branches` column usage (this milestone)

| Column | Used? | Role |
|--------|-------|------|
| `id`, `project_id`, `title`, `purpose` | Yes | Identity and display |
| `parent_branch_id` | Yes | Tree structure; `NULL` = root branch (close-protected) |
| `status` | Yes | `'active'` vs `'closed'` for listing and chat gate |
| `closed_at` | Yes | Set on close, cleared on reopen; sort key for closed list |
| `created_at`, `updated_at` | Yes | Timestamps; `updated_at` bumped on edit/close/reopen |
| `source_message_id` | No | Reserved for create-from-message |
| `context_summary` | No | Reserved for branch context injection |
| `closure_summary` | No | Reserved for LLM closure on branch close |
| `ready_to_close` status value | No | In schema CHECK constraint only |

#### `messages` column usage (branch-merges)

| Column | Used? | Role |
|--------|-------|------|
| `message_kind` | Yes | `chat` (default) or `merge_packet` |
| `merge_id` | Yes | Links merge packet messages to `branch_merges` |

#### `branch_merges` column usage

| Column | Role |
|--------|------|
| `merge_sequence` | 1-based counter per child branch |
| `status` | `draft`, `confirmed`, or `discarded` |
| `packet_json` | Structured `MergePacket` (user-editable while draft) |
| `rendered_markdown` | Markdown inserted into parent on confirm |
| `parent_message_id` | Parent `messages` row created on confirm |
| `close_child_after` | Whether confirm also closed the child |

One active draft per child enforced by partial unique index (`status = 'draft'`).

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

Expect JSON with `project`, `branches`, `closedBranches`, `branch`, `messages`, and `isReadOnly`. On first load, `closedBranches` is `[]`, `branches` includes the root branch (title `"Main"`), `messages` is `[]`, and `isReadOnly` is `false`.

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

- On the **root branch**, send a message (e.g. “This is the main thread”)
- Switch to another branch; send a different message
- Switch back to root — only root messages should appear
- Refresh the browser — same active branch and history should reload

**4. Edit branch**

- Select an active branch; change title and/or purpose in the details panel
- Refresh — edits should persist

**5. Close and reopen branch**

- Create a non-root branch, send a message, then close it
- Branch moves to **Closed branches**; UI switches to root; chat input disabled on closed branch
- `GET /api/workspace` should show the branch in `closedBranches`, not in `branches`, with `isReadOnly: false` while on root
- Select the closed branch — history visible, `isReadOnly: true`, read-only banner shown
- Reopen — branch returns to active list; chat works again
- Attempt to close the root branch — should show an error (UI hides Close; API returns 400 with *"The root branch cannot be closed."*)

**6. Closed branch chat blocked (server)**

```powershell
curl -X POST http://localhost:5173/api/chat `
  -H "Content-Type: application/json" `
  -d "{\"projectId\":\"YOUR_PROJECT_ID\",\"branchId\":\"CLOSED_BRANCH_ID\",\"content\":\"test\"}"
```

Expected: `400` with *Cannot send messages to a closed branch.*

**7. Chat + Workers AI**

- Send messages in any **active** branch; confirm assistant replies
- Multi-turn context is scoped to the **current branch only**

**8. Persistence across refresh**

- Select a non-root branch, send messages, refresh
- Confirm you return to that branch with its history (`localStorage`)

**9. D1 row count (optional)**

```powershell
pnpm wrangler d1 execute thought-gene-db --local --command "SELECT branch_id, COUNT(*) AS count FROM messages GROUP BY branch_id;"
```

Each branch with chat activity should have its own row count.

**10. curl chat turn (optional)**

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
| Edit branch title/purpose | Pass (branch-management) |
| Close non-root branch; read-only view | Pass (branch-management) |
| Reopen closed branch | Pass (branch-management) |
| Chat rejected on closed branch (API) | Pass (branch-management) |
| Root branch protected via `parent_branch_id IS NULL` | Pass (branch-management) |

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
│   │   ├── branches.ts      # POST/PATCH /api/branches, close, reopen
│   │   └── chat.ts          # POST /api/chat
│   ├── validation/
│   │   ├── parse-create-branch.ts
│   │   ├── parse-update-branch.ts
│   │   ├── parse-branch-action.ts
│   │   └── parse-chat-request.ts
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
│       ├── branches/        # BranchList, ClosedBranchList, CreateBranchForm, BranchDetailsPanel
│       └── chat/            # Presentational chat UI (readOnly support)
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

### Decision: `GET /api/workspace` bootstrap with branch lists

**Why:** Single endpoint returns project, active and closed branch lists, selected branch, messages, and `isReadOnly` — avoids N+1 fetches for single-project app.

**Alternatives:** Separate `GET /api/branches` and `GET /api/branches/:id/messages`. Deferred until multi-project or heavy branch lists.

### Decision: Split active and closed branches in the API response

**Why:** Active switcher (`branches`) stays uncluttered; closed history is discoverable without mixing lifecycle states in one list.

**Alternatives:** Single list with a `status` filter on the client. Rejected — harder to render distinct UI sections and default sort orders.

### Decision: Root branch via `parent_branch_id IS NULL`

**Why:** Renaming the default branch title should not affect lifecycle rules. Structural root detection matches the data model.

**Alternatives:** Title check for `"Main"`. Rejected — fragile if users rename the root branch.

### Decision: Close without LLM closure packet

**Why:** This milestone covers lifecycle UX and server enforcement only; `closure_summary` stays null until artifact extraction is built.

**Alternatives:** Generate summary on close via Workers AI. Deferred per scope.

### Decision: Read-only enforced in UI and API

**Why:** `isReadOnly` disables chat input and branch creation immediately; `chat-service` rejects non-active branches so direct API calls cannot append messages to closed history.

**Alternatives:** UI-only disable. Rejected — server must be authoritative for persisted data.

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
| No LLM closure packets | `closure_summary` not populated on close |
| `ready_to_close` unused | Branches in this status would not appear in active or closed lists |
| Closed branch metadata edit UI | API allows PATCH on closed branches; UI disables edit when `isReadOnly` |
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

See [Intentionally out of scope](#intentionally-out-of-scope) for deferred items. Additional ideas:
- Create branch from message (`source_message_id`)
- Branch context injection (`context_summary`, parent history seeding)
- Multiple projects UI
- Artifact extraction and project memory
- URL routing for branches
- Streaming and markdown rendering
- Auth and per-user workspaces

---

*Last updated: branch merges on `feature/branch-merges`.*
