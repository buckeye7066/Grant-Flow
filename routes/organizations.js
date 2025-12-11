/**
 * Organizations API Routes
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';

const router = express.Router();

// Helper to parse JSON fields
function parseOrg(row) {
  if (!row) return null;
  return {
    ...row,
    focus_areas: row.focus_areas ? JSON.parse(row.focus_areas) : [],
    populations_served: row.populations_served ? JSON.parse(row.populations_served) : []
  };
}

// GET all organizations
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM organizations ORDER BY name').all();
    res.json(rows.map(parseOrg));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single organization
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.params.id);
    if (!row) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json(parseOrg(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE organization
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const id = req.body.id || uuidv4();
    
    const stmt = db.prepare(`
      INSERT INTO organizations (
        id, name, applicant_type, ein, mission, city, state, zip, address,
        website, annual_budget, staff_size, year_founded, focus_areas,
        populations_served, geographic_scope, contact_name, contact_email,
        contact_phone, notes
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);
    
    stmt.run(
      id,
      req.body.name,
      req.body.applicant_type,
      req.body.ein,
      req.body.mission,
      req.body.city,
      req.body.state,
      req.body.zip,
      req.body.address,
      req.body.website,
      req.body.annual_budget,
      req.body.staff_size,
      req.body.year_founded,
      JSON.stringify(req.body.focus_areas || []),
      JSON.stringify(req.body.populations_served || []),
      req.body.geographic_scope,
      req.body.contact_name,
      req.body.contact_email,
      req.body.contact_phone,
      req.body.notes
    );
    
    const created = db.prepare('SELECT * FROM organizations WHERE id = ?').get(id);
    res.status(201).json(parseOrg(created));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE organization
router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    
    const stmt = db.prepare(`
      UPDATE organizations SET
        name = COALESCE(?, name),
        applicant_type = COALESCE(?, applicant_type),
        ein = COALESCE(?, ein),
        mission = COALESCE(?, mission),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        zip = COALESCE(?, zip),
        address = COALESCE(?, address),
        website = COALESCE(?, website),
        annual_budget = COALESCE(?, annual_budget),
        staff_size = COALESCE(?, staff_size),
        year_founded = COALESCE(?, year_founded),
        focus_areas = COALESCE(?, focus_areas),
        populations_served = COALESCE(?, populations_served),
        geographic_scope = COALESCE(?, geographic_scope),
        contact_name = COALESCE(?, contact_name),
        contact_email = COALESCE(?, contact_email),
        contact_phone = COALESCE(?, contact_phone),
        notes = COALESCE(?, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    stmt.run(
      req.body.name,
      req.body.applicant_type,
      req.body.ein,
      req.body.mission,
      req.body.city,
      req.body.state,
      req.body.zip,
      req.body.address,
      req.body.website,
      req.body.annual_budget,
      req.body.staff_size,
      req.body.year_founded,
      req.body.focus_areas ? JSON.stringify(req.body.focus_areas) : null,
      req.body.populations_served ? JSON.stringify(req.body.populations_served) : null,
      req.body.geographic_scope,
      req.body.contact_name,
      req.body.contact_email,
      req.body.contact_phone,
      req.body.notes,
      req.params.id
    );
    
    const updated = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.params.id);
    res.json(parseOrg(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE organization
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM organizations WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
