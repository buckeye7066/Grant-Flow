import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { getDb } from '../db/init.js'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const orgDir = path.join(uploadsDir, req.params.organizationId)
    if (!fs.existsSync(orgDir)) {
      fs.mkdirSync(orgDir, { recursive: true })
    }
    cb(null, orgDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(8).toString('hex')
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}-${uniqueSuffix}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'text/plain',
      'text/csv'
    ]
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('File type not allowed'), false)
    }
  }
})

// Get all documents for an organization
router.get('/:organizationId', (req, res) => {
  try {
    const db = getDb()
    const { organizationId } = req.params
    
    const documents = db.prepare(`
      SELECT * FROM profile_documents 
      WHERE organization_id = ?
      ORDER BY created_at DESC
    `).all(organizationId)
    
    res.json(documents)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Upload document
router.post('/:organizationId/upload', upload.single('file'), (req, res) => {
  try {
    const db = getDb()
    const { organizationId } = req.params
    const { category, description, is_phi } = req.body
    const file = req.file

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const id = crypto.randomUUID()
    
    db.prepare(`
      INSERT INTO profile_documents (
        id, organization_id, filename, original_name, mime_type, size, category, description, is_phi
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      organizationId,
      file.filename,
      file.originalname,
      file.mimetype,
      file.size,
      category || 'other',
      description || null,
      is_phi === 'true' || is_phi === true ? 1 : 0
    )

    const document = db.prepare('SELECT * FROM profile_documents WHERE id = ?').get(id)
    res.status(201).json(document)
  } catch (err) {
    console.error('Upload error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Upload from clipboard (base64 image)
router.post('/:organizationId/paste', express.json({ limit: '50mb' }), (req, res) => {
  try {
    const db = getDb()
    const { organizationId } = req.params
    const { imageData, category, description } = req.body

    if (!imageData) {
      return res.status(400).json({ error: 'No image data provided' })
    }

    // Parse base64 data
    const matches = imageData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid image data' })
    }

    const mimeType = matches[1]
    const buffer = Buffer.from(matches[2], 'base64')
    
    // Determine file extension
    const extMap = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/gif': '.gif',
      'image/webp': '.webp'
    }
    const ext = extMap[mimeType] || '.png'
    
    // Save file
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`
    const orgDir = path.join(uploadsDir, organizationId)
    if (!fs.existsSync(orgDir)) {
      fs.mkdirSync(orgDir, { recursive: true })
    }
    
    const filepath = path.join(orgDir, filename)
    fs.writeFileSync(filepath, buffer)

    const id = crypto.randomUUID()
    
    db.prepare(`
      INSERT INTO profile_documents (
        id, organization_id, filename, original_name, mime_type, size, category, description, is_phi
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      id,
      organizationId,
      filename,
      `pasted-image${ext}`,
      mimeType,
      buffer.length,
      category || 'screenshot',
      description || 'Pasted from clipboard'
    )

    const document = db.prepare('SELECT * FROM profile_documents WHERE id = ?').get(id)
    res.status(201).json(document)
  } catch (err) {
    console.error('Paste error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Save pasted text as document
router.post('/:organizationId/text', (req, res) => {
  try {
    const db = getDb()
    const { organizationId } = req.params
    const { text, category, description, filename } = req.body

    if (!text) {
      return res.status(400).json({ error: 'No text provided' })
    }

    // Save as text file
    const fname = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.txt`
    const orgDir = path.join(uploadsDir, organizationId)
    if (!fs.existsSync(orgDir)) {
      fs.mkdirSync(orgDir, { recursive: true })
    }
    
    const filepath = path.join(orgDir, fname)
    fs.writeFileSync(filepath, text, 'utf8')

    const id = crypto.randomUUID()
    
    db.prepare(`
      INSERT INTO profile_documents (
        id, organization_id, filename, original_name, mime_type, size, category, description, is_phi
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      id,
      organizationId,
      fname,
      filename || 'pasted-text.txt',
      'text/plain',
      Buffer.byteLength(text, 'utf8'),
      category || 'notes',
      description || 'Pasted text'
    )

    const document = db.prepare('SELECT * FROM profile_documents WHERE id = ?').get(id)
    res.status(201).json(document)
  } catch (err) {
    console.error('Text save error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Download/view document
router.get('/:organizationId/file/:filename', (req, res) => {
  try {
    const { organizationId, filename } = req.params
    const filepath = path.join(uploadsDir, organizationId, filename)
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'File not found' })
    }
    
    res.sendFile(filepath)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Delete document
router.delete('/:organizationId/:documentId', (req, res) => {
  try {
    const db = getDb()
    const { organizationId, documentId } = req.params
    
    const doc = db.prepare('SELECT * FROM profile_documents WHERE id = ? AND organization_id = ?').get(documentId, organizationId)
    
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' })
    }
    
    // Delete file
    const filepath = path.join(uploadsDir, organizationId, doc.filename)
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath)
    }
    
    // Delete database record
    db.prepare('DELETE FROM profile_documents WHERE id = ?').run(documentId)
    
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Update document metadata
router.put('/:organizationId/:documentId', (req, res) => {
  try {
    const db = getDb()
    const { organizationId, documentId } = req.params
    const { category, description, is_phi } = req.body
    
    db.prepare(`
      UPDATE profile_documents 
      SET category = COALESCE(?, category),
          description = COALESCE(?, description),
          is_phi = COALESCE(?, is_phi)
      WHERE id = ? AND organization_id = ?
    `).run(category, description, is_phi, documentId, organizationId)
    
    const document = db.prepare('SELECT * FROM profile_documents WHERE id = ?').get(documentId)
    res.json(document)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
