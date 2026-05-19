#!/usr/bin/env node
/**
 * Appends (or replaces) a coverage section at the end of the current PR description.
 * Expects coverage/coverage-summary.json from Vitest (istanbul, json-summary reporter).
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';

const MARKER_START = '<!-- coverage:start -->';
const MARKER_END = '<!-- coverage:end -->';
const SUMMARY_PATH = 'coverage/coverage-summary.json';

const prNumber = process.env.PR_NUMBER;
if (!prNumber) {
	console.error('PR_NUMBER is required');
	process.exit(1);
}

function formatPct(pct) {
	return typeof pct === 'number' && !Number.isNaN(pct) ? `${pct.toFixed(2)}%` : 'N/A';
}

function relativePath(filePath) {
	const repoRoot = process.env.GITHUB_WORKSPACE || process.cwd();
	return relative(repoRoot, filePath).replace(/\\/g, '/');
}

function buildCoverageSection(summary) {
	const total = summary.total;
	const files = Object.keys(summary)
		.filter((key) => key !== 'total')
		.sort();

	let md = `${MARKER_START}\n`;
	md += '## Test coverage\n\n';
	md += `Run: ${process.env.GITHUB_SHA?.slice(0, 7) ?? 'local'}\n\n`;
	md += '| Metric | Coverage |\n| --- | ---: |\n';
	md += `| Statements | ${formatPct(total.statements.pct)} |\n`;
	md += `| Branches | ${formatPct(total.branches.pct)} |\n`;
	md += `| Functions | ${formatPct(total.functions.pct)} |\n`;
	md += `| Lines | ${formatPct(total.lines.pct)} |\n\n`;

	if (files.length > 0) {
		md += '<details>\n<summary>Per-file coverage</summary>\n\n';
		md += '| File | Stmts | Branch | Funcs | Lines |\n| --- | ---: | ---: | ---: | ---: |\n';
		for (const file of files) {
			const entry = summary[file];
			const path = relativePath(file);
			md += `| \`${path}\` | ${formatPct(entry.statements.pct)} | ${formatPct(entry.branches.pct)} | ${formatPct(entry.functions.pct)} | ${formatPct(entry.lines.pct)} |\n`;
		}
		md += '\n</details>\n';
	}

	md += `\n${MARKER_END}\n`;
	return md;
}

function stripOldCoverage(body) {
	const start = body.indexOf(MARKER_START);
	if (start === -1) {
		return body.trimEnd();
	}
	const end = body.indexOf(MARKER_END, start);
	if (end === -1) {
		return body.slice(0, start).trimEnd();
	}
	return (body.slice(0, start) + body.slice(end + MARKER_END.length)).trimEnd();
}

const summary = JSON.parse(readFileSync(SUMMARY_PATH, 'utf8'));
const section = buildCoverageSection(summary);

const oldBody = execSync(`gh pr view ${prNumber} --json body -q .body`, {
	encoding: 'utf8',
	stdio: ['pipe', 'pipe', 'inherit'],
});

const newBody = `${stripOldCoverage(oldBody)}\n\n${section}`.trimEnd() + '\n';
const bodyFile = '/tmp/pr-body.md';
writeFileSync(bodyFile, newBody, 'utf8');

execSync(`gh pr edit ${prNumber} --body-file ${bodyFile}`, { stdio: 'inherit' });
console.log(`Updated PR #${prNumber} description with coverage summary.`);
