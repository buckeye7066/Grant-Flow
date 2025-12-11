/**
 * Benefits.gov Crawler
 * Discovers benefit programs and assistance opportunities
 * Targets individual/family assistance programs
 */

import { BaseCrawler } from './base.js'
import * as cheerio from 'cheerio'

export class BenefitsGovCrawler extends BaseCrawler {
  constructor() {
    super('benefits_gov', 'Government benefits and assistance programs from Benefits.gov')
    this.baseUrl = 'https://www.benefits.gov'
    this.apiUrl = 'https://www.benefits.gov/benefit-finder/api'
  }

  async crawl(profiles) {
    console.log(`[BenefitsGov] Starting crawl for ${profiles.length} profiles...`)

    for (const profile of profiles) {
      const criteria = this.parseProfileForMatching(profile)
      
      // Only crawl for individuals/families, not organizations
      if (this.isIndividualProfile(criteria)) {
        try {
          await this.findBenefits(criteria, profile.id)
        } catch (err) {
          console.error(`[BenefitsGov] Error for profile ${profile.id}:`, err.message)
        }
      }
    }

    console.log(`[BenefitsGov] Completed. Found ${this.opportunitiesFound} programs.`)
  }

  isIndividualProfile(criteria) {
    return ['individual', 'high_school', 'college', 'graduate', 'homeschool', 'medical', 'family'].includes(criteria.profileType)
  }

  async findBenefits(criteria, profileId) {
    // Build questionnaire answers based on profile
    const answers = this.buildQuestionnaire(criteria)
    
    // Fetch benefit categories relevant to this profile
    const categories = this.getRelevantCategories(criteria)
    
    for (const category of categories) {
      try {
        await this.crawlCategory(category, criteria, profileId)
        await new Promise(r => setTimeout(r, 500)) // Rate limiting
      } catch (err) {
        console.error(`[BenefitsGov] Category ${category} error:`, err.message)
      }
    }
  }

  buildQuestionnaire(criteria) {
    const answers = {}
    
    // Basic demographics
    if (criteria.location.state) {
      answers.state = criteria.location.state
    }
    
    // Income-based
    if (criteria.lowIncome) {
      answers.income = 'low'
    }
    
    // Special populations
    if (criteria.veteran) {
      answers.veteran = true
    }
    if (criteria.disability) {
      answers.disability = true
    }
    if (criteria.isStudent) {
      answers.student = true
    }
    if (criteria.singleParent) {
      answers.parent = true
      answers.singleParent = true
    }
    
    // Health conditions
    if (criteria.hasHealthCondition) {
      answers.healthCondition = true
    }
    
    // Government assistance
    if (criteria.onMedicaid) answers.medicaid = true
    if (criteria.onSNAP) answers.snap = true
    if (criteria.onSSI) answers.ssi = true
    
    return answers
  }

  getRelevantCategories(criteria) {
    const categories = []
    
    // Always include general assistance
    categories.push('financial-assistance')
    
    // Add specific categories based on profile
    if (criteria.lowIncome || criteria.onSNAP) {
      categories.push('food-nutrition')
    }
    if (criteria.homeless || criteria.lowIncome) {
      categories.push('housing')
    }
    if (criteria.hasHealthCondition || criteria.disability) {
      categories.push('health-care')
      categories.push('disability-assistance')
    }
    if (criteria.isStudent) {
      categories.push('education-training')
    }
    if (criteria.veteran) {
      categories.push('veteran-benefits')
    }
    if (criteria.singleParent || criteria.householdSize > 1) {
      categories.push('family-children')
    }
    if (criteria.disasterSurvivor) {
      categories.push('disaster-relief')
    }
    
    return [...new Set(categories)]
  }

  async crawlCategory(category, criteria, profileId) {
    try {
      // Try API first
      const apiUrl = `${this.apiUrl}/benefits?category=${category}&state=${criteria.location.state || ''}`
      let benefits = []
      
      try {
        const response = await this.fetchPage(apiUrl, { timeout: 30000 })
        if (response && response.benefits) {
          benefits = response.benefits
        }
      } catch {
        // Fallback to scraping
        benefits = await this.scrapeCategory(category, criteria.location.state)
      }

      for (const benefit of benefits) {
        await this.processBenefit(benefit, criteria, profileId, category)
      }
    } catch (err) {
      console.error(`[BenefitsGov] Error crawling ${category}:`, err.message)
    }
  }

  async scrapeCategory(category, state) {
    const benefits = []
    try {
      const url = `${this.baseUrl}/categories/${category}`
      const html = await this.fetchPage(url)
      const $ = cheerio.load(html)

      // Parse benefit listings
      $('.benefit-result, .program-card').each((i, el) => {
        const $el = $(el)
        benefits.push({
          title: $el.find('.title, h3, h4').first().text().trim(),
          description: $el.find('.description, .summary, p').first().text().trim(),
          agency: $el.find('.agency, .source').text().trim(),
          url: $el.find('a').attr('href'),
          eligibility: $el.find('.eligibility').text().trim()
        })
      })
    } catch (err) {
      console.error(`[BenefitsGov] Scrape error:`, err.message)
    }
    return benefits
  }

  async processBenefit(benefit, criteria, profileId, category) {
    const opportunity = {
      source_id: benefit.id || `benefits_gov_${this.hashString(benefit.title)}`,
      source: 'benefits_gov',
      title: benefit.title,
      sponsor: benefit.agency || 'Federal Government',
      description: benefit.description || benefit.summary || '',
      amount_min: null, // Benefits often don't have fixed amounts
      amount_max: null,
      deadline: null, // Benefits are typically ongoing
      eligibility_criteria: benefit.eligibility || benefit.eligibleApplicants || '',
      focus_areas: [category],
      url: benefit.url?.startsWith('http') ? benefit.url : `${this.baseUrl}${benefit.url}`
    }

    const match = this.calculateMatchScore(opportunity, criteria)
    
    if (match.score >= 25) { // Lower threshold for assistance programs
      await this.saveOpportunity(opportunity)
      
      if (profileId) {
        await this.saveMatch(profileId, opportunity.source_id, match)
      }
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
            JSON.stringify({ reasons: match.reasons, category: 'benefits' })
          )
        }
      }
    } catch (err) {
      console.error('[BenefitsGov] Match save error:', err.message)
    }
  }
}

export default BenefitsGovCrawler
