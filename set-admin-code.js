import { getDb } from './db/init.js'

const db = getDb()

db.prepare(`
  UPDATE clients 
  SET access_code = 'ELYRIA7066!' 
  WHERE email = 'Dr.JohnWhite@axiombiolabs.org'
`).run()

const admin = db.prepare("SELECT name, email, access_code FROM clients WHERE email = 'Dr.JohnWhite@axiombiolabs.org'").get()
if (admin) {
  console.log('Updated admin account:')
  console.log('  Name:', admin.name)
  console.log('  Email:', admin.email)
  console.log('  Access Code:', admin.access_code)
} else {
  console.log('Admin not found - run migrate-clients.js first')
}
