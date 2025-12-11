import { getDb } from './init.js'

const db = getDb()

console.log('Creating profile_documents table...')

try {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS profile_documents (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT,
      size INTEGER,
      category TEXT DEFAULT 'other',
      description TEXT,
      is_phi INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (organization_id) REFERENCES organizations(id)
    )
  `).run()
  console.log('✓ Created profile_documents table')
} catch (err) {
  console.log('○ profile_documents table already exists or error:', err.message)
}

// Create uploads directory reference
console.log('\n✓ Migration complete!')
console.log('Documents will be stored in: backend/uploads/')
console.log('Categories: phi, application, transcript, financial, other')
