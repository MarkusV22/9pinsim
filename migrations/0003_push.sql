-- Push-Mitteilungen: Abos je Gerät und die eigenen Server-Schlüssel (VAPID, vom Server selbst erzeugt)
CREATE TABLE push_subs (
  endpoint TEXT PRIMARY KEY,
  user_id  TEXT NOT NULL,
  p256dh   TEXT NOT NULL,
  auth     TEXT NOT NULL,
  created  INTEGER NOT NULL
);
CREATE INDEX push_subs_user ON push_subs(user_id);
CREATE TABLE server_keys (
  id   TEXT PRIMARY KEY,
  data TEXT NOT NULL
);
