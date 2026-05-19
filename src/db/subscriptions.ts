import type { SubscriptionRow } from '../types';

const MAX_FETCH_PER_RUN = 20;

export async function listSubscriptions(env: Env): Promise<SubscriptionRow[]> {
	const result = await env.RSSFILTER_DB.prepare(
		`SELECT id, feed_url, title, site_hostname, enabled, etag, last_modified,
		        last_fetched_at, last_error, created_at, updated_at
		 FROM subscriptions
		 ORDER BY created_at DESC`,
	).all<SubscriptionRow>();
	return result.results ?? [];
}

export async function getSubscription(env: Env, id: string): Promise<SubscriptionRow | null> {
	return env.RSSFILTER_DB.prepare(
		`SELECT id, feed_url, title, site_hostname, enabled, etag, last_modified,
		        last_fetched_at, last_error, created_at, updated_at
		 FROM subscriptions WHERE id = ?`,
	)
		.bind(id)
		.first<SubscriptionRow>();
}

export async function createSubscription(env: Env, feedUrl: string, siteHostname: string, title?: string | null): Promise<SubscriptionRow> {
	const id = crypto.randomUUID();
	const now = Date.now();
	await env.RSSFILTER_DB.prepare(
		`INSERT INTO subscriptions (id, feed_url, title, site_hostname, enabled, created_at, updated_at)
		 VALUES (?, ?, ?, ?, 1, ?, ?)`,
	)
		.bind(id, feedUrl, title ?? null, siteHostname, now, now)
		.run();

	const row = await getSubscription(env, id);
	if (!row) {
		throw new Error('Failed to create subscription');
	}
	return row;
}

export async function updateSubscription(
	env: Env,
	id: string,
	updates: {
		enabled?: boolean;
		title?: string | null;
		etag?: string | null;
		lastModified?: string | null;
		lastFetchedAt?: number | null;
		lastError?: string | null;
	},
): Promise<SubscriptionRow | null> {
	const existing = await getSubscription(env, id);
	if (!existing) {
		return null;
	}

	const now = Date.now();
	const enabled = updates.enabled !== undefined ? (updates.enabled ? 1 : 0) : existing.enabled;
	const title = updates.title !== undefined ? updates.title : existing.title;
	const etag = updates.etag !== undefined ? updates.etag : existing.etag;
	const lastModified = updates.lastModified !== undefined ? updates.lastModified : existing.last_modified;
	const lastFetchedAt = updates.lastFetchedAt !== undefined ? updates.lastFetchedAt : existing.last_fetched_at;
	const lastError = updates.lastError !== undefined ? updates.lastError : existing.last_error;

	await env.RSSFILTER_DB.prepare(
		`UPDATE subscriptions
		 SET enabled = ?, title = ?, etag = ?, last_modified = ?,
		     last_fetched_at = ?, last_error = ?, updated_at = ?
		 WHERE id = ?`,
	)
		.bind(enabled, title, etag, lastModified, lastFetchedAt, lastError, now, id)
		.run();

	return getSubscription(env, id);
}

export async function deleteSubscription(env: Env, id: string): Promise<boolean> {
	const result = await env.RSSFILTER_DB.prepare('DELETE FROM subscriptions WHERE id = ?').bind(id).run();
	return (result.meta.changes ?? 0) > 0;
}

export async function listEnabledForFetch(env: Env, limit = MAX_FETCH_PER_RUN): Promise<SubscriptionRow[]> {
	const result = await env.RSSFILTER_DB.prepare(
		`SELECT id, feed_url, title, site_hostname, enabled, etag, last_modified,
		        last_fetched_at, last_error, created_at, updated_at
		 FROM subscriptions
		 WHERE enabled = 1
		 ORDER BY COALESCE(last_fetched_at, 0) ASC
		 LIMIT ?`,
	)
		.bind(limit)
		.all<SubscriptionRow>();
	return result.results ?? [];
}

export { MAX_FETCH_PER_RUN };
