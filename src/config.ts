import { excludeConfig } from './exclude_config';

/**
 * コンパイル済みの正規表現設定を保持するインターフェース
 */
interface CompiledExcludeConfig {
	title: RegExp[];
	link: RegExp[];
}

/**
 * 設定された正規表現パターンが有効かどうかを検証します。
 */
export function validateConfig(config: typeof excludeConfig): CompiledExcludeConfig {
	const result: CompiledExcludeConfig = {
		title: [],
		link: []
	};

	const validateList = (patterns: string[], type: 'title' | 'link') => {
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

// アプリケーション起動時に一度だけ検証を行う
export const compiledExcludeConfig = validateConfig(excludeConfig);

