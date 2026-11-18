-- Up Migration

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_lowercase CHECK (email = LOWER(email))
);

CREATE UNIQUE INDEX users_email_unique ON users (email);

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE workspaces (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  owner_id    INTEGER      NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX workspaces_owner_id_idx ON workspaces (owner_id);

CREATE TRIGGER workspaces_set_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE workspace_members (
  workspace_id INTEGER     NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  user_id      INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role         VARCHAR(10) NOT NULL DEFAULT 'MEMBER',
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id),
  CONSTRAINT workspace_members_role_check CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER'))
);

CREATE INDEX workspace_members_user_id_idx ON workspace_members (user_id);

CREATE TABLE projects (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id INTEGER      NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL,
  description  TEXT,
  created_by   INTEGER      REFERENCES users (id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX projects_workspace_id_idx ON projects (workspace_id);

CREATE TRIGGER projects_set_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE tasks (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id  INTEGER      NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  description TEXT,
  status      VARCHAR(20)  NOT NULL DEFAULT 'TODO',
  assignee_id INTEGER      REFERENCES users (id) ON DELETE SET NULL,
  created_by  INTEGER      REFERENCES users (id) ON DELETE SET NULL,
  due_date    DATE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT tasks_status_check CHECK (status IN ('TODO', 'IN_PROGRESS', 'DONE')),
  CONSTRAINT tasks_title_not_blank CHECK (LENGTH(TRIM(title)) > 0)
);

CREATE INDEX tasks_project_id_status_idx ON tasks (project_id, status);
CREATE INDEX tasks_project_id_due_date_idx ON tasks (project_id, due_date);
CREATE INDEX tasks_assignee_id_idx ON tasks (assignee_id);

CREATE TRIGGER tasks_set_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE task_comments (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task_id    INTEGER     NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  user_id    INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT task_comments_content_not_blank CHECK (LENGTH(TRIM(content)) > 0)
);

CREATE INDEX task_comments_task_id_created_at_idx ON task_comments (task_id, created_at);

CREATE TRIGGER task_comments_set_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE activity_logs (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id INTEGER     NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  task_id    INTEGER     REFERENCES tasks (id) ON DELETE SET NULL,
  user_id    INTEGER     REFERENCES users (id) ON DELETE SET NULL,
  action     VARCHAR(50) NOT NULL,
  changes    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX activity_logs_task_id_created_at_idx ON activity_logs (task_id, created_at);
CREATE INDEX activity_logs_project_id_created_at_idx ON activity_logs (project_id, created_at);

-- Down Migration

DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS task_comments;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS workspace_members;
DROP TABLE IF EXISTS workspaces;
DROP TABLE IF EXISTS users;
DROP FUNCTION IF EXISTS set_updated_at();
