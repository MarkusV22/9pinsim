-- Google-Anmeldung: Konto mit Google-Konto verbinden
ALTER TABLE users ADD COLUMN google_sub TEXT;
ALTER TABLE users ADD COLUMN email TEXT;
CREATE UNIQUE INDEX users_google ON users(google_sub);
CREATE TABLE oauth_state (
  state   TEXT PRIMARY KEY,
  user_id TEXT,
  created INTEGER NOT NULL
);
