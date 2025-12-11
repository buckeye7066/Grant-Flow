import Database from 'better-sqlite3';

const db = new Database('./db/grantflow.db');

const clients = [
  { name: 'Olivia Beltran', code: 'OLIVIA-2024' },
  { name: 'Brian Nicholas Newman', code: 'BRIAN-2024' },
  { name: 'Avanell Lea Leamon', code: 'AVANELL-2024' }
];

console.log('Creating client accounts...\n');

clients.forEach(c => {
  try {
    db.prepare('INSERT INTO clients (name, access_code, email, is_admin) VALUES (?, ?, ?, 0)').run(c.name, c.code, '');
    console.log('Created: ' + c.name + ' - Code: ' + c.code);
  } catch(e) {
    console.log('Already exists: ' + c.name);
  }
});

db.close();
console.log('\nDone!');
