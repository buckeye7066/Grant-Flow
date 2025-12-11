/**
 * Database migration to add client management and service subscriptions
 * Run this script once to update the database schema
 */

import Database from 'better-sqlite3'
import path from 'path'
import crypto from 'crypto'

const dbPath = path.join(process.cwd(), '..', 'data', 'grantflow.db')
const db = new Database(dbPath)

console.log('Starting database migration for client management...')

// Create clients table
db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    organization_name TEXT,
    client_category TEXT DEFAULT 'individual',
    annual_budget REAL,
    access_code TEXT UNIQUE,
    is_active INTEGER DEFAULT 1,
    is_admin INTEGER DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )
`)
console.log('✓ Created clients table')

// Create client_services table (purchased services)
db.exec(`
  CREATE TABLE IF NOT EXISTS client_services (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    service_id TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    purchase_date TEXT DEFAULT (datetime('now')),
    expiry_date TEXT,
    amount_paid REAL,
    amount_due REAL,
    payment_status TEXT DEFAULT 'pending',
    milestone_1_paid INTEGER DEFAULT 0,
    milestone_2_paid INTEGER DEFAULT 0,
    milestone_3_paid INTEGER DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (client_id) REFERENCES clients(id)
  )
`)
console.log('✓ Created client_services table')

// Create client_payments table
db.exec(`
  CREATE TABLE IF NOT EXISTS client_payments (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    client_service_id TEXT,
    amount REAL NOT NULL,
    payment_method TEXT,
    payment_date TEXT DEFAULT (datetime('now')),
    milestone_number INTEGER,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (client_service_id) REFERENCES client_services(id)
  )
`)
console.log('✓ Created client_payments table')

// Create client_hours table (for hourly billing)
db.exec(`
  CREATE TABLE IF NOT EXISTS client_hours (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    service_id TEXT DEFAULT 'hourly_consultation',
    date TEXT NOT NULL,
    hours REAL NOT NULL,
    description TEXT,
    billable INTEGER DEFAULT 1,
    billed INTEGER DEFAULT 0,
    rate REAL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (client_id) REFERENCES clients(id)
  )
`)
console.log('✓ Created client_hours table')

// Link organizations to clients
try {
  db.exec(`ALTER TABLE organizations ADD COLUMN client_id TEXT REFERENCES clients(id)`)
  console.log('✓ Added client_id to organizations table')
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('○ client_id column already exists in organizations')
  }
}

// Create admin user (John White)
const adminId = crypto.randomUUID()
const adminCode = 'ADMIN-' + crypto.randomBytes(4).toString('hex').toUpperCase()

try {
  db.prepare(`
    INSERT INTO clients (id, name, email, phone, client_category, is_admin, access_code, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    adminId,
    'John White',
    'Dr.JohnWhite@axiombiolabs.org',
    '423-504-7778',
    'admin',
    1,
    adminCode,
    'System Administrator'
  )
  console.log(`✓ Created admin user with access code: ${adminCode}`)
} catch (e) {
  if (e.message.includes('UNIQUE constraint')) {
    console.log('○ Admin user already exists')
  } else {
    console.error('Error creating admin:', e.message)
  }
}

console.log('\n✓ Migration complete!')
console.log('Database now supports client management and service subscriptions.')

db.close()
