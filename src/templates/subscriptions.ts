import { navHtml, navStyles } from './nav';

export const subscriptionsHtmlTemplate = `<!DOCTYPE html>
<html lang="ja">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>購読管理 - RSS Reader</title>
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
	<style>
		body { max-width: 900px; margin: 0 auto; padding: 2rem; }
		${navStyles}
		.sub-row { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; margin-bottom: 0.75rem; padding: 0.75rem; border: 1px solid var(--pico-muted-border-color); border-radius: var(--pico-border-radius); }
		.sub-row .info { flex: 1; min-width: 200px; }
		.sub-row .url { font-size: 0.8rem; color: var(--pico-muted-color); word-break: break-all; }
		.sub-row .meta { font-size: 0.75rem; color: var(--pico-muted-color); }
		.actions { display: flex; gap: 0.35rem; flex-wrap: wrap; }
		#message { margin-top: 0.5rem; }
	</style>
</head>
<body>
	${navHtml.replace('href="/subscriptions"', 'href="/subscriptions" aria-current="page"')}
	<h1>購読管理</h1>

	<form id="add-form">
		<label for="feed-url">フィード URL</label>
		<div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
			<input type="url" id="feed-url" name="feed_url" placeholder="https://example.com/feed.xml" required style="flex:1;min-width:200px;">
			<button type="submit">追加</button>
		</div>
	</form>
	<p id="message"></p>

	<h2>購読一覧</h2>
	<div id="list"><p>読み込み中…</p></div>

	<script>
		async function loadList() {
			const list = document.getElementById('list');
			const res = await fetch('/api/subscriptions');
			if (!res.ok) {
				list.innerHTML = '<p>取得に失敗しました</p>';
				return;
			}
			const data = await res.json();
			const subs = data.subscriptions || [];
			if (subs.length === 0) {
				list.innerHTML = '<p>購読がありません</p>';
				return;
			}
			list.innerHTML = '';
			for (const s of subs) {
				const row = document.createElement('div');
				row.className = 'sub-row';
				row.dataset.id = s.id;
				const title = s.title || s.site_hostname;
				const lastFetch = s.last_fetched_at ? new Date(s.last_fetched_at).toLocaleString('ja-JP') : '未取得';
				row.innerHTML =
					'<div class="info"><strong>' + esc(title) + '</strong>' +
					'<div class="url">' + esc(s.feed_url) + '</div>' +
					'<div class="meta">最終取得: ' + esc(lastFetch) +
					(s.last_error ? ' · エラー: ' + esc(s.last_error) : '') + '</div></div>' +
					'<div class="actions">' +
					'<button type="button" class="fetch-btn secondary outline">今すぐ取得</button>' +
					'<button type="button" class="toggle-btn secondary outline">' + (s.enabled ? '無効化' : '有効化') + '</button>' +
					'<button type="button" class="delete-btn secondary outline">削除</button>' +
					'</div>';
				row.querySelector('.fetch-btn').addEventListener('click', () => fetchNow(s.id));
				row.querySelector('.toggle-btn').addEventListener('click', () => toggleSub(s.id, !s.enabled));
				row.querySelector('.delete-btn').addEventListener('click', () => deleteSub(s.id));
				list.appendChild(row);
			}
		}

		function esc(s) {
			const d = document.createElement('div');
			d.textContent = String(s ?? '');
			return d.innerHTML;
		}

		document.getElementById('add-form').addEventListener('submit', async (e) => {
			e.preventDefault();
			const msg = document.getElementById('message');
			const url = document.getElementById('feed-url').value.trim();
			msg.textContent = '追加中…';
			const res = await fetch('/api/subscriptions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ feed_url: url }),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				msg.textContent = data.error || '追加に失敗しました';
				return;
			}
			msg.textContent = '追加しました。初回取得を開始しています…';
			document.getElementById('feed-url').value = '';
			await loadList();
			msg.textContent = '';
		});

		async function fetchNow(id) {
			const msg = document.getElementById('message');
			msg.textContent = '取得中…';
			const res = await fetch('/api/fetch?subscription_id=' + encodeURIComponent(id), { method: 'POST' });
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				msg.textContent = data.error || '取得に失敗しました';
				return;
			}
			msg.textContent = '取得完了（' + (data.itemsStored ?? 0) + ' 件処理）';
			await loadList();
		}

		async function toggleSub(id, enabled) {
			await fetch('/api/subscriptions/' + encodeURIComponent(id), {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ enabled }),
			});
			await loadList();
		}

		async function deleteSub(id) {
			if (!confirm('この購読を削除しますか？')) return;
			await fetch('/api/subscriptions/' + encodeURIComponent(id), { method: 'DELETE' });
			await loadList();
		}

		loadList();
	</script>
</body>
</html>`;
