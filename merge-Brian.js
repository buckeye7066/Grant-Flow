/**
 * Merge Brian Nicholas Newman profiles
 * Run with: node merge-brian.js
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'data', 'grantflow.db'));

// Find all Brian profiles
const brians = db.prepare(`
  SELECT * FROM organizations 
  WHERE name LIKE '%Brian%Newman%' OR name LIKE '%Brian Nicholas%'
`).all();

console.log(`Found ${brians.length} Brian profile(s):\n`);

brians.forEach((b, i) => {
  console.log(`--- Profile ${i + 1} ---`);
  console.log(`ID: ${b.id}`);
  console.log(`Name: ${b.name}`);
  console.log(`Email: ${b.email || 'N/A'}`);
  console.log(`City: ${b.city}, ${b.state}`);
  console.log(`Mission: ${(b.mission || '').slice(0, 100)}...`);
  console.log(`Focus Areas: ${b.focus_areas ? JSON.parse(b.focus_areas).slice(0, 3).join(', ') : 'N/A'}`);
  console.log('');
});

if (brians.length === 2) {
  // Merge logic - keep the one with more data
  const [p1, p2] = brians;
  
  // Count non-null fields
  const countFields = (obj) => Object.values(obj).filter(v => v !== null && v !== '' && v !== '[]').length;
  
  const keep = countFields(p1) >= countFields(p2) ? p1 : p2;
  const remove = keep.id === p1.id ? p2 : p1;
  
  console.log(`\nMerging: Keeping "${keep.name}" (ID: ${keep.id})`);
  console.log(`Removing: "${remove.name}" (ID: ${remove.id})`);
  
  // Merge fields from remove into keep where keep is empty
  const updates = [];
  const params = [];
  
  for (const [key, value] of Object.entries(remove)) {
    if (key === 'id' || key === 'created_at' || key === 'updated_at') continue;
    
    const keepValue = keep[key];
    if ((keepValue === null || keepValue === '' || keepValue === '[]') && value && value !== '' && value !== '[]') {
      updates.push(`${key} = ?`);
      params.push(value);
      console.log(`  Merging field: ${key}`);
    }
  }
  
  if (updates.length > 0) {
    params.push(keep.id);
    const updateSQL = `UPDATE organizations SET ${updates.join(', ')}, updated_at = ? WHERE id = ?`;
    params.splice(params.length - 1, 0, new Date().toISOString());
    db.prepare(updateSQL).run(...params);
    console.log(`\nUpdated ${updates.length} fields in kept profile.`);
  }
  
  // Update any references to the removed profile
  const tables = ['pipeline_items', 'matches'];
  for (const table of tables) {
    try {
      const result = db.prepare(`UPDATE ${table} SET organization_id = ? WHERE organization_id = ?`).run(keep.id, remove.id);
      if (result.changes > 0) {
        console.log(`Updated ${result.changes} rows in ${table}`);
      }
    } catch (e) {
      // Table might not exist or have that column
    }
  }
  
  // Delete the duplicate
  db.prepare('DELETE FROM organizations WHERE id = ?').run(remove.id);
  console.log(`\nDeleted duplicate profile.`);
  console.log(`\n✅ Merge complete! Brian Nicholas Newman now has one unified profile.`);
  
} else if (brians.length === 1) {
  console.log('Only one Brian profile found - no merge needed.');
} else if (brians.length === 0) {
  console.log('No Brian profiles found.');
} else {
  console.log(`Found ${brians.length} profiles - manual review needed.`);
}

db.close();