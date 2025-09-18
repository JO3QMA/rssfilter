# RSS Filter Makefile

.PHONY: build test clean deploy dev

# デフォルトターゲット
all: build

# ビルド
build:
	@echo "Building WASM module..."
	tinygo build -target wasi -o main.wasm main.go
	@echo "Build completed!"

# テスト実行
test:
	@echo "Running tests..."
	go test -v ./...
	@echo "Tests completed!"

# ローカル開発サーバー起動
dev:
	@echo "Starting development server..."
	wrangler dev

# デプロイ
deploy:
	@echo "Deploying to Cloudflare Workers..."
	wrangler deploy
	@echo "Deployment completed!"

# クリーンアップ
clean:
	@echo "Cleaning up build artifacts..."
	rm -f main.wasm
	@echo "Cleanup completed!"

# ビルドとテスト
build-test: build test

# ビルド、テスト、デプロイ
deploy-full: build test deploy
