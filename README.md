# RSS Filter

RSS/Atomフィードを取得し、設定された正規表現に基づいて不要なエントリーを自動的に除外するCloudflare Workersアプリケーションです。

## ✨ 機能

- **RSS/Atomフィードの取得**: `/get?site=URL` エンドポイントで指定したURLのフィードを取得
- **自動フィルタリング**: タイトルやリンクURLに正規表現パターンがマッチするエントリーを自動除外
- **構造保持**: XMLの構造（ネームスペース、CDATA、属性など）を完全に保持したままフィルタリング
- **複数フォーマット対応**: RSS 2.0、RSS 1.0、Atom の各形式に対応
- **安全な処理**: XXE攻撃対策、サイズ制限、エラーハンドリングを実装
- **動的設定管理**: Cloudflare KV を使用した設定の永続化と動的更新
- **サイトごとの個別設定**: グローバル設定に加え、サイト固有の除外パターンを設定可能
- **Web UI**: ブラウザから直感的に設定を編集できる管理画面（`/settings`）
- **設定のバリデーション**: 正規表現パターンの妥当性チェック

## 🚀 クイックスタート

### 前提条件

- Node.js 18以上
- npm または yarn
- Cloudflare アカウント（デプロイ時）

### セットアップ

```bash
# リポジトリをクローン
git clone <repository-url>
cd rssfilter

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

開発サーバーは `http://localhost:8787` で起動します。

## 📝 設定

### 設定方法

このアプリケーションでは、Cloudflare KV を使用して設定を動的に管理します。設定は以下の2つの方法で変更できます：

1. **Web UI を使用（推奨）**: `/settings` エンドポイントにブラウザでアクセスし、フォームから設定を編集
2. **API を使用**: `/api/settings` エンドポイントにPOSTリクエストを送信

### 設定構造

設定は以下のJSON構造を持ちます：

```json
{
  "global": {
    "title": ["正規表現パターン1", "正規表現パターン2"],
    "link": ["URLパターン1", "URLパターン2"]
  },
  "sites": {
    "example.com": {
      "title": ["サイト固有のパターン"],
      "link": ["サイト固有のURLパターン"]
    }
  }
}
```

- **`global`**: すべてのサイトに適用されるグローバル設定
- **`sites`**: サイトごとの個別設定（ホスト名をキーとして指定）

サイト固有の設定が存在する場合、グローバル設定とサイト固有の設定がマージされて適用されます。

### Web UI での設定

デプロイ済みのWorkerの `/settings` エンドポイント（例: `https://your-worker.your-account.workers.dev/settings`）にブラウザでアクセスしてください。

### デフォルト設定

KVに設定が存在しない場合は、空のデフォルト設定（フィルタリングなし）が使用されます。

### 正規表現の書き方

- 文字列リテラルとして記述します（`/pattern/` ではなく `'pattern'`）
- 大文字小文字は区別されません（`i` フラグが自動適用されます）
- 特殊文字（`.` など）はエスケープが必要です（例: `\\.`）
- 無効な正規表現パターンは保存時にバリデーションエラーになります

## 🔌 使い方

### APIエンドポイント

#### RSSフィード取得・フィルタリング

```
GET /get?site=<RSSフィードのURL>
```

**例:**

```bash
# RSSフィードを取得してフィルタリング
curl "http://localhost:8787/get?site=https://example.com/feed.xml"

# 実際のRSSフィードで試す
curl "http://localhost:8787/get?site=https://www.w3.org/2005/Atom"
```

**レスポンス:**
- **成功時 (200)**: フィルタリング済みのRSS/Atomフィード（XML形式）
- **エラー時**:
  - `400`: `site` パラメータが不足、または無効なURL形式
  - `415`: サポートされていないContent-Type（XML/JSON系以外）
  - `500`: サーバーエラー

#### 設定管理画面

```
GET /settings
```

ブラウザから設定を編集できるWeb UIを表示します。

#### 設定保存API

```
POST /api/settings
```

Content-Type: `application/json`

**リクエストボディ:**
```json
{
  "global": {
    "title": ["^PR:", "【広告】"],
    "link": ["ad\\.example\\.com"]
  },
  "sites": {
    "example.com": {
      "title": ["サイト固有のパターン"],
      "link": ["site-specific\\.com"]
    }
  }
}
```

**レスポンス:**
- **成功時 (200)**: `{"success": true}`
- **エラー時 (400/500)**: `{"error": "エラーメッセージ"}`

### サポートされるContent-Type

- `application/rss+xml`
- `application/atom+xml`
- `application/xml`
- `text/xml`
- `application/json`
- `application/feed+json`

## 🛠️ 開発

### 開発環境（Dev Container）

このプロジェクトは Dev Container に対応しています。VS Code を使用している場合、以下の手順で環境構築を自動化できます。

1. コマンドパレット（\`Ctrl+Shift+P\` / \`Cmd+Shift+P\`）を開く
2. "Dev Containers: Reopen in Container" を選択

これにより、Node.js (LTS)、Wrangler、および推奨されるVS Code拡張機能が事前インストールされた環境が起動します。

### 開発サーバーの起動

```bash
npm run dev
```

### テストの実行

```bash
# 全テストを実行
npm test

# ウォッチモードで実行
npm test -- --watch
```

### 型定義の生成

Cloudflare Workersの型定義を生成する場合：

```bash
npm run cf-typegen
```

### リントとフォーマット

コードの静的解析とフォーマットを行う場合：

```bash
# リント実行
npm run lint

# リント自動修正
npm run lint:fix
```

## 📦 デプロイ

### KVネームスペースの作成

このアプリケーションは設定の保存にCloudflare KVを使用します。デプロイ前に自身のCloudflareアカウントでKVネームスペースを作成する必要があります。

1. **本番用KVの作成**:
   ```bash
   npx wrangler kv:namespace create RSSFILTER_CONFIG
   ```

2. **プレビュー用KVの作成**（推奨）:
   ```bash
   npx wrangler kv:namespace create RSSFILTER_CONFIG --preview
   ```

3. **`wrangler.jsonc` の更新**:
   コマンドの出力結果（ID）を `wrangler.jsonc` に設定してください。

   ```jsonc
   	"kv_namespaces": [
   		{
   			"binding": "RSSFILTER_CONFIG",
   			"id": "ここに本番用IDを設定",
   			"preview_id": "ここにプレビュー用IDを設定"
   		}
   	]
   ```

### Cloudflare Workersへのデプロイ

```bash
# デプロイ前にログイン
npx wrangler login

# デプロイ実行
npm run deploy
```

### 環境変数の設定

必要に応じて、`wrangler.jsonc` で環境変数やバインディングを設定できます。

### アクセス制限（推奨）

管理画面（`/settings`）および設定API（`/api/settings`）は、認証なしでアクセスできる状態では第三者に設定を書き換えられるリスクがあります。
本番環境で運用する際は、**Cloudflare Access (Zero Trust)** を使用して、`/get` 以外のパスへのアクセスを制限することを強く推奨します。

**推奨設定例:**
- **対象**: `your-worker.workers.dev/*`
- **ポリシー**:
  - Path が `/get` で始まる場合: **Bypass** (誰でもアクセス可能)
  - それ以外: **Allow** (メール認証や特定のIPアドレスのみ許可)

## 🏗️ アーキテクチャ

### ディレクトリ構造

```
rssfilter/
├── src/
│   ├── index.ts                    # メインエントリーポイント（/get, /settings, /api/settings エンドポイント）
│   ├── config.ts                   # 設定のバリデーションとコンパイル
│   ├── config_store.ts             # KVストレージを使った設定管理
│   ├── rss.ts                      # RSS/Atomのパース・フィルタ・ビルド処理
│   └── LICENSE                     # ライセンスファイル
├── test/
│   ├── index.spec.ts               # エンドポイントのテスト
│   ├── rss.spec.ts                 # フィルタリングロジックのテスト
│   ├── config.spec.ts              # 設定バリデーションのテスト
│   └── tsconfig.json               # テスト用TypeScript設定
├── package.json
├── tsconfig.json
├── vitest.config.mts
├── wrangler.jsonc
├── eslint.config.mjs
└── worker-configuration.d.ts
```

### 技術スタック

- **Runtime**: Cloudflare Workers
- **Language**: TypeScript
- **XML Parsing**: [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser) v5
- **Storage**: Cloudflare KV (設定の永続化)
- **Testing**: Vitest + @cloudflare/vitest-pool-workers
- **Build Tool**: Wrangler
- **UI Framework**: Pico.css (設定画面用)

### フィルタリングの仕組み

1. **設定読み込み**: Cloudflare KV からサイトごとの設定を取得（グローバル設定 + サイト固有設定のマージ）
2. **パース**: `fast-xml-parser` の `preserveOrder: true` モードでXMLを解析
3. **抽出**: RSS/Atomの各エントリーから `title` と `link` を抽出
4. **判定**: 読み込んだ設定の正規表現パターンと照合
5. **除外**: マッチしたエントリーを削除
6. **再構築**: フィルタリング後の構造をXML文字列として再構築

### セキュリティ機能

- **XXE対策**: `processEntities: false` でエンティティ展開を無効化
- **サイズ制限**: 5MBを超えるレスポンスはフィルタリングをスキップ（メモリ保護）
- **エラーハンドリング**: パースエラー時は元のコンテンツをそのまま返す（Fail Open）
- **設定バリデーション**: 正規表現パターンの妥当性を保存時に検証

## 🧪 テスト

### テストカバレッジ

- RSS 2.0 / RSS 1.0 / Atom の各形式
- タイトル・リンク個別のフィルタリング
- XML構造の保持（ネームスペース、CDATA、属性）
- エッジケース（空データ、非XML、巨大ファイル）
- 設定バリデーション

### テストの実行

```bash
npm test
```

## 📚 参考資料

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [fast-xml-parser Documentation](https://github.com/NaturalIntelligence/fast-xml-parser)
- [RSS 2.0 Specification](https://www.rssboard.org/rss-specification)
- [Atom Syndication Format](https://www.rfc-editor.org/rfc/rfc4287)

## 🤝 コントリビューション

プルリクエストやイシューの報告を歓迎します。大きな変更を行う場合は、事前にイシューで議論してください。

## 📄 ライセンス

このプロジェクトは [MIT License](LICENSE) の下で公開されています。

---

**注意**: このアプリケーションは設定された正規表現に基づいてエントリーを除外します。設定を変更した場合は、デプロイが必要です。

