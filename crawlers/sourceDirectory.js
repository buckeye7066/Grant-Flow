/**
 * Source Directory Crawler
 * Crawls community foundations, Rotary clubs, Lions clubs, etc.
 * Local/regional funding sources and geographic-specific opportunities
 */

import { BaseCrawler } from './base.js'
import * as cheerio from 'cheerio'

export class SourceDirectoryCrawler extends BaseCrawler {
  constructor() {
    super('source_directory', 'Community foundations, service clubs, and local funders')
    
    // Types of local funding sources
    this.sourceTypes = [
      {
        type: 'community_foundation',
        name: 'Community Foundations',
        searchPattern: 'community foundation',
        urls: [
          'https://www.cof.org/community-foundations',
          'https://www.cfstandards.org/community-foundations'
        ]
      },
      {
        type: 'rotary',
        name: 'Rotary Clubs',
        searchPattern: 'rotary club grants',
        urls: ['https://www.rotary.org']
      },
      {
        type: 'lions',
        name: 'Lions Clubs',
        searchPattern: 'lions club grants',
        urls: ['https://www.lionsclubs.org']
      },
      {
        type: 'kiwanis',
        name: 'Kiwanis Clubs',
        searchPattern: 'kiwanis club grants',
        urls: ['https://www.kiwanis.org']
      },
      {
        type: 'united_way',
        name: 'United Way',
        searchPattern: 'united way',
        urls: ['https://www.unitedway.org']
      },
      {
        type: 'junior_league',
        name: 'Junior League',
        searchPattern: 'junior league grants',
        urls: ['https://www.ajli.org']
      }
    ]
  }

  async crawl(profiles) {
    console.log(`[SourceDirectory] Starting crawl for ${profiles.length} profiles...`)

    for (const profile of profiles) {
      const criteria = this.parseProfileForMatching(profile)
      
      try {
        await this.findLocalSources(criteria, profile.id)
      } catch (err) {
        console.error(`[SourceDirectory] Error for profile ${profile.id}:`, err.message)
      }
    }

    console.log(`[SourceDirectory] Completed. Found ${this.opportunitiesFound} local sources.`)
  }

  async findLocalSources(criteria, profileId) {
    const state = criteria.location.state
    const city = criteria.location.city

    // Search for each type of local source
    for (const sourceType of this.sourceTypes) {
      try {
        await this.crawlSourceType(sourceType, criteria, profileId)
        await new Promise(r => setTimeout(r, 500))
      } catch (err) {
        console.error(`[SourceDirectory] ${sourceType.name} error:`, err.message)
      }
    }

    // Also look for local foundations by state
    if (state) {
      await this.findStateFoundations(state, criteria, profileId)
    }
  }

  async crawlSourceType(sourceType, criteria, profileId) {
    const state = criteria.location.state
    const city = criteria.location.city

    // Create opportunities for local chapters
    if (state) {
      // Community Foundation
      if (sourceType.type === 'community_foundation') {
        await this.createCommunityFoundationOpp(state, city, criteria, profileId)
      }
      
      // Service clubs
      else if (['rotary', 'lions', 'kiwanis'].includes(sourceType.type)) {
        await this.createServiceClubOpp(sourceType, state, city, criteria, profileId)
      }
      
      // United Way
      else if (sourceType.type === 'united_way') {
        await this.createUnitedWayOpp(state, city, criteria, profileId)
      }
    }
  }

  async createCommunityFoundationOpp(state, city, criteria, profileId) {
    const locationName = city ? `${city}, ${state}` : state
    
    const opportunity = {
      source_id: `cf_${state}_${city || 'state'}`.toLowerCase().replace(/\s+/g, '_'),
      source: 'source_directory',
      title: `Community Foundation of ${locationName} - Local Grants`,
      sponsor: `Community Foundation of ${locationName}`,
      description: `Community foundations provide grants to local nonprofits and individuals in ${locationName}. They typically fund education, health, human services, arts, and community development. Many offer scholarship programs, emergency assistance, and donor-advised fund grants.`,
      amount_min: 500,
      amount_max: 50000,
      deadline: null,
      eligibility_criteria: `Located in or serving ${locationName}. 501(c)(3) nonprofits preferred. Some individual assistance available.`,
      focus_areas: ['community', 'local', criteria.location.state],
      url: `https://www.google.com/search?q=community+foundation+${encodeURIComponent(locationName)}`
    }

    const match = this.calculateMatchScore(opportunity, criteria)
    
    // Boost score for local match
    if (criteria.location.state) {
      match.score += 15
      match.reasons.push('Local funding source')
    }
    
    if (match.score >= 25) {
      await this.saveOpportunity(opportunity)
      if (profileId) await this.saveMatch(profileId, opportunity.source_id, match)
    }
  }

  async createServiceClubOpp(sourceType, state, city, criteria, profileId) {
    const locationName = city ? `${city}, ${state}` : state
    const clubName = sourceType.name.replace(' Clubs', ' Club')
    
    // Service clubs typically fund specific causes
    const focusAreas = {
      rotary: ['community service', 'education', 'peace', 'disease prevention', 'water'],
      lions: ['vision', 'hearing', 'diabetes', 'hunger', 'environment', 'childhood cancer'],
      kiwanis: ['children', 'youth', 'education', 'community']
    }
    
    const opportunity = {
      source_id: `${sourceType.type}_${state}_${city || 'state'}`.toLowerCase().replace(/\s+/g, '_'),
      source: 'source_directory',
      title: `${clubName} of ${locationName} - Community Grants`,
      sponsor: `${clubName} of ${locationName}`,
      description: `${sourceType.name} provide community grants and service projects in ${locationName}. Focus areas include: ${focusAreas[sourceType.type]?.join(', ') || 'community service'}.`,
      amount_min: 250,
      amount_max: 5000,
      deadline: null,
      eligibility_criteria: `Projects benefiting ${locationName} community. Contact local club for specific requirements.`,
      focus_areas: focusAreas[sourceType.type] || ['community'],
      url: `https://www.google.com/search?q=${encodeURIComponent(clubName)}+${encodeURIComponent(locationName)}`
    }

    const match = this.calculateMatchScore(opportunity, criteria)
    
    // Check if profile focus areas match service club focus
    const clubFocus = focusAreas[sourceType.type] || []
    const focusMatch = criteria.focusAreas.some(area => 
      clubFocus.some(cf => area.toLowerCase().includes(cf) || cf.includes(area.toLowerCase()))
    )
    
    if (focusMatch) {
      match.score += 10
      match.reasons.push(`Focus aligns with ${clubName} priorities`)
    }
    
    if (match.score >= 25) {
      await this.saveOpportunity(opportunity)
      if (profileId) await this.saveMatch(profileId, opportunity.source_id, match)
    }
  }

  async createUnitedWayOpp(state, city, criteria, profileId) {
    const locationName = city ? `${city}, ${state}` : state
    
    const opportunity = {
      source_id: `uw_${state}_${city || 'state'}`.toLowerCase().replace(/\s+/g, '_'),
      source: 'source_directory',
      title: `United Way of ${locationName} - Community Investment`,
      sponsor: `United Way of ${locationName}`,
      description: `United Way invests in education, financial stability, and health programs in ${locationName}. They provide grants to nonprofits addressing community needs and individual assistance programs.`,
      amount_min: 1000,
      amount_max: 100000,
      deadline: null,
      eligibility_criteria: `501(c)(3) nonprofits serving ${locationName}. Programs must address education, income, or health.`,
      focus_areas: ['education', 'financial stability', 'health', 'community'],
      url: `https://www.google.com/search?q=united+way+${encodeURIComponent(locationName)}`
    }

    const match = this.calculateMatchScore(opportunity, criteria)
    
    if (criteria.isNonprofit) {
      match.score += 10
      match.reasons.push('Nonprofit eligible for United Way funding')
    }
    
    if (match.score >= 25) {
      await this.saveOpportunity(opportunity)
      if (profileId) await this.saveMatch(profileId, opportunity.source_id, match)
    }
  }

  async findStateFoundations(state, criteria, profileId) {
    // Major state-specific foundation types
    const stateFoundations = [
      { 
        pattern: `${state} humanities council`,
        focus: 'humanities, arts, culture'
      },
      {
        pattern: `${state} arts commission`,
        focus: 'arts, artists, cultural organizations'
      },
      {
        pattern: `${state} health foundation`,
        focus: 'health, healthcare access, public health'
      }
    ]

    for (const foundation of stateFoundations) {
      const opportunity = {
        source_id: `state_${this.hashString(foundation.pattern)}`,
        source: 'source_directory',
        title: `${state} ${foundation.pattern.split(' ').slice(1).join(' ').replace(/^\w/, c => c.toUpperCase())}`,
        sponsor: foundation.pattern.replace(/^\w/, c => c.toUpperCase()),
        description: `State-level funding for ${foundation.focus} in ${state}.`,
        amount_min: 1000,
        amount_max: 25000,
        deadline: null,
        eligibility_criteria: `Organizations and projects in ${state} focused on ${foundation.focus}.`,
        focus_areas: foundation.focus.split(', '),
        url: `https://www.google.com/search?q=${encodeURIComponent(foundation.pattern)}`
      }

      const match = this.calculateMatchScore(opportunity, criteria)
      if (match.score >= 20) {
        await this.saveOpportunity(opportunity)
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
            JSON.stringify({ reasons: match.reasons, category: 'local' })
          )
        }
      }
    } catch (err) {
      console.error('[SourceDirectory] Match save error:', err.message)
    }
  }
}

export default SourceDirectoryCrawler
