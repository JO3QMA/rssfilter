# RSS Filter

Cloudflare Workers上で動作するRSSフィルターサービスです。指定されたRSSフィードをオンラインでフィルタリングし、不要なエントリーを除外した新しいRSSフィードを生成します。

## 機能

- RSSフィードの受信とフィルタリング
- URLフィルター（完全一致）
- タイトルフィルター（部分一致）
- フィルタリング後のRSSフィード生成
- セキュリティ対策（SSRF攻撃防止）
- 高速レスポンス（Cloudflare Workers）

## 使用方法

```
https://<Workerのドメイン>/?url=<フィルタリングしたいRSSフィードのURL>
```

例：
```
https://rss-filter.example.com/?url=https://example-news.com/feed.xml
```

## フィルター設定

フィルター条件は `main.go` または `common.go` 内の以下の変数で設定できます：

- `denyURLList`: 除外するURLのリスト（完全一致）
- `denyTitleKeywords`: 除外するタイトルのキーワードリスト（部分一致）

### デフォルトのフィルター条件

```go
// 除外するURLのリスト
var denyURLList = []string{
    "https://example-news.com/article/123",
    "https://example-news.com/article/456",
}

// 除外するタイトルのキーワードリスト
var denyTitleKeywords = []string{
    "PR:",
    "【広告】",
    "キャンペーン情報",
}
```

## 開発

### 必要なツール

- Go 1.21+
- TinyGo
- Wrangler CLI
- Cloudflareアカウント

### セットアップ

```bash
# リポジトリのクローン
git clone <repository-url>
cd rssfilter

# 依存関係のインストール
go mod tidy

# ビルド
make build

# テスト実行
make test
```

### ローカル開発

```bash
make dev
```

### デプロイ

```bash
make deploy
```

詳細なデプロイメント手順は [DEPLOYMENT.md](DEPLOYMENT.md) を参照してください。

## アーキテクチャ

- **ホスティング**: Cloudflare Workers
- **開発言語**: Go (TinyGoでWebAssemblyにコンパイル)
- **バージョン管理**: Git

## セキュリティ

- SSRF攻撃防止（ローカルホスト・プライベートIP拒否）
- URL検証
- タイムアウト設定
- User-Agent設定

## ライセンス

MIT License
