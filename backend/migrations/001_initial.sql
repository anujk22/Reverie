CREATE TABLE students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  started_at TEXT NOT NULL,
  ended_at TEXT,
  title TEXT,
  dream_completed INTEGER DEFAULT 0
);

CREATE TABLE utterances (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  role TEXT NOT NULL CHECK(role IN ('student','tutor')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  seq INTEGER NOT NULL
);

CREATE TABLE engrams (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  type TEXT NOT NULL CHECK(type IN ('misconception','mastery','preference','affect','goal','fact','strategy_outcome')),
  content TEXT NOT NULL,
  subject_tags TEXT NOT NULL DEFAULT '[]',
  confidence REAL NOT NULL,
  importance REAL NOT NULL,
  strength REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','superseded','archived')),
  provisional INTEGER NOT NULL DEFAULT 1,
  superseded_by TEXT REFERENCES engrams(id),
  created_at TEXT NOT NULL,
  last_accessed_at TEXT NOT NULL,
  access_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE engram_sources (
  engram_id TEXT NOT NULL REFERENCES engrams(id),
  utterance_id TEXT NOT NULL REFERENCES utterances(id),
  PRIMARY KEY (engram_id, utterance_id)
);

CREATE TABLE memory_events (
  id TEXT PRIMARY KEY,
  engram_id TEXT REFERENCES engrams(id),
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  session_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_events_created ON memory_events(created_at);

CREATE TABLE dream_reports (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  stats_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE llm_calls (
  id TEXT PRIMARY KEY,
  purpose TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  latency_ms INTEGER,
  session_id TEXT,
  created_at TEXT NOT NULL,
  error TEXT
);

CREATE TABLE app_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE engram_vectors (
  engram_id TEXT PRIMARY KEY REFERENCES engrams(id),
  embedding_json TEXT NOT NULL
);
