import { env } from 'cloudflare:workers';
import sql from '../migrations/0001_init.sql?raw';

const statements = sql
	.split(';')
	.map((s) =>
		s
			.split('\n')
			.filter((line) => !line.trim().startsWith('--'))
			.join('\n')
			.trim(),
	)
	.filter((s) => s.length > 0);

for (const statement of statements) {
	await env.RSSFILTER_DB.prepare(statement).run();
}
