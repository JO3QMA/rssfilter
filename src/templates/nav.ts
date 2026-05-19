export const navHtml = `<nav class="app-nav">
	<a href="/">Reader</a>
	<a href="/subscriptions">購読</a>
	<a href="/settings">設定</a>
</nav>`;

export const navStyles = `
	.app-nav {
		display: flex;
		gap: 1rem;
		margin-bottom: 1.5rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--pico-muted-border-color);
	}
	.app-nav a {
		text-decoration: none;
		font-weight: 500;
	}
	.app-nav a[aria-current="page"] {
		color: var(--pico-primary);
	}
`;
