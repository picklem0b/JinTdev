import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { Orchestrator } from '../engine/orchestrator.js';
import { defaultTheme } from './themes.js';
import type { AgentMessage, AgentRole, AgentStatus } from '../types/index.js';

const TABS = [
	'feed',
	'leader',
	'backend',
	'frontend',
	'contract',
	'diff'
] as const;
type Tab = (typeof TABS)[number];
const t = defaultTheme;

// ─── Logo ────────────────────────────────────────────────────────────────────

const LOGO = [
	'         ╔══════════════╗         ',
	'         ║  ╔════════╗  ║         ',
	'         ║  ║ >_ ~ · ║  ║         ',
	'         ║  ║  · ·   ║  ║         ',
	'         ║  ╚════════╝  ║         ',
	'         ║   ▓▓▓▓▓▓▓▓  ║         ',
	'         ╚══════════════╝         ',
	'        ░░░░░░░░░░░░░░░░░░        ',
	'       ░░   AI  DEV  TEAM   ░░    ',
	'        ░░░░░░░░░░░░░░░░░░░░      ',
	'              A I D T             '
];

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<AgentRole, string> = {
	leader: '[@leader]',
	backend: '[@backend]',
	frontend: '[@frontend]'
};

const ROLE_COLOR: Record<string, string> = {
	leader: t.leader,
	backend: t.backend,
	frontend: t.frontend,
	user: t.user,
	system: t.system,
	all: t.muted
};

const STATUS_DOT: Record<AgentStatus, string> = {
	idle: '○',
	thinking: '◌',
	responding: '●',
	waiting: '◐',
	done: '✓',
	error: '✗'
};

const STATUS_COLOR: Record<AgentStatus, string> = {
	idle: t.muted,
	thinking: t.warning,
	responding: t.success,
	waiting: t.thinking,
	done: t.success,
	error: t.error
};

const SLASH_COMMANDS = [
	{ cmd: '/task', desc: 'Run full team on a task' },
	{ cmd: '/clear', desc: 'Clear session and history' },
	{ cmd: '/help', desc: 'Show all commands' },
	{ cmd: '/project', desc: 'Set project path' },
	{ cmd: '/model', desc: 'Show active models' },
	{ cmd: '/history', desc: 'Show input history' },
	{ cmd: '/status', desc: 'Show agent statuses' },
	{ cmd: '/reset', desc: 'Reset all agent memory' }
];

const AT_OPTIONS = [
	{ name: 'leader', desc: 'Talk to Leader only' },
	{ name: 'backend', desc: 'Talk to Backend only' },
	{ name: 'frontend', desc: 'Talk to Frontend only' },
	{ name: 'all', desc: 'Broadcast to all agents' }
];

// ─── Subcomponents ───────────────────────────────────────────────────────────

function Logo() {
	return (
		<Box flexDirection='column' alignItems='center' marginY={1}>
			{LOGO.map((line, i) => (
				<Text
					key={i}
					color={i < 7 ? t.leader : i === 10 ? t.warning : t.muted}
				>
					{line}
				</Text>
			))}
			<Box marginTop={1}>
				<Text color={t.muted} dimColor italic>
					Use / for commands · @ for agents · ↑↓ history
				</Text>
			</Box>
		</Box>
	);
}

function TabBar({ activeTab }: { activeTab: Tab }) {
	return (
		<Box borderStyle='round' borderColor={t.border} paddingX={1}>
			<Text color={t.leader} bold italic>
				AIDT
			</Text>
			<Text color={t.muted}> ─ </Text>
			{TABS.map((tab, i) => (
				<Box key={tab}>
					{i > 0 && <Text color={t.muted}> </Text>}
					<Text
						color={activeTab === tab ? t.leader : t.muted}
						bold={activeTab === tab}
						underline={activeTab === tab}
					>
						{tab}
					</Text>
				</Box>
			))}
		</Box>
	);
}

function UserMessage({ content, time }: { content: string; time: string }) {
	const width = Math.max(10, (process.stdout.columns ?? 80) - 4);
	const divider = '─'.repeat(width);
	return (
		<Box flexDirection='column' marginBottom={1}>
			<Text color={t.muted} dimColor>
				{divider}
			</Text>
			<Box paddingX={1} gap={1}>
				<Text color={t.user} wrap='wrap'>
					{content}
				</Text>
				<Text color={t.muted} dimColor>
					{time}
				</Text>
			</Box>
			<Text color={t.muted} dimColor>
				{divider}
			</Text>
		</Box>
	);
}

function ErrorMessage({ content }: { content: string }) {
	return (
		<Box
			flexDirection='column'
			marginBottom={1}
			paddingX={1}
			borderStyle='single'
			borderColor={t.error}
		>
			<Text color={t.error} bold>
				✗ error
			</Text>
			<Text color={t.error} wrap='wrap'>
				{content}
			</Text>
		</Box>
	);
}

function AgentMessageBlock({ msg }: { msg: AgentMessage }) {
	const role = msg.from as AgentRole;
	return (
		<Box flexDirection='column' marginBottom={1} paddingLeft={1}>
			<Box gap={1}>
				<Text color={ROLE_COLOR[role] ?? t.system} bold>
					{ROLE_LABEL[role] ?? `[${msg.from}]`}
				</Text>
				<Text color={t.muted} dimColor>
					{new Date(msg.timestamp).toLocaleTimeString()}
				</Text>
				<Text color={t.muted} dimColor italic>
					{msg.type}
				</Text>
			</Box>
			<Box paddingLeft={2}>
				<Text color={ROLE_COLOR[role] ?? t.system} wrap='wrap'>
					{msg.content}
				</Text>
			</Box>
		</Box>
	);
}

function StreamingBlock({ role, buffer }: { role: AgentRole; buffer: string }) {
	return (
		<Box flexDirection='column' marginBottom={1} paddingLeft={1}>
			<Box gap={1}>
				<Text color={ROLE_COLOR[role]} bold>
					{ROLE_LABEL[role]}
				</Text>
				<Text color={t.warning} italic>
					thinking
				</Text>
				<Text color={t.warning}>▌</Text>
			</Box>
			<Box paddingLeft={2}>
				<Text color={t.thinking} italic wrap='wrap'>
					{buffer}
				</Text>
			</Box>
		</Box>
	);
}

function AutocompleteMenu({
	items,
	selectedIdx,
	type
}: {
	items: { label: string; desc: string }[];
	selectedIdx: number;
	type: 'slash' | 'at';
}) {
	return (
		<Box
			flexDirection='column'
			borderStyle='round'
			borderColor={type === 'slash' ? t.cmdGreen : t.flagShort}
			marginX={1}
		>
			{items.map((item, i) => (
				<Box key={item.label} paddingX={1} gap={2}>
					<Text
						color={i === selectedIdx ? t.user : t.muted}
						bold={i === selectedIdx}
						inverse={i === selectedIdx}
					>
						{item.label.padEnd(14)}
					</Text>
					<Text color={t.muted} dimColor>
						{item.desc}
					</Text>
				</Box>
			))}
		</Box>
	);
}

function ContextBar({
	repoPath,
	phase,
	tokenCount,
	cost,
	agentStatuses
}: {
	repoPath?: string;
	phase: string;
	tokenCount: number;
	cost: number;
	agentStatuses: Record<AgentRole, AgentStatus>;
}) {
	return (
		<Box
			flexDirection='column'
			borderStyle='single'
			borderColor={t.border}
			paddingX={1}
		>
			<Box justifyContent='space-between'>
				<Box gap={1}>
					<Text color={t.muted}>📁</Text>
					<Text color={t.path}>{repoPath ?? 'no project'}</Text>
				</Box>
				<Box gap={2}>
					<Text color={t.muted}>
						phase:<Text color={t.warning}> {phase}</Text>
					</Text>
					<Text color={t.muted}>
						tokens:
						<Text color={t.cmdYellow}>
							{' '}
							{tokenCount.toLocaleString()}
						</Text>
					</Text>
					<Text color={t.muted}>
						cost:<Text color={t.success}> ~${cost.toFixed(4)}</Text>
					</Text>
				</Box>
			</Box>
			<Box gap={3}>
				{(['leader', 'backend', 'frontend'] as AgentRole[]).map(
					role => (
						<Box key={role} gap={1}>
							<Text color={STATUS_COLOR[agentStatuses[role]]}>
								{STATUS_DOT[agentStatuses[role]]}
							</Text>
							<Text color={ROLE_COLOR[role]}>{role}</Text>
							<Text color={t.muted} dimColor>
								{agentStatuses[role]}
							</Text>
						</Box>
					)
				)}
			</Box>
		</Box>
	);
}

function InputBar({
	value,
	onChange,
	onSubmit,
	targetAgent,
	busy
}: {
	value: string;
	onChange: (v: string) => void;
	onSubmit: (v: string) => void;
	targetAgent: string | null;
	busy: boolean;
}) {
	return (
		<Box
			borderStyle='round'
			borderColor={busy ? t.warning : t.border}
			paddingX={1}
			gap={1}
		>
			<Text color={busy ? t.warning : t.success}>❯</Text>
			{targetAgent && (
				<Text color={ROLE_COLOR[targetAgent] ?? t.muted} bold>
					@{targetAgent}
				</Text>
			)}
			<TextInput
				value={value}
				onChange={onChange}
				onSubmit={onSubmit}
				placeholder={
					busy ? 'Team is working...' : 'What can I do for you?'
				}
			/>
		</Box>
	);
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App({
	apiKey,
	repoPath
}: {
	apiKey: string;
	repoPath?: string;
}) {
	const { exit } = useApp();
	const orcRef = useRef(new Orchestrator());
	const orc = orcRef.current;

	const [messages, setMessages] = useState<AgentMessage[]>([]);
	const [input, setInput] = useState('');
	const [activeTab, setActiveTab] = useState<Tab>('feed');
	const [targetAgent, setTargetAgent] = useState<string | null>(null);
	const [streamingRole, setStreamingRole] = useState<AgentRole | null>(null);
	const [streamingBuffer, setStreamingBuffer] = useState('');
	const [phase, setPhase] = useState('IDLE');
	const [tokenCount, setTokenCount] = useState(0);
	const [cost, setCost] = useState(0);
	const [busy, setBusy] = useState(false);
	const [inputHistory, setInputHistory] = useState<string[]>([]);
	const [historyIdx, setHistoryIdx] = useState(-1);
	const [autocomplete, setAutocomplete] = useState<'slash' | 'at' | null>(
		null
	);
	const [acSelectedIdx, setAcSelectedIdx] = useState(0);
	const [acFilter, setAcFilter] = useState('');
	const [agentStatuses, setAgentStatuses] = useState<
		Record<AgentRole, AgentStatus>
	>({
		leader: 'idle',
		backend: 'idle',
		frontend: 'idle'
	});

	const currentRepoPath = useRef(repoPath);

	useEffect(() => {
		process.env.OPENROUTER_API_KEY = apiKey;

		orc.on('message', (msg: AgentMessage) => {
			setMessages(prev => [...prev, msg]);
			setStreamingBuffer('');
			setStreamingRole(null);
			setTokenCount(prev => prev + msg.content.split(' ').length);
			setCost(prev => prev + 0.0);
		});

		orc.on('token', (role: AgentRole, token: string) => {
			setStreamingRole(role);
			setStreamingBuffer(prev => prev + token);
		});

		orc.on('status', (role: AgentRole, status: string) => {
			setAgentStatuses(prev => ({
				...prev,
				[role]: status as AgentStatus
			}));
		});

		orc.on('phase', (p: string) => setPhase(p));

		orc.on('error', (err: Error) => {
			setMessages(prev => [
				...prev,
				{
					id: Date.now().toString(),
					from: 'system',
					to: 'user',
					type: 'CHAT',
					phase: 'FAILED',
					content: err.message,
					timestamp: Date.now()
				}
			]);
			setBusy(false);
			setPhase('FAILED');
		});

		if (repoPath) orc.setRepoContext(`Project path: ${repoPath}`);
	}, []);

	// ─── Autocomplete filtering ───────────────────────────────────────────────

	const slashItems = SLASH_COMMANDS.filter(c =>
		c.cmd.startsWith(acFilter)
	).map(c => ({ label: c.cmd, desc: c.desc }));

	const atItems = AT_OPTIONS.filter(a => a.name.startsWith(acFilter)).map(
		a => ({ label: `@${a.name}`, desc: a.desc })
	);

	const acItems = autocomplete === 'slash' ? slashItems : atItems;

	// ─── Input handling ───────────────────────────────────────────────────────

	const handleChange = useCallback((val: string) => {
		setInput(val);
		setHistoryIdx(-1);

		if (val === '/') {
			setAutocomplete('slash');
			setAcFilter('/');
			setAcSelectedIdx(0);
		} else if (val.startsWith('/') && !val.includes(' ')) {
			setAutocomplete('slash');
			setAcFilter(val);
			setAcSelectedIdx(0);
		} else if (val === '@') {
			setAutocomplete('at');
			setAcFilter('');
			setAcSelectedIdx(0);
		} else if (val.startsWith('@') && !val.includes(' ')) {
			setAutocomplete('at');
			setAcFilter(val.slice(1));
			setAcSelectedIdx(0);
		} else {
			setAutocomplete(null);
		}
	}, []);

	const addMessage = useCallback(
		(content: string, to: string, type = 'CHAT') => {
			setMessages(prev => [
				...prev,
				{
					id: Date.now().toString(),
					from: 'user',
					to: to as AgentRole,
					type: type as any,
					phase: 'RECEIVED',
					content,
					timestamp: Date.now()
				}
			]);
		},
		[]
	);

	const handleSubmit = useCallback(
		async (value: string) => {
			if (!value.trim()) return;

			// ── autocomplete selection ──
			if (autocomplete && acItems.length > 0) {
				const selected = acItems[acSelectedIdx];
				if (selected) {
					if (autocomplete === 'slash') {
						setInput(selected.label + ' ');
					} else {
						const name = selected.label.slice(1);
						setTargetAgent(name);
						setInput('');
					}
					setAutocomplete(null);
					return;
				}
			}

			if (busy) return;
			setInput('');
			setAutocomplete(null);
			setInputHistory(prev => [value, ...prev.slice(0, 49)]);

			// ── @agent message ──
			const atMatch = value.match(/^@(\w+)\s+(.+)/);
			if (atMatch) {
				const [, role, msg] = atMatch;
				const valid = ['leader', 'backend', 'frontend', 'all'];
				if (valid.includes(role)) {
					addMessage(msg, role);
					setBusy(true);
					if (role === 'all') {
						await orc.runTask(msg);
					} else {
						await orc.chat(msg, role as AgentRole);
					}
					setBusy(false);
					setTargetAgent(null);
					return;
				}
			}

			// ── targeted agent from state ──
			if (targetAgent) {
				addMessage(value, targetAgent);
				setBusy(true);
				if (targetAgent === 'all') {
					await orc.runTask(value);
				} else {
					await orc.chat(value, targetAgent as AgentRole);
				}
				setBusy(false);
				return;
			}

			// ── slash commands ──
			if (value.startsWith('/task ')) {
				const req = value.slice(6).trim();
				addMessage(req, 'all', 'TASK_ASSIGNMENT');
				setBusy(true);
				await orc.runTask(req);
				setBusy(false);
				return;
			}

			if (value === '/clear') {
				setMessages([]);
				orc.clearAll();
				setPhase('IDLE');
				setTokenCount(0);
				setCost(0);
				return;
			}

			if (value === '/reset') {
				orc.clearAll();
				setMessages(prev => [
					...prev,
					{
						id: Date.now().toString(),
						from: 'system',
						to: 'user',
						type: 'CHAT',
						phase: 'RECEIVED',
						content: 'All agent memory cleared.',
						timestamp: Date.now()
					}
				]);
				return;
			}

			if (value === '/status') {
				const lines = Object.entries(agentStatuses)
					.map(([r, s]) => `${r}: ${s}`)
					.join('  |  ');
				setMessages(prev => [
					...prev,
					{
						id: Date.now().toString(),
						from: 'system',
						to: 'user',
						type: 'CHAT',
						phase: 'RECEIVED',
						content: lines,
						timestamp: Date.now()
					}
				]);
				return;
			}

			if (value === '/model') {
				setMessages(prev => [
					...prev,
					{
						id: Date.now().toString(),
						from: 'system',
						to: 'user',
						type: 'CHAT',
						phase: 'RECEIVED',
						content:
							'leader: nemotron-ultra-550b  |  backend: laguna-s-2.1  |  frontend: nemotron-nano-omni',
						timestamp: Date.now()
					}
				]);
				return;
			}

			if (value === '/help') {
				const help = SLASH_COMMANDS.map(
					c => `${c.cmd.padEnd(12)} ${c.desc}`
				).join('\n');
				setMessages(prev => [
					...prev,
					{
						id: Date.now().toString(),
						from: 'system',
						to: 'user',
						type: 'CHAT',
						phase: 'RECEIVED',
						content: help,
						timestamp: Date.now()
					}
				]);
				return;
			}

			if (value.startsWith('/project ')) {
				const path = value.slice(9).trim();
				currentRepoPath.current = path;
				orc.setRepoContext(`Project path: ${path}`);
				setMessages(prev => [
					...prev,
					{
						id: Date.now().toString(),
						from: 'system',
						to: 'user',
						type: 'CHAT',
						phase: 'RECEIVED',
						content: `Project set to: ${path}`,
						timestamp: Date.now()
					}
				]);
				return;
			}

			if (value === '/history') {
				const hist = inputHistory
					.slice(0, 10)
					.map((h, i) => `${i + 1}. ${h}`)
					.join('\n');
				setMessages(prev => [
					...prev,
					{
						id: Date.now().toString(),
						from: 'system',
						to: 'user',
						type: 'CHAT',
						phase: 'RECEIVED',
						content: hist || 'No history yet.',
						timestamp: Date.now()
					}
				]);
				return;
			}

			// ── default: chat with leader ──
			addMessage(value, 'leader');
			setBusy(true);
			await orc.chat(value);
			setBusy(false);
		},
		[
			orc,
			busy,
			autocomplete,
			acItems,
			acSelectedIdx,
			targetAgent,
			agentStatuses,
			inputHistory
		]
	);

	// ─── Key handling ─────────────────────────────────────────────────────────

	useInput((char, key) => {
		if (key.ctrl && char === 'c') exit();

		if (key.tab && !autocomplete) {
			const idx = TABS.indexOf(activeTab);
			setActiveTab(TABS[(idx + 1) % TABS.length]);
			return;
		}

		if (autocomplete) {
			if (key.upArrow) {
				setAcSelectedIdx(i => Math.max(0, i - 1));
				return;
			}
			if (key.downArrow) {
				setAcSelectedIdx(i => Math.min(acItems.length - 1, i + 1));
				return;
			}
			if (key.escape) {
				setAutocomplete(null);
				return;
			}
			return;
		}

		if (key.upArrow && !autocomplete) {
			const next = Math.min(historyIdx + 1, inputHistory.length - 1);
			setHistoryIdx(next);
			if (inputHistory[next]) setInput(inputHistory[next]);
			return;
		}

		if (key.downArrow && !autocomplete) {
			const next = historyIdx - 1;
			if (next < 0) {
				setHistoryIdx(-1);
				setInput('');
			} else {
				setHistoryIdx(next);
				if (inputHistory[next]) setInput(inputHistory[next]);
			}
			return;
		}

		if (key.escape) {
			setTargetAgent(null);
			setAutocomplete(null);
		}
	});

	// ─── Feed filtering ───────────────────────────────────────────────────────

	const filterRole = (['leader', 'backend', 'frontend'] as string[]).includes(
		activeTab
	)
		? (activeTab as AgentRole)
		: undefined;

	const visibleMessages = filterRole
		? messages.filter(m => m.from === filterRole || m.to === filterRole)
		: messages;

	return (
		<Box flexDirection='column' height={process.stdout.rows}>
			{/* Tab bar */}
			<TabBar activeTab={activeTab} />

			{/* Feed */}
			<Box
				flexDirection='column'
				flexGrow={1}
				paddingX={1}
				overflowY='hidden'
			>
				{visibleMessages.length === 0 && activeTab === 'feed' && (
					<Logo />
				)}
				{visibleMessages.slice(-40).map(msg => {
					if (msg.from === 'user') {
						return (
							<UserMessage
								key={msg.id}
								content={msg.content}
								time={new Date(
									msg.timestamp
								).toLocaleTimeString()}
							/>
						);
					}
					if (msg.phase === 'FAILED' || msg.from === 'system') {
						return (
							<ErrorMessage key={msg.id} content={msg.content} />
						);
					}
					return <AgentMessageBlock key={msg.id} msg={msg} />;
				})}
				{streamingRole && streamingBuffer && (
					<StreamingBlock
						role={streamingRole}
						buffer={streamingBuffer}
					/>
				)}
			</Box>

			{/* Autocomplete menu */}
			{autocomplete && acItems.length > 0 && (
				<AutocompleteMenu
					items={acItems}
					selectedIdx={acSelectedIdx}
					type={autocomplete}
				/>
			)}

			{/* Context bar */}
			<ContextBar
				repoPath={currentRepoPath.current}
				phase={phase}
				tokenCount={tokenCount}
				cost={cost}
				agentStatuses={agentStatuses}
			/>

			{/* Input */}
			<InputBar
				value={input}
				onChange={handleChange}
				onSubmit={handleSubmit}
				targetAgent={targetAgent}
				busy={busy}
			/>
		</Box>
	);
}
