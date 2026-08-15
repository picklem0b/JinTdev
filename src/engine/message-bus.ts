import { EventEmitter } from 'events'
import type { AgentMessage } from '../types/index.js'

class MessageBus extends EventEmitter {
  private queue: AgentMessage[] = []

  publish(message: AgentMessage): void {
    this.queue.push(message)
    this.emit('message', message)
    if (message.to !== 'all') {
      this.emit(`message:${message.to}`, message)
    } else {
      this.emit('message:leader', message)
      this.emit('message:backend', message)
      this.emit('message:frontend', message)
    }
  }

  getHistory(): AgentMessage[] {
    return [...this.queue]
  }

  getHistoryFor(role: string): AgentMessage[] {
    return this.queue.filter(m => m.to === role || m.from === role || m.to === 'all')
  }

  clear(): void {
    this.queue = []
  }
}

export const bus = new MessageBus()
