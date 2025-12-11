import { getDb } from './init.js'

const db = getDb()

console.log('Adding billing columns to clients table...')

// Add pro_bono column
try {
  db.prepare(`ALTER TABLE clients ADD COLUMN pro_bono INTEGER DEFAULT 0`).run()
  console.log('✓ Added pro_bono column')
} catch (err) {
  if (err.message.includes('duplicate column')) {
    console.log('○ pro_bono column already exists')
  } else {
    console.error('Error adding pro_bono:', err.message)
  }
}

// Add hardship_flag column
try {
  db.prepare(`ALTER TABLE clients ADD COLUMN hardship_flag INTEGER DEFAULT 0`).run()
  console.log('✓ Added hardship_flag column')
} catch (err) {
  if (err.message.includes('duplicate column')) {
    console.log('○ hardship_flag column already exists')
  } else {
    console.error('Error adding hardship_flag:', err.message)
  }
}

// Add billing_notes column for tax documentation
try {
  db.prepare(`ALTER TABLE clients ADD COLUMN billing_notes TEXT`).run()
  console.log('✓ Added billing_notes column')
} catch (err) {
  if (err.message.includes('duplicate column')) {
    console.log('○ billing_notes column already exists')
  } else {
    console.error('Error adding billing_notes:', err.message)
  }
}

console.log('\n✓ Migration complete!')
console.log('Pro bono clients will have services tracked but not billed.')
