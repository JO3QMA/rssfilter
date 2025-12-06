/**
 * 除外パターン設定のインターフェース
 */
export interface ExcludePatternConfig {
	title: string[];
	link: string[];
}

/**
 * サイトごとの設定を含む完全な設定インターフェース
 */
export interface Config {
	global: ExcludePatternConfig;
	sites: Record<string, ExcludePatternConfig>;
}

/**
 * コンパイル済みの正規表現設定を保持するインターフェース
 */
export interface CompiledExcludeConfig {
	title: RegExp[];
	link: RegExp[];
}

/**
 * 正規表現パターンが有効かどうかを検証します。
 * @param pattern 検証する正規表現パターン
 * @returns 有効な場合は true、無効な場合は false
 */
export function validateRegExp(pattern: string): boolean {
	try {
		new RegExp(pattern);
		return true;
	} catch {
		return false;
	}
}

/**
 * 設定された正規表現パターンが有効かどうかを検証し、コンパイル済みの設定を返します。
 */
export function validateConfig(config: ExcludePatternConfig): CompiledExcludeConfig {
	const result: CompiledExcludeConfig = {
		title: [],
		link: [],
	};

	const validateList = (patterns: string[], type: 'title' | 'link'): void => {
		for (const pattern of patterns) {
			try {
				result[type].push(new RegExp(pattern, 'i'));
			} catch (e) {
				console.warn(`Invalid regex pattern found in ${type} config: "${pattern}". Skipping. Error: ${e}`);
			}
		}
	};

	validateList(config.title, 'title');
	validateList(config.link, 'link');

	return result;
}

/**
 * デフォルト設定を取得します（KVに設定が無い場合に使用）
 * 旧来の exclude_config.ts は使用せず、空のデフォルト設定を返します
 */
export function getDefaultConfig(): Config {
	return {
		global: {
			title: [],
			link: [],
		},
		sites: {},
	};
}

// アプリケーション起動時に一度だけ検証を行う（後方互換性のため残す）
export const compiledExcludeConfig = validateConfig({
	title: [],
	link: [],
});
