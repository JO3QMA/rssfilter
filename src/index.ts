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

				// レスポンスをそのまま返す
				return new Response(response.body, {
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
