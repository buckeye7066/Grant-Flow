/**
 * Crawler Routes
 * API endpoints for managing and running crawlers
 */

import express from 'express'
import crawlerManager, { WebsiteCrawler } from '../crawlers/index.js'
import { getDb } from '../db/init.js'

const router = express.Router()

// Get all crawler status
router.get('/status', (req, res) => {
  try {
    const status = crawlerManager.getStatus()
    res.json(status)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get list of available crawlers
router.get('/list', (req, res) => {
  try {
    const crawlers = crawlerManager.getAll().map(c => ({
      name: c.name,
      description: c.description
    }))
    res.json(crawlers)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Run all crawlers
router.post('/run-all', async (req, res) => {
  try {
    const { profileIds } = req.body
    
    // Run in background
    res.json({ message: 'Crawlers started', status: 'running' })
    
    // Actually run crawlers (async)
    crawlerManager.runAll(profileIds || [])
      .then(results => {
        console.log('All crawlers completed:', results)
      })
      .catch(err => {
        console.error('Crawler error:', err)
      })
      
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Run specific crawler
router.post('/run/:crawlerName', async (req, res) => {
  try {
    const { crawlerName } = req.params
    const { profileIds } = req.body
    
    const crawler = crawlerManager.get(crawlerName)
    if (!crawler) {
      return res.status(404).json({ error: `Crawler ${crawlerName} not found` })
    }
    
    // Start crawling
    res.json({ message: `Crawler ${crawlerName} started`, status: 'running' })
    
    // Run async
    crawler.run(profileIds || [])
      .then(result => {
        console.log(`Crawler ${crawlerName} completed:`, result)
      })
      .catch(err => {
        console.error(`Crawler ${crawlerName} error:`, err)
      })
      
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Run crawler for specific profile
router.post('/run-for-profile/:profileId', async (req, res) => {
  try {
    const { profileId } = req.params
    const { crawlers } = req.body // Optional: specific crawlers to run
    
    const db = getDb()
    const profile = db.prepare('SELECT * FROM organizations WHERE id = ?').get(profileId)
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' })
    }
    
    res.json({ message: `Crawlers started for profile ${profile.name}`, status: 'running' })
    
    // Run specified crawlers or all
    if (crawlers && crawlers.length > 0) {
      for (const crawlerName of crawlers) {
        const crawler = crawlerManager.get(crawlerName)
        if (crawler) {
          crawler.run([profileId]).catch(err => {
            console.error(`Crawler ${crawlerName} error:`, err)
          })
        }
      }
    } else {
      crawlerManager.runAll([profileId]).catch(err => {
        console.error('Crawler error:', err)
      })
    }
    
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Crawl custom URL
router.post('/crawl-url', async (req, res) => {
  try {
    const { url, profileId } = req.body
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' })
    }
    
    const websiteCrawler = crawlerManager.get('website')
    
    // Get profile criteria if provided
    let criteria = null
    if (profileId) {
      const db = getDb()
      const profile = db.prepare('SELECT * FROM organizations WHERE id = ?').get(profileId)
      if (profile) {
        // Parse profile data
        if (profile.profile_data) {
          try {
            const extra = JSON.parse(profile.profile_data)
            Object.assign(profile, extra)
          } catch {}
        }
        criteria = websiteCrawler.parseProfileForMatching(profile)
      }
    }
    
    // Crawl the URL
    const opportunities = await websiteCrawler.crawlUrl(url, criteria, profileId)
    
    res.json({
      success: true,
      url,
      opportunitiesFound: opportunities.length,
      opportunities
    })
    
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get crawler results/matches for a profile
router.get('/matches/:profileId', (req, res) => {
  try {
    const { profileId } = req.params
    const db = getDb()
    
    const matches = db.prepare(`
      SELECT m.*, o.title, o.sponsor, o.amount_min, o.amount_max, o.deadline, o.url, o.source
      FROM matches m
      JOIN funding_opportunities o ON m.opportunity_id = o.id
      WHERE m.organization_id = ?
      ORDER BY m.score DESC
    `).all(profileId)
    
    res.json(matches)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get crawler statistics
router.get('/stats', (req, res) => {
  try {
    const db = getDb()
    
    const stats = {
      totalOpportunities: db.prepare('SELECT COUNT(*) as count FROM funding_opportunities').get().count,
      bySource: db.prepare(`
        SELECT source, COUNT(*) as count 
        FROM funding_opportunities 
        GROUP BY source
      `).all(),
      totalMatches: db.prepare('SELECT COUNT(*) as count FROM matches').get().count,
      recentOpportunities: db.prepare(`
        SELECT COUNT(*) as count 
        FROM funding_opportunities 
        WHERE created_at > datetime('now', '-7 days')
      `).get().count,
      crawlerStatus: crawlerManager.getStatus()
    }
    
    res.json(stats)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
