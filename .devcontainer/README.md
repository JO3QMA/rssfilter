# Dev Container 環境

このdevcontainer環境には以下のツールが含まれています：

- **Node.js**: LTS版
- **npm**: Node.jsに付属（最新版にアップグレードされます）
- **Cloudflare Wrangler**: 最新版（グローバルインストール）

## 使用方法

1. VS Codeでこのワークスペースを開く
2. コマンドパレット（Ctrl+Shift+P / Cmd+Shift+P）を開く
3. "Dev Containers: Reopen in Container" を選択
4. コンテナがビルドされ、起動します

初回起動時には、必要なツールが自動的にインストールされます。

## インストール済みツール

- Node.js (LTS)
- npm (最新版)
- Cloudflare Wrangler (最新版)
- Git
- その他の開発ツール

## 拡張機能

以下のVS Code拡張機能が自動的にインストールされます：

- ESLint (dbaeumer.vscode-eslint)
- Prettier (esbenp.prettier-vscode)

## 動作確認

コンテナ起動後、以下のコマンドでバージョンを確認できます：

```bash
node --version
npm --version
wrangler --version
```
