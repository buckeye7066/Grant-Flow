import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import path from 'path'
import { getDb } from './db/init.js'

// Import routes
import organizationsRouter from './routes/organizations.js'
import opportunitiesRouter from './routes/opportunities.js'
import pipelineRouter from './routes/pipeline.js'
import matchesRouter from './routes/matches.js'
import aiRouter from './routes/ai.js'
import importRouter from './routes/import.js'
import clientsRouter from './routes/clients.js'
import crawlersRouter from './routes/crawlers.js'
import documentsRouter from './routes/documents.js'
import analyticsRouter from './routes/analytics.js'
import billingRoutes from './routes/billingRoutes.js'
import documentRoutes from './routes/documentRoutes.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json({ limit: '50mb' }))

// Initialize database FIRST
const db = getDb()

// API Routes
app.use('/api/organizations', organizationsRouter)
app.use('/api/opportunities', opportunitiesRouter)
app.use('/api/pipeline', pipelineRouter)
app.use('/api/matches', matchesRouter)
app.use('/api/ai', aiRouter)
app.use('/api/import', importRouter)
app.use('/api/clients', clientsRouter)
app.use('/api/crawlers', crawlersRouter)
app.use('/api/documents', documentsRouter)
app.use('/api/analytics', analyticsRouter)
app.use('/api', billingRoutes(db))
app.use('/api', documentRoutes(db))

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')))
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`GrantFlow server running on port ${PORT}`)
})

export default app
