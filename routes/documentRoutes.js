import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', '..', 'data', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

export default function documentRoutes(db) {
  const router = express.Router();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  console.log('OpenAI ready');

  async function extractPdfText(filePath) {
    const data = new Uint8Array(fs.readFileSync(filePath));
    const doc = await pdfjsLib.getDocument({ data }).promise;
    let text = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(x => x.str).join(' ') + '\n';
    }
    return text;
  }

  const EXTRACTION_PROMPT = `You are a document parser for GrantFlow. Extract ALL data from this document into a flat JSON object. Return ONLY valid JSON with no markdown, no backticks, no explanation. Map fields to these keys: name, email, phone, website, dob, age, ssn, green_card_number, address, city, state, zip, ein, uei, cage_code, organization_type, annual_budget, staff_count, sam_registered, grants_gov_active, faith_based, serves_rural, minority_serving, public_charity, ntee_code, hipaa_compliant, ferpa_compliant, current_school, intended_major, gpa, act_score, sat_score, grade_level, first_gen_college, stem_student, pell_grant_eligible, fafsa_completed, community_service_hours, annual_income, household_size, low_income, unemployed, disabled, uninsured, medical_debt, education_debt, financial_challenges, medicaid, medicare, ssi, ssdi, snap, tanf, wic, section_8, liheap, government_programs, health_conditions, cancer, chronic_illness, dialysis, neurodivergent, mental_health, visual_impairment, hearing_impairment, wheelchair_user, citizenship_status, race_ethnicity, tribal_affiliation, religion, lgbtq, ethnicity_african_american, ethnicity_hispanic, ethnicity_asian, ethnicity_native_american, ethnicity_white, single_parent, foster_youth, orphan, adopted, family_caregiver, widow_widower, homeless, domestic_violence_survivor, formerly_incarcerated, family_situation, veteran, active_duty, military_spouse, military_dependent, disabled_veteran, veteran_branch_mos, va_disability_rating, discharge_character, gold_star_family, occupation, employer, healthcare_worker, teacher, firefighter, law_enforcement, small_business_owner, farmer, gun_owner, nra_member, hunter, concealed_carry, competitive_shooter, elected_official, office_held, political_candidate, party_democratic, party_republican, party_independent, goals, story, funding_need, challenges, support_network, extracurricular, awards, keywords, profile_type. For checkboxes use true/false.`;

  router.post('/documents/upload-and-parse', upload.array('file', 10), async (req, res) => {
    console.log('=== UPLOAD START ===');
    try {
      const { organizationId, pastedText } = req.body;
      const files = req.files || [];
      if (!organizationId) return res.status(400).json({ error: 'organizationId required' });

      const documents = [];
      let allText = pastedText || '';

      for (const file of files) {
        console.log('Processing:', file.originalname);
        const docId = uuidv4();
        db.prepare("INSERT INTO profile_documents (id, organization_id, filename, original_name, mime_type, size, category, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))").run(docId, organizationId, file.filename, file.originalname, file.mimetype, file.size, 'uploaded');
        documents.push({ id: docId, filename: file.filename, originalName: file.originalname, mimeType: file.mimetype, size: file.size });

        if (file.mimetype === 'application/pdf') {
          console.log('Extracting PDF text...');
          try {
            const txt = await extractPdfText(file.path);
            console.log('Extracted', txt.length, 'chars');
            allText += '\n' + txt;
          } catch (e) { console.error('PDF error:', e.message); }
        }
      }

      let extractedFields = {};
      if (allText.trim()) {
        console.log('Calling OpenAI...');
        try {
          const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: EXTRACTION_PROMPT },
              { role: 'user', content: allText.substring(0, 50000) }
            ],
            max_tokens: 8000,
            temperature: 0.1
          });
          const responseText = response.choices[0]?.message?.content || '';
          console.log('Response:', responseText.substring(0, 200));
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            extractedFields = JSON.parse(jsonMatch[0]);
            console.log('Parsed', Object.keys(extractedFields).length, 'fields');
          }
        } catch (aiErr) { console.error('OpenAI error:', aiErr.message); }
      }

      console.log('=== RESULT:', Object.keys(extractedFields).length, 'fields ===');
      res.json({ success: true, documents, extractedFields, fieldCount: Object.keys(extractedFields).length });
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/documents/:organizationId', (req, res) => {
    try {
      const docs = db.prepare('SELECT id, filename, original_name, mime_type, size, category, uploaded_at FROM profile_documents WHERE organization_id = ? ORDER BY uploaded_at DESC').all(req.params.organizationId);
      res.json(docs);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.delete('/documents/:docId', (req, res) => {
    try {
      const doc = db.prepare('SELECT * FROM profile_documents WHERE id = ?').get(req.params.docId);
      if (doc) {
        const filePath = path.join(__dirname, '..', '..', 'data', 'uploads', doc.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        db.prepare('DELETE FROM profile_documents WHERE id = ?').run(req.params.docId);
      }
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/documents/download/:docId', (req, res) => {
    try {
      const doc = db.prepare('SELECT * FROM profile_documents WHERE id = ?').get(req.params.docId);
      if (!doc) return res.status(404).json({ error: 'Not found' });
      res.download(path.join(__dirname, '..', '..', 'data', 'uploads', doc.filename), doc.original_name);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  return router;
}