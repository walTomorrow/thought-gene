# Thought Gene

Thought Gene is a project workspace for AI-assisted decision making.

Instead of treating conversations as a long chat history, Thought Gene extracts and organizes the important artifacts that emerge from discussions:

* Decisions
* Open questions
* Options
* Risks
* Assumptions
* Deferred implementations
* Staged implementation plans

## The Problem

When working on a complex project with an LLM, important decisions become buried in conversation history.

You might spend an hour discussing:

> How should application data be stored?

Eventually a conclusion is reached:

> Use a simple solution for the MVP and revisit a more robust architecture later.

Weeks later, neither the user nor the LLM remembers:

* Why that decision was made
* What alternatives were considered
* What work was intentionally deferred
* When the decision should be revisited

Thought Gene is designed to preserve this information.

## How It Works

Projects contain conversations.

Conversations can spawn branches focused on a specific question or decision.

Example:

```text
Main Project
├─ Authentication Strategy
├─ Data Storage
├─ API Design
└─ Deployment Architecture
```

A branch remains active while a question is being explored.

When the discussion reaches a conclusion, the branch can be closed.

Closing a branch promotes its outputs into permanent project memory:

* Accepted decisions
* Rejected options
* Open questions
* Deferred implementations
* Summary context

The branch becomes inactive, but its conclusions remain available to the project.

## Example

Branch:

```text
Question:
How should application data be stored?
```

Result:

```text
Decision:
Use Cloudflare D1 for the MVP.

Deferred Implementation:
Cross-device synchronization.

Open Question:
Will users require accounts in v1?
```

These artifacts become part of the project's shared memory.

## Goals

The initial MVP focuses on:

* Branching conversations
* Decision extraction
* Branch closure workflows
* Global decision registry
* Open question tracking
* Deferred implementation tracking
* Exportable context for coding assistants

## Status

Early development. See [docs/implementation.md](docs/implementation.md) for architecture and local setup.

## Local Development

Requires [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/).

```powershell
pnpm install
pnpm wrangler login
```

Set your Cloudflare account ID in `wrangler.toml`:

```toml
account_id = "your_account_id_here"
```

Create the D1 database and apply migrations:

```powershell
pnpm wrangler d1 create thought-gene-db
```

Copy the `database_id` from the output into `wrangler.toml` (replace `REPLACE_WITH_DATABASE_ID`), then:

```powershell
pnpm db:migrate:local
```

Optionally override the AI model:

```powershell
copy .dev.vars.example .dev.vars
```

Start the dev server:

```powershell
pnpm dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`), send a chat message, and confirm you receive an assistant reply. Refresh the page — your conversation should reload from D1.

See [docs/implementation.md](docs/implementation.md) for environment variables, request flow, and testing with curl.