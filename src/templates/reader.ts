import { navHtml, navStyles } from './nav';

export const readerHtmlTemplate = `<!DOCTYPE html>
<html lang="ja">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>RSS Reader</title>
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
	<style>
		body { max-width: 900px; margin: 0 auto; padding: 2rem; }
		${navStyles}
		.item { margin-bottom: 1.25rem; padding-bottom: 1rem; border-bottom: 1px solid var(--pico-muted-border-color); }
		.item-meta { font-size: 0.85rem; color: var(--pico-muted-color); margin-top: 0.25rem; }
		.item h3 { margin: 0 0 0.25rem; font-size: 1.1rem; }
		#status { color: var(--pico-muted-color); }
		.load-more { margin-top: 1.5rem; text-align: center; }
	</style>
</head>
<body>
	${navHtml.replace('href="/"', 'href="/" aria-current="page"')}
	<h1>RSS Reader</h1>
	<p id="status">読み込み中…</p>
	<div id="items"></div>
	<div class="load-more">
		<button type="button" id="load-more" class="secondary" hidden>もっと読む</button>
	</div>
	<script>
		let offset = 0;
		const limit = 30;
		let hasMore = true;

		function formatDate(ts) {
			if (!ts) return '';
			return new Date(ts).toLocaleString('ja-JP');
		}

		async function loadItems(append) {
			const status = document.getElementById('status');
			const container = document.getElementById('items');
			const loadBtn = document.getElementById('load-more');
			if (!append) {
				offset = 0;
				container.innerHTML = '';
			}
			status.textContent = '読み込み中…';
			loadBtn.hidden = true;

			const res = await fetch('/api/items?limit=' + limit + '&offset=' + offset);
			if (!res.ok) {
				status.textContent = '記事の取得に失敗しました';
				return;
			}
			const data = await res.json();
			const items = data.items || [];
			hasMore = items.length === limit;
			offset += items.length;

			if (!append && items.length === 0) {
				status.textContent = '記事がありません。購読を追加するか、取得を実行してください。';
				return;
			}
			status.textContent = '';

			for (const item of items) {
				const el = document.createElement('article');
				el.className = 'item';
				const title = item.title || '(無題)';
				const link = item.link ? '<a href="' + escapeAttr(item.link) + '" target="_blank" rel="noopener">' + escapeHtml(title) + '</a>' : escapeHtml(title);
				el.innerHTML = '<h3>' + link + '</h3>' +
					'<div class="item-meta">' + escapeHtml(item.subscription_title || item.feed_url || '') +
					(item.published_at ? ' · ' + formatDate(item.published_at) : '') + '</div>';
				if (item.summary) {
					const p = document.createElement('p');
					p.textContent = item.summary.length > 300 ? item.summary.slice(0, 300) + '…' : item.summary;
					el.appendChild(p);
				}
				container.appendChild(el);
			}

			loadBtn.hidden = !hasMore;
		}

		function escapeHtml(s) {
			const d = document.createElement('div');
			d.textContent = s;
			return d.innerHTML;
		}
		function escapeAttr(s) {
			return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
		}

		document.getElementById('load-more').addEventListener('click', () => loadItems(true));
		loadItems(false);
	</script>
</body>
</html>`;
