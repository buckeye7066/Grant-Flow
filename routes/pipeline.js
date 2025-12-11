/**
 * Pipeline API Routes
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';

const router = express.Router();

// Helper to parse JSON fields and join related data
function parsePipelineItem(row) {
  if (!row) return null;
  return {
    ...row,
    match_reasons: row.match_reasons ? JSON.parse(row.match_reasons) : []
  };
}

// GET all pipeline items (with optional filters)
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { organization_id, stage, status } = req.query;
    
    let query = `
      SELECT 
        p.*,
        o.name as organization_name,
        f.title as opportunity_title,
        f.sponsor as opportunity_sponsor,
        f.deadline as opportunity_deadline,
        f.amount_min,
        f.amount_max
      FROM pipeline_items p
      LEFT JOIN organizations o ON p.organization_id = o.id
      LEFT JOIN funding_opportunities f ON p.opportunity_id = f.id
      WHERE 1=1
    `;
    const params = [];
    
    if (organization_id) {
      query += ' AND p.organization_id = ?';
      params.push(organization_id);
    }
    
    if (stage) {
      query += ' AND p.stage = ?';
      params.push(stage);
    }
    
    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY p.priority DESC, p.created_at DESC';
    
    const rows = db.prepare(query).all(...params);
    res.json(rows.map(parsePipelineItem));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET pipeline summary (counts by stage)
router.get('/summary', (req, res) => {
  try {
    const db = getDb();
    const { organization_id } = req.query;
    
    let query = `
      SELECT stage, COUNT(*) as count
      FROM pipeline_items
      WHERE status = 'active'
    `;
    const params = [];
    
    if (organization_id) {
      query += ' AND organization_id = ?';
      params.push(organization_id);
    }
    
    query += ' GROUP BY stage';
    
    const rows = db.prepare(query).all(...params);
    
    // Convert to object
    const summary = {
      discovered: 0,
      interested: 0,
      researching: 0,
      preparing: 0,
      drafting: 0,
      submitted: 0,
      awarded: 0,
      declined: 0
    };
    
    rows.forEach(row => {
      summary[row.stage] = row.count;
    });
    
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single pipeline item
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare(`
      SELECT 
        p.*,
        o.name as organization_name,
        f.title as opportunity_title,
        f.sponsor as opportunity_sponsor,
        f.description as opportunity_description,
        f.deadline as opportunity_deadline,
        f.amount_min,
        f.amount_max,
        f.url as opportunity_url
      FROM pipeline_items p
      LEFT JOIN organizations o ON p.organization_id = o.id
      LEFT JOIN funding_opportunities f ON p.opportunity_id = f.id
      WHERE p.id = ?
    `).get(req.params.id);
    
    if (!row) {
      return res.status(404).json({ error: 'Pipeline item not found' });
    }
    res.json(parsePipelineItem(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE pipeline item
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const id = req.body.id || uuidv4();
    
    // Check if already exists
    const existing = db.prepare(`
      SELECT id FROM pipeline_items 
      WHERE organization_id = ? AND opportunity_id = ?
    `).get(req.body.organization_id, req.body.opportunity_id);
    
    if (existing) {
      return res.status(409).json({ 
        error: 'Pipeline item already exists for this org/opportunity combination',
        existing_id: existing.id
      });
    }
    
    const stmt = db.prepare(`
      INSERT INTO pipeline_items (
        id, organization_id, opportunity_id, stage, status, priority,
        confidence_score, match_reasons, notes, deadline, amount_requested, assigned_to
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      req.body.organization_id,
      req.body.opportunity_id,
      req.body.stage || 'discovered',
      req.body.status || 'active',
      req.body.priority || 0,
      req.body.confidence_score,
      JSON.stringify(req.body.match_reasons || []),
      req.body.notes,
      req.body.deadline,
      req.body.amount_requested,
      req.body.assigned_to
    );
    
    const created = db.prepare('SELECT * FROM pipeline_items WHERE id = ?').get(id);
    res.status(201).json(parsePipelineItem(created));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE pipeline item (including stage changes)
router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    
    const stmt = db.prepare(`
      UPDATE pipeline_items SET
        stage = COALESCE(?, stage),
        status = COALESCE(?, status),
        priority = COALESCE(?, priority),
        confidence_score = COALESCE(?, confidence_score),
        match_reasons = COALESCE(?, match_reasons),
        notes = COALESCE(?, notes),
        deadline = COALESCE(?, deadline),
        amount_requested = COALESCE(?, amount_requested),
        assigned_to = COALESCE(?, assigned_to),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    stmt.run(
      req.body.stage,
      req.body.status,
      req.body.priority,
      req.body.confidence_score,
      req.body.match_reasons ? JSON.stringify(req.body.match_reasons) : null,
      req.body.notes,
      req.body.deadline,
      req.body.amount_requested,
      req.body.assigned_to,
      req.params.id
    );
    
    const updated = db.prepare('SELECT * FROM pipeline_items WHERE id = ?').get(req.params.id);
    res.json(parsePipelineItem(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Move pipeline item to different stage
router.post('/:id/move', (req, res) => {
  try {
    const db = getDb();
    const { stage } = req.body;
    
    if (!stage) {
      return res.status(400).json({ error: 'Stage is required' });
    }
    
    db.prepare(`
      UPDATE pipeline_items 
      SET stage = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(stage, req.params.id);
    
    const updated = db.prepare('SELECT * FROM pipeline_items WHERE id = ?').get(req.params.id);
    res.json(parsePipelineItem(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE pipeline item
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM pipeline_items WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
