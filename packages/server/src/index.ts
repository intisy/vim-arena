import 'dotenv/config'
import express, { type Express } from 'express'
import cors from 'cors'
import { authMiddleware } from './middleware/auth.js'
import { healthRouter } from './routes/health.js'
import { statsRouter } from './routes/stats.js'
import { challengesRouter } from './routes/challenges.js'
import { matchmakingRouter } from './routes/matchmaking.js'
import { raceRouter } from './routes/race.js'
import { startMatchmaker } from './services/matchmaker.js'

const app: Express = express()
const PORT = parseInt(process.env.PORT || '3001', 10)

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())

// Public routes
app.use('/api', healthRouter)

// Protected routes (require valid Supabase JWT)
app.use('/api', authMiddleware, statsRouter)
app.use('/api', authMiddleware, challengesRouter)
app.use('/api', authMiddleware, matchmakingRouter)
app.use('/api', authMiddleware, raceRouter)

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server error]', err.message)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`[vim-arena server] listening on port ${PORT}`)

  // Start matchmaking worker
  startMatchmaker()
})

export { app }
