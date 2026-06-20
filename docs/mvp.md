# MVP

This document defines the minimum viable product for Thought Gene.

The MVP is not a general-purpose ChatGPT clone.

The MVP is a project workspace where conversation branches can be turned into durable project memory.

## Core Product Loop

The MVP should prove one loop:

```text
Create Project
→ Start Main Chat
→ Create Branch
→ Explore Branch
→ Close Branch
→ Review Extracted Artifacts
→ Promote Artifacts to Project Memory
```

The product succeeds if a user can have a messy AI conversation, close a branch, and receive a useful structured record of what was decided, what remains open, and what should happen later.

## Primary User Experience

A user should be able to:

1. Create a new project.
2. Begin chatting in the main project conversation.
3. Create a branch from the current conversation or a specific message.
4. Use the branch to focus on a specific question, design choice, or implementation concern.
5. Close the branch when the discussion has reached a useful stopping point.
6. Review a generated closure packet.
7. Approve, edit, or discard extracted artifacts.
8. See approved artifacts in global project memory.

## Required MVP Features

### Projects

A project is the top-level container for all work.

A project contains:

* Main conversation
* Branches
* Messages
* Decisions
* Open questions
* Deferred implementations
* Next steps
* Risks and assumptions

A new project should automatically create a main branch.

### Chat Interface

The MVP requires a normal chatbot interface.

The interface should support:

* User messages
* Assistant messages
* Message history
* Loading state
* Basic markdown rendering
* Model response streaming if practical

The chat interface is the primary way the user works with Thought Gene.

### Branches

A branch is a focused conversational workspace.

Branches should include:

* Title
* Purpose
* Status
* Parent branch
* Source message, if created from a message
* Conversation messages
* Closure summary, if closed

Branch statuses:

* `active`
* `ready_to_close`
* `closed`

A branch should not simply be treated as another independent chat. It should have a purpose and lifecycle.

### Branch Creation

The user should be able to create a branch from:

* The current conversation
* A specific message
* A manually entered question or topic

When a branch is created, the system should suggest:

* Branch title
* Branch purpose
* Initial context summary

The user can edit these before creating the branch.

### Branch Context

A new branch should receive enough context to be useful without copying unnecessary history forever.

Initial branch context should include:

* Project summary
* Parent branch summary
* Relevant recent messages
* Branch purpose

For the MVP, this context can be simple and deterministic.

Advanced retrieval is not required yet.

### Branch Closure

Branch closure is the central MVP feature.

The user should be able to click:

```text
Close Branch
```

The system should then generate a closure packet.

A closure packet should include:

* Branch summary
* Accepted decisions
* Open questions
* Deferred implementations
* Next steps
* Risks
* Assumptions

The user must review the closure packet before it becomes project memory.

### Closure Review

The closure review UI should allow the user to:

* Accept artifacts
* Edit artifacts
* Delete artifacts
* Change artifact type
* Change artifact status

The system should never silently make permanent project-memory changes without user approval.

### Project Memory

Approved closure artifacts are promoted into global project memory.

The MVP should include a project memory dashboard with sections for:

* Decisions
* Open Questions
* Deferred Implementations
* Next Steps
* Risks
* Assumptions
* Closed Branches

Closed branches should be hidden from the active branch list but remain accessible from history.

### Artifacts

An artifact is a structured piece of project memory.

MVP artifact types:

* `decision`
* `open_question`
* `deferred_implementation`
* `next_step`
* `risk`
* `assumption`

Each artifact should include:

* Title
* Body
* Type
* Status
* Source branch
* Source message, if available
* Created date
* Updated date

Suggested artifact statuses:

* `proposed`
* `accepted`
* `open`
* `deferred`
* `resolved`
* `superseded`

The exact status set may be simplified during implementation.

## Non-Goals

The MVP should not include:

* GitHub integration
* Issue creation
* Milestone creation
* RAG
* Vector search
* Web search
* Multi-agent workflows
* Multi-user collaboration
* Real-time collaboration
* Billing
* Public sharing
* Complex graph visualization
* Automatic branch closure
* Advanced conflict detection

These are important future capabilities, but they are not required to validate the core product loop.

## Design Constraints

### Keep the UI Conversational

The interface should feel like a chatbot first.

Project memory should support the conversation, not overwhelm it.

The user should not feel like they are filling out a project management database.

### AI Suggests, User Approves

The AI can suggest structure.

The user decides what becomes canonical project memory.

This is especially important for decisions.

### Branches Should End

Branches are not meant to live forever.

A successful branch should produce useful artifacts and then close.

### Closed Does Not Mean Forgotten

Closing a branch hides it from active work, but preserves:

* Summary
* Artifacts
* Source messages
* Traceability

### Avoid Overbuilding

The first version should optimize for clarity, not completeness.

A rough but useful closure packet is more important than a sophisticated branching graph.

## Suggested Data Model

### Project

```ts
type Project = {
  id: string;
  name: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
};
```

### Branch

```ts
type Branch = {
  id: string;
  projectId: string;
  parentBranchId?: string;
  sourceMessageId?: string;
  title: string;
  purpose: string;
  status: "active" | "ready_to_close" | "closed";
  contextSummary?: string;
  closureSummary?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
};
```

### Message

```ts
type Message = {
  id: string;
  projectId: string;
  branchId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};
```

### Artifact

```ts
type Artifact = {
  id: string;
  projectId: string;
  sourceBranchId: string;
  sourceMessageId?: string;
  type:
    | "decision"
    | "open_question"
    | "deferred_implementation"
    | "next_step"
    | "risk"
    | "assumption";
  status: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};
```

### Closure Packet

```ts
type ClosurePacket = {
  branchId: string;
  summary: string;
  artifacts: ArtifactDraft[];
};

type ArtifactDraft = {
  type:
    | "decision"
    | "open_question"
    | "deferred_implementation"
    | "next_step"
    | "risk"
    | "assumption";
  status: string;
  title: string;
  body: string;
};
```

## Suggested Technical Stack

Initial implementation can use:

* React or Next.js for the frontend
* Cloudflare Workers for API routes
* Cloudflare D1 for relational storage
* OpenAI or Anthropic API for chat and extraction
* Cloudflare Pages for deployment

Cloudflare Durable Objects, Vectorize, Queues, R2, and GitHub integration can be added later if needed.

## LLM Responsibilities

The MVP needs two LLM behaviors.

### Chat Response

Generate normal assistant replies within the current branch.

The assistant should be aware of:

* Project summary
* Current branch purpose
* Recent branch messages
* Relevant approved project artifacts

### Closure Extraction

Generate a structured closure packet when the user closes a branch.

The closure extractor should identify:

* What was decided
* What remains unresolved
* What should be done next
* What was deferred
* What risks or assumptions were introduced

The extractor should not invent decisions. If the branch did not reach a conclusion, it should say so.

## MVP Success Criteria

The MVP is successful if a user can:

* Create a project
* Have a useful AI conversation
* Create a focused branch
* Close that branch
* Review extracted decisions and open questions
* Promote approved artifacts into project memory
* Return later and understand what was decided without rereading the full conversation

The strongest success signal is:

> The user trusts the project memory more than the raw chat history.

## Future Capabilities

After the MVP works, future work may include:

* RAG over project memory
* Web search
* Hierarchical context summarization
* Agent context export
* Cursor context bundles
* GitHub issue and milestone generation
* Decision health monitoring
* Artifact relationship graphs
* Multi-agent collaboration
* External documentation sync