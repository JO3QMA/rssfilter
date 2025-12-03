import { describe, it, expect, vi, afterEach } from 'vitest';
import { filterRss } from '../src/rss';
import { validateConfig } from '../src/config';

// config モジュールの excludePatterns をモックするために
// 実際には import された compiledExcludePatterns を書き換えるか、
// rss.ts が config をどう使うかによる。
// 今回は compiledExcludePatterns をモックしたいが、read-only export なので難しい。
// したがって、vi.mock でモジュールごとモックする。

vi.mock('../src/config', async () => {
	return {
		compiledExcludeConfig: {
			title: [
				/PR:/,
				/【広告】/i,
			],
			link: [
				/spam/
			]
		},
		validateConfig: (config: any) => {
			// 簡易的なモック
			return { title: [], link: [] };
		}
	};
});

describe('RSS Filtering Logic (preserveOrder)', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('RSS 2.0: filters items matching title', () => {
		const xml = `
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <item>
      <title>Valid Item</title>
      <link>http://example.com/1</link>
    </item>
    <item>
      <title>PR: Ad Item</title>
      <link>http://example.com/2</link>
    </item>
  </channel>
</rss>`;
		const result = filterRss(xml);
		expect(result).not.toContain('PR: Ad Item');
		expect(result).toContain('Valid Item');
		expect(result).toContain('<rss version="2.0">');
	});

	it('RSS 1.0: filters items matching link', () => {
		const xml = `
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/">
  <item>
    <title>Valid Item</title>
    <link>http://example.com/valid</link>
  </item>
  <item>
    <title>Spam Item</title>
    <link>http://example.com/spam/123</link>
  </item>
</rdf:RDF>`;
		const result = filterRss(xml);
		expect(result).not.toContain('Spam Item');
		expect(result).toContain('Valid Item');
	});

	it('Atom: filters entries matching title or link href', () => {
		const xml = `
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Valid Entry</title>
    <link href="http://example.com/valid"/>
  </entry>
  <entry>
    <title>【広告】Ad Entry</title>
    <link href="http://example.com/ad"/>
  </entry>
  <entry>
    <title>Spam Link Entry</title>
    <link href="http://example.com/spam/entry"/>
  </entry>
</feed>`;
		const result = filterRss(xml);
		expect(result).not.toContain('【広告】Ad Entry'); // タイトル除外
		expect(result).not.toContain('Spam Link Entry'); // リンク除外
		expect(result).toContain('Valid Entry');
	});

	it('Preserves XML structure (attributes, namespaces, CDATA)', () => {
		const xml = `
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <item>
      <title><![CDATA[Valid & Safe]]></title>
      <dc:creator>Author Name</dc:creator>
      <description>Desc</description>
    </item>
    <item>
      <title>PR: Remove me</title>
    </item>
  </channel>
</rss>`;
		const result = filterRss(xml);
		expect(result).toContain('xmlns:dc="http://purl.org/dc/elements/1.1/"');
		expect(result).toContain('<![CDATA[Valid & Safe]]>');
		expect(result).toContain('<dc:creator>Author Name</dc:creator>');
		expect(result).not.toContain('PR: Remove me');
	});

	it('Handles single item (not array) correctly', () => {
		// fast-xml-parser with preserveOrder always returns arrays for children,
		// but checking robustness
		const xml = `
<rss>
  <channel>
    <item>
      <title>PR: Only One Item</title>
    </item>
  </channel>
</rss>`;
		const result = filterRss(xml);
		// 唯一のアイテムが削除されると、itemタグがなくなるはず
		expect(result).not.toContain('<item>');
		expect(result).toContain('<channel>');
	});

	it('Handles empty XML or non-XML gracefully', () => {
		const plainText = 'Just some text';
		expect(filterRss(plainText)).toBe(plainText);

		const empty = '';
		expect(filterRss(empty)).toBe(empty);
	});
});


