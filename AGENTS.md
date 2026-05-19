# AGENTS.md

このリポジトリは **Cloudflare Workers** 上で動く **RSS Reader** です（TypeScript / Wrangler / D1 / Vitest）。RSS 購読管理・定期取得（Cron）・正規表現フィルタを提供します。

## Setup commands

- 依存関係のインストール: `npm ci`
- D1 マイグレーション（ローカル）: `npx wrangler d1 migrations apply RSSFILTER_DB --local`
- 開発サーバー起動: `npm run dev`（= `wrangler dev`）
- テスト実行: `npm test`（Vitest）
- リント: `npm run lint`
- リント自動修正: `npm run lint:fix`
- Workers 型生成: `npm run cf-typegen`（Wrangler を上げたあとは `worker-configuration.d.ts` を最新にするため再実行）

## Local development tips

- エントリーポイント: `src/index.ts`（`fetch` + `scheduled`）
- Wrangler 設定: `wrangler.jsonc`
- D1 バインディング: `RSSFILTER_DB`（`migrations/`）
- Cron: 15 分ごと（`*/15 * * * *`）
- Reader UI: `GET /`
- 購読管理: `GET /subscriptions`
- 除外設定: `GET /settings`
- 設定保存 API: `POST /api/settings`
- 手動取得: `POST /api/fetch`（`?subscription_id=` 任意）
- ※本番運用では Cloudflare Access 等で管理系パスを保護推奨

## Testing instructions

- 全テスト: `npm test`
- ウォッチ: `npm test -- --watch`
- 1 テストのみ: `npm test -- -t "<test name>"`

補足:

- テストは `vitest.config.mts` で `@cloudflare/vitest-pool-workers` を使い、Wrangler 設定（`wrangler.jsonc`）を参照します。
- D1 スキーマは `test/apply-migrations.ts` で各テストラン前に適用されます。
- `vitest` は `~4.1.x`（patch のみ）にしている。peer は `^4.1.0` だが、minor を自動で上げすぎないようプール連携を保守的に保つため。
- Vitest 4 / Vite 8 は Node ^20.19 または ^22.12 以上を推奨（CI は Node 22）。

## Code style / conventions

- TypeScript: `strict: true`（`tsconfig.json`）
- フォーマット: Prettier（`.prettierrc`）
  - single quotes（`'`）
  - semicolons あり
  - tabs を使用
- 静的解析: ESLint（`eslint.config.mjs`）
  - 未使用変数は原則エラー（`_` で始まるものは例外）
  - `any` は警告

## CI notes

- GitHub Actions は Node 22 / `npm ci` で実行します。
- `npm run lint:fix` が CI で走り、差分が出ると **自動コミットされます**（`.github/workflows/test.yml`）。
  - 変更時はローカルでも `npm run lint:fix` を先に実行してから進めると安全です。

## Deployment notes

- 初回: `npx wrangler d1 create rssfilter-db` → `database_id` を `wrangler.jsonc` に設定
- 本番マイグレーション: `npx wrangler d1 migrations apply RSSFILTER_DB --remote`
- デプロイ: `npm run deploy`（= `wrangler deploy`）
- 秘密情報はコミットしないこと（Workers の Secret / Cloudflare の設定を利用）
