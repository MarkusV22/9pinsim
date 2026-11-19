-- Konten, Anmeldungen und ein einfacher Dokumentspeicher (wie die Claude-Datenbank des Prototyps)
CREATE TABLE users (
  id       TEXT PRIMARY KEY,
  nick     TEXT NOT NULL DEFAULT 'Spieler',   -- Anzeigename (Spielername)
  login    TEXT UNIQUE,                       -- Anmeldename (klein), NULL = Gastkonto
  pass     TEXT,                              -- PBKDF2-Hash (hex)
  salt     TEXT,
  created  INTEGER NOT NULL
);
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  created    INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE TABLE docs (
  path    TEXT PRIMARY KEY,   -- z. B. coop/K7M2QX/m/u123
  parent  TEXT NOT NULL,      -- Sammlung, z. B. coop/K7M2QX/m
  id      TEXT NOT NULL,      -- letzter Teil
  data    TEXT NOT NULL,      -- JSON
  by      TEXT,
  updated INTEGER NOT NULL
);
CREATE INDEX docs_parent ON docs(parent);
