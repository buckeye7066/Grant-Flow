/**
 * GrantFlow Crawler System
 * Main index file - exports all crawlers and manager
 */

import { CrawlerManager, BaseCrawler, CRAWLER_STATUS } from './base.js'
import { GrantsGovCrawler } from './grantsGov.js'
import { BenefitsGovCrawler } from './benefitsGov.js'
import { DSIRECrawler } from './dsire.js'
import { IRS990Crawler } from './irs990.js'
import { UniversityScholarshipsCrawler } from './universityScholarships.js'
import { SourceDirectoryCrawler } from './sourceDirectory.js'
import { WebsiteCrawler } from './website.js'

// Initialize crawler manager with all crawlers
const crawlerManager = new CrawlerManager()

// Register all crawlers
crawlerManager.register(new GrantsGovCrawler())
crawlerManager.register(new BenefitsGovCrawler())
crawlerManager.register(new DSIRECrawler())
crawlerManager.register(new IRS990Crawler())
crawlerManager.register(new UniversityScholarshipsCrawler())
crawlerManager.register(new SourceDirectoryCrawler())
crawlerManager.register(new WebsiteCrawler())

// Export everything
export {
  crawlerManager,
  CrawlerManager,
  BaseCrawler,
  CRAWLER_STATUS,
  GrantsGovCrawler,
  BenefitsGovCrawler,
  DSIRECrawler,
  IRS990Crawler,
  UniversityScholarshipsCrawler,
  SourceDirectoryCrawler,
  WebsiteCrawler
}

export default crawlerManager
