const Database = require('better-sqlite3');
const db = new Database('../data/grantflow.db');
const brians = db.prepare("SELECT id, name FROM organizations WHERE name LIKE '%Brian%Newman%'").all();
console.log('Found:', brians.length, 'profiles');
brians.forEach(function(b) { console.log('-', b.name, b.id); });
if (brians.length > 1) {
  db.prepare('DELETE FROM organizations WHERE id = ?').run(brians[1].id);
  console.log('Deleted duplicate');
}
db.close();
