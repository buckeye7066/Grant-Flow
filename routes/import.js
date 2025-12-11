/**
 * Import Routes - Import data from Base44 export
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';

const router = express.Router();

/**
 * Import Base44 export data
 * POST /api/import/base44
 * Body: { data: <exported JSON> }
 */
router.post('/base44', (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data || !data.entities) {
      return res.status(400).json({ error: 'Invalid export data format' });
    }
    
    const db = getDb();
    const results = {
      imported: {},
      errors: []
    };
    
    console.log('[Import] Starting Base44 import...');
    console.log('[Import] Entities found:', Object.keys(data.entities));
    
    // Map Base44 entity names to our tables
    const entityMappings = {
      'Organization': importOrganizations,
      'FundingOpportunity': importOpportunities,
      'PipelineItem': importPipelineItems,
      'Match': importMatches
    };
    
    for (const [entityName, records] of Object.entries(data.entities)) {
      if (!records || !Array.isArray(records)) continue;
      
      const importer = entityMappings[entityName];
      if (importer) {
        try {
          const count = importer(db, records);
          results.imported[entityName] = count;
          console.log(`[Import] Imported ${count} ${entityName} records`);
        } catch (err) {
          results.errors.push({ entity: entityName, error: err.message });
          console.error(`[Import] Error importing ${entityName}:`, err.message);
        }
      } else {
        console.log(`[Import] No importer for ${entityName}, skipping`);
      }
    }
    
    res.json({
      success: true,
      message: 'Import complete',
      results
    });
    
  } catch (err) {
    console.error('[Import] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Import Organizations
 */
function importOrganizations(db, records) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO organizations (
      id, name, applicant_type, ein, mission, city, state, zip, address,
      website, annual_budget, staff_size, year_founded, focus_areas,
      populations_served, geographic_scope, contact_name, contact_email,
      contact_phone, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  let count = 0;
  
  for (const rec of records) {
    try {
      stmt.run(
        rec.id || uuidv4(),
        rec.name || rec.organization_name || 'Unnamed',
        rec.applicant_type || rec.type,
        rec.ein,
        rec.mission || rec.mission_statement,
        rec.city,
        rec.state,
        rec.zip || rec.postal_code,
        rec.address || rec.street_address,
        rec.website || rec.url,
        rec.annual_budget || rec.budget,
        rec.staff_size || rec.employees,
        rec.year_founded || rec.founded,
        JSON.stringify(rec.focus_areas || rec.focusAreas || []),
        JSON.stringify(rec.populations_served || rec.populationsServed || []),
        rec.geographic_scope || rec.geographicScope,
        rec.contact_name || rec.contactName,
        rec.contact_email || rec.contactEmail || rec.email,
        rec.contact_phone || rec.contactPhone || rec.phone,
        rec.notes,
        rec.created_date || rec.createdAt || new Date().toISOString(),
        rec.updated_date || rec.updatedAt || new Date().toISOString()
      );
      count++;
    } catch (e) {
      console.warn(`[Import] Skipped org ${rec.name}: ${e.message}`);
    }
  }
  
  return count;
}

/**
 * Import Funding Opportunities
 */
function importOpportunities(db, records) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO funding_opportunities (
      id, title, sponsor, sponsor_type, description, funding_type,
      categories, amount_min, amount_max, deadline, url, eligibility,
      eligibility_bullets, focus_areas, geographic_restrictions,
      application_url, contact_email, contact_phone, status, source,
      source_id, raw_data, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  let count = 0;
  
  for (const rec of records) {
    try {
      stmt.run(
        rec.id || uuidv4(),
        rec.title || rec.name || 'Untitled',
        rec.sponsor || rec.funder,
        rec.sponsor_type || rec.sponsorType || rec.funderType,
        rec.description || rec.descriptionMd || rec.summary,
        rec.funding_type || rec.fundingType || rec.type,
        JSON.stringify(rec.categories || []),
        rec.amount_min || rec.awardMin || rec.amountMin,
        rec.amount_max || rec.awardMax || rec.amountMax,
        rec.deadline || rec.deadlineAt,
        rec.url || rec.link,
        rec.eligibility || rec.eligibilityText,
        JSON.stringify(rec.eligibility_bullets || rec.eligibilityBullets || []),
        JSON.stringify(rec.focus_areas || rec.focusAreas || []),
        rec.geographic_restrictions || rec.geographicRestrictions,
        rec.application_url || rec.applicationUrl,
        rec.contact_email || rec.contactEmail,
        rec.contact_phone || rec.contactPhone,
        rec.status || 'active',
        rec.source,
        rec.source_id || rec.sourceId,
        JSON.stringify(rec),
        rec.created_date || rec.createdAt || new Date().toISOString(),
        rec.updated_date || rec.updatedAt || new Date().toISOString()
      );
      count++;
    } catch (e) {
      console.warn(`[Import] Skipped opportunity ${rec.title}: ${e.message}`);
    }
  }
  
  return count;
}

/**
 * Import Pipeline Items
 */
function importPipelineItems(db, records) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO pipeline_items (
      id, organization_id, opportunity_id, stage, status, priority,
      confidence_score, match_reasons, notes, deadline, amount_requested,
      assigned_to, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  let count = 0;
  
  for (const rec of records) {
    try {
      stmt.run(
        rec.id || uuidv4(),
        rec.organization_id || rec.organizationId || rec.org_id,
        rec.opportunity_id || rec.opportunityId || rec.grant_id,
        rec.stage || rec.status || 'discovered',
        rec.status || 'active',
        rec.priority || 0,
        rec.confidence_score || rec.confidenceScore || rec.score,
        JSON.stringify(rec.match_reasons || rec.matchReasons || []),
        rec.notes,
        rec.deadline,
        rec.amount_requested || rec.amountRequested,
        rec.assigned_to || rec.assignedTo,
        rec.created_date || rec.createdAt || new Date().toISOString(),
        rec.updated_date || rec.updatedAt || new Date().toISOString()
      );
      count++;
    } catch (e) {
      console.warn(`[Import] Skipped pipeline item: ${e.message}`);
    }
  }
  
  return count;
}

/**
 * Import Matches
 */
function importMatches(db, records) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO matches (
      id, organization_id, opportunity_id, score, reasons,
      ai_analysis, match_type, searched_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  let count = 0;
  
  for (const rec of records) {
    try {
      stmt.run(
        rec.id || uuidv4(),
        rec.organization_id || rec.organizationId,
        rec.opportunity_id || rec.opportunityId,
        rec.score || rec.confidence,
        JSON.stringify(rec.reasons || rec.match_reasons || []),
        rec.ai_analysis || rec.analysis,
        rec.match_type || rec.type || 'imported',
        rec.searched_at || rec.searchedAt,
        rec.created_date || rec.createdAt || new Date().toISOString()
      );
      count++;
    } catch (e) {
      console.warn(`[Import] Skipped match: ${e.message}`);
    }
  }
  
  return count;
}

/**
 * Get import status / stats
 */
router.get('/stats', (req, res) => {
  try {
    const db = getDb();
    
    const stats = {
      organizations: db.prepare('SELECT COUNT(*) as count FROM organizations').get().count,
      opportunities: db.prepare('SELECT COUNT(*) as count FROM funding_opportunities').get().count,
      pipeline_items: db.prepare('SELECT COUNT(*) as count FROM pipeline_items').get().count,
      matches: db.prepare('SELECT COUNT(*) as count FROM matches').get().count
    };
    
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
