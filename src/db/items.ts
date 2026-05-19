import type { FeedItemRow, ParsedFeedItem } from '../types';

export async function itemIdFor(subscriptionId: string, guid: string): Promise<string> {
	const data = new TextEncoder().encode(`${subscriptionId}:${guid}`);
	const hash = await crypto.subtle.digest('SHA-256', data);
	return Array.from(new Uint8Array(hash))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export async function upsertItems(env: Env, subscriptionId: string, items: ParsedFeedItem[], fetchedAt: number): Promise<number> {
	let inserted = 0;
	for (const item of items) {
		const guid = item.guid || item.link || item.title || crypto.randomUUID();
		const id = await itemIdFor(subscriptionId, guid);
		const result = await env.RSSFILTER_DB.prepare(
			`INSERT INTO feed_items (id, subscription_id, title, link, guid, published_at, summary, fetched_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			 ON CONFLICT(subscription_id, guid) DO UPDATE SET
			   title = excluded.title,
			   link = excluded.link,
			   published_at = excluded.published_at,
			   summary = excluded.summary,
			   fetched_at = excluded.fetched_at`,
		)
			.bind(id, subscriptionId, item.title || null, item.link || null, guid, item.publishedAt, item.summary || null, fetchedAt)
			.run();
		if ((result.meta.changes ?? 0) > 0) {
			inserted++;
		}
	}
	return inserted;
}

export async function listItems(env: Env, options: { subscriptionId?: string; limit?: number; offset?: number }): Promise<FeedItemRow[]> {
	const limit = options.limit ?? 50;
	const offset = options.offset ?? 0;

	if (options.subscriptionId) {
		const result = await env.RSSFILTER_DB.prepare(
			`SELECT fi.id, fi.subscription_id, fi.title, fi.link, fi.guid, fi.published_at, fi.summary, fi.fetched_at,
			        s.title AS subscription_title, s.feed_url
			 FROM feed_items fi
			 JOIN subscriptions s ON s.id = fi.subscription_id
			 WHERE fi.subscription_id = ?
			 ORDER BY COALESCE(fi.published_at, fi.fetched_at) DESC
			 LIMIT ? OFFSET ?`,
		)
			.bind(options.subscriptionId, limit, offset)
			.all<FeedItemRow>();
		return result.results ?? [];
	}

	const result = await env.RSSFILTER_DB.prepare(
		`SELECT fi.id, fi.subscription_id, fi.title, fi.link, fi.guid, fi.published_at, fi.summary, fi.fetched_at,
		        s.title AS subscription_title, s.feed_url
		 FROM feed_items fi
		 JOIN subscriptions s ON s.id = fi.subscription_id
		 ORDER BY COALESCE(fi.published_at, fi.fetched_at) DESC
		 LIMIT ? OFFSET ?`,
	)
		.bind(limit, offset)
		.all<FeedItemRow>();
	return result.results ?? [];
}

export async function countItemsBySubscription(env: Env, subscriptionId: string): Promise<number> {
	const row = await env.RSSFILTER_DB.prepare('SELECT COUNT(*) AS cnt FROM feed_items WHERE subscription_id = ?')
		.bind(subscriptionId)
		.first<{ cnt: number }>();
	return row?.cnt ?? 0;
}
