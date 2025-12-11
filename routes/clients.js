import express from 'express'
import { getDb } from '../db/init.js'
import crypto from 'crypto'

const router = express.Router()

// Generate unique access code
function generateAccessCode(clientCategory) {
  const prefix = clientCategory === 'individual' ? 'IND' : 'ORG'
  const code = crypto.randomBytes(4).toString('hex').toUpperCase()
  return `${prefix}-${code}`
}

// Get all clients with their services
router.get('/', (req, res) => {
  try {
    const db = getDb()
    
    const clients = db.prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM client_services WHERE client_id = c.id) as service_count,
        (SELECT SUM(amount_paid) FROM client_services WHERE client_id = c.id) as total_paid,
        (SELECT SUM(amount_due) FROM client_services WHERE client_id = c.id) as total_due
      FROM clients c
      ORDER BY c.created_at DESC
    `).all()

    // Get services for each client
    const clientsWithServices = clients.map(client => {
      const services = db.prepare(`
        SELECT * FROM client_services WHERE client_id = ?
      `).all(client.id)
      
      return { ...client, services }
    })

    res.json(clientsWithServices)
  } catch (err) {
    console.error('Error fetching clients:', err)
    res.status(500).json({ error: err.message })
  }
})

// Get single client with full details
router.get('/:id', (req, res) => {
  try {
    const db = getDb()
    const { id } = req.params

    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id)
    if (!client) {
      return res.status(404).json({ error: 'Client not found' })
    }

    const services = db.prepare('SELECT * FROM client_services WHERE client_id = ?').all(id)
    const payments = db.prepare('SELECT * FROM client_payments WHERE client_id = ? ORDER BY payment_date DESC').all(id)
    const hours = db.prepare('SELECT * FROM client_hours WHERE client_id = ? ORDER BY date DESC').all(id)
    const organizations = db.prepare('SELECT * FROM organizations WHERE client_id = ?').all(id)

    res.json({ ...client, services, payments, hours, organizations })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Login with access code
router.post('/login', (req, res) => {
  try {
    const db = getDb()
    const { access_code } = req.body

    if (!access_code) {
      return res.status(400).json({ error: 'Access code required' })
    }

    const client = db.prepare(`
      SELECT * FROM clients WHERE access_code = ? AND is_active = 1
    `).get(access_code)

    if (!client) {
      return res.status(401).json({ error: 'Invalid access code' })
    }

    // Get active services
    const services = db.prepare(`
      SELECT * FROM client_services 
      WHERE client_id = ? 
      AND status = 'active'
      AND (expiry_date IS NULL OR expiry_date > datetime('now'))
    `).all(client.id)

    // Map services to features
    const features = new Set(['profile_management', 'anya_assistant'])
    
    for (const service of services) {
      const serviceFeatures = getServiceFeatures(service.service_id)
      serviceFeatures.forEach(f => features.add(f))
    }

    // Admin gets all features
    if (client.is_admin) {
      features.add('admin')
      features.add('smart_matcher_full')
      features.add('opportunity_search')
      features.add('pipeline_management')
      features.add('grant_writer_full')
      features.add('calendar_full')
    }

    res.json({
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        organization_name: client.organization_name,
        client_category: client.client_category,
        is_admin: client.is_admin,
        pro_bono: client.pro_bono,
        hardship_flag: client.hardship_flag
      },
      services,
      features: Array.from(features)
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Create new client
router.post('/', (req, res) => {
  try {
    const db = getDb()
    const { 
      name, email, phone, organization_name, client_category, 
      annual_budget, notes, pro_bono, hardship_flag, billing_notes 
    } = req.body

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email required' })
    }

    const id = crypto.randomUUID()
    const access_code = generateAccessCode(client_category)

    db.prepare(`
      INSERT INTO clients (
        id, name, email, phone, organization_name, client_category, 
        annual_budget, access_code, is_active, is_admin, notes,
        pro_bono, hardship_flag, billing_notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?, ?, datetime('now'))
    `).run(
      id, name, email, phone || null, organization_name || null,
      client_category || 'small_org', annual_budget || null, access_code, notes || null,
      pro_bono || 0, hardship_flag || 0, billing_notes || null
    )

    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id)
    res.status(201).json(client)
  } catch (err) {
    console.error('Create client error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Update client
router.put('/:id', (req, res) => {
  try {
    const db = getDb()
    const { id } = req.params
    const updates = req.body

    const allowedFields = [
      'name', 'email', 'phone', 'organization_name', 'client_category',
      'annual_budget', 'is_active', 'notes', 'pro_bono', 'hardship_flag', 'billing_notes'
    ]

    const setClause = []
    const values = []

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = ?`)
        values.push(value)
      }
    }

    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }

    values.push(id)
    db.prepare(`UPDATE clients SET ${setClause.join(', ')} WHERE id = ?`).run(...values)

    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id)
    res.json(client)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Delete client
router.delete('/:id', (req, res) => {
  try {
    const db = getDb()
    const { id } = req.params

    // Delete related records first
    db.prepare('DELETE FROM client_payments WHERE client_id = ?').run(id)
    db.prepare('DELETE FROM client_hours WHERE client_id = ?').run(id)
    db.prepare('DELETE FROM client_services WHERE client_id = ?').run(id)
    db.prepare('UPDATE organizations SET client_id = NULL WHERE client_id = ?').run(id)
    db.prepare('DELETE FROM clients WHERE id = ?').run(id)

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Add service to client
router.post('/:id/services', (req, res) => {
  try {
    const db = getDb()
    const { id: clientId } = req.params
    const { service_id, amount_due, expiry_date } = req.body

    // Check if client is pro bono
    const client = db.prepare('SELECT pro_bono FROM clients WHERE id = ?').get(clientId)
    
    const serviceRecord = {
      id: crypto.randomUUID(),
      client_id: clientId,
      service_id,
      status: 'active',
      purchase_date: new Date().toISOString(),
      expiry_date: expiry_date || null,
      amount_due: amount_due || 0,
      amount_paid: client?.pro_bono ? amount_due : 0, // Pro bono marks as "paid" immediately
      payment_status: client?.pro_bono ? 'pro_bono' : 'pending',
      milestone_1_paid: client?.pro_bono ? 1 : 0,
      milestone_2_paid: client?.pro_bono ? 1 : 0,
      milestone_3_paid: client?.pro_bono ? 1 : 0
    }

    db.prepare(`
      INSERT INTO client_services (
        id, client_id, service_id, status, purchase_date, expiry_date,
        amount_due, amount_paid, payment_status, milestone_1_paid, milestone_2_paid, milestone_3_paid
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      serviceRecord.id, serviceRecord.client_id, serviceRecord.service_id,
      serviceRecord.status, serviceRecord.purchase_date, serviceRecord.expiry_date,
      serviceRecord.amount_due, serviceRecord.amount_paid, serviceRecord.payment_status,
      serviceRecord.milestone_1_paid, serviceRecord.milestone_2_paid, serviceRecord.milestone_3_paid
    )

    const service = db.prepare('SELECT * FROM client_services WHERE id = ?').get(serviceRecord.id)
    res.status(201).json(service)
  } catch (err) {
    console.error('Add service error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Update service
router.put('/services/:serviceId', (req, res) => {
  try {
    const db = getDb()
    const { serviceId } = req.params
    const updates = req.body

    const allowedFields = [
      'status', 'expiry_date', 'amount_due', 'amount_paid', 
      'payment_status', 'milestone_1_paid', 'milestone_2_paid', 'milestone_3_paid'
    ]

    const setClause = []
    const values = []

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = ?`)
        values.push(value)
      }
    }

    if (setClause.length > 0) {
      values.push(serviceId)
      db.prepare(`UPDATE client_services SET ${setClause.join(', ')} WHERE id = ?`).run(...values)
    }

    // Auto-update payment status based on milestones
    const service = db.prepare('SELECT * FROM client_services WHERE id = ?').get(serviceId)
    if (service && service.payment_status !== 'pro_bono') {
      const milestonePaid = (service.milestone_1_paid ? 0.4 : 0) + 
                           (service.milestone_2_paid ? 0.4 : 0) + 
                           (service.milestone_3_paid ? 0.2 : 0)
      const newAmountPaid = Math.round(service.amount_due * milestonePaid)
      
      let newStatus = 'pending'
      if (milestonePaid === 1) newStatus = 'paid'
      else if (milestonePaid > 0) newStatus = 'partial'
      
      db.prepare(`
        UPDATE client_services SET amount_paid = ?, payment_status = ? WHERE id = ?
      `).run(newAmountPaid, newStatus, serviceId)
    }

    const updatedService = db.prepare('SELECT * FROM client_services WHERE id = ?').get(serviceId)
    res.json(updatedService)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Record payment
router.post('/:id/payments', (req, res) => {
  try {
    const db = getDb()
    const { id: clientId } = req.params
    const { client_service_id, amount, payment_method, milestone_number } = req.body

    const paymentId = crypto.randomUUID()
    
    db.prepare(`
      INSERT INTO client_payments (id, client_id, client_service_id, amount, payment_method, payment_date, milestone_number)
      VALUES (?, ?, ?, ?, ?, datetime('now'), ?)
    `).run(paymentId, clientId, client_service_id, amount, payment_method || 'other', milestone_number || null)

    // Update service amount_paid
    if (client_service_id) {
      db.prepare(`
        UPDATE client_services 
        SET amount_paid = amount_paid + ?
        WHERE id = ?
      `).run(amount, client_service_id)

      // Update payment status
      const service = db.prepare('SELECT * FROM client_services WHERE id = ?').get(client_service_id)
      if (service) {
        let newStatus = 'partial'
        if (service.amount_paid >= service.amount_due) newStatus = 'paid'
        db.prepare('UPDATE client_services SET payment_status = ? WHERE id = ?').run(newStatus, client_service_id)
      }
    }

    const payment = db.prepare('SELECT * FROM client_payments WHERE id = ?').get(paymentId)
    res.status(201).json(payment)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Log hours
router.post('/:id/hours', (req, res) => {
  try {
    const db = getDb()
    const { id: clientId } = req.params
    const { service_id, date, hours, description, billable, rate } = req.body

    const hourId = crypto.randomUUID()
    
    db.prepare(`
      INSERT INTO client_hours (id, client_id, service_id, date, hours, description, billable, billed, rate)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(hourId, clientId, service_id || null, date, hours, description || null, billable ? 1 : 0, rate || null)

    const hour = db.prepare('SELECT * FROM client_hours WHERE id = ?').get(hourId)
    res.status(201).json(hour)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Pro Bono Report (for tax purposes)
router.get('/reports/pro-bono', (req, res) => {
  try {
    const db = getDb()
    const { year } = req.query
    
    const yearFilter = year ? `AND strftime('%Y', cs.purchase_date) = ?` : ''
    const params = year ? [year] : []

    const proBonoClients = db.prepare(`
      SELECT 
        c.id, c.name, c.email, c.organization_name, c.billing_notes,
        SUM(cs.amount_due) as total_value,
        COUNT(cs.id) as service_count,
        GROUP_CONCAT(cs.service_id) as services
      FROM clients c
      LEFT JOIN client_services cs ON c.id = cs.client_id
      WHERE c.pro_bono = 1 ${yearFilter}
      GROUP BY c.id
    `).all(...params)

    const totalValue = proBonoClients.reduce((sum, c) => sum + (c.total_value || 0), 0)

    res.json({
      year: year || 'all',
      clients: proBonoClients,
      totalClients: proBonoClients.length,
      totalValue,
      generatedAt: new Date().toISOString()
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Helper function to map services to features
function getServiceFeatures(serviceId) {
  const featureMap = {
    'quick_eligibility_scan': ['smart_matcher_basic', 'opportunity_search', 'eligibility_report'],
    'comprehensive_funding_dossier': ['smart_matcher_full', 'opportunity_search', 'pipeline_management', 'funding_dossier', 'timeline_planning', 'eligibility_report'],
    'application_strategy_session': ['consultation', 'calendar_basic'],
    'micro_grant_application': ['grant_writer', 'budget_tool', 'submission_tracking'],
    'standard_foundation_application': ['grant_writer', 'budget_tool', 'logic_model', 'evaluation_plan', 'submission_tracking'],
    'complex_federal_application': ['grant_writer_full', 'budget_tool', 'logic_model', 'evaluation_plan', 'work_plan', 'compliance_review', 'submission_tracking'],
    'transfer_scholarship_pack': ['grant_writer', 'scholarship_search'],
    'editing_redraft': ['grant_writer', 'editing'],
    'budget_logic_model': ['budget_tool', 'logic_model'],
    'compliance_reporting': ['compliance_review', 'reporting'],
    'grant_calendar': ['calendar_full', 'deadline_reminders', 'milestone_tracking'],
    'hourly_consultation': ['consultation_hours']
  }
  
  return featureMap[serviceId] || []
}

export default router
