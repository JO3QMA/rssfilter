import type { CompiledExcludeConfig } from './config';

/**
 * タイトル・リンクが除外パターンに一致するか判定します。
 */
export function matchesExclude(title: string, link: string, excludeConfig: CompiledExcludeConfig): boolean {
	if (title) {
		for (const pattern of excludeConfig.title) {
			if (pattern.test(title)) {
				return true;
			}
		}
	}

	if (link) {
		for (const pattern of excludeConfig.link) {
			if (pattern.test(link)) {
				return true;
			}
		}
	}

	return false;
}
