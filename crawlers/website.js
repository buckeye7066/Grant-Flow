/**
 * Website Crawler
 * Generic web scraper for any funding source URL
 * Uses AI-assisted extraction of opportunity data
 */

import { BaseCrawler } from './base.js'
import * as cheerio from 'cheerio'
import OpenAI from 'openai'

export class WebsiteCrawler extends BaseCrawler {
  constructor() {
    super('website', 'Generic website crawler with AI extraction')
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }

  async crawl(profiles) {
    // This crawler is designed to be called with specific URLs
    // Not for general crawling
    console.log(`[Website] Generic crawler ready for custom URLs`)
  }

  /**
   * Crawl a specific URL and extract funding opportunities
   */
  async crawlUrl(url, criteria, profileId) {
    console.log(`[Website] Crawling ${url}...`)
    
    try {
      const html = await this.fetchPage(url)
      const $ = cheerio.load(html)
      
      // Remove script, style, nav, footer elements
      $('script, style, nav, footer, header, aside').remove()
      
      // Get main content
      const textContent = $('body').text()
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 8000) // Limit for AI processing
      
      // Use AI to extract opportunities
      const opportunities = await this.extractWithAI(url, textContent, $)
      
      // Process extracted opportunities
      for (const opp of opportunities) {
        await this.processOpportunity(opp, criteria, profileId, url)
      }
      
      console.log(`[Website] Found ${opportunities.length} opportunities at ${url}`)
      return opportunities
      
    } catch (err) {
      console.error(`[Website] Error crawling ${url}:`, err.message)
      throw err
    }
  }

  async extractWithAI(url, textContent, $) {
    // First try structural extraction
    const structuralOpps = this.structuralExtraction($)
    
    if (structuralOpps.length > 0) {
      return structuralOpps
    }
    
    // Fall back to AI extraction
    if (!this.openai || !process.env.OPENAI_API_KEY) {
      console.log('[Website] OpenAI not configured, using basic extraction only')
      return this.basicExtraction($)
    }

    try {
      const prompt = `Analyze this webpage content and extract any funding opportunities, grants, scholarships, or assistance programs.

URL: ${url}

Content:
${textContent.substring(0, 6000)}

For each opportunity found, provide:
1. Title/Name
2. Sponsor/Organization
3. Description
4. Amount (min and max if available)
5. Deadline
6. Eligibility
7. Focus areas/categories

Return a JSON array of opportunities. If no opportunities found, return empty array [].
Only return valid JSON, no other text.

Example format:
[{"title": "Grant Name", "sponsor": "Organization", "description": "...", "amount_min": 1000, "amount_max": 5000, "deadline": "2024-03-01", "eligibility": "...", "focus_areas": ["education", "health"]}]`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000
      })

      const content = response.choices[0].message.content.trim()
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '')
      
      return JSON.parse(jsonStr)
      
    } catch (err) {
      console.error('[Website] AI extraction error:', err.message)
      return this.basicExtraction($)
    }
  }

  structuralExtraction($) {
    const opportunities = []
    
    // Common grant listing patterns
    const selectors = [
      '.grant-item', '.opportunity-card', '.funding-opportunity',
      '.scholarship-item', '.program-listing', 'article.grant',
      '[data-grant]', '[data-opportunity]', '.listing-item'
    ]
    
    for (const selector of selectors) {
      $(selector).each((i, el) => {
        const $el = $(el)
        const opp = {
          title: $el.find('h2, h3, .title, .name').first().text().trim(),
          sponsor: $el.find('.sponsor, .organization, .funder').text().trim(),
          description: $el.find('.description, .summary, p').first().text().trim(),
          amount_min: this.extractAmount($el.find('.amount, .award').text()),
          amount_max: null,
          deadline: $el.find('.deadline, .due-date').text().trim(),
          eligibility: $el.find('.eligibility, .requirements').text().trim(),
          focus_areas: []
        }
        
        if (opp.title) {
          opportunities.push(opp)
        }
      })
      
      if (opportunities.length > 0) break
    }
    
    return opportunities
  }

  basicExtraction($) {
    const opportunities = []
    
    // Look for any headings that might be grant names
    $('h1, h2, h3').each((i, el) => {
      const title = $(el).text().trim()
      
      // Check if it looks like a grant/scholarship
      const keywords = ['grant', 'scholarship', 'funding', 'award', 'fellowship', 'program']
      if (keywords.some(kw => title.toLowerCase().includes(kw))) {
        const $parent = $(el).parent()
        opportunities.push({
          title: title,
          sponsor: $('meta[property="og:site_name"]').attr('content') || '',
          description: $parent.find('p').first().text().trim().substring(0, 500),
          amount_min: null,
          amount_max: null,
          deadline: null,
          eligibility: '',
          focus_areas: []
        })
      }
    })
    
    return opportunities.slice(0, 10)
  }

  extractAmount(text) {
    if (!text) return null
    const match = text.match(/\$[\d,]+/)
    if (match) {
      return parseInt(match[0].replace(/[$,]/g, ''))
    }
    return null
  }

  async processOpportunity(opp, criteria, profileId, sourceUrl) {
    const opportunity = {
      source_id: `web_${this.hashString(sourceUrl + opp.title)}`,
      source: 'website',
      title: opp.title,
      sponsor: opp.sponsor || new URL(sourceUrl).hostname,
      description: opp.description || '',
      amount_min: opp.amount_min,
      amount_max: opp.amount_max,
      deadline: opp.deadline,
      eligibility_criteria: opp.eligibility || '',
      focus_areas: opp.focus_areas || [],
      url: sourceUrl
    }

    if (criteria) {
      const match = this.calculateMatchScore(opportunity, criteria)
      
      if (match.score >= 20) {
        await this.saveOpportunity(opportunity)
        
        if (profileId) {
          await this.saveMatch(profileId, opportunity.source_id, match)
        }
      }
    } else {
      // Save without matching
      await this.saveOpportunity(opportunity)
    }
  }

  hashString(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16)
  }

  async saveMatch(profileId, sourceId, match) {
    try {
      const oppId = this.db.prepare(
        'SELECT id FROM funding_opportunities WHERE source_id = ?'
      ).get(sourceId)?.id

      if (oppId) {
        const existing = this.db.prepare(
          'SELECT id FROM matches WHERE organization_id = ? AND opportunity_id = ?'
        ).get(profileId, oppId)

        if (!existing) {
          this.db.prepare(`
            INSERT INTO matches (id, organization_id, opportunity_id, score, analysis, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
          `).run(
            crypto.randomUUID(),
            profileId,
            oppId,
            match.score,
            JSON.stringify({ reasons: match.reasons, category: 'custom' })
          )
        }
      }
    } catch (err) {
      console.error('[Website] Match save error:', err.message)
    }
  }
}

export default WebsiteCrawler
