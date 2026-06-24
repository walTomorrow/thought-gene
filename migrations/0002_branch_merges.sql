CREATE TABLE branch_merges (
  id                  TEXT PRIMARY KEY,
  project_id          TEXT NOT NULL REFERENCES projects(id),
  child_branch_id     TEXT NOT NULL REFERENCES branches(id),
  parent_branch_id    TEXT NOT NULL REFERENCES branches(id),
  merge_sequence      INTEGER NOT NULL,
  status              TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'confirmed', 'discarded')),
  packet_json         TEXT NOT NULL,
  rendered_markdown   TEXT,
  parent_message_id   TEXT REFERENCES messages(id),
  close_child_after   INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  confirmed_at        TEXT
);

CREATE UNIQUE INDEX idx_branch_merges_child_sequence
  ON branch_merges(child_branch_id, merge_sequence);

CREATE UNIQUE INDEX idx_branch_merges_one_draft_per_child
  ON branch_merges(child_branch_id)
  WHERE status = 'draft';

CREATE INDEX idx_branch_merges_parent
  ON branch_merges(parent_branch_id, confirmed_at DESC);

CREATE INDEX idx_branch_merges_child_status
  ON branch_merges(child_branch_id, status);

ALTER TABLE messages ADD COLUMN message_kind TEXT NOT NULL DEFAULT 'chat'
  CHECK (message_kind IN ('chat', 'merge_packet'));

ALTER TABLE messages ADD COLUMN merge_id TEXT REFERENCES branch_merges(id);
