CREATE TABLE projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  summary     TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE branches (
  id                TEXT PRIMARY KEY,
  project_id        TEXT NOT NULL REFERENCES projects(id),
  parent_branch_id  TEXT REFERENCES branches(id),
  source_message_id TEXT,
  title             TEXT NOT NULL,
  purpose           TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'ready_to_close', 'closed')),
  context_summary   TEXT,
  closure_summary   TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  closed_at         TEXT
);

CREATE INDEX idx_branches_project_id ON branches(project_id);

CREATE TABLE messages (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id),
  branch_id   TEXT NOT NULL REFERENCES branches(id),
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content     TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE INDEX idx_messages_branch_created ON messages(branch_id, created_at);
