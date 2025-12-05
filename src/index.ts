/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

/**
 * 設定画面のHTMLを生成します
 */
async function generateSettingsPage(env: Env): Promise<string> {
	const { loadConfig } = await import('./config_store');
	const config = await loadConfig(env);

	// XSS対策: JSON埋め込み時に < をエスケープ
	const configJson = JSON.stringify(config).replace(/</g, '\\u003c');

	return `<!DOCTYPE html>
<html lang="ja">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>RSS Filter 設定</title>
	<style>
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
			max-width: 800px;
			margin: 0 auto;
			padding: 20px;
			line-height: 1.6;
		}
		h1 {
			color: #333;
			border-bottom: 2px solid #4CAF50;
			padding-bottom: 10px;
		}
		.section {
			margin: 30px 0;
			padding: 20px;
			background: #f9f9f9;
			border-radius: 8px;
		}
		.section h2 {
			margin-top: 0;
			color: #555;
		}
		label {
			display: block;
			margin: 10px 0 5px;
			font-weight: bold;
			color: #333;
		}
		textarea {
			width: 100%;
			min-height: 150px;
			padding: 10px;
			border: 1px solid #ddd;
			border-radius: 4px;
			font-family: monospace;
			font-size: 14px;
			box-sizing: border-box;
		}
		.site-config {
			margin: 15px 0;
			padding: 15px;
			background: white;
			border: 1px solid #ddd;
			border-radius: 4px;
		}
		.site-config-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 10px;
		}
		.site-input {
			flex: 1;
			padding: 8px;
			border: 1px solid #ddd;
			border-radius: 4px;
			margin-right: 10px;
		}
		button {
			background: #4CAF50;
			color: white;
			border: none;
			padding: 10px 20px;
			border-radius: 4px;
			cursor: pointer;
			font-size: 16px;
			margin: 5px;
		}
		button:hover {
			background: #45a049;
		}
		button.danger {
			background: #f44336;
		}
		button.danger:hover {
			background: #da190b;
		}
		button.save {
			background: #2196F3;
			font-size: 18px;
			padding: 15px 30px;
			margin-top: 20px;
		}
		button.save:hover {
			background: #0b7dda;
		}
		#message {
			margin: 20px 0;
			padding: 15px;
			border-radius: 4px;
			display: none;
		}
		#message.success {
			background: #d4edda;
			color: #155724;
			border: 1px solid #c3e6cb;
		}
		#message.error {
			background: #f8d7da;
			color: #721c24;
			border: 1px solid #f5c6cb;
		}
		.help-text {
			font-size: 12px;
			color: #666;
			margin-top: 5px;
		}
	</style>
</head>
<body>
	<h1>RSS Filter 設定</h1>
	
	<div id="message"></div>
	
	<form id="configForm">
		<div class="section">
			<h2>グローバル設定</h2>
			<p class="help-text">すべてのサイトに適用される除外パターンです。1行に1つの正規表現パターンを入力してください。</p>
			
			<label for="global-title">タイトル除外パターン:</label>
			<textarea id="global-title" name="global-title" placeholder="例: ^PR:&#10;【広告】"></textarea>
			
			<label for="global-link">リンク除外パターン:</label>
			<textarea id="global-link" name="global-link" placeholder="例: ad\\.example\\.com"></textarea>
		</div>
		
		<div class="section">
			<h2>サイトごとの設定</h2>
			<p class="help-text">特定のサイトにのみ適用される除外パターンです。ドメイン名（例: example.com）を入力してください。</p>
			<div id="site-configs"></div>
			<button type="button" id="add-site">サイト設定を追加</button>
		</div>
		
		<button type="submit" class="save">設定を保存</button>
	</form>
	
	<script id="initial-config" type="application/json">${configJson}</script>
	<script>
		const config = JSON.parse(document.getElementById('initial-config').textContent);
		
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
				'<input type="text" class="site-input" value="' + siteEscaped + '" placeholder="ドメイン名 (例: example.com)" required>' +
				'<button type="button" class="danger" onclick="removeSiteConfig(this)">削除</button>' +
				'</div>' +
				'<label>タイトル除外パターン:</label>' +
				'<textarea class="site-title" placeholder="1行に1つの正規表現パターン">' + titleText + '</textarea>' +
				'<label>リンク除外パターン:</label>' +
				'<textarea class="site-link" placeholder="1行に1つの正規表現パターン">' + linkText + '</textarea>';
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
			messageDiv.style.display = 'none';
			
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
					messageDiv.className = 'success';
					messageDiv.textContent = '設定を保存しました（反映まで最大1分程度かかる場合があります）';
					messageDiv.style.display = 'block';
				} else {
					messageDiv.className = 'error';
					messageDiv.textContent = result.error || 'エラーが発生しました';
					messageDiv.style.display = 'block';
				}
			} catch (error) {
				messageDiv.className = 'error';
				messageDiv.textContent = 'エラーが発生しました: ' + error.message;
				messageDiv.style.display = 'block';
			}
		});
	</script>
</body>
</html>`;
}

export default {
	async fetch(request, env, _ctx): Promise<Response> {
		const url = new URL(request.url);

		// /get エンドポイントの処理
		if (url.pathname === '/get') {
			const siteUrl = url.searchParams.get('site');

			if (!siteUrl) {
				return new Response('Missing site parameter', { status: 400 });
			}

			try {
				// URLの検証
				const targetUrl = new URL(siteUrl);

				// リクエストをそのまま転送
				const response = await fetch(targetUrl.toString(), {
					method: request.method,
					headers: request.headers,
					body: request.body,
				});

				// 許可された MIME Type のみを許可
				const allowedMimeTypes = [
					'application/rss+xml',
					'application/atom+xml',
					'application/xml',
					'text/xml',
					'application/json',
					'application/feed+json',
				];

				const contentType = response.headers.get('content-type') ?? '';
				const isAllowed = allowedMimeTypes.some((mime) => contentType.toLowerCase().startsWith(mime));

				if (!isAllowed) {
					return new Response('Unsupported content type', {
						status: 415, // Unsupported Media Type
					});
				}

				// XML系の場合のみフィルタリング処理を行う
				const isXml = contentType.includes('xml') || contentType.includes('rss') || contentType.includes('atom');

				let responseBody = response.body;

				// サイズ制限 (5MB) - これを超える場合はフィルタせずそのまま返す
				const contentLengthHeader = response.headers.get('content-length');
				const MAX_SIZE = 5 * 1024 * 1024;
				let skipFilter = false;

				if (contentLengthHeader) {
					const length = Number.parseInt(contentLengthHeader, 10);
					if (!Number.isNaN(length) && length > MAX_SIZE) {
						skipFilter = true;
					}
				}

				if (isXml && !skipFilter) {
					try {
						// レスポンスボディを読み込む
						const arrayBuffer = await response.arrayBuffer();

						if (arrayBuffer.byteLength > MAX_SIZE) {
							// 実際に読み込んだサイズが大きすぎる場合もスキップ
							responseBody = arrayBuffer;
						} else {
							const decoder = new TextDecoder('utf-8'); // 基本的にUTF-8を仮定
							const xmlText = decoder.decode(arrayBuffer);

							// サイト識別子を抽出（URL正規化: hostnameを使用）
							let siteKey: string | undefined;
							try {
								siteKey = new URL(siteUrl).hostname;
							} catch {
								// URL解析に失敗した場合はsiteKeyをundefinedのまま（グローバル設定のみ使用）
							}

							// KVから設定を読み込み、コンパイル済み設定を取得
							const { getCompiledExcludeConfigForSite } = await import('./config_store');
							let compiledConfig;
							try {
								compiledConfig = await getCompiledExcludeConfigForSite(_env, siteKey);
							} catch (e) {
								console.error('Error loading config from KV, using default:', e);
								// エラー時はデフォルト設定を使用
								const { compiledExcludeConfig } = await import('./config');
								compiledConfig = compiledExcludeConfig;
							}

							// フィルタリング実行
							const { filterRss } = await import('./rss');
							const filteredXml = filterRss(xmlText, compiledConfig);

							responseBody = filteredXml;
						}
					} catch (e) {
						console.error('Error filtering RSS:', e);
						// エラー時は元のコンテンツ(読み込み済みであれば再利用できないため、ここで復旧は難しいが、
						// arrayBuffer読み込み後のエラーならスキップして生のデータを返すことは可能かもしれないが、
						// ここではコンソールログを出して、responseBodyへの代入を行わないことで
						// 後続の new Response で何を使うか...
						// arrayBuffer が取れていればそれを使うべき。
						// tryブロック内で arrayBuffer が定義されていない場合もある。
						// 簡略化のため、ここでは「フィルタ失敗時はエラーレスポンス」ではなく
						// 「可能なら生データを返す」ようにしたいが、Stream消費済み問題がある。
						// 実装上、arrayBuffer変数への代入まで成功していればそれを使う。
						// 失敗していれば response.body はもう読めないのでエラーになる。
						// ここではシンプルにエラーレスポンスを返す。
						return new Response(`RSS Filter Error: ${e instanceof Error ? e.message : 'Unknown'}`, { status: 500 });
					}
				}

				// レスポンスをそのまま返す
				return new Response(responseBody, {
					status: response.status,
					statusText: response.statusText,
					headers: response.headers,
				});
			} catch (error) {
				if (error instanceof TypeError && error.message.includes('Invalid URL')) {
					return new Response('Invalid URL format', { status: 400 });
				}
				return new Response(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
			}
		}

		// /settings エンドポイント: 設定画面を表示
		if (url.pathname === '/settings') {
			if (request.method !== 'GET') {
				return new Response('Method not allowed', { status: 405 });
			}
			const html = await generateSettingsPage(env);
			return new Response(html, {
				headers: { 'content-type': 'text/html; charset=utf-8' },
			});
		}

		// /api/settings エンドポイント: 設定を保存
		if (url.pathname === '/api/settings') {
			if (request.method !== 'POST') {
				return new Response('Method not allowed', { status: 405 });
			}

			try {
				const body = await request.json();
				const config = body as import('./config').Config;

				// データ構造のバリデーション
				if (!config || typeof config !== 'object') {
					return new Response(JSON.stringify({ error: 'Invalid config structure' }), {
						status: 400,
						headers: { 'content-type': 'application/json' },
					});
				}

				if (!config.global || !Array.isArray(config.global.title) || !Array.isArray(config.global.link)) {
					return new Response(JSON.stringify({ error: 'Invalid global config structure' }), {
						status: 400,
						headers: { 'content-type': 'application/json' },
					});
				}

				if (config.sites && typeof config.sites !== 'object') {
					return new Response(JSON.stringify({ error: 'Invalid sites config structure' }), {
						status: 400,
						headers: { 'content-type': 'application/json' },
					});
				}

				// 正規表現パターンのバリデーション
				const { validateRegExp } = await import('./config');
				const errors: string[] = [];

				// グローバル設定の検証
				for (const pattern of config.global.title) {
					if (typeof pattern !== 'string') {
						errors.push(`Global title: invalid type (expected string)`);
					} else if (!validateRegExp(pattern)) {
						errors.push(`Global title: invalid regex pattern "${pattern}"`);
					}
				}
				for (const pattern of config.global.link) {
					if (typeof pattern !== 'string') {
						errors.push(`Global link: invalid type (expected string)`);
					} else if (!validateRegExp(pattern)) {
						errors.push(`Global link: invalid regex pattern "${pattern}"`);
					}
				}

				// サイトごとの設定の検証
				if (config.sites) {
					for (const [site, siteConfig] of Object.entries(config.sites)) {
						if (!siteConfig || typeof siteConfig !== 'object') {
							errors.push(`Site ${site}: invalid config structure`);
							continue;
						}
						if (!Array.isArray(siteConfig.title) || !Array.isArray(siteConfig.link)) {
							errors.push(`Site ${site}: invalid config structure (title and link must be arrays)`);
							continue;
						}
						for (const pattern of siteConfig.title) {
							if (typeof pattern !== 'string') {
								errors.push(`Site ${site} title: invalid type (expected string)`);
							} else if (!validateRegExp(pattern)) {
								errors.push(`Site ${site} title: invalid regex pattern "${pattern}"`);
							}
						}
						for (const pattern of siteConfig.link) {
							if (typeof pattern !== 'string') {
								errors.push(`Site ${site} link: invalid type (expected string)`);
							} else if (!validateRegExp(pattern)) {
								errors.push(`Site ${site} link: invalid regex pattern "${pattern}"`);
							}
						}
					}
				}

				if (errors.length > 0) {
					return new Response(JSON.stringify({ error: `正規表現が間違っています: ${errors.join(', ')}` }), {
						status: 400,
						headers: { 'content-type': 'application/json' },
					});
				}

				// バリデーション通過後、KVに保存
				const { saveConfig } = await import('./config_store');
				await saveConfig(env, config);

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { 'content-type': 'application/json' },
				});
			} catch (error) {
				console.error('Error saving config:', error);
				if (error instanceof Error && error.message.includes('Invalid regex')) {
					return new Response(JSON.stringify({ error: error.message }), {
						status: 400,
						headers: { 'content-type': 'application/json' },
					});
				}
				return new Response(JSON.stringify({ error: 'Internal server error' }), {
					status: 500,
					headers: { 'content-type': 'application/json' },
				});
			}
		}

		return new Response('Hello World!');
	},
} satisfies ExportedHandler<Env>;
