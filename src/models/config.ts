export interface ModelConfig {
  primary: string
  fallbacks: string[]
  contextWindow: number
  streaming: boolean
}

export const MODEL_CONFIG: Record<string, ModelConfig> = {
  leader: {
    primary: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    fallbacks: ['nvidia/nemotron-3-super-120b-a12b:free'],
    contextWindow: 1000000,
    streaming: true,
  },
  backend: {
    primary: 'poolside/laguna-s-2.1:free',
    fallbacks: ['nvidia/nemotron-3-super-120b-a12b:free'],
    contextWindow: 262144,
    streaming: false,
  },
  frontend: {
    primary: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    fallbacks: ['nvidia/nemotron-3-super-120b-a12b:free'],
    contextWindow: 256000,
    streaming: false,
  },
}

export const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'
