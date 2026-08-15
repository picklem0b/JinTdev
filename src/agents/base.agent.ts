import { callModel, type ChatMessage } from '../models/router.js'
import { bus } from '../engine/message-bus.js'
import { randomUUID } from 'crypto'
import type { AgentRole, AgentMessage, MessageType, TaskPhase } from '../types/index.js'

export abstract class BaseAgent {
  abstract role: AgentRole
  abstract systemPrompt: string

  protected history: ChatMessage[] = []

  async send(
    content: string,
    type: MessageType,
    to: AgentRole | 'all' | 'user',
    phase: TaskPhase,
    onToken?: (token: string) => void
  ): Promise<string> {
    this.history.push({ role: 'user', content })

    const response = await callModel(
      this.role,
      [{ role: 'system', content: this.systemPrompt }, ...this.history],
      onToken
    )

    this.history.push({ role: 'assistant', content: response.content })

    const message: AgentMessage = {
      id: randomUUID(),
      from: this.role,
      to,
      type,
      phase,
      content: response.content,
      timestamp: Date.now(),
    }

    bus.publish(message)
    return response.content
  }

  async chat(userMessage: string, onToken?: (token: string) => void): Promise<string> {
    return this.send(userMessage, 'CHAT', 'user', 'RECEIVED', onToken)
  }

  clearHistory(): void {
    this.history = []
  }

  injectContext(context: string): void {
    this.history.push({
      role: 'user',
      content: `[CONTEXT]\n${context}`,
    })
    this.history.push({
      role: 'assistant',
      content: 'Context received. Ready.',
    })
  }
}
