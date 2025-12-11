/**
 * Funding Opportunities API Routes
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';

const router = express.Router();

// Helper to parse JSON fields
function parseOpportunity(row) {
  if (!row) return null;
  return {
    ...row,
    categories: row.categories ? JSON.parse(row.categories) : [],
    eligibility_bullets: row.eligibility_bullets ? JSON.parse(row.eligibility_bullets) : [],
    focus_areas: row.focus_areas ? JSON.parse(row.focus_areas) : [],
    raw_data: row.raw_data ? JSON.parse(row.raw_data) : null
  };
}

// GET all opportunities
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { status, limit = 25000 } = req.query;
    
    let query = 'SELECT * FROM funding_opportunities';
    const params = [];
    
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY deadline ASC LIMIT ?';
    params.push(parseInt(limit));
    
    const rows = db.prepare(query).all(...params);
    res.json(rows.map(parseOpportunity));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single opportunity
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare('SELECT * FROM funding_opportunities WHERE id = ?').get(req.params.id);
    if (!row) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }
    res.json(parseOpportunity(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SEARCH opportunities
router.get('/search/:query', (req, res) => {
  try {
    const db = getDb();
    const searchTerm = `%${req.params.query}%`;
    
    const rows = db.prepare(`
      SELECT * FROM funding_opportunities 
      WHERE title LIKE ? 
         OR sponsor LIKE ? 
         OR description LIKE ?
         OR categories LIKE ?
      ORDER BY deadline ASC
      LIMIT 50
    `).all(searchTerm, searchTerm, searchTerm, searchTerm);
    
    res.json(rows.map(parseOpportunity));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE opportunity
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const id = req.body.id || uuidv4();
    
    const stmt = db.prepare(`
      INSERT INTO funding_opportunities (
        id, title, sponsor, sponsor_type, description, funding_type,
        categories, amount_min, amount_max, deadline, url, eligibility,
        eligibility_bullets, focus_areas, geographic_restrictions,
        application_url, contact_email, contact_phone, status, source,
        source_id, raw_data
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);
    
    stmt.run(
      id,
      req.body.title,
      req.body.sponsor,
      req.body.sponsor_type,
      req.body.description,
      req.body.funding_type,
      JSON.stringify(req.body.categories || []),
      req.body.amount_min,
      req.body.amount_max,
      req.body.deadline,
      req.body.url,
      req.body.eligibility,
      JSON.stringify(req.body.eligibility_bullets || []),
      JSON.stringify(req.body.focus_areas || []),
      req.body.geographic_restrictions,
      req.body.application_url,
      req.body.contact_email,
      req.body.contact_phone,
      req.body.status || 'active',
      req.body.source,
      req.body.source_id,
      JSON.stringify(req.body.raw_data || null)
    );
    
    const created = db.prepare('SELECT * FROM funding_opportunities WHERE id = ?').get(id);
    res.status(201).json(parseOpportunity(created));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE opportunity
router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    
    const stmt = db.prepare(`
      UPDATE funding_opportunities SET
        title = COALESCE(?, title),
        sponsor = COALESCE(?, sponsor),
        sponsor_type = COALESCE(?, sponsor_type),
        description = COALESCE(?, description),
        funding_type = COALESCE(?, funding_type),
        categories = COALESCE(?, categories),
        amount_min = COALESCE(?, amount_min),
        amount_max = COALESCE(?, amount_max),
        deadline = COALESCE(?, deadline),
        url = COALESCE(?, url),
        eligibility = COALESCE(?, eligibility),
        eligibility_bullets = COALESCE(?, eligibility_bullets),
        focus_areas = COALESCE(?, focus_areas),
        geographic_restrictions = COALESCE(?, geographic_restrictions),
        application_url = COALESCE(?, application_url),
        contact_email = COALESCE(?, contact_email),
        contact_phone = COALESCE(?, contact_phone),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    stmt.run(
      req.body.title,
      req.body.sponsor,
      req.body.sponsor_type,
      req.body.description,
      req.body.funding_type,
      req.body.categories ? JSON.stringify(req.body.categories) : null,
      req.body.amount_min,
      req.body.amount_max,
      req.body.deadline,
      req.body.url,
      req.body.eligibility,
      req.body.eligibility_bullets ? JSON.stringify(req.body.eligibility_bullets) : null,
      req.body.focus_areas ? JSON.stringify(req.body.focus_areas) : null,
      req.body.geographic_restrictions,
      req.body.application_url,
      req.body.contact_email,
      req.body.contact_phone,
      req.body.status,
      req.params.id
    );
    
    const updated = db.prepare('SELECT * FROM funding_opportunities WHERE id = ?').get(req.params.id);
    res.json(parseOpportunity(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE opportunity
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM funding_opportunities WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
