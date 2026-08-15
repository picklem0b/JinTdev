export type AgentRole = 'leader' | 'backend' | 'frontend'

export type MessageType =
  | 'TASK_ASSIGNMENT'
  | 'PROPOSAL'
  | 'CHALLENGE'
  | 'QUESTION'
  | 'DISCOVERY'
  | 'DEPENDENCY'
  | 'RESULT'
  | 'FAILURE'
  | 'CONTRACT_VIOLATION'
  | 'CHAT'

export type TaskPhase =
  | 'RECEIVED'
  | 'ANALYZING'
  | 'PLANNING'
  | 'DELEGATING'
  | 'PROPOSING'
  | 'DISCUSSING'
  | 'DECIDED'
  | 'IMPLEMENTING'
  | 'BUILDING'
  | 'TESTING'
  | 'REVIEWING'
  | 'FIXING'
  | 'COMPLETE'
  | 'FAILED'

export type AgentStatus = 'idle' | 'thinking' | 'responding' | 'waiting' | 'done' | 'error'

export interface AgentMessage {
  id: string
  from: AgentRole | 'user' | 'system'
  to: AgentRole | 'all' | 'user'
  type: MessageType
  phase: TaskPhase
  content: string
  timestamp: number
  streaming?: boolean
}

export interface AgentState {
  role: AgentRole
  status: AgentStatus
  model: string
  currentMessage: string
  messageHistory: AgentMessage[]
}

export interface TaskContract {
  feature: string
  endpoints: ContractEndpoint[]
  databaseChanges: DatabaseChange[]
  frontendRequirements: FrontendRequirement[]
  testRequirements: string[]
  crossSystemChecks: string[]
}

export interface ContractEndpoint {
  method: string
  path: string
  auth: boolean
  request: Record<string, unknown>
  response: Record<string, unknown>
  errors: Record<number, string>
}

export interface DatabaseChange {
  type: 'CREATE_TABLE' | 'ALTER_TABLE' | 'ADD_INDEX' | 'MIGRATION'
  description: string
}

export interface FrontendRequirement {
  component: string
  apiClient: string
  stateShape: Record<string, unknown>
  emptyState: string
  errorState: string
}

export interface AppState {
  phase: TaskPhase
  agents: Record<AgentRole, AgentState>
  messages: AgentMessage[]
  contract: TaskContract | null
  activeTab: AgentRole | 'feed' | 'contract' | 'diff'
  userInput: string
  targetAgent: AgentRole | 'all' | null
  repoPath: string | null
}

export interface Theme {
  name: string
  leader: string
  backend: string
  frontend: string
  system: string
  user: string
  thinking: string
  success: string
  error: string
  warning: string
  muted: string
  path: string
  cmdGreen: string
  cmdYellow: string
  flagShort: string
  flagLong: string
  location: string
  bracketDark: string
  bracketCurly: string
  bracketSquare: string
  quote: string
  bg: string
  border: string
}
