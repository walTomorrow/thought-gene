# Branch Merges

This document specifies the branch merge packet feature on `feature/branch-merges`.

## Purpose

A child branch explores a topic in detail. **Merge to parent** produces a parent-facing packet so the parent branch can continue without rereading the child conversation.

Merge is an **upstream handoff** into the parent chat. It is separate from **close branch** (archival).

## User workflow

1. On an active child branch, click **Merge to parent**.
2. If a draft exists, choose to open it or replace it with a new generated packet.
3. Server gathers child + parent context and calls Workers AI.
4. User reviews and edits the structured packet in a modal.
5. User confirms merge (optional: close child branch afterward).
6. Server inserts a visible **merge packet** message into the parent branch.
7. UI switches to the parent branch and highlights the new message.

No LLM acknowledgement is posted to the parent after confirm.

## API routes

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/branches/:childBranchId/merges?projectId=` | Merge history + active draft |
| `POST` | `/api/branches/:childBranchId/merges/generate` | Generate draft packet (`replaceDraft?`) |
| `PATCH` | `/api/branches/:childBranchId/merges/:mergeId` | Save edited draft |
| `POST` | `/api/branches/:childBranchId/merges/:mergeId/confirm` | Confirm merge (`closeChildAfter?`) |
| `DELETE` | `/api/branches/:childBranchId/merges/:mergeId?projectId=` | Discard draft |

## Database

Migration: `migrations/0002_branch_merges.sql`

- `branch_merges` — draft / confirmed / discarded lifecycle, one draft per child (partial unique index)
- `messages.message_kind` — `chat` \| `merge_packet`
- `messages.merge_id` — link to `branch_merges`

## Packet shape

Types: `shared/merge.ts`. Rendered markdown: `shared/render-merge-packet.ts`.

Sections: executive summary, decisions, implementation details, assumptions, open questions, deferred work, risks, next steps, optional rejected options, parent continuity note.

## Rules

- Root branch cannot merge (`parent_branch_id IS NULL`).
- Only **active** child branches can generate/confirm merges.
- Cannot merge into a **closed** parent.
- Multiple confirmed merges per child are allowed (sequenced).
- Warning if no new child messages since last confirmed merge.
- Artifacts and project memory dashboard are **out of scope**.

## Code layout

| Layer | Path |
|-------|------|
| Types | `shared/merge.ts`, `shared/render-merge-packet.ts` |
| Routes | `worker/src/routes/merges.ts` |
| Service | `worker/src/services/merge-service.ts`, `merge-context.ts` |
| DB | `worker/src/db/branch-merges.ts` |
| AI | `worker/src/ai/run-merge-packet.ts` |
| UI | `MergeReviewModal`, `MergeHistoryList`, merge packet `MessageBubble` |
