#!/usr/bin/env node
import React from 'react'
import { render } from 'ink'
import App from './cli/app.js'
import { readFileSync, existsSync } from 'fs'
import { resolve, join } from 'path'
import { homedir } from 'os'

function getApiKey(): string {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY

  const keyFile = join(homedir(), 'key.txt')
  if (existsSync(keyFile)) {
    return readFileSync(keyFile, 'utf8').trim()
  }

  console.error('No API key found. Set OPENROUTER_API_KEY or put key in ~/key.txt')
  process.exit(1)
}

function getRepoPath(): string | undefined {
  const arg = process.argv[2]
  if (!arg) return undefined
  const p = resolve(arg)
  if (existsSync(p)) return p
  return undefined
}

const apiKey = getApiKey()
const repoPath = getRepoPath()

render(React.createElement(App, { apiKey, repoPath }))
