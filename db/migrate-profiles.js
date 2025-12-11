/**
 * Database migration to add comprehensive profile fields
 * Run this script once to update the database schema
 */

import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), '..', 'data', 'grantflow.db')
const db = new Database(dbPath)

console.log('Starting database migration for comprehensive profiles...')

// Add profile_data column if it doesn't exist
try {
  db.exec(`ALTER TABLE organizations ADD COLUMN profile_data TEXT`)
  console.log('✓ Added profile_data column')
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('○ profile_data column already exists')
  } else {
    console.error('Error adding profile_data:', e.message)
  }
}

// Add additional columns for comprehensive profiles
const columns = [
  { name: 'street_address', type: 'TEXT' },
  { name: 'zip', type: 'TEXT' },
  { name: 'uei', type: 'TEXT' },
  { name: 'cage_code', type: 'TEXT' },
  { name: 'annual_budget', type: 'REAL' },
  { name: 'staff_count', type: 'INTEGER' }
]

columns.forEach(col => {
  try {
    db.exec(`ALTER TABLE organizations ADD COLUMN ${col.name} ${col.type}`)
    console.log(`✓ Added ${col.name} column`)
  } catch (e) {
    if (e.message.includes('duplicate column')) {
      console.log(`○ ${col.name} column already exists`)
    } else {
      console.error(`Error adding ${col.name}:`, e.message)
    }
  }
})

console.log('\n✓ Migration complete!')
console.log('Your database now supports comprehensive profile data.')

db.close()
