/**
 * Matches API Routes
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';

const router = express.Router();

// Helper to parse JSON fields
function parseMatch(row) {
  if (!row) return null;
  return {
    ...row,
    reasons: row.reasons ? JSON.parse(row.reasons) : []
  };
}

// GET matches for organization
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { organization_id, min_score } = req.query;
    
    let query = `
      SELECT 
        m.*,
        o.name as organization_name,
        f.title as opportunity_title,
        f.sponsor as opportunity_sponsor,
        f.deadline,
        f.amount_min,
        f.amount_max,
        f.url
      FROM matches m
      LEFT JOIN organizations o ON m.organization_id = o.id
      LEFT JOIN funding_opportunities f ON m.opportunity_id = f.id
      WHERE 1=1
    `;
    const params = [];
    
    if (organization_id) {
      query += ' AND m.organization_id = ?';
      params.push(organization_id);
    }
    
    if (min_score) {
      query += ' AND m.score >= ?';
      params.push(parseFloat(min_score));
    }
    
    query += ' ORDER BY m.score DESC, m.created_at DESC';
    
    const rows = db.prepare(query).all(...params);
    res.json(rows.map(parseMatch));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single match
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare(`
      SELECT 
        m.*,
        o.name as organization_name,
        o.mission,
        o.focus_areas as org_focus_areas,
        f.title as opportunity_title,
        f.sponsor as opportunity_sponsor,
        f.description as opportunity_description,
        f.deadline,
        f.amount_min,
        f.amount_max,
        f.url,
        f.eligibility
      FROM matches m
      LEFT JOIN organizations o ON m.organization_id = o.id
      LEFT JOIN funding_opportunities f ON m.opportunity_id = f.id
      WHERE m.id = ?
    `).get(req.params.id);
    
    if (!row) {
      return res.status(404).json({ error: 'Match not found' });
    }
    res.json(parseMatch(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE match (usually from AI matching)
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const id = req.body.id || uuidv4();
    
    const stmt = db.prepare(`
      INSERT INTO matches (
        id, organization_id, opportunity_id, score, reasons,
        ai_analysis, match_type, searched_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      req.body.organization_id,
      req.body.opportunity_id,
      req.body.score,
      JSON.stringify(req.body.reasons || []),
      req.body.ai_analysis,
      req.body.match_type || 'ai',
      req.body.searched_at || new Date().toISOString()
    );
    
    const created = db.prepare('SELECT * FROM matches WHERE id = ?').get(id);
    res.status(201).json(parseMatch(created));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk create matches
router.post('/bulk', (req, res) => {
  try {
    const db = getDb();
    const { matches } = req.body;
    
    if (!matches || !Array.isArray(matches)) {
      return res.status(400).json({ error: 'matches array is required' });
    }
    
    const stmt = db.prepare(`
      INSERT INTO matches (
        id, organization_id, opportunity_id, score, reasons,
        ai_analysis, match_type, searched_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const created = [];
    
    const insertMany = db.transaction((items) => {
      for (const match of items) {
        const id = match.id || uuidv4();
        stmt.run(
          id,
          match.organization_id,
          match.opportunity_id,
          match.score,
          JSON.stringify(match.reasons || []),
          match.ai_analysis,
          match.match_type || 'ai',
          match.searched_at || new Date().toISOString()
        );
        created.push(id);
      }
    });
    
    insertMany(matches);
    
    res.status(201).json({ 
      success: true, 
      created: created.length,
      ids: created 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE match
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM matches WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add match to pipeline
router.post('/:id/add-to-pipeline', (req, res) => {
  try {
    const db = getDb();
    
    // Get the match
    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    // Check if already in pipeline
    const existing = db.prepare(`
      SELECT id FROM pipeline_items 
      WHERE organization_id = ? AND opportunity_id = ?
    `).get(match.organization_id, match.opportunity_id);
    
    if (existing) {
      return res.json({ 
        success: true, 
        message: 'Already in pipeline',
        pipeline_id: existing.id 
      });
    }
    
    // Create pipeline item
    const pipelineId = uuidv4();
    db.prepare(`
      INSERT INTO pipeline_items (
        id, organization_id, opportunity_id, stage, status, 
        confidence_score, match_reasons
      ) VALUES (?, ?, ?, 'interested', 'active', ?, ?)
    `).run(
      pipelineId,
      match.organization_id,
      match.opportunity_id,
      match.score,
      match.reasons
    );
    
    res.status(201).json({ 
      success: true, 
      pipeline_id: pipelineId 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
