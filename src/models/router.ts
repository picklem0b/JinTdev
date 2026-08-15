import { OPENROUTER_BASE, MODEL_CONFIG } from './config.js'
import type { AgentRole } from '../types/index.js'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface RouterResponse {
  content: string
  model: string
}

export async function callModel(
  role: AgentRole,
  messages: ChatMessage[],
  onToken?: (token: string) => void
): Promise<RouterResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set')

  const config = MODEL_CONFIG[role]
  const chain = [config.primary, ...config.fallbacks]

  for (const model of chain) {
    try {
      const result = await fetchCompletion(apiKey, model, messages, config.streaming, onToken)
      return { content: result, model }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('rate limit') || msg.includes('unavailable')) {
        continue
      }
      throw err
    }
  }

  throw new Error(`All models in chain for ${role} failed`)
}

async function fetchCompletion(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  streaming: boolean,
  onToken?: (token: string) => void
): Promise<string> {
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/jintdev/aidt',
      'X-Title': 'AIDT',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: streaming,
      max_tokens: 4096,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`)
  }

  if (streaming && onToken) {
    return readStream(res, onToken)
  }

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>
  }
  return data.choices?.[0]?.message?.content ?? ''
}

async function readStream(res: Response, onToken: (token: string) => void): Promise<string> {
  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split('\n').filter(l => l.startsWith('data: '))

    for (const line of lines) {
      const data = line.slice(6).trim()
      if (data === '[DONE]') continue
      try {
        const parsed = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string } }>
        }
        const token = parsed.choices?.[0]?.delta?.content ?? ''
        if (token) {
          full += token
          onToken(token)
        }
      } catch {
        continue
      }
    }
  }

  return full
}
