import type { CodeSnippet } from '../../types/challenge'

export const LONG_SNIPPETS: CodeSnippet[] = [
  {
    id: 'long-snippet-1',
    content: `function createStore(initialState) {
  let state = initialState
  const listeners = []

  function getState() {
    return state
  }

  function setState(newState) {
    state = { ...state, ...newState }
    listeners.forEach(listener => listener(state))
  }

  function subscribe(listener) {
    listeners.push(listener)
    return function unsubscribe() {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  function dispatch(action) {
    if (typeof action === 'function') {
      return action(dispatch, getState)
    }
    setState(action.payload)
  }

  return { getState, setState, subscribe, dispatch }
}`,
    language: 'javascript',
    lineCount: 35,
    tags: ['function', 'closure', 'state-management'],
  },
  {
    id: 'long-snippet-2',
    content: `class TaskQueue {
  constructor(concurrency = 3) {
    this.concurrency = concurrency
    this.running = 0
    this.queue = []
    this.results = []
  }

  add(task, priority = 0) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, priority, resolve, reject })
      this.queue.sort((a, b) => b.priority - a.priority)
      this.run()
    })
  }

  async run() {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const { task, resolve, reject } = this.queue.shift()
      this.running++
      try {
        const result = await task()
        this.results.push(result)
        resolve(result)
      } catch (error) {
        reject(error)
      } finally {
        this.running--
        this.run()
      }
    }
  }

  async drain() {
    while (this.running > 0 || this.queue.length > 0) {
      await new Promise(r => setTimeout(r, 50))
    }
    return this.results
  }
}`,
    language: 'javascript',
    lineCount: 39,
    tags: ['class', 'async', 'queue'],
  },
  {
    id: 'long-snippet-3',
    content: `const express = require('express')
const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const logger = (req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(req.method, req.url, res.statusCode, duration)
  })
  next()
}

app.use(logger)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

app.get('/api/users', async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 10
  const offset = (page - 1) * limit
  const users = await db.query('SELECT * FROM users LIMIT ? OFFSET ?', [limit, offset])
  res.json({ users, page, limit })
})

app.post('/api/users', async (req, res) => {
  const { name, email } = req.body
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email required' })
  }
  const user = await db.query('INSERT INTO users (name, email) VALUES (?, ?)', [name, email])
  res.status(201).json(user)
})

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(3000)`,
    language: 'javascript',
    lineCount: 42,
    tags: ['express', 'middleware', 'api'],
  },
  {
    id: 'long-snippet-4',
    content: `function createRouter() {
  const routes = { GET: [], POST: [], PUT: [], DELETE: [] }

  function addRoute(method, path, handler) {
    const parts = path.split('/').filter(Boolean)
    const params = []
    const pattern = parts.map(part => {
      if (part.startsWith(':')) {
        params.push(part.slice(1))
        return '([^/]+)'
      }
      return part
    }).join('/')
    routes[method].push({ regex: new RegExp(pattern), params, handler })
  }

  function match(method, url) {
    const path = url.split('?')[0].replace(/^\\/|\\/$/, '')
    for (const route of routes[method] || []) {
      const m = path.match(route.regex)
      if (m) {
        const values = {}
        route.params.forEach((name, i) => {
          values[name] = m[i + 1]
        })
        return { handler: route.handler, params: values }
      }
    }
    return null
  }

  return {
    get: (path, handler) => addRoute('GET', path, handler),
    post: (path, handler) => addRoute('POST', path, handler),
    put: (path, handler) => addRoute('PUT', path, handler),
    delete: (path, handler) => addRoute('DELETE', path, handler),
    match,
  }
}`,
    language: 'javascript',
    lineCount: 38,
    tags: ['function', 'routing', 'regex'],
  },
]
