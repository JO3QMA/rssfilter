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

export default {
	async fetch(request, env, ctx): Promise<Response> {
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
				const isAllowed = allowedMimeTypes.some((mime) =>
					contentType.toLowerCase().startsWith(mime),
				);

				if (!isAllowed) {
					return new Response('Unsupported content type', {
						status: 415, // Unsupported Media Type
					});
				}

				// XML系の場合のみフィルタリング処理を行う
				const isXml =
					contentType.includes('xml') ||
					contentType.includes('rss') ||
					contentType.includes('atom');

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

							// フィルタリング実行
							const { filterRss } = await import('./rss');
							const filteredXml = filterRss(xmlText);

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

		return new Response('Hello World!');
	},
} satisfies ExportedHandler<Env>;
