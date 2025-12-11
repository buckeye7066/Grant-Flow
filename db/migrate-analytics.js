import { getDb } from './init.js'

const db = getDb()

console.log('Creating analytics and personalization tables...')

// User activity/session tracking
try {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      login_time TEXT DEFAULT (datetime('now')),
      logout_time TEXT,
      ip_address TEXT,
      user_agent TEXT,
      is_first_login INTEGER DEFAULT 0,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `).run()
  console.log('✓ Created user_sessions table')
} catch (err) {
  console.log('○ user_sessions:', err.message)
}

// Page view tracking
try {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS page_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL,
      session_id TEXT,
      page_path TEXT NOT NULL,
      page_title TEXT,
      timestamp TEXT DEFAULT (datetime('now')),
      time_on_page INTEGER,
      FOREIGN KEY (client_id) REFERENCES clients(id),
      FOREIGN KEY (session_id) REFERENCES user_sessions(id)
    )
  `).run()
  console.log('✓ Created page_views table')
} catch (err) {
  console.log('○ page_views:', err.message)
}

// System announcements
try {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      priority INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      show_to_all INTEGER DEFAULT 1,
      target_client_ids TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT,
      created_by TEXT
    )
  `).run()
  console.log('✓ Created announcements table')
} catch (err) {
  console.log('○ announcements:', err.message)
}

// User preferences for personalization
try {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      id TEXT PRIMARY KEY,
      client_id TEXT UNIQUE NOT NULL,
      theme TEXT DEFAULT 'default',
      primary_color TEXT DEFAULT '#3B82F6',
      accent_color TEXT DEFAULT '#8B5CF6',
      font_family TEXT DEFAULT 'Inter',
      font_size TEXT DEFAULT 'medium',
      sidebar_collapsed INTEGER DEFAULT 0,
      dashboard_layout TEXT DEFAULT 'default',
      show_animations INTEGER DEFAULT 1,
      dark_mode INTEGER DEFAULT 0,
      compact_mode INTEGER DEFAULT 0,
      custom_css TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `).run()
  console.log('✓ Created user_preferences table')
} catch (err) {
  console.log('○ user_preferences:', err.message)
}

// Track if user has seen onboarding
try {
  db.prepare(`ALTER TABLE clients ADD COLUMN has_seen_onboarding INTEGER DEFAULT 0`).run()
  console.log('✓ Added has_seen_onboarding column')
} catch (err) {
  console.log('○ has_seen_onboarding:', err.message)
}

// Track last login
try {
  db.prepare(`ALTER TABLE clients ADD COLUMN last_login TEXT`).run()
  console.log('✓ Added last_login column')
} catch (err) {
  console.log('○ last_login:', err.message)
}

// Track login count
try {
  db.prepare(`ALTER TABLE clients ADD COLUMN login_count INTEGER DEFAULT 0`).run()
  console.log('✓ Added login_count column')
} catch (err) {
  console.log('○ login_count:', err.message)
}

console.log('\n✓ Analytics migration complete!')
