-- 除外設定（旧 KV Config と同等構造を JSON で 1 行保持）
CREATE TABLE app_config (
  id TEXT PRIMARY KEY CHECK (id = 'config'),
  body TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  feed_url TEXT NOT NULL UNIQUE,
  title TEXT,
  site_hostname TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  etag TEXT,
  last_modified TEXT,
  last_fetched_at INTEGER,
  last_error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE feed_items (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  title TEXT,
  link TEXT,
  guid TEXT,
  published_at INTEGER,
  summary TEXT,
  fetched_at INTEGER NOT NULL,
  UNIQUE(subscription_id, guid)
);

CREATE INDEX idx_feed_items_subscription_published
  ON feed_items(subscription_id, published_at DESC);
CREATE INDEX idx_subscriptions_enabled ON subscriptions(enabled);
