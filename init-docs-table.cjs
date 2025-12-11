const db = require('better-sqlite3')('G:/Apps/grantflow-local/data/grantflow.db');
db.exec("CREATE TABLE IF NOT EXISTS profile_documents (id TEXT PRIMARY KEY, organization_id TEXT, filename TEXT, original_name TEXT, mime_type TEXT, size INTEGER, category TEXT, uploaded_at TEXT)");
console.log('Table created/verified');