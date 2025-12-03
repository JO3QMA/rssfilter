import { describe, it, expect, vi } from 'vitest';
import { validateConfig } from '../src/config';

describe('Config Validation', () => {
	it('validates and ignores invalid regex patterns', () => {
		const config = {
			title: ['^ValidTitle', 'Invalid('],
			link: ['ValidLink$', 'Invalid[']
		};
		
		// コンソール警告をスパイ
		const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		
		const valid = validateConfig(config);
		
		expect(valid.title).toHaveLength(1);
		expect(valid.title[0].source).toBe('^ValidTitle');
		
		expect(valid.link).toHaveLength(1);
		expect(valid.link[0].source).toBe('ValidLink$');

		expect(consoleSpy).toHaveBeenCalledTimes(2);
		expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid regex pattern found in title config'));
		expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid regex pattern found in link config'));
		
		consoleSpy.mockRestore();
	});
});

