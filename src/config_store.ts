import { Config, ExcludePatternConfig, CompiledExcludeConfig, validateConfig, validateRegExp, getDefaultConfig } from './config';

const CONFIG_KEY = 'config';

/**
 * D1から設定を読み込みます。存在しない場合はデフォルト設定を返します。
 */
export async function loadConfig(env: Env): Promise<Config> {
	try {
		const row = await env.RSSFILTER_DB.prepare('SELECT body FROM app_config WHERE id = ?').bind(CONFIG_KEY).first<{ body: string }>();
		if (!row) {
			return getDefaultConfig();
		}
		return JSON.parse(row.body) as Config;
	} catch (e) {
		console.error('Error loading config from D1:', e);
		return getDefaultConfig();
	}
}

/**
 * 設定をD1に保存します。保存前に正規表現パターンのバリデーションを行います。
 */
export async function saveConfig(env: Env, config: Config): Promise<void> {
	const globalErrors = validatePatterns(config.global);
	if (globalErrors.length > 0) {
		throw new Error(`Invalid regex patterns in global config: ${globalErrors.join(', ')}`);
	}

	for (const [site, siteConfig] of Object.entries(config.sites)) {
		const siteErrors = validatePatterns(siteConfig);
		if (siteErrors.length > 0) {
			throw new Error(`Invalid regex patterns in site config (${site}): ${siteErrors.join(', ')}`);
		}
	}

	const now = Date.now();
	await env.RSSFILTER_DB.prepare(
		`INSERT INTO app_config (id, body, updated_at) VALUES (?, ?, ?)
		 ON CONFLICT(id) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at`,
	)
		.bind(CONFIG_KEY, JSON.stringify(config), now)
		.run();
}

function validatePatterns(config: ExcludePatternConfig): string[] {
	const errors: string[] = [];
	for (const pattern of config.title) {
		if (!validateRegExp(pattern)) {
			errors.push(`title: "${pattern}"`);
		}
	}
	for (const pattern of config.link) {
		if (!validateRegExp(pattern)) {
			errors.push(`link: "${pattern}"`);
		}
	}
	return errors;
}

/**
 * サイトごとの設定をマージしたコンパイル済み設定を取得します。
 */
export async function getCompiledExcludeConfigForSite(env: Env, site?: string): Promise<CompiledExcludeConfig> {
	const config = await loadConfig(env);

	const merged: ExcludePatternConfig = {
		title: [...config.global.title],
		link: [...config.global.link],
	};

	if (site && config.sites[site]) {
		merged.title.push(...config.sites[site].title);
		merged.link.push(...config.sites[site].link);
	}

	return validateConfig(merged);
}
