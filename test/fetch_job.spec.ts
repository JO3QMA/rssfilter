import { env } from 'cloudflare:workers';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createSubscription } from '../src/db/subscriptions';
import { fetchOneSubscription } from '../src/fetch_job';
import { saveConfig } from '../src/config_store';
import { countItemsBySubscription } from '../src/db/items';

const sampleRss = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <item>
      <title>Keep me</title>
      <link>https://example.com/keep</link>
      <guid>keep-1</guid>
    </item>
    <item>
      <title>PR: Remove me</title>
      <link>https://example.com/remove</link>
      <guid>remove-1</guid>
    </item>
  </channel>
</rss>`;

afterEach(() => {
	vi.restoreAllMocks();
});

describe('fetchOneSubscription', () => {
	it('stores only items that pass exclude filters', async () => {
		await saveConfig(env, {
			global: { title: ['^PR:'], link: [] },
			sites: {},
		});

		const sub = await createSubscription(env, 'https://example.com/feed.xml', 'example.com');

		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(sampleRss, {
				status: 200,
				headers: { 'content-type': 'application/rss+xml' },
			}),
		);

		const result = await fetchOneSubscription(env, sub);
		expect(result.ok).toBe(true);
		expect(result.itemsStored).toBeGreaterThan(0);

		const count = await countItemsBySubscription(env, sub.id);
		expect(count).toBe(1);
	});
});
