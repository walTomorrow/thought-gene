CREATE TABLE artifacts (
  id                    TEXT PRIMARY KEY,
  project_id            TEXT NOT NULL REFERENCES projects(id),
  type                  TEXT NOT NULL
                        CHECK (type IN (
                          'decision',
                          'requirement',
                          'open_question',
                          'deferred_work',
                          'future_goal'
                        )),
  status                TEXT NOT NULL DEFAULT 'suggested'
                        CHECK (status IN (
                          'suggested',
                          'accepted',
                          'resolved',
                          'deferred',
                          'superseded',
                          'dropped'
                        )),
  title                 TEXT NOT NULL,
  body                  TEXT NOT NULL DEFAULT '',
  reasoning             TEXT,
  assumptions_json      TEXT,
  risks_json            TEXT,
  constraints_json      TEXT,
  rejected_options_json TEXT,
  source_branch_id      TEXT REFERENCES branches(id),
  source_merge_id       TEXT REFERENCES branch_merges(id),
  source_message_id     TEXT REFERENCES messages(id),
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL
);

CREATE INDEX idx_artifacts_project_updated
  ON artifacts(project_id, updated_at DESC);

CREATE INDEX idx_artifacts_project_type_status
  ON artifacts(project_id, type, status);

CREATE INDEX idx_artifacts_source_branch
  ON artifacts(source_branch_id, updated_at DESC);

CREATE INDEX idx_artifacts_source_merge
  ON artifacts(source_merge_id);
