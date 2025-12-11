/**
 * IRS 990 Crawler
 * Analyzes nonprofit tax filings (Form 990) to discover foundation giving patterns
 * Uses ProPublica Nonprofit Explorer API
 */

import { BaseCrawler } from './base.js'

export class IRS990Crawler extends BaseCrawler {
  constructor() {
    super('irs_990', 'Foundation giving patterns from IRS 990 filings')
    this.apiUrl = 'https://projects.propublica.org/nonprofits/api/v2'
  }

  async crawl(profiles) {
    console.log(`[IRS990] Starting crawl for ${profiles.length} profiles...`)

    for (const profile of profiles) {
      const criteria = this.parseProfileForMatching(profile)
      
      try {
        await this.findFoundations(criteria, profile.id)
      } catch (err) {
        console.error(`[IRS990] Error for profile ${profile.id}:`, err.message)
      }
    }

    console.log(`[IRS990] Completed. Found ${this.opportunitiesFound} foundations.`)
  }

  async findFoundations(criteria, profileId) {
    // Search for foundations by focus area keywords
    const searchTerms = this.buildSearchTerms(criteria)
    
    for (const term of searchTerms) {
      try {
        await this.searchFoundations(term, criteria, profileId)
        await new Promise(r => setTimeout(r, 500)) // Rate limiting
      } catch (err) {
        console.error(`[IRS990] Search error for "${term}":`, err.message)
      }
    }

    // Also search by state for local foundations
    if (criteria.location.state) {
      await this.searchLocalFoundations(criteria, profileId)
    }
  }

  buildSearchTerms(criteria) {
    const terms = []

    // Add focus areas
    if (criteria.focusAreas.length > 0) {
      terms.push(...criteria.focusAreas.slice(0, 3))
    }

    // Add profile-specific terms
    if (criteria.isStudent) terms.push('education scholarship')
    if (criteria.hasHealthCondition) terms.push('health medical')
    if (criteria.veteran) terms.push('veteran military')
    if (criteria.disability) terms.push('disability')
    if (criteria.faithBased) terms.push('religious ministry')
    if (criteria.ruralArea) terms.push('rural community')
    if (criteria.lgbtq) terms.push('LGBTQ')

    // Add keywords
    if (criteria.keywords.length > 0) {
      terms.push(...criteria.keywords.slice(0, 2))
    }

    return [...new Set(terms)].slice(0, 8)
  }

  async searchFoundations(searchTerm, criteria, profileId) {
    try {
      // ProPublica API search
      const url = `${this.apiUrl}/search.json?q=${encodeURIComponent(searchTerm)}&c_code%5Bid%5D=3` // c_code 3 = private foundations
      
      const response = await this.fetchPage(url)
      
      if (response && response.organizations) {
        for (const org of response.organizations.slice(0, 20)) {
          await this.processFoundation(org, criteria, profileId, searchTerm)
        }
      }
    } catch (err) {
      console.error(`[IRS990] API search error:`, err.message)
    }
  }

  async searchLocalFoundations(criteria, profileId) {
    try {
      // Search for community foundations in the state
      const stateQuery = `community foundation ${criteria.location.state}`
      const url = `${this.apiUrl}/search.json?q=${encodeURIComponent(stateQuery)}`
      
      const response = await this.fetchPage(url)
      
      if (response && response.organizations) {
        for (const org of response.organizations.slice(0, 15)) {
          await this.processFoundation(org, criteria, profileId, 'local')
        }
      }
    } catch (err) {
      console.error(`[IRS990] Local search error:`, err.message)
    }
  }

  async processFoundation(foundation, criteria, profileId, matchTerm) {
    // Get more details about the foundation
    let details = null
    try {
      if (foundation.ein) {
        const detailUrl = `${this.apiUrl}/organizations/${foundation.ein}.json`
        details = await this.fetchPage(detailUrl)
      }
    } catch {
      // Continue without details
    }

    // Calculate giving capacity from 990 data
    const grantAmount = this.estimateGrantSize(foundation, details)
    
    const opportunity = {
      source_id: `irs990_${foundation.ein || this.hashString(foundation.name)}`,
      source: 'irs_990',
      title: `${foundation.name} - Foundation Grants`,
      sponsor: foundation.name,
      description: this.buildDescription(foundation, details, matchTerm),
      amount_min: grantAmount ? Math.floor(grantAmount * 0.1) : null, // Typical grants are 10% of average
      amount_max: grantAmount || null,
      deadline: null, // Foundations often have rolling deadlines
      eligibility_criteria: this.buildEligibility(foundation, details),
      focus_areas: [matchTerm, foundation.ntee_code].filter(Boolean),
      url: `https://projects.propublica.org/nonprofits/organizations/${foundation.ein}`
    }

    const match = this.calculateMatchScore(opportunity, criteria)
    
    // Also consider if foundation makes grants (vs operating foundation)
    const isGrantMaking = details?.organization?.foundation_giving_info || foundation.ntee_code?.startsWith('T')
    
    if (match.score >= 30 || (isGrantMaking && match.score >= 20)) {
      await this.saveOpportunity(opportunity)
      
      if (profileId) {
        await this.saveMatch(profileId, opportunity.source_id, match)
      }
    }
  }

  estimateGrantSize(foundation, details) {
    // Try to get grant amounts from 990 data
    if (details?.filings_with_data?.[0]) {
      const filing = details.filings_with_data[0]
      // Look for grants paid
      if (filing.totgrantspd) {
        return Math.round(filing.totgrantspd / 10) // Average grant estimate
      }
      // Or total revenue as rough indicator
      if (filing.totrevenue) {
        return Math.round(filing.totrevenue * 0.05) // 5% of revenue as typical grant
      }
    }
    
    // Fallback based on foundation size
    if (foundation.income_amount) {
      return Math.round(foundation.income_amount * 0.05)
    }
    
    return null
  }

  buildDescription(foundation, details, matchTerm) {
    let desc = `${foundation.name} is a private foundation`
    
    if (foundation.city && foundation.state) {
      desc += ` based in ${foundation.city}, ${foundation.state}`
    }
    
    if (foundation.ntee_code) {
      const nteeName = this.getNTEEName(foundation.ntee_code)
      if (nteeName) {
        desc += `. Focus area: ${nteeName}`
      }
    }
    
    desc += `. Matched search term: ${matchTerm}.`
    
    if (details?.organization?.ruling_date) {
      desc += ` Established: ${details.organization.ruling_date}.`
    }
    
    return desc
  }

  buildEligibility(foundation, details) {
    const criteria = []
    
    if (foundation.state) {
      criteria.push(`May prioritize ${foundation.state} organizations`)
    }
    
    if (foundation.ntee_code) {
      const nteeName = this.getNTEEName(foundation.ntee_code)
      if (nteeName) {
        criteria.push(`Focus: ${nteeName}`)
      }
    }
    
    criteria.push('Contact foundation for application requirements')
    
    return criteria.join('. ')
  }

  getNTEEName(code) {
    const nteeCategories = {
      'A': 'Arts, Culture & Humanities',
      'B': 'Education',
      'C': 'Environment',
      'D': 'Animal-Related',
      'E': 'Health Care',
      'F': 'Mental Health',
      'G': 'Disease/Disorders',
      'H': 'Medical Research',
      'I': 'Crime & Legal',
      'J': 'Employment',
      'K': 'Food & Nutrition',
      'L': 'Housing & Shelter',
      'M': 'Public Safety',
      'N': 'Recreation & Sports',
      'O': 'Youth Development',
      'P': 'Human Services',
      'Q': 'International',
      'R': 'Civil Rights',
      'S': 'Community Development',
      'T': 'Philanthropy & Grantmaking',
      'U': 'Science & Technology',
      'V': 'Social Science',
      'W': 'Public Affairs',
      'X': 'Religion',
      'Y': 'Mutual & Membership',
      'Z': 'Unknown'
    }
    
    return nteeCategories[code?.charAt(0)] || null
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
            JSON.stringify({ reasons: match.reasons, category: 'foundation' })
          )
        }
      }
    } catch (err) {
      console.error('[IRS990] Match save error:', err.message)
    }
  }
}

export default IRS990Crawler
