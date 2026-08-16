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

const LOGO = [
	'    ╔═══════════╗',
	'    ║  >_  ~~~  ║',
	'    ║   ·  · )  ║',
	'    ║  ╔═════╗  ║',
	'    ║  ║ AI  ║  ║',
	'    ╚══╩═════╩══╝',
	'    ░░░░░░░░░░░░░',
	'   ░░   AIDT    ░░',
	'    ░░░░░░░░░░░░░'
];

const ROLE_LABEL: Record<AgentRole, string> = {
	leader: '[@leader]',
	backend: '[@backend]',
	frontend: '[@frontend]'
};

const ROLE_COLOR: Record<AgentRole | 'user' | 'system', string> = {
	leader: t.leader,
	backend: t.backend,
	frontend: t.frontend,
	user: t.user,
	system: t.system
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

function Logo() {
	return (
		<Box flexDirection='column' alignItems='center' marginBottom={1}>
			{LOGO.map((line, i) => (
				<Text key={i} color={i < 6 ? t.leader : t.muted}>
					{line}
				</Text>
			))}
			<Text color={t.muted} dimColor italic>
				{'  Use / for slash commands · @ for agents · Tab to switch  '}
			</Text>
		</Box>
	);
}

function TabBar({
	activeTab,
	agentStatuses
}: {
	activeTab: Tab;
	agentStatuses: Record<AgentRole, AgentStatus>;
}) {
	return (
		<Box
			flexDirection='column'
			borderStyle='round'
			borderColor={t.border}
			paddingX={1}
			marginBottom={0}
		>
			<Box gap={2}>
				{TABS.map(tab => {
					const active = tab === activeTab;
					return (
						<Box key={tab}>
							{active ? (
								<Text
									color={t.leader}
									bold
									underline
								>{` ${tab} `}</Text>
							) : (
								<Text color={t.muted}>{` ${tab} `}</Text>
							)}
						</Box>
					);
				})}
			</Box>
			<Box gap={3} marginTop={0}>
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

function ContextBar({
	repoPath,
	phase,
	tokenCount
}: {
	repoPath?: string;
	phase: string;
	tokenCount: number;
}) {
	return (
		<Box
			borderStyle='single'
			borderColor={t.border}
			paddingX={1}
			justifyContent='space-between'
		>
			<Box gap={1}>
				<Text color={t.muted}>{'📁'}</Text>
				<Text color={t.path}>{repoPath ?? 'no project'}</Text>
			</Box>
			<Box gap={2}>
				<Text color={t.muted}>
					phase: <Text color={t.warning}>{phase}</Text>
				</Text>
				<Text color={t.muted}>
					tokens:{' '}
					<Text color={t.cmdYellow}>
						{tokenCount.toLocaleString()}
					</Text>
				</Text>
				<Text color={t.muted}>
					model: <Text color={t.leader}>nemotron-ultra</Text>
				</Text>
			</Box>
		</Box>
	);
}

function UserMessage({ content, time }: { content: string; time: string }) {
	const width = process.stdout.columns - 4;
	const divider = '─'.repeat(Math.max(10, width));
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

function AgentMessageBlock({ msg }: { msg: AgentMessage }) {
	const role = msg.from as AgentRole;
	return (
		<Box flexDirection='column' marginBottom={1} paddingLeft={1}>
			<Box gap={1}>
				<Text color={ROLE_COLOR[role]} bold>
					{ROLE_LABEL[role] ?? `[${msg.from}]`}
				</Text>
				<Text color={t.muted} dimColor>
					{new Date(msg.timestamp).toLocaleTimeString()}
				</Text>
				<Text color={t.muted} dimColor italic>
					{msg.type}
				</Text>
			</Box>
			<Box paddingLeft={2} paddingTop={0}>
				<Text color={ROLE_COLOR[role]} wrap='wrap'>
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
				<Text color={t.warning}>thinking</Text>
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

function Feed({
	messages,
	filterRole,
	streamingRole,
	streamingBuffer,
	showLogo
}: {
	messages: AgentMessage[];
	filterRole?: AgentRole;
	streamingRole: AgentRole | null;
	streamingBuffer: string;
	showLogo: boolean;
}) {
	const visible = filterRole
		? messages.filter(m => m.from === filterRole || m.to === filterRole)
		: messages;

	return (
		<Box
			flexDirection='column'
			flexGrow={1}
			paddingX={1}
			overflowY='hidden'
		>
			{showLogo && visible.length === 0 && <Logo />}
			{visible.slice(-40).map(msg => {
				if (msg.from === 'user') {
					return (
						<UserMessage
							key={msg.id}
							content={msg.content}
							time={new Date(msg.timestamp).toLocaleTimeString()}
						/>
					);
				}
				return <AgentMessageBlock key={msg.id} msg={msg} />;
			})}
			{streamingRole && streamingBuffer && (
				<StreamingBlock role={streamingRole} buffer={streamingBuffer} />
			)}
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
	targetAgent: AgentRole | 'all' | null;
	busy: boolean;
}) {
	const prefix = targetAgent ? `@${targetAgent} ` : '';
	return (
		<Box
			flexDirection='column'
			borderStyle='round'
			borderColor={busy ? t.warning : t.border}
		>
			<Box paddingX={1} gap={1}>
				<Text color={t.muted}>{'❯'}</Text>
				{targetAgent && (
					<Text color={ROLE_COLOR[targetAgent as AgentRole]}>
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
		</Box>
	);
}

function HelpBar() {
	return (
		<Box paddingX={1} gap={2}>
			<Text color={t.muted} dimColor>
				Use <Text color={t.cmdGreen}>/</Text> for slash commands
			</Text>
			<Text color={t.muted} dimColor>
				<Text color={t.flagShort}>@</Text> for agent mentions
			</Text>
			<Text color={t.muted} dimColor>
				<Text color={t.cmdYellow}>Tab</Text> switch tabs
			</Text>
			<Text color={t.muted} dimColor>
				<Text color={t.error}>^C</Text> exit
			</Text>
		</Box>
	);
}

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
	const [targetAgent, setTargetAgent] = useState<AgentRole | 'all' | null>(
		null
	);
	const [streamingRole, setStreamingRole] = useState<AgentRole | null>(null);
	const [streamingBuffer, setStreamingBuffer] = useState('');
	const [phase, setPhase] = useState('IDLE');
	const [tokenCount, setTokenCount] = useState(0);
	const [busy, setBusy] = useState(false);
	const [agentStatuses, setAgentStatuses] = useState<
		Record<AgentRole, AgentStatus>
	>({
		leader: 'idle',
		backend: 'idle',
		frontend: 'idle'
	});

	useEffect(() => {
		process.env.OPENROUTER_API_KEY = apiKey;

		orc.on('message', (msg: AgentMessage) => {
			setMessages(prev => [...prev, msg]);
			setStreamingBuffer('');
			setStreamingRole(null);
			setTokenCount(prev => prev + msg.content.split(' ').length);
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
			setBusy(
				Object.values({ ...agentStatuses, [role]: status }).some(
					s => s === 'thinking' || s === 'responding'
				)
			);
		});

		orc.on('phase', (p: string) => setPhase(p));

		if (repoPath) orc.setRepoContext(`Project path: ${repoPath}`);
	}, []);

	useInput((char, key) => {
		if (key.ctrl && char === 'c') exit();
		if (key.tab) {
			const idx = TABS.indexOf(activeTab);
			setActiveTab(TABS[(idx + 1) % TABS.length]);
		}
		if (key.escape) setTargetAgent(null);
	});

	const handleSubmit = useCallback(
		async (value: string) => {
			if (!value.trim() || busy) return;
			setInput('');

			const atMatch = value.match(/^@(\w+)\s+(.+)/);
			if (atMatch) {
				const [, role, msg] = atMatch;
				const valid: AgentRole[] = ['leader', 'backend', 'frontend'];
				if (valid.includes(role as AgentRole)) {
					const target = role as AgentRole;
					setTargetAgent(target);
					setMessages(prev => [
						...prev,
						{
							id: Date.now().toString(),
							from: 'user',
							to: target,
							type: 'CHAT',
							phase: 'RECEIVED',
							content: msg,
							timestamp: Date.now()
						}
					]);
					setBusy(true);
					await orc.chat(msg, target);
					setBusy(false);
					setTargetAgent(null);
					return;
				}
			}

			if (value.startsWith('/task ')) {
				const request = value.slice(6).trim();
				setMessages(prev => [
					...prev,
					{
						id: Date.now().toString(),
						from: 'user',
						to: 'all',
						type: 'TASK_ASSIGNMENT',
						phase: 'RECEIVED',
						content: request,
						timestamp: Date.now()
					}
				]);
				setBusy(true);
				await orc.runTask(request);
				setBusy(false);
				return;
			}

			if (value.startsWith('/clear')) {
				setMessages([]);
				orc.clearAll();
				setPhase('IDLE');
				return;
			}

			setMessages(prev => [
				...prev,
				{
					id: Date.now().toString(),
					from: 'user',
					to: 'leader',
					type: 'CHAT',
					phase: 'RECEIVED',
					content: value,
					timestamp: Date.now()
				}
			]);
			setBusy(true);
			await orc.chat(value);
			setBusy(false);
		},
		[orc, busy, agentStatuses]
	);

	const filterRole = (['leader', 'backend', 'frontend'] as Tab[]).includes(
		activeTab
	)
		? (activeTab as AgentRole)
		: undefined;

	return (
		<Box flexDirection='column' height={process.stdout.rows}>
			<TabBar activeTab={activeTab} agentStatuses={agentStatuses} />
			<ContextBar
				repoPath={repoPath}
				phase={phase}
				tokenCount={tokenCount}
			/>
			<Feed
				messages={messages}
				filterRole={filterRole}
				streamingRole={streamingRole}
				streamingBuffer={streamingBuffer}
				showLogo={activeTab === 'feed'}
			/>
			<InputBar
				value={input}
				onChange={setInput}
				onSubmit={handleSubmit}
				targetAgent={targetAgent}
				busy={busy}
			/>
			<HelpBar />
		</Box>
	);
}
