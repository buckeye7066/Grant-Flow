import Database from 'better-sqlite3';

const db = new Database('./db/grantflow.db');

console.log('Starting database migration...\n');

const columns = [
  { name: 'subscription_tier', type: 'TEXT DEFAULT "hope"' },
  { name: 'client_category', type: 'TEXT DEFAULT "individual"' },
  { name: 'ministry_discount', type: 'TEXT DEFAULT ""' },
  { name: 'hardship_discount', type: 'TEXT DEFAULT ""' },
  { name: 'pro_bono', type: 'INTEGER DEFAULT 0' },
  { name: 'grace_period_months', type: 'INTEGER DEFAULT 0' },
  { name: 'grace_period_start', type: 'TEXT DEFAULT ""' },
  { name: 'selected_addons', type: 'TEXT DEFAULT "[]"' },
  { name: 'billing_notes', type: 'TEXT DEFAULT ""' },
  { name: 'monthly_subscription_amount', type: 'REAL DEFAULT 0' },
  { name: 'billing_status', type: 'TEXT DEFAULT "active"' }
];

columns.forEach(col => {
  try {
    db.exec(`ALTER TABLE clients ADD COLUMN ${col.name} ${col.type}`);
    console.log('Added: ' + col.name);
  } catch (e) {
    console.log('Exists: ' + col.name);
  }
});

db.close();
console.log('\nDone!');
