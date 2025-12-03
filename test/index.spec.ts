import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('Hello World worker', () => {
	it('responds with Hello World! (unit style)', async () => {
		const request = new IncomingRequest('http://example.com');
		// Create an empty context to pass to `worker.fetch()`.
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
		await waitOnExecutionContext(ctx);
		expect(await response.text()).toMatchInlineSnapshot(`"Hello World!"`);
	});

	it('responds with Hello World! (integration style)', async () => {
		const response = await SELF.fetch('https://example.com');
		expect(await response.text()).toMatchInlineSnapshot(`"Hello World!"`);
	});
});

describe('/get endpoint', () => {
	it('returns response from specified site (unit style)', async () => {
		const request = new IncomingRequest('http://example.com/get?site=https://example.com');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		
		expect(response.status).toBe(200);
		const text = await response.text();
		expect(text).toContain('Example Domain');
	});

	it('returns response from specified site (integration style)', async () => {
		const response = await SELF.fetch('https://example.com/get?site=https://example.com');
		
		expect(response.status).toBe(200);
		const text = await response.text();
		expect(text).toContain('Example Domain');
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

	it('preserves response headers from target site (unit style)', async () => {
		const request = new IncomingRequest('http://example.com/get?site=https://example.com');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		
		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toContain('text/html');
	});

	it('preserves response headers from target site (integration style)', async () => {
		const response = await SELF.fetch('https://example.com/get?site=https://example.com');
		
		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toContain('text/html');
	});
});
