/**
 * Database Initialization
 * 
 * Creates SQLite database with all required tables
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', '..', 'data');
const dbPath = join(dataDir, 'grantflow.db');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db;

export function getDb() {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export function initializeDatabase() {
  const db = getDb();
  
  console.log('Initializing database...');
  
  // Organizations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applicant_type TEXT,
      ein TEXT,
      mission TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      address TEXT,
      website TEXT,
      annual_budget REAL,
      staff_size INTEGER,
      year_founded INTEGER,
      focus_areas TEXT,  -- JSON array
      populations_served TEXT,  -- JSON array
      geographic_scope TEXT,
      contact_name TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Funding Opportunities table
  db.exec(`
    CREATE TABLE IF NOT EXISTS funding_opportunities (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      sponsor TEXT,
      sponsor_type TEXT,
      description TEXT,
      funding_type TEXT,
      categories TEXT,  -- JSON array
      amount_min REAL,
      amount_max REAL,
      deadline TEXT,
      url TEXT,
      eligibility TEXT,
      eligibility_bullets TEXT,  -- JSON array
      focus_areas TEXT,  -- JSON array
      geographic_restrictions TEXT,
      application_url TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      status TEXT DEFAULT 'active',
      source TEXT,
      source_id TEXT,
      raw_data TEXT,  -- JSON for any extra fields
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Pipeline Items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS pipeline_items (
      id TEXT PRIMARY KEY,
      organization_id TEXT,
      opportunity_id TEXT,
      stage TEXT DEFAULT 'discovered',
      status TEXT DEFAULT 'active',
      priority INTEGER DEFAULT 0,
      confidence_score REAL,
      match_reasons TEXT,  -- JSON array
      notes TEXT,
      deadline TEXT,
      amount_requested REAL,
      assigned_to TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id),
      FOREIGN KEY (opportunity_id) REFERENCES funding_opportunities(id)
    )
  `);
  
  // Matches table (for AI matching results)
  db.exec(`
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      organization_id TEXT,
      opportunity_id TEXT,
      score REAL,
      reasons TEXT,  -- JSON array
      ai_analysis TEXT,
      match_type TEXT,
      searched_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id),
      FOREIGN KEY (opportunity_id) REFERENCES funding_opportunities(id)
    )
  `);
  
  // Grant Sources table (for discovery)
  db.exec(`
    CREATE TABLE IF NOT EXISTS grant_sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT,
      source_type TEXT,
      categories TEXT,  -- JSON array
      geographic_focus TEXT,
      last_crawled TEXT,
      crawl_frequency TEXT,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Activity Log table
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      entity_type TEXT,
      entity_id TEXT,
      action TEXT,
      details TEXT,  -- JSON
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_pipeline_org ON pipeline_items(organization_id);
    CREATE INDEX IF NOT EXISTS idx_pipeline_opp ON pipeline_items(opportunity_id);
    CREATE INDEX IF NOT EXISTS idx_pipeline_stage ON pipeline_items(stage);
    CREATE INDEX IF NOT EXISTS idx_matches_org ON matches(organization_id);
    CREATE INDEX IF NOT EXISTS idx_opportunities_deadline ON funding_opportunities(deadline);
  `);
  
  console.log('Database initialized successfully!');
  console.log(`Database location: ${dbPath}`);
  
  return db;
}

export default { getDb, initializeDatabase };
