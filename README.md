# RSS Reader (rssfilter)

Cloudflare Workers + D1 で動くスタンドアロン RSS Reader です。フィードの購読管理・定期取得（Cron）・正規表現によるエントリー除外を行います。

## 機能

- **購読管理**: フィード URL の追加・削除・有効/無効切り替え（`/subscriptions`）
- **定期取得**: Cron（15 分ごと）で有効な購読を上流から取得
- **フィルタリング**: タイトル・リンクの正規表現で除外し、通過した記事のみ D1 に保存
- **Reader UI**: 保存済み記事の一覧（`/`）
- **除外設定**: グローバル / サイト（hostname）別のパターン（`/settings`）

### 対応フォーマット

- RSS 2.0 / RSS 1.0 / Atom（XML）
- JSON Feed

## クイックスタート

```bash
git clone <repository-url>
cd rssfilter
npm ci

# D1（初回のみ: wrangler.jsonc の database_id を自分の ID に差し替え）
npx wrangler d1 create rssfilter-db
npx wrangler d1 migrations apply RSSFILTER_DB --local

npm run dev
```

ブラウザで `http://localhost:8787/` を開き、購読を追加してください。初回取得は追加直後にバックグラウンドで実行されます。手動取得は `POST /api/fetch` または購読画面の「今すぐ取得」から行えます。

## API

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/` | Reader UI |
| GET | `/subscriptions` | 購読管理 UI |
| GET | `/settings` | 除外設定 UI |
| GET | `/api/subscriptions` | 購読一覧 |
| POST | `/api/subscriptions` | 購読追加 `{ "feed_url": "..." }` |
| PATCH | `/api/subscriptions/:id` | `{ "enabled": true }` 等 |
| DELETE | `/api/subscriptions/:id` | 購読削除 |
| GET | `/api/items?limit=&offset=&subscription_id=` | 記事一覧 |
| POST | `/api/settings` | 除外設定保存 |
| POST | `/api/fetch` | 手動取得（`?subscription_id=` 任意） |

### Breaking change

- **`GET /get?site=` は廃止**しました（旧プロキシ型フィルタ URL は利用できません）。
- **Cloudflare KV** は使用しません。設定・購読・記事はすべて **D1** に保存します。

## 除外設定

`/settings` または `POST /api/settings` で JSON を保存します。

```json
{
  "global": {
    "title": ["^PR:", "【広告】"],
    "link": []
  },
  "sites": {
    "example.com": {
      "title": ["サイト固有"],
      "link": ["track\\."]
    }
  }
}
```

- `global` は全フィードに適用
- `sites` のキーはフィード URL の **hostname**
- サイト固有パターンはグローバルに **追加**（マージ）されます

## デプロイ

```bash
npx wrangler login
npx wrangler d1 migrations apply RSSFILTER_DB --remote
npm run deploy
```

`wrangler.jsonc` の `database_id` を本番用 D1 の ID に更新してからデプロイしてください。

### アクセス制限（推奨）

管理画面・API は認証なしで変更可能です。本番では **Cloudflare Access (Zero Trust)** 等で `/api/*`・`/settings`・`/subscriptions` を保護することを推奨します。

## 開発

```bash
npm test
npm run lint
npm run lint:fix
npm run cf-typegen
```

テストは Node 20.19+ または 22.12+ を推奨します（Vitest 4 / Vite 8）。

## アーキテクチャ

```
src/
  index.ts           # ルーティング・scheduled
  config.ts          # 除外設定型
  config_store.ts    # D1 app_config
  exclude.ts         # 除外判定
  feed_parser.ts     # RSS/Atom/JSON パース
  fetch_job.ts       # 上流取得・フィルタ・保存
  rss.ts             # XML フィルタ（filterRss）
  db/                # D1 アクセス
  templates/         # Pico.css UI
migrations/          # D1 スキーマ
```

## ライセンス

[MIT License](LICENSE)
