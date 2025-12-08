export const settingsHtmlTemplate = `<!DOCTYPE html>
<html lang="ja">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>RSS Filter 設定</title>
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
	<style>
		body {
			max-width: 800px;
			margin: 0 auto;
			padding: 2rem;
		}
		h1 {
			color: var(--pico-primary);
			margin-bottom: 2rem;
		}
		textarea {
			font-family: monospace;
			font-size: 0.75rem;
			padding: 0.75rem;
			min-height: 150px;
		}
		.site-config {
			margin: 1.5rem 0;
			padding: 1.5rem;
			border: 1px solid var(--pico-border-color);
			border-radius: var(--pico-border-radius);
		}
		.site-config-header {
			margin-bottom: 1rem;
		}
		.site-config-header .domain-label {
			display: block;
			margin-bottom: 0.5rem;
			font-size: 0.875rem;
			font-weight: 500;
		}
		.site-config-header .input-row {
			display: flex;
			gap: 1rem;
			align-items: flex-end;
		}
		.site-config-header .input-row input {
			flex: 1;
			margin: 0;
		}
		.site-config-header .input-row button {
			margin: 0;
			white-space: nowrap;
		}
		#message {
			display: none;
		}
		#message.show {
			display: block;
			position: fixed;
			top: 20px;
			left: 50%;
			transform: translateX(-50%);
			max-width: min(600px, 90vw);
			padding: 1rem 1.5rem;
			border-radius: 0.5rem;
			border: 2px solid;
			font-weight: 500;
			font-size: 0.875rem;
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
			z-index: 1000;
			animation: slideIn 0.3s ease-out;
		}
		#message.show[data-theme="success"] {
			background-color: #d1edff;
			border-color: #0d6efd;
			color: #0c63e4;
		}
		#message.show[data-theme="danger"] {
			background-color: #f8d7da;
			border-color: #dc3545;
			color: #b02a37;
		}
		@keyframes slideIn {
			from {
				opacity: 0;
				transform: translateX(-50%) translateY(-10px);
			}
			to {
				opacity: 1;
				transform: translateX(-50%) translateY(0);
			}
		}
		small {
			display: block;
			margin-top: 0.5rem;
			color: var(--pico-muted-color);
		}
	</style>
</head>
<body>
	<div class="container">
		<h1>RSS Filter 設定</h1>

			<div id="message" role="alert"></div>

			<form id="configForm">
				<fieldset>
					<legend>グローバル設定</legend>
					<small>すべてのサイトに適用される除外パターンです。1行に1つの正規表現パターンを入力してください。</small>

					<label for="global-title">
						タイトル除外パターン
						<textarea id="global-title" name="global-title" placeholder="例: ^PR:&#10;【広告】" rows="8"></textarea>
					</label>

					<label for="global-link">
						リンク除外パターン
						<textarea id="global-link" name="global-link" placeholder="例: ad\\.example\\.com" rows="8"></textarea>
					</label>
				</fieldset>

				<fieldset>
					<legend>サイトごとの設定</legend>
					<small>特定のサイトにのみ適用される除外パターンです。ドメイン名（例: example.com）を入力してください。</small>
					<div id="site-configs"></div>
					<button type="button" id="add-site" class="secondary">サイト設定を追加</button>
				</fieldset>

				<button type="submit">設定を保存</button>
			</form>
	</div>

	<script id="initial-config" type="application/json">{{configJson}}</script>
	<script>
		const config = JSON.parse(document.getElementById('initial-config').textContent);

		// Ctrl + S で設定を保存する機能を追加
		document.addEventListener('keydown', function(e) {
			if ((e.ctrlKey || e.metaKey) && e.key === 's') {
				e.preventDefault(); // ブラウザのデフォルトの保存動作を防ぐ
				document.getElementById('configForm').requestSubmit(); // フォームを送信
			}
		});

		// グローバル設定をフォームに反映
		document.getElementById('global-title').value = config.global.title.join('\\n');
		document.getElementById('global-link').value = config.global.link.join('\\n');

		// サイトごとの設定をフォームに反映
		const siteConfigsDiv = document.getElementById('site-configs');
		let siteConfigIndex = 0;

		function createSiteConfig(site, siteConfig) {
			const div = document.createElement('div');
			div.className = 'site-config';
			div.dataset.index = siteConfigIndex++;
			const titleText = (siteConfig?.title || []).join('\\n').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
			const linkText = (siteConfig?.link || []).join('\\n').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
			const siteEscaped = String(site).replace(/"/g, '&quot;');
			div.innerHTML = '<div class="site-config-header">' +
				'<label class="domain-label">ドメイン名</label>' +
				'<div class="input-row">' +
				'<input type="text" class="site-input" value="' + siteEscaped + '" placeholder="example.com" required>' +
				'<button type="button" class="contrast" onclick="removeSiteConfig(this)">削除</button>' +
				'</div>' +
				'</div>' +
				'<label>' +
				'タイトル除外パターン' +
				'<textarea class="site-title" placeholder="1行に1つの正規表現パターン" rows="6">' + titleText + '</textarea>' +
				'</label>' +
				'<label>' +
				'リンク除外パターン' +
				'<textarea class="site-link" placeholder="1行に1つの正規表現パターン" rows="6">' + linkText + '</textarea>' +
				'</label>';
			siteConfigsDiv.appendChild(div);
		}

		// 既存のサイト設定を表示
		for (const [site, siteConfig] of Object.entries(config.sites)) {
			createSiteConfig(site, siteConfig);
		}

		// サイト設定追加ボタン
		document.getElementById('add-site').addEventListener('click', () => {
			createSiteConfig('', null);
		});

		// サイト設定削除
		window.removeSiteConfig = function(button) {
			button.closest('.site-config').remove();
		};

		// フォーム送信
		document.getElementById('configForm').addEventListener('submit', async (e) => {
			e.preventDefault();

			const messageDiv = document.getElementById('message');
			messageDiv.className = '';
			messageDiv.removeAttribute('data-theme');
			messageDiv.textContent = '';

			// フォームから設定オブジェクトを構築
			const newConfig = {
				global: {
					title: document.getElementById('global-title').value.split('\\n').filter(s => s.trim()),
					link: document.getElementById('global-link').value.split('\\n').filter(s => s.trim())
				},
				sites: {}
			};

			// サイトごとの設定を収集
			document.querySelectorAll('.site-config').forEach(div => {
				const siteInput = div.querySelector('.site-input');
				const siteTitle = div.querySelector('.site-title');
				const siteLink = div.querySelector('.site-link');

				const site = siteInput.value.trim();
				if (site) {
					newConfig.sites[site] = {
						title: siteTitle.value.split('\\n').filter(s => s.trim()),
						link: siteLink.value.split('\\n').filter(s => s.trim())
					};
				}
			});

			try {
				const response = await fetch('/api/settings', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(newConfig)
				});

				const result = await response.json();

				if (response.ok) {
					messageDiv.className = 'show';
					messageDiv.setAttribute('data-theme', 'success');
					messageDiv.textContent = '設定を保存しました（反映まで最大1分程度かかる場合があります）';
					// 15秒後にメッセージを自動的に隠す
					setTimeout(() => {
						messageDiv.className = '';
						messageDiv.removeAttribute('data-theme');
						messageDiv.textContent = '';
					}, 15000);
				} else {
					messageDiv.className = 'show';
					messageDiv.setAttribute('data-theme', 'danger');
					messageDiv.textContent = result.error || 'エラーが発生しました';
					// 15秒後にエラーメッセージを自動的に隠す
					setTimeout(() => {
						messageDiv.className = '';
						messageDiv.removeAttribute('data-theme');
						messageDiv.textContent = '';
					}, 15000);
				}
			} catch (error) {
				messageDiv.className = 'show';
				messageDiv.setAttribute('data-theme', 'danger');
				messageDiv.textContent = 'エラーが発生しました: ' + error.message;
				// 15秒後にエラーメッセージを自動的に隠す
				setTimeout(() => {
					messageDiv.className = '';
					messageDiv.removeAttribute('data-theme');
					messageDiv.textContent = '';
				}, 15000);
			}
		});
	</script>
</body>
</html>`;
