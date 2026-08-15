#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import App from './cli/app.js';
import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';

function loadEnv(): void {
	const envPath = join(process.cwd(), '.env');
	if (!existsSync(envPath)) return;
	const lines = readFileSync(envPath, 'utf8').split('\n');
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const eq = trimmed.indexOf('=');
		if (eq === -1) continue;
		const key = trimmed.slice(0, eq).trim();
		const value = trimmed
			.slice(eq + 1)
			.trim()
			.replace(/^["']|["']$/g, '');
		if (!process.env[key]) process.env[key] = value;
	}
}

function getApiKey(): string {
	loadEnv();
	if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
	console.error('No API key found. Add OPENROUTER_API_KEY=your-key to .env');
	process.exit(1);
}

function getRepoPath(): string | undefined {
	const arg = process.argv[2];
	if (!arg) return undefined;
	const p = resolve(arg);
	if (existsSync(p)) return p;
	return undefined;
}

const apiKey = getApiKey();
const repoPath = getRepoPath();

render(React.createElement(App, { apiKey, repoPath }));
