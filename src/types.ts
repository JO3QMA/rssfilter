export interface ParsedFeedItem {
	title: string;
	link: string;
	guid: string;
	publishedAt: number | null;
	summary: string;
}

export interface SubscriptionRow {
	id: string;
	feed_url: string;
	title: string | null;
	site_hostname: string;
	enabled: number;
	etag: string | null;
	last_modified: string | null;
	last_fetched_at: number | null;
	last_error: string | null;
	created_at: number;
	updated_at: number;
}

export interface FeedItemRow {
	id: string;
	subscription_id: string;
	title: string | null;
	link: string | null;
	guid: string | null;
	published_at: number | null;
	summary: string | null;
	fetched_at: number;
	subscription_title?: string | null;
	feed_url?: string;
}
