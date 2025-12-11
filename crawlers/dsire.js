/**
 * DSIRE Crawler
 * Database of State Incentives for Renewables & Efficiency
 * Energy/sustainability-focused funding and incentives
 */

import { BaseCrawler } from './base.js'
import * as cheerio from 'cheerio'

export class DSIRECrawler extends BaseCrawler {
  constructor() {
    super('dsire', 'Energy incentives and renewable programs from DSIRE')
    this.baseUrl = 'https://www.dsireusa.org'
    this.apiUrl = 'https://programs.dsireusa.org/system/program'
  }

  async crawl(profiles) {
    console.log(`[DSIRE] Starting crawl for ${profiles.length} profiles...`)

    for (const profile of profiles) {
      const criteria = this.parseProfileForMatching(profile)
      
      // Only crawl if profile has energy/sustainability focus or is in relevant sector
      if (this.isRelevantProfile(criteria)) {
        try {
          await this.findIncentives(criteria, profile.id)
        } catch (err) {
          console.error(`[DSIRE] Error for profile ${profile.id}:`, err.message)
        }
      }
    }

    console.log(`[DSIRE] Completed. Found ${this.opportunitiesFound} incentives.`)
  }

  isRelevantProfile(criteria) {
    // Check if profile has energy/sustainability interests
    const energyKeywords = ['energy', 'solar', 'wind', 'renewable', 'sustainability', 'green', 'efficiency', 'environmental', 'climate']
    
    const hasEnergyFocus = criteria.focusAreas.some(area => 
      energyKeywords.some(kw => area.toLowerCase().includes(kw))
    )
    
    const hasEnergyKeyword = criteria.keywords.some(kw => 
      energyKeywords.some(ekw => kw.toLowerCase().includes(ekw))
    )
    
    // Also relevant for farmers, rural areas, nonprofits
    return hasEnergyFocus || hasEnergyKeyword || criteria.isFarmer || criteria.ruralArea || criteria.isNonprofit
  }

  async findIncentives(criteria, profileId) {
    const state = criteria.location.state
    
    if (!state) {
      console.log(`[DSIRE] No state specified, crawling federal programs only`)
      await this.crawlFederalPrograms(criteria, profileId)
      return
    }

    // Crawl state-specific programs
    await this.crawlStatePrograms(state, criteria, profileId)
    
    // Also get federal programs
    await this.crawlFederalPrograms(criteria, profileId)
  }

  async crawlStatePrograms(state, criteria, profileId) {
    try {
      // DSIRE API or scraping
      const url = `${this.baseUrl}/programs?state=${state}`
      const html = await this.fetchPage(url)
      const $ = cheerio.load(html)

      // Parse program listings
      const programs = []
      $('.program-result, .incentive-card, table tbody tr').each((i, el) => {
        const $el = $(el)
        programs.push({
          title: $el.find('.title, .name, td:first-child').text().trim(),
          type: $el.find('.type, .category, td:nth-child(2)').text().trim(),
          state: state,
          description: $el.find('.description, .summary').text().trim(),
          url: $el.find('a').attr('href'),
          sector: $el.find('.sector, .eligibility').text().trim()
        })
      })

      for (const program of programs) {
        if (program.title) {
          await this.processProgram(program, criteria, profileId)
        }
      }
    } catch (err) {
      console.error(`[DSIRE] State crawl error for ${state}:`, err.message)
    }
  }

  async crawlFederalPrograms(criteria, profileId) {
    try {
      const federalPrograms = [
        { name: 'Investment Tax Credit (ITC)', type: 'Tax Credit', sector: 'Solar, Wind' },
        { name: 'Production Tax Credit (PTC)', type: 'Tax Credit', sector: 'Wind, Renewable' },
        { name: 'USDA REAP Grants', type: 'Grant', sector: 'Rural, Agriculture' },
        { name: 'DOE Weatherization Assistance', type: 'Grant', sector: 'Low-Income, Efficiency' },
        { name: 'EPA Clean Energy Programs', type: 'Grant', sector: 'Environmental' }
      ]

      for (const program of federalPrograms) {
        const opportunity = {
          source_id: `dsire_federal_${this.hashString(program.name)}`,
          source: 'dsire',
          title: program.name,
          sponsor: 'Federal Government',
          description: `${program.type} for ${program.sector}. Federal incentive program for renewable energy and efficiency.`,
          amount_min: null,
          amount_max: null,
          deadline: null,
          eligibility_criteria: program.sector,
          focus_areas: ['energy', 'sustainability', program.sector.toLowerCase()],
          url: `${this.baseUrl}/programs?type=federal`
        }

        const match = this.calculateMatchScore(opportunity, criteria)
        if (match.score >= 25) {
          await this.saveOpportunity(opportunity)
        }
      }
    } catch (err) {
      console.error(`[DSIRE] Federal programs error:`, err.message)
    }
  }

  async processProgram(program, criteria, profileId) {
    const opportunity = {
      source_id: `dsire_${program.state}_${this.hashString(program.title)}`,
      source: 'dsire',
      title: program.title,
      sponsor: `${program.state} State`,
      description: program.description || `${program.type} - ${program.sector}`,
      amount_min: null,
      amount_max: null,
      deadline: null,
      eligibility_criteria: program.sector || '',
      focus_areas: ['energy', 'renewable', program.type?.toLowerCase()].filter(Boolean),
      url: program.url?.startsWith('http') ? program.url : `${this.baseUrl}${program.url}`
    }

    const match = this.calculateMatchScore(opportunity, criteria)
    
    if (match.score >= 25) {
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
            JSON.stringify({ reasons: match.reasons, category: 'energy' })
          )
        }
      }
    } catch (err) {
      console.error('[DSIRE] Match save error:', err.message)
    }
  }
}

export default DSIRECrawler
