import { XMLParser } from 'fast-xml-parser';
import type { ParsedFeedItem } from './types';

type XmlNode = {
	[key: string]: XmlNodeValue | XmlNodeValue[] | Record<string, string> | undefined;
};

type XmlNodeValue = XmlNode[] | { '#text': string } | { __cdata: string } | string | XmlNode;

const parserOptions = {
	preserveOrder: true,
	ignoreAttributes: false,
	processEntities: false,
	parseTagValue: false,
	trimValues: true,
	cdataPropName: '__cdata',
};

const ALLOWED_MIME_TYPES = [
	'application/rss+xml',
	'application/atom+xml',
	'application/xml',
	'text/xml',
	'application/json',
	'application/feed+json',
];

export function isAllowedContentType(contentType: string): boolean {
	const lower = contentType.toLowerCase();
	return ALLOWED_MIME_TYPES.some((mime) => lower.startsWith(mime));
}

export function isXmlContentType(contentType: string): boolean {
	const lower = contentType.toLowerCase();
	return (
		lower.includes('xml') || lower.includes('rss') || lower.includes('atom') || (lower.startsWith('application/') && lower.includes('+xml'))
	);
}

export function parseFeed(body: string, contentType: string): { feedTitle?: string; items: ParsedFeedItem[] } {
	if (isJsonFeed(contentType)) {
		return parseJsonFeed(body);
	}
	if (isXmlContentType(contentType)) {
		return parseXmlFeed(body);
	}
	return { items: [] };
}

function isJsonFeed(contentType: string): boolean {
	const lower = contentType.toLowerCase();
	return lower.startsWith('application/json') || lower.startsWith('application/feed+json');
}

function parseJsonFeed(body: string): { feedTitle?: string; items: ParsedFeedItem[] } {
	const data = JSON.parse(body) as {
		title?: string;
		items?: Array<{
			id?: string;
			url?: string;
			title?: string;
			date_published?: string;
			summary?: string;
			content_text?: string;
		}>;
	};
	const items: ParsedFeedItem[] = [];
	for (const entry of data.items ?? []) {
		const link = entry.url ?? '';
		const guid = entry.id ?? link;
		items.push({
			title: entry.title ?? '',
			link,
			guid,
			publishedAt: parseDate(entry.date_published),
			summary: entry.summary ?? entry.content_text ?? '',
		});
	}
	return { feedTitle: data.title, items };
}

function parseXmlFeed(body: string): { feedTitle?: string; items: ParsedFeedItem[] } {
	const parser = new XMLParser(parserOptions);
	const jsonObj = parser.parse(body);
	if (!jsonObj || !Array.isArray(jsonObj) || jsonObj.length === 0) {
		return { items: [] };
	}

	const items: ParsedFeedItem[] = [];
	let feedTitle: string | undefined;

	for (const node of jsonObj as XmlNode[]) {
		const tagNames = Object.keys(node).filter((k) => k !== ':@');
		if (tagNames.length !== 1) continue;
		const tagName = tagNames[0];
		const children = node[tagName];

		if (tagName === 'rss' && Array.isArray(children)) {
			const parsed = parseRss2(children as XmlNode[]);
			feedTitle = parsed.feedTitle;
			items.push(...parsed.items);
		} else if ((tagName === 'rdf:RDF' || tagName === 'RDF') && Array.isArray(children)) {
			items.push(...collectEntryItems(children as XmlNode[], 'item'));
		} else if (tagName === 'feed' && Array.isArray(children)) {
			feedTitle = extractChildText(children as XmlNode[], 'title');
			items.push(...collectEntryItems(children as XmlNode[], 'entry'));
		}
	}

	return { feedTitle, items };
}

function parseRss2(channelNodes: XmlNode[]): { feedTitle?: string; items: ParsedFeedItem[] } {
	let feedTitle: string | undefined;
	const items: ParsedFeedItem[] = [];

	for (const node of channelNodes) {
		const tagNames = Object.keys(node).filter((k) => k !== ':@');
		if (tagNames.length !== 1) continue;
		const tagName = tagNames[0];
		const children = node[tagName];

		if (tagName === 'title' && Array.isArray(children)) {
			feedTitle = extractTextValue(children);
		} else if (tagName === 'channel' && Array.isArray(children)) {
			feedTitle = extractChildText(children as XmlNode[], 'title') ?? feedTitle;
			items.push(...collectEntryItems(children as XmlNode[], 'item'));
		}
	}

	return { feedTitle, items };
}

function collectEntryItems(parentArray: XmlNode[], itemTagName: string): ParsedFeedItem[] {
	const items: ParsedFeedItem[] = [];

	for (const node of parentArray) {
		const tagNames = Object.keys(node).filter((k) => k !== ':@');
		if (tagNames.length !== 1) continue;
		const tagName = tagNames[0];

		if (tagName === itemTagName && Array.isArray(node[tagName])) {
			items.push(parseEntryNodes(node[tagName] as XmlNode[], itemTagName === 'entry'));
		}
	}

	return items;
}

function parseEntryNodes(entryNodes: XmlNode[], isAtom: boolean): ParsedFeedItem {
	let title = '';
	let link = '';
	let guid = '';
	let publishedAt: number | null = null;
	let summary = '';

	for (const node of entryNodes) {
		const keys = Object.keys(node).filter((k) => k !== ':@');
		if (keys.length === 0) continue;
		const tagName = keys[0];
		const value = node[tagName];

		if (tagName === 'title') {
			title = extractTextValue(value);
		} else if (tagName === 'link') {
			const textVal = extractTextValue(value);
			if (textVal) {
				link = textVal;
			} else if (node[':@']?.['@_href']) {
				link = node[':@']['@_href'];
			}
		} else if (tagName === 'guid' || tagName === 'id') {
			guid = extractTextValue(value);
		} else if (tagName === 'pubDate' || tagName === 'published' || tagName === 'updated') {
			const raw = extractTextValue(value);
			publishedAt = parseDate(raw);
		} else if (tagName === 'description' || tagName === 'summary' || tagName === 'content') {
			const text = extractTextValue(value);
			if (text && !summary) {
				summary = text.length > 500 ? text.slice(0, 500) + '…' : text;
			}
		}
	}

	if (!guid) {
		guid = link || title;
	}

	if (isAtom && !link && entryNodes.length > 0) {
		for (const node of entryNodes) {
			if (node[':@']?.['@_href']) {
				link = node[':@']['@_href'];
				break;
			}
		}
	}

	return { title, link, guid, publishedAt, summary };
}

function extractChildText(nodes: XmlNode[], childTag: string): string | undefined {
	for (const node of nodes) {
		const tagNames = Object.keys(node).filter((k) => k !== ':@');
		if (tagNames.length === 1 && tagNames[0] === childTag && Array.isArray(node[childTag])) {
			return extractTextValue(node[childTag]);
		}
	}
	return undefined;
}

function extractTextValue(value: XmlNodeValue | XmlNodeValue[]): string {
	if (Array.isArray(value)) {
		for (const item of value) {
			if (typeof item === 'object' && item !== null && '#text' in item) {
				return (item as { '#text': string })['#text'];
			}
			if (typeof item === 'object' && item !== null && '__cdata' in item) {
				return (item as { __cdata: string }).__cdata;
			}
		}
	} else if (typeof value === 'string') {
		return value;
	}
	return '';
}

function parseDate(raw: string | undefined): number | null {
	if (!raw) return null;
	const ts = Date.parse(raw);
	return Number.isNaN(ts) ? null : ts;
}
