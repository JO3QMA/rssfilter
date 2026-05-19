import { getCompiledExcludeConfigForSite } from './config_store';
import { getSubscription, listEnabledForFetch, updateSubscription } from './db/subscriptions';
import { upsertItems } from './db/items';
import { isAllowedContentType, parseFeed } from './feed_parser';
import { matchesExclude } from './exclude';
import type { ParsedFeedItem, SubscriptionRow } from './types';
import { MAX_FETCH_PER_RUN } from './db/subscriptions';

const MAX_BODY_SIZE = 5 * 1024 * 1024;

export interface FetchResult {
	subscriptionId: string;
	ok: boolean;
	status?: number;
	itemsStored?: number;
	error?: string;
}

export async function runScheduledFetch(env: Env): Promise<FetchResult[]> {
	const subs = await listEnabledForFetch(env, MAX_FETCH_PER_RUN);
	const results: FetchResult[] = [];
	for (const sub of subs) {
		results.push(await fetchOneSubscription(env, sub));
	}
	return results;
}

export async function fetchOneSubscription(env: Env, subscription: SubscriptionRow | string): Promise<FetchResult> {
	const sub = typeof subscription === 'string' ? await getSubscription(env, subscription) : subscription;

	if (!sub) {
		return { subscriptionId: typeof subscription === 'string' ? subscription : '', ok: false, error: 'Subscription not found' };
	}

	if (!sub.enabled) {
		return { subscriptionId: sub.id, ok: false, error: 'Subscription disabled' };
	}

	try {
		const headers: HeadersInit = {
			'User-Agent': 'rssfilter/1.0',
			Accept: 'application/rss+xml, application/atom+xml, application/feed+json, application/json, application/xml, text/xml',
		};
		if (sub.etag) {
			headers['If-None-Match'] = sub.etag;
		}
		if (sub.last_modified) {
			headers['If-Modified-Since'] = sub.last_modified;
		}

		const response = await fetch(sub.feed_url, { headers });

		if (response.status === 304) {
			await updateSubscription(env, sub.id, {
				lastFetchedAt: Date.now(),
				lastError: null,
			});
			return { subscriptionId: sub.id, ok: true, status: 304, itemsStored: 0 };
		}

		if (!response.ok) {
			const err = `Upstream HTTP ${response.status}`;
			await updateSubscription(env, sub.id, { lastError: err, lastFetchedAt: Date.now() });
			return { subscriptionId: sub.id, ok: false, status: response.status, error: err };
		}

		const contentType = response.headers.get('content-type') ?? '';
		if (!isAllowedContentType(contentType)) {
			const err = 'Unsupported content type';
			await updateSubscription(env, sub.id, { lastError: err, lastFetchedAt: Date.now() });
			return { subscriptionId: sub.id, ok: false, error: err };
		}

		const buffer = await response.arrayBuffer();
		if (buffer.byteLength > MAX_BODY_SIZE) {
			const err = 'Feed too large';
			await updateSubscription(env, sub.id, { lastError: err, lastFetchedAt: Date.now() });
			return { subscriptionId: sub.id, ok: false, error: err };
		}

		const body = new TextDecoder('utf-8').decode(buffer);
		const { feedTitle, items } = parseFeed(body, contentType);

		const compiled = await getCompiledExcludeConfigForSite(env, sub.site_hostname);
		const filtered = filterItems(items, compiled);

		const fetchedAt = Date.now();
		const stored = await upsertItems(env, sub.id, filtered, fetchedAt);

		await updateSubscription(env, sub.id, {
			title: feedTitle ?? sub.title,
			etag: response.headers.get('etag'),
			lastModified: response.headers.get('last-modified'),
			lastFetchedAt: fetchedAt,
			lastError: null,
		});

		return { subscriptionId: sub.id, ok: true, status: response.status, itemsStored: stored };
	} catch (e) {
		const err = e instanceof Error ? e.message : 'Unknown error';
		await updateSubscription(env, sub.id, { lastError: err, lastFetchedAt: Date.now() });
		return { subscriptionId: sub.id, ok: false, error: err };
	}
}

function filterItems(items: ParsedFeedItem[], compiled: import('./config').CompiledExcludeConfig): ParsedFeedItem[] {
	return items.filter((item) => !matchesExclude(item.title, item.link, compiled));
}
