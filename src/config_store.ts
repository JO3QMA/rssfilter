import { Config, ExcludePatternConfig, CompiledExcludeConfig, validateConfig, validateRegExp, getDefaultConfig } from './config';

const CONFIG_KEY = 'config';

/**
 * KVから設定を読み込みます。存在しない場合はデフォルト設定を返します。
 */
export async function loadConfig(env: Env): Promise<Config> {
	try {
		const stored = await env.CONFIG_KV.get(CONFIG_KEY);
		if (stored === null) {
			return getDefaultConfig();
		}
		return JSON.parse(stored) as Config;
	} catch (e) {
		console.error('Error loading config from KV:', e);
		// エラー時はデフォルト設定を返す
		return getDefaultConfig();
	}
}

/**
 * 設定をKVに保存します。保存前に正規表現パターンのバリデーションを行います。
 * @throws 不正な正規表現パターンが含まれている場合、エラーを投げます
 */
export async function saveConfig(env: Env, config: Config): Promise<void> {
	// グローバル設定のバリデーション
	const globalErrors = validatePatterns(config.global);
	if (globalErrors.length > 0) {
		throw new Error(`Invalid regex patterns in global config: ${globalErrors.join(', ')}`);
	}

	// サイトごとの設定のバリデーション
	for (const [site, siteConfig] of Object.entries(config.sites)) {
		const siteErrors = validatePatterns(siteConfig);
		if (siteErrors.length > 0) {
			throw new Error(`Invalid regex patterns in site config (${site}): ${siteErrors.join(', ')}`);
		}
	}

	// バリデーション通過後、KVに保存
	await env.CONFIG_KV.put(CONFIG_KEY, JSON.stringify(config));
}

/**
 * パターン設定を検証し、エラーのあるパターンリストを返します
 */
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
 * グローバル設定をベースに、サイト固有の設定で上書きします。
 */
export async function getCompiledExcludeConfigForSite(env: Env, site?: string): Promise<CompiledExcludeConfig> {
	const config = await loadConfig(env);

	// マージされた設定を作成
	const merged: ExcludePatternConfig = {
		title: [...config.global.title],
		link: [...config.global.link],
	};

	// サイト固有の設定があれば上書き
	if (site && config.sites[site]) {
		merged.title.push(...config.sites[site].title);
		merged.link.push(...config.sites[site].link);
	}

	// コンパイル済み設定を返す
	return validateConfig(merged);
}
