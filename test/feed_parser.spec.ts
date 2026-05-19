import { describe, it, expect } from 'vitest';
import { parseFeed } from '../src/feed_parser';

const sampleRss = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Test</title>
    <item>
      <title>Article</title>
      <link>https://example.com/a</link>
      <guid>g1</guid>
      <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

describe('parseFeed', () => {
	it('parses RSS 2.0 items', () => {
		const { feedTitle, items } = parseFeed(sampleRss, 'application/rss+xml');
		expect(feedTitle).toBe('Test');
		expect(items).toHaveLength(1);
		expect(items[0].title).toBe('Article');
		expect(items[0].link).toBe('https://example.com/a');
		expect(items[0].guid).toBe('g1');
	});

	it('parses JSON Feed', () => {
		const body = JSON.stringify({
			title: 'JSON Feed',
			items: [{ id: '1', url: 'https://ex.com/1', title: 'One', date_published: '2024-01-01T00:00:00Z' }],
		});
		const { items } = parseFeed(body, 'application/feed+json');
		expect(items).toHaveLength(1);
		expect(items[0].link).toBe('https://ex.com/1');
	});
});
