# JinTdev — AIDT

> *AI Dev Team terminal interface*

A fully autonomous multi-model AI software development team that works together on a real codebase — coordinated by a central Leader, with specialized Backend and Frontend engineers, all visible in a single terminal interface.

---

## What it is

AIDT is a terminal CLI (`aidt`) that runs a team of AI agents powered by OpenRouter's free models. You give one high-level request. The Leader analyzes it, creates a plan, delegates to Backend and Frontend engineers, mediates disagreements, verifies the result, and reports back. You watch every agent think and respond in real time.

---

## Team

| Agent | Color | Model | Role |
|---|---|---|---|
| Leader | Gold | `nvidia/nemotron-3-ultra-550b-a55b:free` | Planning, decisions, contracts, review |
| Backend | Red-orange | `poolside/laguna-s-2.1:free` | APIs, DB, auth, services |
| Frontend | Pink | `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` | UI, components, state, routing |

---

## Requirements

- Node.js 20+
- pnpm
- OpenRouter API key (free tier)

---

## Setup

```bash
git clone https://github.com/picklem0b/JinTdev.git
cd JinTdev
pnpm install

# Put your OpenRouter key in ~/key.txt
echo "sk-or-v1-..." > ~/key.txt
```

---

## Usage

```bash
# Start AIDT (no project)
pnpm dev

# Start AIDT pointed at a project
pnpm dev ~/wudapp

# Inside AIDT:
# /task add offline playlist downloads   — run the full team on a task
# @leader what's your plan?              — chat directly with leader
# @backend explain the auth flow         — chat directly with backend
# @frontend what state shape do you need — chat directly with frontend
# Tab                                    — cycle through tabs
# Ctrl+C                                 — exit
```

---

## Tabs

| Tab | Shows |
|---|---|
| `feed` | All agents, full live conversation |
| `leader` | Leader messages only |
| `backend` | Backend messages only |
| `frontend` | Frontend messages only |
| `contract` | Current task contract |
| `diff` | Git diff of changes |

---

## Commands

| Command | Description |
|---|---|
| `/task [request]` | Run the full team on a task |
| `@leader [msg]` | Direct message to Leader |
| `@backend [msg]` | Direct message to Backend |
| `@frontend [msg]` | Direct message to Frontend |
| `@all [msg]` | Broadcast to all agents |
| `Tab` | Switch tabs |
| `Ctrl+C` | Exit |

---

## Project structure

```
src/
├── agents/
│   ├── base.agent.ts
│   ├── leader.agent.ts
│   ├── backend.agent.ts
│   └── frontend.agent.ts
├── cli/
│   ├── app.tsx
│   └── themes.ts
├── engine/
│   ├── orchestrator.ts
│   └── message-bus.ts
├── models/
│   ├── config.ts
│   └── router.ts
├── types/
│   └── index.ts
└── index.ts
```

---

## Themes

Three built-in themes: `default`, `ocean`, `midnight`. All follow the AIDT color language:

- Commands: green + yellow
- Short flags `-x`: blue
- Long flags `--x`: orange
- Paths: purple
- Errors: dark red
- Success: green + ✓

---

## Git versioning

Format: `V1.MINOR.FILE_COUNT`

- `V1` locked until all V1 features compile and run
- `MINOR` increments per fix session
- `FILE_COUNT` increments per file, never resets within a minor

---

## Roadmap

- [x] CLI shell with tabs, themes, streaming
- [x] Leader / Backend / Frontend agents
- [x] OpenRouter model router with fallback chains
- [x] Message bus and orchestrator
- [ ] Repo reader and context windowing
- [ ] Git worktree isolation per agent
- [ ] MCP server
- [ ] Contract registry and enforcement
- [ ] Git diff tab
- [ ] Additional specialist agents (Security, QA, DevOps)
