export const homeHtmlTemplate = `<!DOCTYPE html>
<html lang="ja">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>RSS Filter</title>
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
	<style>
		body {
			max-width: 800px;
			margin: 0 auto;
			padding: 2rem;
		}
		.container {
			text-align: center;
		}
		h1 {
			color: var(--pico-primary);
			margin-bottom: 2rem;
		}
		.description {
			margin-bottom: 2rem;
			font-size: 1.1rem;
			color: var(--pico-muted-color);
		}
		.links {
			display: flex;
			gap: 1rem;
			justify-content: center;
			flex-wrap: wrap;
			margin-bottom: 2rem;
		}
		.rss-input-section {
			margin-top: 2rem;
			max-width: 600px;
			margin-left: auto;
			margin-right: auto;
		}
		.input-group {
			display: flex;
			gap: 0.5rem;
			margin-top: 0.5rem;
		}
		.rss-input {
			flex: 1;
		}
		.copy-btn {
			padding: 0.75rem 1rem;
			white-space: nowrap;
		}
		.github-link {
			display: inline-block;
			margin-top: 2rem;
			color: var(--pico-muted-color);
		}
		.github-link:hover {
			color: var(--pico-color);
		}
	</style>
</head>
<body>
	<div class="container">
		<h1>RSS Filter</h1>
		<p class="description">
			RSS/Atomフィードを取得し、設定された正規表現に基づいて不要なエントリーを自動的に除外するCloudflare Workersアプリケーションです。
		</p>

		<div class="links">
			<button type="button" id="settings-btn" class="btn">⚙️ 設定</button>
		</div>

		<div class="rss-input-section">
			<label for="rss-url">RSSフィードURL</label>
			<div class="input-group">
				<input type="url" id="rss-url" placeholder="https://example.com/feed.xml" class="rss-input">
				<button type="button" id="copy-btn" class="btn copy-btn">📋</button>
			</div>
			<small>入力したURLに対してフィルタリングされたRSSを取得するURLをクリップボードにコピーします</small>
		</div>

		<p>
			<a href="https://github.com/JO3QMA/rssfilter" class="github-link" target="_blank" rel="noopener">
				📖 GitHub リポジトリ
			</a>
		</p>
	</div>

	<script>
		document.getElementById('settings-btn').addEventListener('click', () => {
			window.location.href = '/settings';
		});

		document.getElementById('copy-btn').addEventListener('click', async () => {
			const rssUrl = document.getElementById('rss-url').value.trim();
			const copyBtn = document.getElementById('copy-btn');

			if (!rssUrl) {
				alert('RSSフィードURLを入力してください');
				return;
			}

			try {
				// URLの検証
				new URL(rssUrl);
			} catch (e) {
				alert('有効なURLを入力してください');
				return;
			}

			const filteredUrl = window.location.origin + '/get?site=' + encodeURIComponent(rssUrl);

			try {
				await navigator.clipboard.writeText(filteredUrl);
				const originalText = copyBtn.textContent;
				copyBtn.textContent = 'コピーしました！';
				copyBtn.style.backgroundColor = '#10b981';
				setTimeout(() => {
					copyBtn.textContent = originalText;
					copyBtn.style.backgroundColor = '';
				}, 2000);
			} catch (err) {
				// クリップボードAPIが使えない場合のフォールバック
				const textArea = document.createElement('textarea');
				textArea.value = filteredUrl;
				document.body.appendChild(textArea);
				textArea.select();
				try {
					document.execCommand('copy');
					const originalText = copyBtn.textContent;
					copyBtn.textContent = 'コピーしました！';
					copyBtn.style.backgroundColor = '#10b981';
					setTimeout(() => {
						copyBtn.textContent = originalText;
						copyBtn.style.backgroundColor = '';
					}, 2000);
				} catch (fallbackErr) {
					alert('クリップボードへのコピーに失敗しました。手動でコピーしてください:\\n' + filteredUrl);
				}
				document.body.removeChild(textArea);
			}
		});

		// Enterキーでコピーできるように
		document.getElementById('rss-url').addEventListener('keypress', (e) => {
			if (e.key === 'Enter') {
				document.getElementById('copy-btn').click();
			}
		});
	</script>
</body>
</html>`;
