# RSS Filter デプロイメントガイド

## 前提条件

以下のツールがインストールされている必要があります：

- Go 1.21+
- TinyGo
- Wrangler CLI
- Cloudflareアカウント

## セットアップ

### 1. TinyGoのインストール

```bash
# macOS
brew install tinygo

# Linux
wget https://github.com/tinygo-org/tinygo/releases/download/v0.30.0/tinygo0.30.0.linux-amd64.tar.gz
tar -xzf tinygo0.30.0.linux-amd64.tar.gz
sudo mv tinygo /usr/local/bin/

# Windows
# https://github.com/tinygo-org/tinygo/releases からダウンロード
```

### 2. Wrangler CLIのインストール

```bash
npm install -g wrangler
```

### 3. Cloudflareアカウントの認証

```bash
wrangler login
```

## ビルドとテスト

### ローカルでのビルド

```bash
make build
```

### テストの実行

```bash
make test
```

### ローカル開発サーバー

```bash
make dev
```

## デプロイ

### 初回デプロイ

1. `wrangler.toml`の設定を確認
2. KV namespaceの設定（必要に応じて）
3. デプロイ実行

```bash
make deploy
```

### 設定のカスタマイズ

`wrangler.toml`で以下の設定をカスタマイズできます：

- Worker名
- 互換性日付
- KV namespace
- 環境変数

## 使用方法

デプロイ後、以下のURL形式でRSSフィードをフィルタリングできます：

```
https://<your-worker-domain>/?url=<RSSフィードのURL>
```

例：
```
https://rss-filter.your-subdomain.workers.dev/?url=https://example.com/feed.xml
```

## フィルター設定の変更

フィルター条件を変更するには：

1. `main.go`または`common.go`の以下の変数を編集：
   - `denyURLList`: 除外するURLのリスト
   - `denyTitleKeywords`: 除外するタイトルのキーワードリスト

2. 変更をコミットしてデプロイ

```bash
git add .
git commit -m "feat: update filter conditions"
git push
make deploy
```

## トラブルシューティング

### ビルドエラー

- TinyGoのバージョンを確認
- Goのバージョンを確認（1.21以上）

### デプロイエラー

- Cloudflareアカウントの認証状態を確認
- `wrangler.toml`の設定を確認
- クォータ制限を確認

### 実行時エラー

- ログを確認：`wrangler tail`
- フィルター条件を確認
- RSSフィードの形式を確認

## 監視とログ

### ログの確認

```bash
wrangler tail
```

### メトリクスの確認

Cloudflareダッシュボードで以下を確認：
- リクエスト数
- エラー率
- レスポンス時間
- CPU使用量
