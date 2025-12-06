import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect, vi, afterEach } from 'vitest';
import worker from '../src/index';

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

afterEach(() => {
	vi.restoreAllMocks();
});

describe('Homepage', () => {
	it('responds with homepage HTML (unit style)', async () => {
		const request = new IncomingRequest('http://example.com');
		// Create an empty context to pass to `worker.fetch()`.
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
		const text = await response.text();
		expect(text).toContain('RSS Filter');
		expect(text).toContain('GitHub リポジトリ');
		expect(text).toContain('/settings');
	});

	it('responds with homepage HTML (integration style)', async () => {
		const response = await SELF.fetch('https://example.com');
		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
		const text = await response.text();
		expect(text).toContain('RSS Filter');
		expect(text).toContain('GitHub リポジトリ');
		expect(text).toContain('/settings');
	});
});

describe('/get endpoint', () => {
	it('returns response only when MIME type is allowed (unit style)', async () => {
		const body = '<rss><channel><title>Test</title></channel></rss>';
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(body, {
				status: 200,
				headers: {
					'content-type': 'application/rss+xml; charset=utf-8',
				},
			}),
		);

		const request = new IncomingRequest('http://example.com/get?site=https://example.com/feed');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(200);
		const text = await response.text();
		expect(text).toBe(body);
	});

	it('rejects when MIME type is not allowed (unit style)', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response('<html>NG</html>', {
				status: 200,
				headers: {
					'content-type': 'text/html; charset=utf-8',
				},
			}),
		);

		const request = new IncomingRequest('http://example.com/get?site=https://example.com/');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(415);
		expect(await response.text()).toBe('Unsupported content type');
	});

	it('returns 400 error when site parameter is missing (unit style)', async () => {
		const request = new IncomingRequest('http://example.com/get');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		
		expect(response.status).toBe(400);
		expect(await response.text()).toBe('Missing site parameter');
	});

	it('returns 400 error when site parameter is missing (integration style)', async () => {
		const response = await SELF.fetch('https://example.com/get');
		
		expect(response.status).toBe(400);
		expect(await response.text()).toBe('Missing site parameter');
	});

	it('returns 400 error for invalid URL format (unit style)', async () => {
		const request = new IncomingRequest('http://example.com/get?site=not-a-valid-url');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		
		expect(response.status).toBe(400);
		expect(await response.text()).toBe('Invalid URL format');
	});

	it('returns 400 error for invalid URL format (integration style)', async () => {
		const response = await SELF.fetch('https://example.com/get?site=not-a-valid-url');
		
		expect(response.status).toBe(400);
		expect(await response.text()).toBe('Invalid URL format');
	});

	it('preserves response headers from target site when allowed (unit style)', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response('{}', {
				status: 200,
				headers: {
					'content-type': 'application/json',
					'x-custom-header': 'test',
				},
			}),
		);

		const request = new IncomingRequest('http://example.com/get?site=https://api.example.com/data');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toContain('application/json');
		expect(response.headers.get('x-custom-header')).toBe('test');
	});

	it('rejects when content-type header is missing (unit style)', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response('no content type', {
				status: 200,
			}),
		);

		const request = new IncomingRequest('http://example.com/get?site=https://example.com/no-header');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(415);
		expect(await response.text()).toBe('Unsupported content type');
	});
});
