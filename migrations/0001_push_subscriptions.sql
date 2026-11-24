-- Daily reminder subscriptions (Web Push). No child data: only the browser's push endpoint + keys,
-- the chosen local reminder time, time zone and UI language.
CREATE TABLE subscriptions (
  endpoint      TEXT PRIMARY KEY,
  p256dh        TEXT NOT NULL,
  auth          TEXT NOT NULL,
  remind_at     TEXT NOT NULL,          -- local "HH:MM"
  tz            TEXT NOT NULL,          -- IANA time zone, e.g. Asia/Ho_Chi_Minh
  lang          TEXT NOT NULL DEFAULT 'vi',
  last_sent_day TEXT,                   -- local "YYYY-MM-DD" of the last daily reminder
  last_test_at  INTEGER,                -- ms; "send test" rate limit
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
