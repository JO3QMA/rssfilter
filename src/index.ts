import { loadConfig, saveConfig } from './config_store';
import { validateRegExp } from './config';
import type { Config } from './config';
import { listSubscriptions, createSubscription, getSubscription, updateSubscription, deleteSubscription } from './db/subscriptions';
import { listItems } from './db/items';
import { fetchOneSubscription, runScheduledFetch } from './fetch_job';
import { readerHtmlTemplate } from './templates/reader';
import { subscriptionsHtmlTemplate } from './templates/subscriptions';

async function generateSettingsPage(env: Env): Promise<string> {
	const config = await loadConfig(env);
	const configJson = JSON.stringify(config).replace(/</g, '\\u003c');
	const { settingsHtmlTemplate } = await import('./templates/settings');
	return settingsHtmlTemplate.replace('{{configJson}}', configJson);
}

function jsonResponse(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'content-type': 'application/json; charset=utf-8' },
	});
}

function htmlResponse(html: string): Response {
	return new Response(html, {
		headers: { 'content-type': 'text/html; charset=utf-8' },
	});
}

function subscriptionToJson(row: import('./types').SubscriptionRow) {
	return {
		id: row.id,
		feed_url: row.feed_url,
		title: row.title,
		site_hostname: row.site_hostname,
		enabled: row.enabled === 1,
		etag: row.etag,
		last_modified: row.last_modified,
		last_fetched_at: row.last_fetched_at,
		last_error: row.last_error,
		created_at: row.created_at,
		updated_at: row.updated_at,
	};
}

async function handleApiSettings(request: Request, env: Env): Promise<Response> {
	if (request.method !== 'POST') {
		return new Response('Method not allowed', { status: 405 });
	}

	try {
		const body = await request.json();
		const config = body as Config;

		if (!config || typeof config !== 'object') {
			return jsonResponse({ error: 'Invalid config structure' }, 400);
		}

		if (!config.global || !Array.isArray(config.global.title) || !Array.isArray(config.global.link)) {
			return jsonResponse({ error: 'Invalid global config structure' }, 400);
		}

		if (config.sites && typeof config.sites !== 'object') {
			return jsonResponse({ error: 'Invalid sites config structure' }, 400);
		}

		const errors: string[] = [];

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
			return jsonResponse({ error: `正規表現が間違っています: ${errors.join(', ')}` }, 400);
		}

		await saveConfig(env, config);
		return jsonResponse({ success: true });
	} catch (error) {
		console.error('Error saving config:', error);
		if (error instanceof Error && error.message.includes('Invalid regex')) {
			return jsonResponse({ error: error.message }, 400);
		}
		return jsonResponse({ error: 'Internal server error' }, 500);
	}
}

async function handleApiSubscriptions(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
	if (request.method === 'GET') {
		const rows = await listSubscriptions(env);
		return jsonResponse({ subscriptions: rows.map(subscriptionToJson) });
	}

	if (request.method === 'POST') {
		try {
			const body = (await request.json()) as { feed_url?: string };
			const feedUrl = body.feed_url?.trim();
			if (!feedUrl) {
				return jsonResponse({ error: 'feed_url is required' }, 400);
			}
			let parsed: URL;
			try {
				parsed = new URL(feedUrl);
			} catch {
				return jsonResponse({ error: 'Invalid URL format' }, 400);
			}
			const siteHostname = parsed.hostname;
			const row = await createSubscription(env, feedUrl, siteHostname);
			ctx.waitUntil(fetchOneSubscription(env, row.id));
			return jsonResponse({ subscription: subscriptionToJson(row) }, 201);
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'Unknown error';
			if (msg.includes('UNIQUE')) {
				return jsonResponse({ error: 'This feed is already subscribed' }, 409);
			}
			return jsonResponse({ error: msg }, 500);
		}
	}

	return new Response('Method not allowed', { status: 405 });
}

async function handleApiSubscriptionById(request: Request, env: Env, id: string): Promise<Response> {
	if (request.method === 'DELETE') {
		const deleted = await deleteSubscription(env, id);
		if (!deleted) {
			return jsonResponse({ error: 'Not found' }, 404);
		}
		return jsonResponse({ success: true });
	}

	if (request.method === 'PATCH') {
		const body = (await request.json()) as { enabled?: boolean; title?: string };
		const updates: { enabled?: boolean; title?: string | null } = {};
		if (typeof body.enabled === 'boolean') {
			updates.enabled = body.enabled;
		}
		if (body.title !== undefined) {
			updates.title = body.title;
		}
		const row = await updateSubscription(env, id, updates);
		if (!row) {
			return jsonResponse({ error: 'Not found' }, 404);
		}
		return jsonResponse({ subscription: subscriptionToJson(row) });
	}

	return new Response('Method not allowed', { status: 405 });
}

async function handleApiItems(url: URL, env: Env): Promise<Response> {
	const limit = Math.min(Number.parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 100);
	const offset = Number.parseInt(url.searchParams.get('offset') ?? '0', 10) || 0;
	const subscriptionId = url.searchParams.get('subscription_id') ?? undefined;

	const items = await listItems(env, { subscriptionId, limit, offset });
	return jsonResponse({
		items: items.map((row) => ({
			id: row.id,
			subscription_id: row.subscription_id,
			title: row.title,
			link: row.link,
			guid: row.guid,
			published_at: row.published_at,
			summary: row.summary,
			fetched_at: row.fetched_at,
			subscription_title: row.subscription_title,
			feed_url: row.feed_url,
		})),
	});
}

async function handleApiFetch(request: Request, env: Env, url: URL): Promise<Response> {
	if (request.method !== 'POST') {
		return new Response('Method not allowed', { status: 405 });
	}

	const subscriptionId = url.searchParams.get('subscription_id');
	if (subscriptionId) {
		const sub = await getSubscription(env, subscriptionId);
		if (!sub) {
			return jsonResponse({ error: 'Not found' }, 404);
		}
		const result = await fetchOneSubscription(env, sub);
		if (!result.ok) {
			return jsonResponse(
				{
					error: result.error ?? 'Fetch failed',
					subscriptionId: result.subscriptionId,
					ok: result.ok,
					status: result.status,
				},
				502,
			);
		}
		return jsonResponse(result);
	}

	const results = await runScheduledFetch(env);
	return jsonResponse({ results });
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		if (path === '/api/settings') {
			return handleApiSettings(request, env);
		}

		if (path === '/api/subscriptions') {
			return handleApiSubscriptions(request, env, ctx);
		}

		const subMatch = /^\/api\/subscriptions\/([^/]+)$/.exec(path);
		if (subMatch) {
			return handleApiSubscriptionById(request, env, subMatch[1]);
		}

		if (path === '/api/items' && request.method === 'GET') {
			return handleApiItems(url, env);
		}

		if (path === '/api/fetch') {
			return handleApiFetch(request, env, url);
		}

		if (path === '/settings' && request.method === 'GET') {
			const html = await generateSettingsPage(env);
			return htmlResponse(html);
		}

		if (path === '/subscriptions' && request.method === 'GET') {
			return htmlResponse(subscriptionsHtmlTemplate);
		}

		if (path === '/' && request.method === 'GET') {
			return htmlResponse(readerHtmlTemplate);
		}

		return new Response('Not Found', { status: 404 });
	},

	async scheduled(_controller, env, ctx): Promise<void> {
		ctx.waitUntil(runScheduledFetch(env));
	},
} satisfies ExportedHandler<Env>;
