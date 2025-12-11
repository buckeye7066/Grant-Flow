/**
 * University Scholarships Crawler
 * Discovers institution-specific scholarship opportunities
 * Student financial aid programs, awards, and fellowships
 */

import { BaseCrawler } from './base.js'
import * as cheerio from 'cheerio'

export class UniversityScholarshipsCrawler extends BaseCrawler {
  constructor() {
    super('university_scholarships', 'Scholarships from universities and colleges')
    
    // Major scholarship databases and aggregators
    this.sources = [
      { name: 'Fastweb', url: 'https://www.fastweb.com', searchPath: '/college-scholarships' },
      { name: 'Scholarships.com', url: 'https://www.scholarships.com', searchPath: '/scholarship-search' },
      { name: 'Bold.org', url: 'https://bold.org', searchPath: '/scholarships' },
      { name: 'Cappex', url: 'https://www.cappex.com', searchPath: '/scholarships' },
      { name: 'Niche', url: 'https://www.niche.com', searchPath: '/scholarships' }
    ]
    
    // Common university scholarship pages
    this.universityPatterns = [
      '/financial-aid/scholarships',
      '/admissions/scholarships',
      '/scholarships',
      '/student-financial-services/scholarships'
    ]
  }

  async crawl(profiles) {
    console.log(`[UnivScholarships] Starting crawl for ${profiles.length} profiles...`)

    for (const profile of profiles) {
      const criteria = this.parseProfileForMatching(profile)
      
      // Only crawl for student profiles
      if (criteria.isStudent) {
        try {
          await this.findScholarships(criteria, profile.id)
        } catch (err) {
          console.error(`[UnivScholarships] Error for profile ${profile.id}:`, err.message)
        }
      }
    }

    console.log(`[UnivScholarships] Completed. Found ${this.opportunitiesFound} scholarships.`)
  }

  async findScholarships(criteria, profileId) {
    // Build scholarship search criteria
    const searchParams = this.buildSearchParams(criteria)
    
    // Crawl scholarship aggregators
    for (const source of this.sources) {
      try {
        await this.crawlScholarshipSource(source, searchParams, criteria, profileId)
        await new Promise(r => setTimeout(r, 1000)) // Rate limiting
      } catch (err) {
        console.error(`[UnivScholarships] ${source.name} error:`, err.message)
      }
    }

    // Crawl specific universities if mentioned in profile
    if (criteria.targetColleges) {
      const colleges = criteria.targetColleges.split(',').map(c => c.trim())
      for (const college of colleges.slice(0, 5)) {
        await this.crawlUniversityScholarships(college, criteria, profileId)
      }
    }
  }

  buildSearchParams(criteria) {
    const params = {
      // Academic
      gpa: criteria.gpa,
      major: criteria.major,
      gradeLevel: criteria.gradeLevel,
      
      // Demographics
      gender: null, // Would need to add to profile
      ethnicity: criteria.ethnicity,
      state: criteria.location.state,
      
      // Special qualifications
      firstGen: criteria.isFirstGen,
      veteran: criteria.veteran,
      disability: criteria.disability,
      lgbtq: criteria.lgbtq,
      lowIncome: criteria.lowIncome || criteria.isPellEligible,
      
      // Interests
      focusAreas: criteria.focusAreas,
      keywords: criteria.keywords
    }
    
    return params
  }

  async crawlScholarshipSource(source, searchParams, criteria, profileId) {
    try {
      // Build search URL based on source
      let searchUrl = `${source.url}${source.searchPath}`
      
      // Add parameters where supported
      const queryParams = new URLSearchParams()
      if (searchParams.state) queryParams.set('state', searchParams.state)
      if (searchParams.major) queryParams.set('major', searchParams.major)
      if (searchParams.gpa) queryParams.set('gpa', searchParams.gpa)
      
      if (queryParams.toString()) {
        searchUrl += `?${queryParams.toString()}`
      }

      const html = await this.fetchPage(searchUrl)
      const $ = cheerio.load(html)

      // Generic parsing for scholarship listings
      const scholarships = []
      
      // Common selectors across scholarship sites
      const selectors = [
        '.scholarship-card',
        '.scholarship-result',
        '.scholarship-item',
        '[data-scholarship]',
        '.result-item',
        'article.scholarship'
      ]

      for (const selector of selectors) {
        $(selector).each((i, el) => {
          const $el = $(el)
          const scholarship = this.parseScholarshipElement($el, $, source)
          if (scholarship.title) {
            scholarships.push(scholarship)
          }
        })
        if (scholarships.length > 0) break
      }

      // Process found scholarships
      for (const scholarship of scholarships.slice(0, 30)) {
        await this.processScholarship(scholarship, criteria, profileId, source.name)
      }

    } catch (err) {
      console.error(`[UnivScholarships] Source ${source.name} crawl error:`, err.message)
    }
  }

  parseScholarshipElement($el, $, source) {
    return {
      title: $el.find('h2, h3, .title, .name, .scholarship-name').first().text().trim(),
      amount: $el.find('.amount, .award, .value, [data-amount]').first().text().trim(),
      deadline: $el.find('.deadline, .due-date, [data-deadline]').first().text().trim(),
      description: $el.find('.description, .summary, p').first().text().trim(),
      eligibility: $el.find('.eligibility, .requirements, .criteria').text().trim(),
      url: $el.find('a').attr('href'),
      sponsor: $el.find('.sponsor, .provider, .organization').text().trim() || source.name
    }
  }

  async crawlUniversityScholarships(collegeName, criteria, profileId) {
    try {
      // Search for university financial aid page
      const searchQuery = `${collegeName} scholarships financial aid`
      
      // In production, you'd use a search API or maintain a university URL database
      // For now, we'll create a placeholder opportunity
      
      const opportunity = {
        source_id: `univ_${this.hashString(collegeName)}`,
        source: 'university_scholarships',
        title: `${collegeName} - Institutional Scholarships`,
        sponsor: collegeName,
        description: `Scholarship opportunities at ${collegeName}. Visit the university's financial aid office for available merit, need-based, and departmental scholarships.`,
        amount_min: 1000,
        amount_max: null, // Full tuition possible
        deadline: null,
        eligibility_criteria: 'Enrolled or admitted students',
        focus_areas: ['education', 'scholarship'],
        url: `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`
      }

      const match = this.calculateMatchScore(opportunity, criteria)
      if (match.score >= 20) {
        await this.saveOpportunity(opportunity)
      }

    } catch (err) {
      console.error(`[UnivScholarships] ${collegeName} crawl error:`, err.message)
    }
  }

  async processScholarship(scholarship, criteria, profileId, sourceName) {
    const amount = this.parseAmount(scholarship.amount)
    
    const opportunity = {
      source_id: `scholarship_${sourceName}_${this.hashString(scholarship.title)}`,
      source: 'university_scholarships',
      title: scholarship.title,
      sponsor: scholarship.sponsor || sourceName,
      description: scholarship.description || '',
      amount_min: amount?.min || null,
      amount_max: amount?.max || null,
      deadline: this.parseDeadline(scholarship.deadline),
      eligibility_criteria: scholarship.eligibility || '',
      focus_areas: ['education', 'scholarship'],
      url: scholarship.url?.startsWith('http') ? scholarship.url : null
    }

    const match = this.calculateMatchScore(opportunity, criteria)
    
    // Check for specific demographic matches that boost score
    if (criteria.isFirstGen && scholarship.eligibility?.toLowerCase().includes('first-generation')) {
      match.score += 15
      match.reasons.push('First-generation student eligible')
    }
    if (criteria.veteran && scholarship.eligibility?.toLowerCase().includes('veteran')) {
      match.score += 15
      match.reasons.push('Veteran eligible')
    }
    if (criteria.ethnicity && scholarship.eligibility?.toLowerCase().includes(criteria.ethnicity.toString().toLowerCase())) {
      match.score += 10
      match.reasons.push('Demographic match')
    }

    if (match.score >= 25) {
      await this.saveOpportunity(opportunity)
      
      if (profileId) {
        await this.saveMatch(profileId, opportunity.source_id, match)
      }
    }
  }

  parseAmount(amountStr) {
    if (!amountStr) return null
    
    // Handle ranges like "$1,000 - $5,000"
    const rangeMatch = amountStr.match(/\$?([\d,]+)\s*[-–]\s*\$?([\d,]+)/)
    if (rangeMatch) {
      return {
        min: parseInt(rangeMatch[1].replace(/,/g, '')),
        max: parseInt(rangeMatch[2].replace(/,/g, ''))
      }
    }
    
    // Single amount
    const singleMatch = amountStr.match(/\$?([\d,]+)/)
    if (singleMatch) {
      const amount = parseInt(singleMatch[1].replace(/,/g, ''))
      return { min: amount, max: amount }
    }
    
    // "Full tuition" or similar
    if (amountStr.toLowerCase().includes('full tuition')) {
      return { min: 10000, max: 50000 }
    }
    
    return null
  }

  parseDeadline(deadlineStr) {
    if (!deadlineStr) return null
    
    // Try to parse various date formats
    try {
      const date = new Date(deadlineStr)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]
      }
    } catch {}
    
    return null
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
            JSON.stringify({ reasons: match.reasons, category: 'scholarship' })
          )
        }
      }
    } catch (err) {
      console.error('[UnivScholarships] Match save error:', err.message)
    }
  }
}

export default UniversityScholarshipsCrawler
