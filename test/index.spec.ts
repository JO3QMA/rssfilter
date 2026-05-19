import { env, exports } from 'cloudflare:workers';
import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, vi, afterEach } from 'vitest';
import worker from '../src/index';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

afterEach(() => {
	vi.restoreAllMocks();
});

describe('Reader homepage', () => {
	it('responds with reader HTML (unit style)', async () => {
		const request = new IncomingRequest('http://example.com/');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
		const text = await response.text();
		expect(text).toContain('RSS Reader');
		expect(text).toContain('/subscriptions');
		expect(text).toContain('/settings');
	});

	it('responds with reader HTML (integration style)', async () => {
		const response = await exports.default.fetch('https://example.com/');
		expect(response.status).toBe(200);
		const text = await response.text();
		expect(text).toContain('RSS Reader');
	});
});

describe('/get endpoint', () => {
	it('is removed', async () => {
		const request = new IncomingRequest('http://example.com/get?site=https://example.com/feed');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(404);
	});
});

describe('/api/subscriptions', () => {
	it('lists empty subscriptions initially', async () => {
		const request = new IncomingRequest('http://example.com/api/subscriptions');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		const data = (await response.json()) as { subscriptions: unknown[] };
		expect(Array.isArray(data.subscriptions)).toBe(true);
	});

	it('creates a subscription', async () => {
		const request = new IncomingRequest('http://example.com/api/subscriptions', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ feed_url: 'https://example.com/feed.xml' }),
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(201);
		const data = (await response.json()) as { subscription: { feed_url: string } };
		expect(data.subscription.feed_url).toBe('https://example.com/feed.xml');
	});

	it('rejects invalid feed_url', async () => {
		const request = new IncomingRequest('http://example.com/api/subscriptions', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ feed_url: 'not-a-url' }),
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(400);
	});
});

describe('/api/items', () => {
	it('returns items array', async () => {
		const request = new IncomingRequest('http://example.com/api/items');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		const data = (await response.json()) as { items: unknown[] };
		expect(Array.isArray(data.items)).toBe(true);
	});
});
