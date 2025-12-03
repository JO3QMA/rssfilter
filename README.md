# RSS Filter

RSS/Atomフィードを取得し、設定された正規表現に基づいて不要なエントリーを自動的に除外するCloudflare Workersアプリケーションです。

## ✨ 機能

- **RSS/Atomフィードの取得**: `/get?site=URL` エンドポイントで指定したURLのフィードを取得
- **自動フィルタリング**: タイトルやリンクURLに正規表現パターンがマッチするエントリーを自動除外
- **構造保持**: XMLの構造（ネームスペース、CDATA、属性など）を完全に保持したままフィルタリング
- **複数フォーマット対応**: RSS 2.0、RSS 1.0、Atom の各形式に対応
- **安全な処理**: XXE攻撃対策、サイズ制限、エラーハンドリングを実装

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

フィルタリングの除外パターンは `src/exclude_config.ts` で設定します。

```typescript
export const excludeConfig = {
	// タイトルに対する除外パターン
	title: [
		'^PR:',           // "PR:" で始まるタイトルを除外
		'【広告】',        // "【広告】" を含むタイトルを除外
		'職員を募集します', // 完全一致
	],
	// リンクURLに対する除外パターン
	link: [
		'ad\\.example\\.com', // "ad.example.com" を含むURLを除外
		'/spam/',            // "/spam/" を含むURLを除外
	]
};
```

### 正規表現の書き方

- 文字列リテラルとして記述します（`/pattern/` ではなく `'pattern'`）
- 大文字小文字は区別されません（`i` フラグが自動適用されます）
- 特殊文字（`.` など）はエスケープが必要です（例: `\\.`）

## 🔌 使い方

### APIエンドポイント

```
GET /get?site=<RSSフィードのURL>
```

### 例

```bash
# RSSフィードを取得してフィルタリング
curl "http://localhost:8787/get?site=https://example.com/feed.xml"

# 実際のRSSフィードで試す
curl "http://localhost:8787/get?site=https://www.w3.org/2005/Atom"
```

### レスポンス

- **成功時 (200)**: フィルタリング済みのRSS/Atomフィード（XML形式）
- **エラー時**:
  - `400`: `site` パラメータが不足、または無効なURL形式
  - `415`: サポートされていないContent-Type（XML/JSON系以外）
  - `500`: サーバーエラー

### サポートされるContent-Type

- `application/rss+xml`
- `application/atom+xml`
- `application/xml`
- `text/xml`
- `application/json`
- `application/feed+json`

## 🛠️ 開発

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

## 📦 デプロイ

### Cloudflare Workersへのデプロイ

```bash
# デプロイ前にログイン
npx wrangler login

# デプロイ実行
npm run deploy
```

### 環境変数の設定

必要に応じて、`wrangler.jsonc` で環境変数やバインディングを設定できます。

## 🏗️ アーキテクチャ

### ディレクトリ構造

```
rssfilter/
├── src/
│   ├── index.ts              # メインエントリーポイント（/get エンドポイント）
│   ├── config.ts             # 設定のバリデーションとコンパイル
│   ├── exclude_config.ts     # 除外パターンの設定（編集対象）
│   └── rss.ts                # RSS/Atomのパース・フィルタ・ビルド処理
├── test/
│   ├── index.spec.ts         # エンドポイントのテスト
│   ├── rss.spec.ts           # フィルタリングロジックのテスト
│   └── config.spec.ts        # 設定バリデーションのテスト
├── package.json
├── tsconfig.json
├── vitest.config.mts
└── wrangler.jsonc
```

### 技術スタック

- **Runtime**: Cloudflare Workers
- **Language**: TypeScript
- **XML Parsing**: [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser) v5
- **Testing**: Vitest + @cloudflare/vitest-pool-workers
- **Build Tool**: Wrangler

### フィルタリングの仕組み

1. **パース**: `fast-xml-parser` の `preserveOrder: true` モードでXMLを解析
2. **抽出**: RSS/Atomの各エントリーから `title` と `link` を抽出
3. **判定**: 設定された正規表現パターンと照合
4. **除外**: マッチしたエントリーを削除
5. **再構築**: フィルタリング後の構造をXML文字列として再構築

### セキュリティ機能

- **XXE対策**: `processEntities: false` でエンティティ展開を無効化
- **サイズ制限**: 5MBを超えるレスポンスはフィルタリングをスキップ（メモリ保護）
- **エラーハンドリング**: パースエラー時は元のコンテンツをそのまま返す（Fail Open）

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

