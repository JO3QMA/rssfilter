import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		cloudflareTest({
			wrangler: { configPath: './wrangler.jsonc' },
		}),
	],
	test: {
		setupFiles: ['./test/apply-migrations.ts'],
		coverage: {
			provider: 'istanbul',
			include: ['src/**/*.ts'],
			exclude: ['src/templates/**'],
			reporter: process.env.CI
				? ['text', 'text-summary', 'lcov', 'json-summary']
				: ['text', 'text-summary', 'html'],
			reportsDirectory: './coverage',
		},
	},
});
