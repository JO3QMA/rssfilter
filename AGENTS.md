# AGENTS.md

このリポジトリは **Cloudflare Workers** 上で動く RSS/Atom フィードフィルタです（TypeScript / Wrangler / KV / Vitest）。

## Setup commands

- 依存関係のインストール: `npm ci`
- 開発サーバー起動: `npm run dev`（= `wrangler dev`）
- テスト実行: `npm test`（Vitest）
- リント: `npm run lint`
- リント自動修正: `npm run lint:fix`
- Workers 型生成: `npm run cf-typegen`（Wrangler を上げたあとは `worker-configuration.d.ts` を最新にするため再実行）

## Local development tips

- エントリーポイント: `src/index.ts`
- Wrangler 設定: `wrangler.jsonc`
- KV バインディング: `RSSFILTER_CONFIG`
- 管理画面: `GET /settings`
- フィード取得: `GET /get?site=<URL>`
- 設定保存 API: `POST /api/settings`（※本番運用では Cloudflare Access 等で `/get` 以外を保護推奨）

## Testing instructions

- 全テスト: `npm test`
- ウォッチ: `npm test -- --watch`
- 1 テストのみ: `npm test -- -t "<test name>"`

補足:

- テストは `vitest.config.mts` で `@cloudflare/vitest-pool-workers` を使い、Wrangler 設定（`wrangler.jsonc`）を参照します。
- `vitest` は `~4.1.x`（patch のみ）にしている。peer は `^4.1.0` だが、minor を自動で上げすぎないようプール連携を保守的に保つため。

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

- GitHub Actions は Node 22 / `npm ci` で実行します（Vitest 4 が引き込む Vite 8 の `engines` が Node ^20.19 または ^22.12 以上を要求するため）。
- `npm run lint:fix` が CI で走り、差分が出ると **自動コミットされます**（`.github/workflows/test.yml`）。
  - 変更時はローカルでも `npm run lint:fix` を先に実行してから進めると安全です。

## Deployment notes

- デプロイ: `npm run deploy`（= `wrangler deploy`）
- 秘密情報はコミットしないこと（Workers の Secret / Cloudflare の設定を利用）
