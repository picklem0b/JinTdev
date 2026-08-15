import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Box, Text, useInput, useApp } from 'ink'
import TextInput from 'ink-text-input'
import { Orchestrator } from '../engine/orchestrator.js'
import { defaultTheme } from './themes.js'
import type { AgentMessage, AgentRole, AgentStatus, AppState } from '../types/index.js'

const ROLE_LABELS: Record<AgentRole, string> = {
  leader: '[@leader]',
  backend: '[@backend]',
  frontend: '[@frontend]',
}

const TABS = ['feed', 'leader', 'backend', 'frontend', 'contract', 'diff'] as const
type Tab = typeof TABS[number]

const t = defaultTheme

function roleColor(role: AgentRole | 'user' | 'system'): string {
  if (role === 'leader') return t.leader
  if (role === 'backend') return t.backend
  if (role === 'frontend') return t.frontend
  if (role === 'user') return t.user
  return t.system
}

function StatusDot({ status }: { status: AgentStatus }) {
  const dots: Record<AgentStatus, string> = {
    idle: '○',
    thinking: '◌',
    responding: '●',
    waiting: '◐',
    done: '✓',
    error: '✗',
  }
  const colors: Record<AgentStatus, string> = {
    idle: t.muted,
    thinking: t.warning,
    responding: t.success,
    waiting: t.thinking,
    done: t.success,
    error: t.error,
  }
  return <Text color={colors[status]}>{dots[status]}</Text>
}

function Header({ activeTab, setTab, agentStatuses }: {
  activeTab: Tab
  setTab: (t: Tab) => void
  agentStatuses: Record<AgentRole, AgentStatus>
}) {
  return (
    <Box flexDirection="column" borderStyle="single" borderColor={t.border} paddingX={1}>
      <Box gap={1} marginBottom={0}>
        <Text color={t.leader} bold italic>AIDT</Text>
        <Text color={t.muted}>─</Text>
        {TABS.map((tab) => (
          <Box key={tab} marginRight={1}>
            <Text
              color={activeTab === tab ? t.user : t.muted}
              bold={activeTab === tab}
              underline={activeTab === tab}
            >
              {tab}
            </Text>
          </Box>
        ))}
      </Box>
      <Box gap={2}>
        {(['leader', 'backend', 'frontend'] as AgentRole[]).map(role => (
          <Box key={role} gap={1}>
            <StatusDot status={agentStatuses[role]} />
            <Text color={roleColor(role)} dimColor={agentStatuses[role] === 'idle'}>
              {role}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

function MessageFeed({ messages, filterRole }: {
  messages: AgentMessage[]
  filterRole?: AgentRole
}) {
  const filtered = filterRole
    ? messages.filter(m => m.from === filterRole || m.to === filterRole)
    : messages

  return (
    <Box flexDirection="column" flexGrow={1} paddingX={1} overflowY="hidden">
      {filtered.slice(-30).map((msg) => (
        <Box key={msg.id} flexDirection="column" marginBottom={1}>
          <Box gap={1}>
            <Text color={roleColor(msg.from as AgentRole)}>
              {msg.from === 'user' ? '[you]' : ROLE_LABELS[msg.from as AgentRole] ?? `[${msg.from}]`}
            </Text>
            <Text color={t.muted} dimColor>
              {new Date(msg.timestamp).toLocaleTimeString()}
            </Text>
            <Text color={t.muted} dimColor>
              {msg.type}
            </Text>
          </Box>
          <Box paddingLeft={2}>
            <Text color={msg.from === 'user' ? t.user : roleColor(msg.from as AgentRole)} wrap="wrap">
              {msg.content}
            </Text>
          </Box>
        </Box>
      ))}
    </Box>
  )
}

function StreamingIndicator({ role, token }: { role: AgentRole | null, token: string }) {
  if (!role || !token) return null
  return (
    <Box paddingX={1} paddingY={0}>
      <Text color={roleColor(role)}>{ROLE_LABELS[role]} </Text>
      <Text color={t.thinking} italic>{token}</Text>
      <Text color={t.warning}> ▌</Text>
    </Box>
  )
}

function InputBar({ value, onChange, onSubmit, targetAgent }: {
  value: string
  onChange: (v: string) => void
  onSubmit: (v: string) => void
  targetAgent: AgentRole | 'all' | null
}) {
  const prefix = targetAgent ? `@${targetAgent} ` : '> '
  return (
    <Box borderStyle="single" borderColor={t.border} paddingX={1}>
      <Text color={t.success} bold>{prefix}</Text>
      <TextInput value={value} onChange={onChange} onSubmit={onSubmit} />
    </Box>
  )
}

export default function App({ apiKey, repoPath }: { apiKey: string, repoPath?: string }) {
  const { exit } = useApp()
  const orchestratorRef = useRef(new Orchestrator())
  const orc = orchestratorRef.current

  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [input, setInput] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('feed')
  const [targetAgent, setTargetAgent] = useState<AgentRole | 'all' | null>(null)
  const [streamingRole, setStreamingRole] = useState<AgentRole | null>(null)
  const [streamingToken, setStreamingToken] = useState('')
  const [agentStatuses, setAgentStatuses] = useState<Record<AgentRole, AgentStatus>>({
    leader: 'idle',
    backend: 'idle',
    frontend: 'idle',
  })

  useEffect(() => {
    process.env.OPENROUTER_API_KEY = apiKey

    orc.on('message', (msg: AgentMessage) => {
      setMessages(prev => [...prev, msg])
      setStreamingToken('')
      setStreamingRole(null)
    })

    orc.on('token', (role: AgentRole, token: string) => {
      setStreamingRole(role)
      setStreamingToken(prev => prev + token)
    })

    orc.on('status', (role: AgentRole, status: string) => {
      setAgentStatuses(prev => ({ ...prev, [role]: status as AgentStatus }))
    })

    orc.on('phase', () => {})

    if (repoPath) {
      orc.setRepoContext(`Project path: ${repoPath}`)
    }
  }, [])

  useInput((inputStr, key) => {
    if (key.ctrl && inputStr === 'c') exit()
    if (key.tab) {
      const idx = TABS.indexOf(activeTab)
      setActiveTab(TABS[(idx + 1) % TABS.length])
    }
  })

  const handleSubmit = useCallback(async (value: string) => {
    if (!value.trim()) return
    setInput('')

    const atMatch = value.match(/^@(\w+)\s+(.*)/)
    if (atMatch) {
      const [, role, msg] = atMatch
      const validRoles: AgentRole[] = ['leader', 'backend', 'frontend']
      if (validRoles.includes(role as AgentRole)) {
        setTargetAgent(role as AgentRole)
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          from: 'user',
          to: role as AgentRole,
          type: 'CHAT',
          phase: 'RECEIVED',
          content: msg,
          timestamp: Date.now(),
        }])
        await orc.chat(msg, role as AgentRole)
        setTargetAgent(null)
        return
      }
    }

    if (value.startsWith('/task ')) {
      const request = value.slice(6)
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        from: 'user',
        to: 'all',
        type: 'TASK_ASSIGNMENT',
        phase: 'RECEIVED',
        content: request,
        timestamp: Date.now(),
      }])
      await orc.runTask(request)
      return
    }

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      from: 'user',
      to: 'leader',
      type: 'CHAT',
      phase: 'RECEIVED',
      content: value,
      timestamp: Date.now(),
    }])
    await orc.chat(value)
  }, [orc])

  const filterRole = activeTab !== 'feed' && activeTab !== 'contract' && activeTab !== 'diff'
    ? activeTab as AgentRole
    : undefined

  return (
    <Box flexDirection="column" height={process.stdout.rows}>
      <Header activeTab={activeTab} setTab={setActiveTab} agentStatuses={agentStatuses} />
      <MessageFeed messages={messages} filterRole={filterRole} />
      <StreamingIndicator role={streamingRole} token={streamingToken} />
      <InputBar
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        targetAgent={targetAgent}
      />
      <Box paddingX={1}>
        <Text color={t.muted} dimColor>
          Tab: switch tabs  @leader/@backend/@frontend: direct message  /task [request]: run team task  Ctrl+C: exit
        </Text>
      </Box>
    </Box>
  )
}
