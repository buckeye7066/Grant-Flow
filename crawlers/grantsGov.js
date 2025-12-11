/**
 * Grants.gov Crawler
 * Scrapes federal grant opportunities from Grants.gov API
 */

import { BaseCrawler } from './base.js'

export class GrantsGovCrawler extends BaseCrawler {
  constructor() {
    super('grants_gov', 'Federal grants from Grants.gov')
    this.apiBase = 'https://www.grants.gov/grantsws/rest/opportunities/search'
    this.detailBase = 'https://www.grants.gov/grantsws/rest/opportunity/details'
  }

  async crawl(profiles) {
    console.log(`[GrantsGov] Starting crawl for ${profiles.length} profiles...`)

    for (const profile of profiles) {
      const criteria = this.parseProfileForMatching(profile)
      
      // Build search queries based on profile
      const searchQueries = this.buildSearchQueries(criteria)
      
      for (const query of searchQueries) {
        try {
          await this.searchGrants(query, criteria, profile.id)
          // Rate limiting
          await new Promise(r => setTimeout(r, 500))
        } catch (err) {
          console.error(`[GrantsGov] Search error for "${query}":`, err.message)
        }
      }
    }

    console.log(`[GrantsGov] Completed. Found ${this.opportunitiesFound} opportunities.`)
  }

  buildSearchQueries(criteria) {
    const queries = []

    // Add focus area queries
    if (criteria.focusAreas.length > 0) {
      queries.push(...criteria.focusAreas.slice(0, 5))
    }

    // Add keyword queries
    if (criteria.keywords.length > 0) {
      queries.push(...criteria.keywords.slice(0, 3))
    }

    // Add profile-type specific queries
    if (criteria.isNonprofit) {
      queries.push('nonprofit community development')
    }
    if (criteria.isStudent) {
      queries.push('education scholarship fellowship')
    }
    if (criteria.isHealthcareWorker) {
      queries.push('healthcare workforce training')
    }
    if (criteria.isTeacher) {
      queries.push('education teacher training')
    }
    if (criteria.isFarmer) {
      queries.push('agriculture rural development')
    }
    if (criteria.ruralArea) {
      queries.push('rural community development')
    }
    if (criteria.faithBased) {
      queries.push('faith-based community initiatives')
    }
    if (criteria.veteran) {
      queries.push('veteran services employment')
    }
    if (criteria.disability) {
      queries.push('disability services rehabilitation')
    }

    // Deduplicate and return
    return [...new Set(queries)].slice(0, 10)
  }

  async searchGrants(keyword, criteria, profileId) {
    try {
      // Grants.gov API search
      const searchParams = {
        keyword: keyword,
        oppStatuses: 'forecasted|posted',
        sortBy: 'openDate|desc',
        rows: 50
      }

      // Add eligibility filters based on profile
      if (criteria.isNonprofit) {
        searchParams.eligibilities = '25' // Nonprofits
      }
      if (criteria.location.state) {
        // Note: Grants.gov doesn't filter by state directly, but we can post-filter
      }

      const response = await this.fetchPage(
        `${this.apiBase}?${new URLSearchParams(searchParams).toString()}`,
        { timeout: 60000 }
      )

      if (response && response.oppHits) {
        for (const opp of response.oppHits) {
          await this.processOpportunity(opp, criteria, profileId)
        }
      }
    } catch (err) {
      // If API fails, try scraping search results page
      console.log(`[GrantsGov] API failed, trying web scrape for "${keyword}"`)
      await this.scrapeSearchResults(keyword, criteria, profileId)
    }
  }

  async scrapeSearchResults(keyword, criteria, profileId) {
    try {
      const searchUrl = `https://www.grants.gov/search-results-detail/${encodeURIComponent(keyword)}`
      const html = await this.fetchPage(searchUrl)
      
      // Parse HTML to extract opportunities
      // This is a fallback when API is unavailable
      // In production, you'd parse the HTML structure
      
    } catch (err) {
      console.error(`[GrantsGov] Scrape failed:`, err.message)
    }
  }

  async processOpportunity(opp, criteria, profileId) {
    // Calculate match score
    const opportunity = {
      source_id: opp.id || opp.opportunityNumber,
      source: 'grants_gov',
      title: opp.title || opp.opportunityTitle,
      sponsor: opp.agency || opp.agencyName,
      description: opp.synopsis || opp.description || '',
      amount_min: this.parseAmount(opp.awardFloor),
      amount_max: this.parseAmount(opp.awardCeiling),
      deadline: opp.closeDate || opp.applicationDueDate,
      eligibility_criteria: opp.eligibleApplicants || '',
      focus_areas: this.extractFocusAreas(opp),
      url: `https://www.grants.gov/search-results-detail/${opp.opportunityNumber || opp.id}`
    }

    const match = this.calculateMatchScore(opportunity, criteria)
    
    // Only save if score is above threshold
    if (match.score >= 30) {
      await this.saveOpportunity(opportunity)
      
      // Create match record for this profile
      if (profileId) {
        await this.saveMatch(profileId, opportunity.source_id, match)
      }
    }
  }

  parseAmount(value) {
    if (!value) return null
    if (typeof value === 'number') return value
    const cleaned = value.toString().replace(/[$,]/g, '')
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? null : parsed
  }

  extractFocusAreas(opp) {
    const areas = []
    if (opp.cfdaNumbers) {
      areas.push(...opp.cfdaNumbers.split(';').map(n => n.trim()))
    }
    if (opp.categoryOfFundingActivity) {
      areas.push(opp.categoryOfFundingActivity)
    }
    return areas
  }

  async saveMatch(profileId, sourceId, match) {
    try {
      const oppId = this.db.prepare(
        'SELECT id FROM funding_opportunities WHERE source_id = ? AND source = ?'
      ).get(sourceId, 'grants_gov')?.id

      if (oppId) {
        const existingMatch = this.db.prepare(
          'SELECT id FROM matches WHERE organization_id = ? AND opportunity_id = ?'
        ).get(profileId, oppId)

        if (!existingMatch) {
          this.db.prepare(`
            INSERT INTO matches (id, organization_id, opportunity_id, score, analysis, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
          `).run(
            crypto.randomUUID(),
            profileId,
            oppId,
            match.score,
            JSON.stringify({ reasons: match.reasons })
          )
        }
      }
    } catch (err) {
      console.error('[GrantsGov] Error saving match:', err.message)
    }
  }
}

export default GrantsGovCrawler
