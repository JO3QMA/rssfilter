import { describe, it, expect } from 'vitest';
import { matchesExclude } from '../src/exclude';
import { validateConfig } from '../src/config';

describe('matchesExclude', () => {
	const compiled = validateConfig({
		title: ['^PR:', 'spam'],
		link: ['track\\.example'],
	});

	it('matches title patterns', () => {
		expect(matchesExclude('PR: News', '', compiled)).toBe(true);
		expect(matchesExclude('Normal', '', compiled)).toBe(false);
	});

	it('matches link patterns', () => {
		expect(matchesExclude('', 'https://safe.example.com/x', compiled)).toBe(false);
		expect(matchesExclude('', 'https://track.example.com/x', compiled)).toBe(true);
	});
});
