import express from 'express'
import OpenAI from 'openai'
import { getDb } from '../db/init.js'

const router = express.Router()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Smart Match endpoint
router.post('/smart-match', async (req, res) => {
  try {
    const { organization_id, limit = 500 } = req.body
    const db = getDb()
    
    const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(organization_id)
    if (!org) return res.status(404).json({ error: 'Organization not found' })
    
    org.focus_areas = org.focus_areas ? JSON.parse(org.focus_areas) : []
    
    const opportunities = db.prepare('SELECT * FROM funding_opportunities LIMIT 1000').all()
    
    const prompt = `You are a grant matching expert. Analyze the organization and find the best matching funding opportunities.

ORGANIZATION:
Name: ${org.name}
Mission: ${org.mission || 'Not specified'}
Focus Areas: ${org.focus_areas?.join(', ') || 'Not specified'}
Location: ${org.city}, ${org.state}
Type: ${org.organization_type || 'Not specified'}

OPPORTUNITIES (${opportunities.length} total):
${opportunities.slice(0, 100).map((o, i) => `${i + 1}. ID:${o.id} | ${o.title} | ${o.sponsor} | $${o.amount_min || 0}-${o.amount_max || 'varies'} | ${o.focus_areas || 'General'}`).join('\n')}

Return JSON array of top matches (score >= 30):
[{"opportunity_id": "id", "score": 0-100, "analysis": "why it matches", "reasons": ["reason1", "reason2"]}]

Only return the JSON array, no other text.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 4000
    })

    let matches = []
    try {
      const content = response.choices[0].message.content.trim()
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '')
      matches = JSON.parse(jsonStr)
    } catch (e) {
      console.error('Parse error:', e)
      matches = []
    }

    const enrichedMatches = matches.map(m => {
      const opp = opportunities.find(o => o.id === m.opportunity_id)
      return {
        ...m,
        opportunity: opp ? { ...opp, focus_areas: opp.focus_areas ? JSON.parse(opp.focus_areas) : [] } : null
      }
    }).filter(m => m.opportunity)

    res.json({
      organization: org,
      matches: enrichedMatches.slice(0, limit),
      summary: `Found ${enrichedMatches.length} matches for ${org.name}`
    })
  } catch (err) {
    console.error('Smart match error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Generate Grant Section endpoint
router.post('/generate-grant-section', async (req, res) => {
  try {
    const { organization, opportunity, section, existingContent = {} } = req.body

    const sectionPrompts = {
      executive_summary: `Write a compelling executive summary (250-300 words) for this grant application. Include the organization's mission, the specific project/program, funding amount requested, and expected outcomes. Write at an MBA level with professional tone.`,
      
      statement_of_need: `Write a powerful statement of need (400-500 words) that demonstrates the problem this grant will address. Use data and statistics where relevant. Show why this organization is positioned to address this need. Write persuasively at an MBA level.`,
      
      project_description: `Write a detailed project description (500-600 words) explaining what the organization will do with this funding. Include specific activities, timeline, and deliverables. Be concrete and actionable. MBA-level professional writing.`,
      
      goals_objectives: `Write clear goals and SMART objectives (300-400 words) for this grant project. Include 2-3 major goals with 3-4 measurable objectives each. Use action verbs and specific metrics. Format professionally.`,
      
      methodology: `Write a methodology section (400-500 words) explaining HOW the organization will implement this project. Include specific approaches, techniques, and processes. Reference best practices where relevant. MBA-level detail.`,
      
      evaluation_plan: `Write an evaluation plan (300-400 words) describing how success will be measured. Include specific metrics, data collection methods, and reporting timelines. Show commitment to accountability and continuous improvement.`,
      
      budget_narrative: `Write a budget narrative (300-400 words) explaining how funds will be used. Break down major expense categories and justify each. Show cost-effectiveness and alignment with project goals. Professional financial writing.`,
      
      sustainability: `Write a sustainability plan (250-300 words) explaining how the project/program will continue after grant funding ends. Include diversified funding strategies, partnerships, and long-term vision. Show organizational capacity.`
    }

    const context = Object.entries(existingContent)
      .filter(([k, v]) => v && k !== section)
      .map(([k, v]) => `${k.toUpperCase()}:\n${v.slice(0, 500)}...`)
      .join('\n\n')

    const orgFocusAreas = Array.isArray(organization?.focus_areas) 
      ? organization.focus_areas.join(', ') 
      : (organization?.focus_areas || 'Not specified')

    const prompt = `You are an expert grant writer with an MBA who has helped organizations secure millions in funding.

ORGANIZATION:
Name: ${organization?.name || 'Organization'}
Mission: ${organization?.mission || 'Not specified'}
Focus Areas: ${orgFocusAreas}
Location: ${organization?.city || ''}, ${organization?.state || ''}

FUNDING OPPORTUNITY:
Title: ${opportunity?.title || 'Grant Opportunity'}
Sponsor: ${opportunity?.sponsor || 'Funder'}
Amount: $${opportunity?.amount_min || 0} - $${opportunity?.amount_max || 'varies'}
Description: ${opportunity?.description || 'Not specified'}
Focus Areas: ${opportunity?.focus_areas || 'General'}
Eligibility: ${opportunity?.eligibility_criteria || 'See guidelines'}

${context ? `ALREADY WRITTEN SECTIONS:\n${context}\n\n` : ''}

TASK: ${sectionPrompts[section] || 'Write this section professionally.'}

Write ONLY the section content. Do not include headers or labels. Match the funder's language and priorities. Be specific to this organization and opportunity.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000
    })

    const content = response.choices[0].message.content.trim()
    res.json({ content, section })
  } catch (err) {
    console.error('Generate section error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Item Search endpoint
router.post('/item-search', async (req, res) => {
  try {
    const { query, organization_id } = req.body
    const db = getDb()
    
    const opportunities = db.prepare(`
      SELECT * FROM funding_opportunities 
      WHERE title LIKE ? OR description LIKE ? OR sponsor LIKE ?
      LIMIT 50
    `).all(`%${query}%`, `%${query}%`, `%${query}%`)
    
    res.json({ results: opportunities, query })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
