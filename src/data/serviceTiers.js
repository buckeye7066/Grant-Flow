// GrantFlow Service Tiers and Pricing
// Based on Master Service Menu

export const CLIENT_CATEGORIES = [
  { id: 'individual', label: 'Individual', description: 'Students, individuals/families seeking assistance', budgetMax: 0 },
  { id: 'small_org', label: 'Small Organization', description: 'Nonprofits, ministries, or businesses with annual budget under $250,000', budgetMax: 250000 },
  { id: 'mid_size', label: 'Mid-Size Organization', description: 'Organizations with annual budget between $250,000 and $2,000,000', budgetMin: 250000, budgetMax: 2000000 },
  { id: 'large_org', label: 'Large Organization', description: 'Organizations with annual budget over $2,000,000', budgetMin: 2000000 }
]

export const SERVICES = {
  // Discovery & Assessment Services
  quick_eligibility_scan: {
    id: 'quick_eligibility_scan',
    name: 'Quick Eligibility Scan',
    category: 'discovery',
    description: 'Rapid assessment of your eligibility for federal, state, and foundation grants. Includes keyword research, initial database queries, and a summary report of 5-10 top opportunities with eligibility notes.',
    pricing: {
      individual: 149,
      small_org: 349,
      mid_size: 349,
      large_org: 750
    },
    features: ['smart_matcher_basic', 'opportunity_search', 'eligibility_report']
  },
  comprehensive_funding_dossier: {
    id: 'comprehensive_funding_dossier',
    name: 'Comprehensive Funding Dossier',
    category: 'discovery',
    description: 'Full funding landscape analysis with detailed research across federal, state, foundation, and corporate sources. Includes strategic recommendations, timeline planning, and prioritized list of 15-30+ opportunities with full eligibility analysis, award ranges, and application requirements.',
    pricing: {
      individual: 399,
      small_org: 1250,
      mid_size: 2400,
      large_org: 3800
    },
    features: ['smart_matcher_full', 'opportunity_search', 'pipeline_management', 'funding_dossier', 'timeline_planning', 'eligibility_report']
  },
  application_strategy_session: {
    id: 'application_strategy_session',
    name: 'Application Strategy Session',
    category: 'discovery',
    description: 'One-on-one consultation to develop your grant application strategy. Includes opportunity prioritization, timeline development, resource assessment, and action planning. 60-90 minute session with written follow-up recommendations.',
    pricing: {
      individual: 300,
      small_org: 450,
      mid_size: 600,
      large_org: 600
    },
    features: ['strategy_session', 'calendar_access']
  },

  // Grant Writing & Application Services
  micro_grant_application: {
    id: 'micro_grant_application',
    name: 'Micro-Grant Application (<$5K)',
    category: 'writing',
    description: 'Complete application preparation for small grants and assistance programs under $5,000. Includes narrative development, budget preparation, and submission coordination. Ideal for emergency assistance, scholarships, and community grants.',
    pricing: {
      individual: 600,
      small_org: 900,
      mid_size: 1200,
      large_org: 1200
    },
    features: ['grant_writer', 'budget_tool', 'submission_tracking'],
    grantSizeMax: 5000
  },
  standard_foundation_application: {
    id: 'standard_foundation_application',
    name: 'Standard Foundation Application',
    category: 'writing',
    description: 'Full-service foundation grant application ($5K-$250K). Includes needs assessment, program design narrative, evaluation plan, logic model, detailed budget with justification, and all required attachments. Typically 5-15 pages.',
    pricing: {
      individual: 2000,
      small_org: 3500,
      mid_size: 5000,
      large_org: 5000
    },
    features: ['grant_writer', 'budget_tool', 'logic_model', 'evaluation_plan', 'submission_tracking'],
    grantSizeMin: 5000,
    grantSizeMax: 250000
  },
  complex_federal_application: {
    id: 'complex_federal_application',
    name: 'Complex/Federal Application',
    category: 'writing',
    description: 'Comprehensive federal or large foundation proposal ($250K+). Includes all narrative sections, detailed work plan, organizational capacity documentation, partnership coordination, complex budget development, sustainability planning, and compliance review. Typically 20-50+ pages.',
    pricing: {
      individual: 5000,
      small_org: 8000,
      mid_size: 12000,
      large_org: 12000
    },
    features: ['grant_writer_full', 'budget_tool', 'logic_model', 'evaluation_plan', 'work_plan', 'compliance_review', 'submission_tracking'],
    grantSizeMin: 250000
  },
  transfer_scholarship_pack: {
    id: 'transfer_scholarship_pack',
    name: 'Transfer Scholarship Pack',
    category: 'writing',
    description: 'Coordinated application support for students applying to multiple transfer scholarships. Includes common essay development, customization for 3-5 institutions, academic records coordination, and submission tracking.',
    pricing: {
      individual: 450,
      small_org: 450,
      mid_size: 450,
      large_org: 450
    },
    features: ['scholarship_essays', 'submission_tracking'],
    clientTypes: ['individual']
  },

  // Support & Compliance Services
  editing_redraft: {
    id: 'editing_redraft',
    name: 'Editing & Redraft Service',
    category: 'support',
    description: 'Professional editing and revision of existing grant proposals. Includes content strengthening, compliance review, formatting, clarity enhancement, and scoring rubric alignment. Does not include complete rewrite.',
    pricing: {
      individual: 300,
      small_org: 500,
      mid_size: 900,
      large_org: 900
    },
    features: ['document_editing', 'compliance_check']
  },
  budget_logic_model: {
    id: 'budget_logic_model',
    name: 'Budget & Logic Model Development',
    category: 'support',
    description: 'Standalone budget creation with detailed justification and logic model development. Includes line-item budget, budget narrative, indirect cost calculations, cost-sharing documentation, and visual logic model showing inputs, activities, outputs, and outcomes.',
    pricing: {
      individual: 350,
      small_org: 600,
      mid_size: 900,
      large_org: 900
    },
    features: ['budget_tool', 'logic_model']
  },
  compliance_reporting: {
    id: 'compliance_reporting',
    name: 'Compliance Reporting & Management',
    category: 'support',
    description: 'Post-award grant management support. Includes quarterly/annual report preparation, expenditure tracking, outcomes documentation, and compliance verification. Per report or monthly retainer available.',
    pricing: {
      individual: 500,
      small_org: 1000,
      mid_size: 1500,
      large_org: 1500
    },
    features: ['compliance_dashboard', 'reporting_tools', 'expenditure_tracking']
  },
  grant_calendar: {
    id: 'grant_calendar',
    name: 'Grant Calendar Setup & Management',
    category: 'support',
    description: 'Comprehensive grant opportunity tracking system. Includes research of applicable deadlines, calendar creation with milestones, automated reminders, and quarterly updates. 12-month calendar with ongoing support.',
    pricing: {
      individual: 800,
      small_org: 1200,
      mid_size: 1800,
      large_org: 1800
    },
    features: ['calendar_full', 'deadline_reminders', 'milestone_tracking']
  },

  // Hourly Services
  hourly_consultation: {
    id: 'hourly_consultation',
    name: 'Hourly Consultation & Advisory',
    category: 'hourly',
    description: 'Flexible hourly support for grant research, proposal review, technical assistance, training, or ad-hoc consulting. Billed in 6-minute increments with 15-minute minimum.',
    pricing: {
      individual: 85,
      small_org: 85,
      mid_size: 115,
      large_org: 150
    },
    isHourly: true,
    features: ['consultation_hours']
  }
}

export const FEATURE_ACCESS = {
  // Core Features
  smart_matcher_basic: {
    name: 'Smart Matcher (Basic)',
    description: 'AI-powered matching with top 10 opportunities'
  },
  smart_matcher_full: {
    name: 'Smart Matcher (Full)',
    description: 'AI-powered matching with unlimited opportunities and detailed analysis'
  },
  opportunity_search: {
    name: 'Opportunity Search',
    description: 'Search and browse funding opportunities database'
  },
  pipeline_management: {
    name: 'Pipeline Management',
    description: 'Track applications through stages'
  },
  grant_writer: {
    name: 'AI Grant Writer (Basic)',
    description: 'Generate basic grant sections with AI assistance'
  },
  grant_writer_full: {
    name: 'AI Grant Writer (Full)',
    description: 'Full grant writing suite with all section types'
  },
  budget_tool: {
    name: 'Budget Development Tool',
    description: 'Create detailed budgets with justifications'
  },
  logic_model: {
    name: 'Logic Model Builder',
    description: 'Visual logic model creation tool'
  },
  evaluation_plan: {
    name: 'Evaluation Plan Generator',
    description: 'Create evaluation and outcomes tracking plans'
  },
  calendar_access: {
    name: 'Calendar Access',
    description: 'View grant calendar and deadlines'
  },
  calendar_full: {
    name: 'Full Calendar Management',
    description: 'Full calendar with custom deadlines and reminders'
  },
  compliance_dashboard: {
    name: 'Compliance Dashboard',
    description: 'Track compliance requirements and deadlines'
  },
  reporting_tools: {
    name: 'Reporting Tools',
    description: 'Generate progress and compliance reports'
  },
  submission_tracking: {
    name: 'Submission Tracking',
    description: 'Track application submissions and status'
  },
  anya_assistant: {
    name: 'Anya AI Assistant',
    description: 'AI assistant for guidance and questions'
  },
  profile_management: {
    name: 'Profile Management',
    description: 'Create and manage organizational profiles'
  }
}

export const PAYMENT_TERMS = {
  milestones: [
    { percentage: 40, description: 'Due at project kickoff (scope locked, calendar set)' },
    { percentage: 40, description: 'Due at complete draft delivery' },
    { percentage: 20, description: 'Due at submission and handoff package delivery' }
  ],
  netDays: 15,
  lateFeeMonthly: 1.5,
  methods: [
    { id: 'check', name: 'Check', payableTo: 'John White' },
    { id: 'venmo', name: 'Venmo', handle: '@John-White-1384' },
    { id: 'cashapp', name: 'CashApp', handle: '$jwhiternmba' },
    { id: 'ach', name: 'ACH / Bank Transfer' },
    { id: 'credit_card', name: 'Credit Card', note: 'processing fee may apply' },
    { id: 'bill_to_grant', name: 'Bill-to-Grant', note: 'when allowed by funder' }
  ]
}

export default { CLIENT_CATEGORIES, SERVICES, FEATURE_ACCESS, PAYMENT_TERMS }
