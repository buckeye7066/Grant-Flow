/**
 * GrantFlow Crawler System
 * Base classes and utilities for all crawlers
 */

import axios from 'axios'
import * as cheerio from 'cheerio'
import { getDb } from '../db/init.js'

// Crawler status constants
export const CRAWLER_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  COMPLETED: 'completed',
  ERROR: 'error'
}

/**
 * Base Crawler Class
 * All crawlers extend this class
 */
export class BaseCrawler {
  constructor(name, description) {
    this.name = name
    this.description = description
    this.status = CRAWLER_STATUS.IDLE
    this.lastRun = null
    this.lastError = null
    this.opportunitiesFound = 0
    this.db = getDb()
  }

  // Parse profile to extract matching criteria
  parseProfileForMatching(profile) {
    const criteria = {
      // Basic info
      profileType: profile.profile_type || profile.organization_type,
      name: profile.name,
      location: {
        city: profile.city,
        state: profile.state,
        zip: profile.zip
      },
      
      // Organization specific
      isNonprofit: profile.public_charity || profile.private_foundation || profile.organization_type?.includes('501'),
      ein: profile.ein,
      annualBudget: profile.annual_budget,
      staffCount: profile.staff_count,
      
      // Focus areas and mission
      focusAreas: this.parseFocusAreas(profile),
      mission: profile.mission || profile.goals,
      keywords: profile.keywords?.split(',').map(k => k.trim()) || [],
      
      // Education
      isStudent: ['high_school', 'college', 'graduate', 'homeschool'].includes(profile.profile_type),
      gradeLevel: profile.grade_level,
      gpa: profile.gpa,
      major: profile.intended_major,
      isFirstGen: profile.first_gen_college,
      isPellEligible: profile.pell_grant_eligible,
      
      // Demographics
      ethnicity: profile.ethnicity,
      veteran: profile.veteran || profile.military_spouse || profile.military_dependent,
      disability: profile.disabled || profile.iep_504_status,
      lgbtq: profile.lgbtq,
      
      // Financial
      lowIncome: profile.low_income,
      annualIncome: profile.annual_income,
      householdSize: profile.household_size,
      
      // Government assistance
      onMedicaid: profile.medicaid,
      onSNAP: profile.snap,
      onSSI: profile.ssi,
      
      // Health conditions
      hasHealthCondition: profile.cancer || profile.chronic_illness || profile.dialysis || profile.mental_health,
      healthConditions: this.parseHealthConditions(profile),
      
      // Occupation
      isHealthcareWorker: profile.healthcare_worker,
      isTeacher: profile.teacher,
      isFirstResponder: profile.firefighter || profile.law_enforcement,
      isPublicServant: profile.public_servant,
      isFarmer: profile.farmer,
      
      // Family situation
      singleParent: profile.single_parent,
      fosterYouth: profile.foster_youth,
      homeless: profile.homeless,
      domesticViolenceSurvivor: profile.domestic_violence_survivor,
      disasterSurvivor: profile.disaster_survivor,
      
      // Certifications & Compliance
      samRegistered: profile.sam_registered,
      hasAuditedFinancials: profile.audited_financials,
      hipaaCompliant: profile.hipaa_compliant,
      ferpaCompliant: profile.ferpa_compliant,
      
      // Special designations
      ruralArea: profile.serves_rural,
      faithBased: profile.faith_based,
      minorityServing: profile.minority_serving,
      tribalAffiliation: profile.tribal_affiliation
    }
    
    return criteria
  }

  parseFocusAreas(profile) {
    let areas = []
    if (profile.focus_areas) {
      if (typeof profile.focus_areas === 'string') {
        try {
          areas = JSON.parse(profile.focus_areas)
        } catch {
          areas = profile.focus_areas.split(',').map(a => a.trim())
        }
      } else if (Array.isArray(profile.focus_areas)) {
        areas = profile.focus_areas
      }
    }
    return areas
  }

  parseHealthConditions(profile) {
    const conditions = []
    if (profile.cancer) conditions.push('cancer')
    if (profile.chronic_illness) conditions.push(profile.chronic_illness_type || 'chronic illness')
    if (profile.dialysis) conditions.push('kidney disease')
    if (profile.organ_transplant) conditions.push('transplant')
    if (profile.hiv_aids) conditions.push('HIV/AIDS')
    if (profile.tbi) conditions.push('traumatic brain injury')
    if (profile.neurodivergent) conditions.push('neurodivergent')
    if (profile.visual_impairment) conditions.push('visual impairment')
    if (profile.hearing_impairment) conditions.push('hearing impairment')
    if (profile.mental_health) conditions.push('mental health')
    return conditions
  }

  // Calculate match score between opportunity and profile
  calculateMatchScore(opportunity, criteria) {
    let score = 0
    let maxScore = 0
    const reasons = []

    // Location match (state/region)
    if (opportunity.location || opportunity.eligibility_location) {
      maxScore += 20
      const oppLocation = (opportunity.location || opportunity.eligibility_location || '').toLowerCase()
      if (oppLocation.includes('national') || oppLocation.includes('all states')) {
        score += 20
        reasons.push('Available nationally')
      } else if (criteria.location.state && oppLocation.includes(criteria.location.state.toLowerCase())) {
        score += 20
        reasons.push(`Available in ${criteria.location.state}`)
      }
    }

    // Organization type match
    if (opportunity.eligibility_type) {
      maxScore += 15
      const eligType = opportunity.eligibility_type.toLowerCase()
      if (criteria.isNonprofit && (eligType.includes('nonprofit') || eligType.includes('501(c)'))) {
        score += 15
        reasons.push('Eligible for nonprofits')
      }
      if (criteria.isStudent && (eligType.includes('student') || eligType.includes('individual'))) {
        score += 15
        reasons.push('Open to students')
      }
    }

    // Focus area match
    if (opportunity.focus_areas && criteria.focusAreas.length > 0) {
      maxScore += 25
      const oppAreas = (typeof opportunity.focus_areas === 'string' 
        ? opportunity.focus_areas.toLowerCase() 
        : opportunity.focus_areas.join(' ').toLowerCase())
      
      const matchingAreas = criteria.focusAreas.filter(area => 
        oppAreas.includes(area.toLowerCase())
      )
      if (matchingAreas.length > 0) {
        score += Math.min(25, matchingAreas.length * 10)
        reasons.push(`Matches focus areas: ${matchingAreas.join(', ')}`)
      }
    }

    // Keyword match
    if (opportunity.description && criteria.keywords.length > 0) {
      maxScore += 15
      const desc = opportunity.description.toLowerCase()
      const matchingKeywords = criteria.keywords.filter(kw => 
        desc.includes(kw.toLowerCase())
      )
      if (matchingKeywords.length > 0) {
        score += Math.min(15, matchingKeywords.length * 5)
        reasons.push(`Keyword matches: ${matchingKeywords.join(', ')}`)
      }
    }

    // Special population matches
    if (criteria.veteran && opportunity.description?.toLowerCase().includes('veteran')) {
      score += 10
      reasons.push('Veteran eligibility')
    }
    if (criteria.disability && opportunity.description?.toLowerCase().includes('disab')) {
      score += 10
      reasons.push('Disability eligibility')
    }
    if (criteria.lowIncome && opportunity.description?.toLowerCase().includes('low-income')) {
      score += 10
      reasons.push('Low-income eligibility')
    }
    if (criteria.isFirstGen && opportunity.description?.toLowerCase().includes('first-generation')) {
      score += 10
      reasons.push('First-generation eligibility')
    }

    // Normalize score to 0-100
    const normalizedScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 50

    return {
      score: Math.min(100, normalizedScore),
      reasons,
      matchedCriteria: reasons.length
    }
  }

  // Save opportunity to database
  async saveOpportunity(opportunity) {
    try {
      const existing = this.db.prepare(
        'SELECT id FROM funding_opportunities WHERE source_id = ? AND source = ?'
      ).get(opportunity.source_id, opportunity.source)

      if (existing) {
        // Update existing
        this.db.prepare(`
          UPDATE funding_opportunities SET
            title = ?, sponsor = ?, description = ?, amount_min = ?, amount_max = ?,
            deadline = ?, eligibility_criteria = ?, focus_areas = ?, url = ?,
            updated_at = datetime('now')
          WHERE id = ?
        `).run(
          opportunity.title,
          opportunity.sponsor,
          opportunity.description,
          opportunity.amount_min,
          opportunity.amount_max,
          opportunity.deadline,
          opportunity.eligibility_criteria,
          JSON.stringify(opportunity.focus_areas || []),
          opportunity.url,
          existing.id
        )
        return existing.id
      } else {
        // Insert new
        const id = crypto.randomUUID()
        this.db.prepare(`
          INSERT INTO funding_opportunities (
            id, source_id, source, title, sponsor, description, 
            amount_min, amount_max, deadline, eligibility_criteria, 
            focus_areas, url, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
          id,
          opportunity.source_id,
          opportunity.source,
          opportunity.title,
          opportunity.sponsor,
          opportunity.description,
          opportunity.amount_min,
          opportunity.amount_max,
          opportunity.deadline,
          opportunity.eligibility_criteria,
          JSON.stringify(opportunity.focus_areas || []),
          opportunity.url
        )
        this.opportunitiesFound++
        return id
      }
    } catch (err) {
      console.error(`Error saving opportunity: ${err.message}`)
      return null
    }
  }

  // HTTP helper with retry logic
  async fetchPage(url, options = {}) {
    const maxRetries = options.retries || 3
    const delay = options.delay || 1000

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await axios.get(url, {
          timeout: options.timeout || 30000,
          headers: {
            'User-Agent': 'GrantFlow Funding Discovery Bot/1.0 (grant research tool)',
            ...options.headers
          }
        })
        return response.data
      } catch (err) {
        if (i === maxRetries - 1) throw err
        await new Promise(r => setTimeout(r, delay * (i + 1)))
      }
    }
  }

  // Main crawl method - override in subclasses
  async crawl(profiles = []) {
    throw new Error('crawl() must be implemented by subclass')
  }

  // Run crawler for specific profiles
  async run(profileIds = []) {
    this.status = CRAWLER_STATUS.RUNNING
    this.lastRun = new Date().toISOString()
    this.opportunitiesFound = 0

    try {
      // Get profiles to match against
      let profiles = []
      if (profileIds.length > 0) {
        profiles = this.db.prepare(
          `SELECT * FROM organizations WHERE id IN (${profileIds.map(() => '?').join(',')})`
        ).all(...profileIds)
      } else {
        profiles = this.db.prepare('SELECT * FROM organizations').all()
      }

      // Parse profile data
      profiles = profiles.map(p => {
        if (p.profile_data) {
          try {
            const extra = JSON.parse(p.profile_data)
            return { ...p, ...extra }
          } catch {}
        }
        return p
      })

      // Run the crawler
      await this.crawl(profiles)

      this.status = CRAWLER_STATUS.COMPLETED
      return {
        success: true,
        opportunitiesFound: this.opportunitiesFound,
        profiles: profiles.length
      }
    } catch (err) {
      this.status = CRAWLER_STATUS.ERROR
      this.lastError = err.message
      console.error(`Crawler ${this.name} error:`, err)
      return {
        success: false,
        error: err.message
      }
    }
  }
}

/**
 * Crawler Manager - orchestrates all crawlers
 */
export class CrawlerManager {
  constructor() {
    this.crawlers = new Map()
    this.db = getDb()
  }

  register(crawler) {
    this.crawlers.set(crawler.name, crawler)
  }

  get(name) {
    return this.crawlers.get(name)
  }

  getAll() {
    return Array.from(this.crawlers.values())
  }

  getStatus() {
    return this.getAll().map(c => ({
      name: c.name,
      description: c.description,
      status: c.status,
      lastRun: c.lastRun,
      lastError: c.lastError,
      opportunitiesFound: c.opportunitiesFound
    }))
  }

  async runAll(profileIds = []) {
    const results = {}
    for (const [name, crawler] of this.crawlers) {
      results[name] = await crawler.run(profileIds)
    }
    return results
  }

  async runCrawler(name, profileIds = []) {
    const crawler = this.crawlers.get(name)
    if (!crawler) throw new Error(`Crawler ${name} not found`)
    return crawler.run(profileIds)
  }
}

export default { BaseCrawler, CrawlerManager, CRAWLER_STATUS }
