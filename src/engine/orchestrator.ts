import { LeaderAgent } from '../agents/leader.agent.js'
import { BackendAgent } from '../agents/backend.agent.js'
import { FrontendAgent } from '../agents/frontend.agent.js'
import { bus } from './message-bus.js'
import { EventEmitter } from 'events'
import type { AgentRole, TaskPhase, AgentMessage } from '../types/index.js'

export interface OrchestratorEvents {
  phase: (phase: TaskPhase) => void
  token: (role: AgentRole, token: string) => void
  message: (msg: AgentMessage) => void
  status: (role: AgentRole, status: string) => void
  error: (err: Error) => void
}

export class Orchestrator extends EventEmitter {
  public leader = new LeaderAgent()
  public backend = new BackendAgent()
  public frontend = new FrontendAgent()

  private phase: TaskPhase = 'RECEIVED'
  private repoContext: string = ''

  constructor() {
    super()
    bus.on('message', (msg: AgentMessage) => {
      this.emit('message', msg)
    })
  }

  setRepoContext(context: string): void {
    this.repoContext = context
    this.leader.injectContext(context)
    this.backend.injectContext(context)
    this.frontend.injectContext(context)
  }

  private setPhase(phase: TaskPhase): void {
    this.phase = phase
    this.emit('phase', phase)
  }

  private emitToken(role: AgentRole, token: string): void {
    this.emit('token', role, token)
  }

  private emitStatus(role: AgentRole, status: string): void {
    this.emit('status', role, status)
  }

  async chat(userMessage: string, targetRole?: AgentRole): Promise<void> {
    const role = targetRole ?? 'leader'
    const agent = this.getAgent(role)

    this.emitStatus(role, 'thinking')

    await agent.chat(userMessage, (token) => {
      this.emitToken(role, token)
    })

    this.emitStatus(role, 'idle')
  }

  async runTask(userRequest: string): Promise<void> {
    try {
      this.setPhase('ANALYZING')
      this.emitStatus('leader', 'thinking')

      const plan = await this.leader.send(
        `New task from user:\n\n${userRequest}\n\nRepo context:\n${this.repoContext}\n\nAnalyze this request. Create an implementation plan. Define the API contract. Then delegate to backend and frontend.`,
        'TASK_ASSIGNMENT',
        'all',
        'PLANNING',
        (token) => this.emitToken('leader', token)
      )

      this.setPhase('DELEGATING')
      this.emitStatus('leader', 'idle')

      this.emitStatus('backend', 'thinking')
      await this.backend.send(
        `Leader's plan:\n\n${plan}\n\nUser request: ${userRequest}\n\nPropose your backend implementation.`,
        'PROPOSAL',
        'leader',
        'PROPOSING',
        (token) => this.emitToken('backend', token)
      )
      this.emitStatus('backend', 'idle')

      this.emitStatus('frontend', 'thinking')
      await this.frontend.send(
        `Leader's plan:\n\n${plan}\n\nUser request: ${userRequest}\n\nPropose your frontend implementation.`,
        'PROPOSAL',
        'leader',
        'PROPOSING',
        (token) => this.emitToken('frontend', token)
      )
      this.emitStatus('frontend', 'idle')

      this.setPhase('REVIEWING')
      this.emitStatus('leader', 'thinking')

      const backendMessages = bus.getHistoryFor('backend')
      const frontendMessages = bus.getHistoryFor('frontend')
      const proposals = backendMessages.concat(frontendMessages)
        .filter(m => m.type === 'PROPOSAL')
        .map(m => `[${m.from.toUpperCase()}]: ${m.content}`)
        .join('\n\n')

      await this.leader.send(
        `Review these proposals:\n\n${proposals}\n\nAre there conflicts? Make a final decision. What is your verdict?`,
        'RESULT',
        'user',
        'REVIEWING',
        (token) => this.emitToken('leader', token)
      )

      this.emitStatus('leader', 'idle')
      this.setPhase('COMPLETE')

    } catch (err) {
      this.setPhase('FAILED')
      this.emit('error', err instanceof Error ? err : new Error(String(err)))
    }
  }

  private getAgent(role: AgentRole) {
    if (role === 'leader') return this.leader
    if (role === 'backend') return this.backend
    return this.frontend
  }

  clearAll(): void {
    this.leader.clearHistory()
    this.backend.clearHistory()
    this.frontend.clearHistory()
    bus.clear()
    this.setPhase('RECEIVED')
  }
}
