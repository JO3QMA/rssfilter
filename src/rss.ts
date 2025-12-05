import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { CompiledExcludeConfig, compiledExcludeConfig } from './config';

/**
 * fast-xml-parser の preserveOrder: true モードでのノード構造
 */
type XmlNode = {
	[key: string]: XmlNodeValue | XmlNodeValue[];
	':@'?: Record<string, string>;
};

type XmlNodeValue = XmlNode[] | { '#text': string } | { __cdata: string } | string | XmlNode;

// XMLParser/Builder の設定オプション
// preserveOrder: true により、タグの順序、コメント、CDATA、属性などを保持します
const options = {
	preserveOrder: true,
	ignoreAttributes: false,
	processEntities: false, // XXE対策
	parseTagValue: false, // 値を勝手に変換しない
	trimValues: true,
	cdataPropName: '__cdata',
	// コメントや処理命令も保持する設定がデフォルトで有効（preserveOrder時）
};

/**
 * XML文字列をパースし、設定された正規表現に基づいてエントリーをフィルタリングし、
 * 再度XML文字列として返します。
 * @param xmlContent フィルタリングするXML文字列
 * @param excludeConfig 除外設定（省略時はデフォルト設定を使用）
 */
export function filterRss(xmlContent: string, excludeConfig: CompiledExcludeConfig = compiledExcludeConfig): string {
	const parser = new XMLParser(options);
	const jsonObj = parser.parse(xmlContent);

	if (!jsonObj || (Array.isArray(jsonObj) && jsonObj.length === 0)) {
		// パース結果が空、または空配列の場合は元のコンテンツを返す
		// 非XMLテキストなどをパースすると空になることがある
		return xmlContent;
	}

	if (!Array.isArray(jsonObj)) {
		// preserveOrder: true の場合、ルートは常に配列になるはずだが、念のため
		return xmlContent;
	}

	// ルート要素を探す (通常は最初の要素だが、コメント等がある場合を考慮)
	// RSS 2.0: <rss> -> <channel> -> <item>
	// RSS 1.0: <rdf:RDF> -> <item>
	// Atom: <feed> -> <entry>

	processNodeList(jsonObj, excludeConfig);

	const builder = new XMLBuilder(options);
	return builder.build(jsonObj);
}

/**
 * ノードリストを再帰的に探索し、RSS/Atomのエントリーを見つけてフィルタリングする
 */
function processNodeList(nodes: XmlNode[], excludeConfig: CompiledExcludeConfig) {
	for (const node of nodes) {
		// 各ノードは { "tagName": [children] } または { ":@": attributes } などの形式
		// preserveOrder: true の場合、node はオブジェクトで、キーがタグ名、値が子要素の配列（または値）

		const tagNames = Object.keys(node).filter((k) => k !== ':@'); // 属性キーを除外
		if (tagNames.length !== 1) continue;
		const tagName = tagNames[0];
		const children = node[tagName];

		if (tagName === 'rss') {
			// RSS 2.0: rss -> channel -> item
			if (Array.isArray(children)) {
				processRss2Channel(children, excludeConfig);
			}
		} else if (tagName === 'rdf:RDF' || tagName === 'RDF') {
			// RSS 1.0: rdf:RDF -> item
			if (Array.isArray(children)) {
				filterItems(children, 'item', excludeConfig);
			}
		} else if (tagName === 'feed') {
			// Atom: feed -> entry
			if (Array.isArray(children)) {
				filterItems(children, 'entry', excludeConfig);
			}
		}
	}
}

function processRss2Channel(nodes: XmlNode[], excludeConfig: CompiledExcludeConfig) {
	for (const node of nodes) {
		const tagNames = Object.keys(node).filter((k) => k !== ':@');
		if (tagNames.length !== 1) continue;
		const tagName = tagNames[0];

		if (tagName === 'channel' && Array.isArray(node[tagName])) {
			filterItems(node[tagName], 'item', excludeConfig);
		}
	}
}

/**
 * 指定されたタグ名のエントリー配列から、除外条件に合致するものを削除する
 * @param parentArray 親要素の子ノード配列 (例: channel の children)
 * @param itemTagName エントリーのタグ名 ('item' または 'entry')
 * @param excludeConfig 除外設定
 */
function filterItems(parentArray: XmlNode[], itemTagName: string, excludeConfig: CompiledExcludeConfig) {
	// 逆順にループして削除してもインデックスがずれないようにするか、
	// filter で新しい配列を作る。
	// ただし parentArray は参照で渡されているので、中身を書き換える必要がある。
	// fast-xml-parser の構造上、parentArray はオブジェクトの配列。

	const itemsKeep: XmlNode[] = [];
	let hasChanges = false;

	for (const node of parentArray) {
		const tagNames = Object.keys(node).filter((k) => k !== ':@');
		const tagName = tagNames[0];

		if (tagName === itemTagName) {
			if (shouldExclude(node[tagName], excludeConfig)) {
				hasChanges = true;
				continue; // 除外
			}
		}
		itemsKeep.push(node);
	}

	if (hasChanges) {
		// 配列の中身を入れ替える
		parentArray.length = 0;
		parentArray.push(...itemsKeep);
	}
}

/**
 * エントリー要素の内容を検査し、除外すべきかどうか判定する
 * @param entryNodes エントリーの子ノード配列
 * @param excludeConfig 除外設定
 */
function shouldExclude(entryNodes: XmlNode[], excludeConfig: CompiledExcludeConfig): boolean {
	if (!Array.isArray(entryNodes)) return false;

	let title = '';
	let link = '';

	for (const node of entryNodes) {
		const keys = Object.keys(node).filter((k) => k !== ':@');
		if (keys.length === 0) {
			// テキストノードの場合 (例: #text)
			// preserveOrder: true の場合、テキストは { "#text": "value" } のようになることが多いが
			// 設定による。単純な構造の場合はスキップ。
			continue;
		}
		const tagName = keys[0];
		const value = node[tagName];

		if (tagName === 'title') {
			title = extractTextValue(value);
		} else if (tagName === 'link') {
			// RSS: <link>url</link>
			// Atom: <link href="url" />
			const textVal = extractTextValue(value);
			if (textVal) {
				link = textVal;
			} else {
				// Atom style or RSS with attributes?
				// 属性チェック
				if (node[':@'] && node[':@']['@_href']) {
					link = node[':@']['@_href'];
				}
			}
		}
	}

	// 正規表現チェック
	// タイトル判定
	if (title) {
		for (const pattern of excludeConfig.title) {
			if (pattern.test(title)) {
				return true;
			}
		}
	}

	// リンク判定
	if (link) {
		for (const pattern of excludeConfig.link) {
			if (pattern.test(link)) {
				return true;
			}
		}
	}

	return false;
}

/**
 * ノードの値からテキストを抽出する
 * preserveOrder: true の場合、値は [{ "#text": "foo" }] のような配列か、直接の値の場合がある
 */
function extractTextValue(value: XmlNodeValue | XmlNodeValue[]): string {
	if (Array.isArray(value)) {
		for (const item of value) {
			if (item['#text']) {
				return item['#text'];
			}
			if (item['__cdata']) {
				return item['__cdata']; // cdataPropName option
			}
		}
	} else if (typeof value === 'string') {
		return value;
	}
	return '';
}
