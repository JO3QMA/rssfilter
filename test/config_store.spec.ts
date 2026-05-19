import { env } from 'cloudflare:workers';
import { describe, it, expect } from 'vitest';
import { loadConfig, saveConfig, getCompiledExcludeConfigForSite } from '../src/config_store';
import { getDefaultConfig } from '../src/config';

describe('config_store (D1)', () => {
	it('returns default config when empty', async () => {
		const config = await loadConfig(env);
		expect(config).toEqual(getDefaultConfig());
	});

	it('saves and loads config', async () => {
		const config = {
			global: { title: ['^AD:'], link: [] },
			sites: {
				'example.com': { title: ['spam'], link: ['track\\.'] },
			},
		};
		await saveConfig(env, config);
		const loaded = await loadConfig(env);
		expect(loaded).toEqual(config);
	});

	it('merges site-specific exclude patterns', async () => {
		await saveConfig(env, {
			global: { title: ['global'], link: [] },
			sites: { 'test.com': { title: ['site'], link: [] } },
		});
		const compiled = await getCompiledExcludeConfigForSite(env, 'test.com');
		expect(compiled.title.length).toBe(2);
		expect(compiled.title[0].test('global')).toBe(true);
		expect(compiled.title[1].test('site')).toBe(true);
	});
});
