import express from 'express'
import crypto from 'crypto'
import { getDb } from '../db/init.js'

const router = express.Router()

// Track page view
router.post('/pageview', (req, res) => {
  try {
    const db = getDb()
    const { clientId, sessionId, pagePath, pageTitle, timeOnPage } = req.body

    if (!clientId || !pagePath) {
      return res.status(400).json({ error: 'clientId and pagePath required' })
    }

    db.prepare(`
      INSERT INTO page_views (client_id, session_id, page_path, page_title, time_on_page)
      VALUES (?, ?, ?, ?, ?)
    `).run(clientId, sessionId || null, pagePath, pageTitle || null, timeOnPage || null)

    res.json({ success: true })
  } catch (err) {
    console.error('Page view tracking error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Create session on login
router.post('/session', (req, res) => {
  try {
    const db = getDb()
    const { clientId, ipAddress, userAgent } = req.body

    const id = crypto.randomUUID()
    
    // Check if first login
    const client = db.prepare('SELECT login_count, has_seen_onboarding FROM clients WHERE id = ?').get(clientId)
    const isFirstLogin = !client?.login_count || client.login_count === 0

    db.prepare(`
      INSERT INTO user_sessions (id, client_id, ip_address, user_agent, is_first_login)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, clientId, ipAddress || null, userAgent || null, isFirstLogin ? 1 : 0)

    // Update client login stats
    db.prepare(`
      UPDATE clients 
      SET last_login = datetime('now'),
          login_count = COALESCE(login_count, 0) + 1
      WHERE id = ?
    `).run(clientId)

    res.json({ 
      sessionId: id, 
      isFirstLogin,
      hasSeenOnboarding: client?.has_seen_onboarding === 1
    })
  } catch (err) {
    console.error('Session creation error:', err)
    res.status(500).json({ error: err.message })
  }
})

// End session
router.post('/session/:sessionId/end', (req, res) => {
  try {
    const db = getDb()
    const { sessionId } = req.params

    db.prepare(`
      UPDATE user_sessions SET logout_time = datetime('now') WHERE id = ?
    `).run(sessionId)

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Mark onboarding as seen
router.post('/onboarding-complete', (req, res) => {
  try {
    const db = getDb()
    const { clientId } = req.body

    db.prepare(`UPDATE clients SET has_seen_onboarding = 1 WHERE id = ?`).run(clientId)

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get user preferences
router.get('/preferences/:clientId', (req, res) => {
  try {
    const db = getDb()
    const { clientId } = req.params

    let prefs = db.prepare('SELECT * FROM user_preferences WHERE client_id = ?').get(clientId)
    
    if (!prefs) {
      // Create default preferences
      const id = crypto.randomUUID()
      db.prepare(`
        INSERT INTO user_preferences (id, client_id) VALUES (?, ?)
      `).run(id, clientId)
      prefs = db.prepare('SELECT * FROM user_preferences WHERE id = ?').get(id)
    }

    res.json(prefs)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Update user preferences
router.put('/preferences/:clientId', (req, res) => {
  try {
    const db = getDb()
    const { clientId } = req.params
    const updates = req.body

    const allowedFields = [
      'theme', 'primary_color', 'accent_color', 'font_family', 'font_size',
      'sidebar_collapsed', 'dashboard_layout', 'show_animations', 'dark_mode',
      'compact_mode', 'custom_css'
    ]

    // Ensure preferences exist
    let prefs = db.prepare('SELECT id FROM user_preferences WHERE client_id = ?').get(clientId)
    if (!prefs) {
      const id = crypto.randomUUID()
      db.prepare('INSERT INTO user_preferences (id, client_id) VALUES (?, ?)').run(id, clientId)
    }

    const setClause = []
    const values = []

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = ?`)
        values.push(value)
      }
    }

    if (setClause.length > 0) {
      setClause.push('updated_at = datetime(\'now\')')
      values.push(clientId)
      db.prepare(`UPDATE user_preferences SET ${setClause.join(', ')} WHERE client_id = ?`).run(...values)
    }

    const updated = db.prepare('SELECT * FROM user_preferences WHERE client_id = ?').get(clientId)
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ========== ADMIN ANALYTICS ==========

// Get analytics summary
router.get('/admin/summary', (req, res) => {
  try {
    const db = getDb()
    const { days = 30 } = req.query

    const dateFilter = `datetime('now', '-${days} days')`

    // Total users
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM clients').get().count

    // Active users (logged in within period)
    const activeUsers = db.prepare(`
      SELECT COUNT(DISTINCT client_id) as count 
      FROM user_sessions 
      WHERE login_time > ${dateFilter}
    `).get().count

    // New users (created within period)
    const newUsers = db.prepare(`
      SELECT COUNT(*) as count FROM clients WHERE created_at > ${dateFilter}
    `).get().count

    // Total sessions
    const totalSessions = db.prepare(`
      SELECT COUNT(*) as count FROM user_sessions WHERE login_time > ${dateFilter}
    `).get().count

    // Total page views
    const totalPageViews = db.prepare(`
      SELECT COUNT(*) as count FROM page_views WHERE timestamp > ${dateFilter}
    `).get().count

    // Average session duration (rough estimate)
    const avgDuration = db.prepare(`
      SELECT AVG(
        CAST((julianday(COALESCE(logout_time, datetime('now'))) - julianday(login_time)) * 24 * 60 AS INTEGER)
      ) as avg_minutes
      FROM user_sessions 
      WHERE login_time > ${dateFilter}
    `).get().avg_minutes || 0

    // Pro bono clients
    const proBonoClients = db.prepare('SELECT COUNT(*) as count FROM clients WHERE pro_bono = 1').get().count

    res.json({
      totalUsers,
      activeUsers,
      newUsers,
      totalSessions,
      totalPageViews,
      avgSessionMinutes: Math.round(avgDuration),
      proBonoClients,
      period: `${days} days`
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get user activity list
router.get('/admin/users', (req, res) => {
  try {
    const db = getDb()
    const { limit = 50, offset = 0 } = req.query

    const users = db.prepare(`
      SELECT 
        c.id, c.name, c.email, c.organization_name, c.is_admin, c.pro_bono,
        c.last_login, c.login_count, c.created_at, c.has_seen_onboarding,
        (SELECT COUNT(*) FROM page_views WHERE client_id = c.id) as total_page_views,
        (SELECT COUNT(*) FROM user_sessions WHERE client_id = c.id) as total_sessions,
        (SELECT page_path FROM page_views WHERE client_id = c.id ORDER BY timestamp DESC LIMIT 1) as last_page
      FROM clients c
      ORDER BY c.last_login DESC NULLS LAST
      LIMIT ? OFFSET ?
    `).all(limit, offset)

    res.json(users)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get specific user's activity
router.get('/admin/users/:clientId/activity', (req, res) => {
  try {
    const db = getDb()
    const { clientId } = req.params
    const { limit = 100 } = req.query

    const sessions = db.prepare(`
      SELECT * FROM user_sessions 
      WHERE client_id = ?
      ORDER BY login_time DESC
      LIMIT ?
    `).all(clientId, limit)

    const pageViews = db.prepare(`
      SELECT * FROM page_views 
      WHERE client_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(clientId, limit)

    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId)

    res.json({ client, sessions, pageViews })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get page popularity
router.get('/admin/pages', (req, res) => {
  try {
    const db = getDb()
    const { days = 30 } = req.query

    const pages = db.prepare(`
      SELECT 
        page_path,
        page_title,
        COUNT(*) as views,
        COUNT(DISTINCT client_id) as unique_visitors,
        AVG(time_on_page) as avg_time_seconds
      FROM page_views
      WHERE timestamp > datetime('now', '-${days} days')
      GROUP BY page_path
      ORDER BY views DESC
      LIMIT 50
    `).all()

    res.json(pages)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get activity timeline
router.get('/admin/timeline', (req, res) => {
  try {
    const db = getDb()
    const { days = 14 } = req.query

    const timeline = db.prepare(`
      SELECT 
        date(timestamp) as date,
        COUNT(*) as page_views,
        COUNT(DISTINCT client_id) as active_users
      FROM page_views
      WHERE timestamp > datetime('now', '-${days} days')
      GROUP BY date(timestamp)
      ORDER BY date ASC
    `).all()

    const logins = db.prepare(`
      SELECT 
        date(login_time) as date,
        COUNT(*) as logins
      FROM user_sessions
      WHERE login_time > datetime('now', '-${days} days')
      GROUP BY date(login_time)
    `).all()

    // Merge data
    const result = timeline.map(t => ({
      ...t,
      logins: logins.find(l => l.date === t.date)?.logins || 0
    }))

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ========== ANNOUNCEMENTS ==========

// Get active announcements
router.get('/announcements', (req, res) => {
  try {
    const db = getDb()
    const { clientId } = req.query

    const announcements = db.prepare(`
      SELECT * FROM announcements 
      WHERE is_active = 1 
      AND (expires_at IS NULL OR expires_at > datetime('now'))
      AND (show_to_all = 1 OR target_client_ids LIKE ?)
      ORDER BY priority DESC, created_at DESC
    `).all(`%${clientId || ''}%`)

    res.json(announcements)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Create announcement (admin)
router.post('/announcements', (req, res) => {
  try {
    const db = getDb()
    const { title, message, type, priority, showToAll, targetClientIds, expiresAt, createdBy } = req.body

    const id = crypto.randomUUID()

    db.prepare(`
      INSERT INTO announcements (id, title, message, type, priority, show_to_all, target_client_ids, expires_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, title, message, type || 'info', priority || 0,
      showToAll !== false ? 1 : 0,
      targetClientIds ? JSON.stringify(targetClientIds) : null,
      expiresAt || null, createdBy || null
    )

    const announcement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id)
    res.status(201).json(announcement)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Update announcement
router.put('/announcements/:id', (req, res) => {
  try {
    const db = getDb()
    const { id } = req.params
    const { title, message, type, priority, isActive, expiresAt } = req.body

    db.prepare(`
      UPDATE announcements 
      SET title = COALESCE(?, title),
          message = COALESCE(?, message),
          type = COALESCE(?, type),
          priority = COALESCE(?, priority),
          is_active = COALESCE(?, is_active),
          expires_at = COALESCE(?, expires_at)
      WHERE id = ?
    `).run(title, message, type, priority, isActive, expiresAt, id)

    const announcement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id)
    res.json(announcement)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Delete announcement
router.delete('/announcements/:id', (req, res) => {
  try {
    const db = getDb()
    db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get all announcements (admin)
router.get('/admin/announcements', (req, res) => {
  try {
    const db = getDb()
    const announcements = db.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all()
    res.json(announcements)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
