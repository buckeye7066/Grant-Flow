// src/api/supabaseClient.js
// DROP-IN REPLACEMENT FOR base44/client
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Entity factory - mimics Base44 API
function createEntity(tableName) {
  return {
    async list(options = {}) {
      let query = supabase.from(tableName).select('*');
      if (options.orderBy) {
        query = query.order(options.orderBy, { ascending: options.ascending ?? true });
      }
      if (options.limit) {
        query = query.limit(options.limit);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async filter(filters) {
      let query = supabase.from(tableName).select('*');
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else {
            query = query.eq(key, value);
          }
        }
      });
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async get(id) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },

    async create(record) {
      const { data, error } = await supabase
        .from(tableName)
        .insert(record)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(id, updates) {
      const { data, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async delete(id) {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    },

    async createMany(records) {
      const { data, error } = await supabase
        .from(tableName)
        .insert(records)
        .select();
      if (error) throw error;
      return data || [];
    },

    async search(column, term) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .ilike(column, `%${term}%`);
      if (error) throw error;
      return data || [];
    },

    async count(filters = {}) {
      let query = supabase.from(tableName).select('*', { count: 'exact', head: true });
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
  };
}

// Auth - mimics Base44 Auth API
const auth = {
  async signUp(email, password, metadata = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) throw error;
    return data;
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async getUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },

  async me() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },

  async resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) throw error;
  },

  async updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// Functions - mimics Base44 Functions API
const functions = {
  async invoke(functionName, payload = {}) {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload,
    });
    if (error) throw error;
    return { data };
  },
};

// Integrations - mimics Base44 Integrations
const integrations = {
  Core: {
    async InvokeLLM(params) {
      return functions.invoke('invoke-llm', params);
    },
    async SendEmail(params) {
      return functions.invoke('send-email', params);
    },
    async UploadFile(params) {
      const { file, bucket = 'uploads', path } = params;
      const filePath = path || `${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);
      return { url: urlData.publicUrl, path: filePath };
    },
    async UploadPrivateFile(params) {
      const { file, bucket = 'private', path } = params;
      const filePath = path || `${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);
      if (error) throw error;
      return { path: filePath };
    },
    async CreateFileSignedUrl(params) {
      const { bucket, path, expiresIn = 3600 } = params;
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);
      if (error) throw error;
      return { signedUrl: data.signedUrl };
    },
    async GenerateImage(params) {
      return functions.invoke('generate-image', params);
    },
    async ExtractDataFromUploadedFile(params) {
      return functions.invoke('extract-data', params);
    },
  },
};

// All entities
const entities = {
  Organization: createEntity('organizations'),
  Contact: createEntity('contacts'),
  Grant: createEntity('grants'),
  GrantCriteria: createEntity('grant_criteria'),
  ProposalSection: createEntity('proposal_sections'),
  Budget: createEntity('budgets'),
  Expense: createEntity('expenses'),
  Document: createEntity('documents'),
  Milestone: createEntity('milestones'),
  BillingPolicy: createEntity('billing_policies'),
  BillingSettings: createEntity('billing_settings'),
  Project: createEntity('projects'),
  SOWItem: createEntity('sow_items'),
  Invoice: createEntity('invoices'),
  InvoiceLine: createEntity('invoice_lines'),
  Payment: createEntity('payments'),
  TimeEntry: createEntity('time_entries'),
  AutomatedSearch: createEntity('automated_searches'),
  Taxonomy: createEntity('taxonomies'),
  FundingOpportunity: createEntity('funding_opportunities'),
  CrawlLog: createEntity('crawl_logs'),
  SourceRegistry: createEntity('source_registry'),
  SourceDirectory: createEntity('source_directory'),
  PartnerSource: createEntity('partner_sources'),
  PartnerFeed: createEntity('partner_feeds'),
  ChecklistItem: createEntity('checklist_items'),
  ApplicationDraft: createEntity('application_drafts'),
  ApplicationRequirement: createEntity('application_requirements'),
  WorkflowStage: createEntity('workflow_stages'),
  WorkflowTask: createEntity('workflow_tasks'),
  AiArtifact: createEntity('ai_artifacts'),
  SearchJob: createEntity('search_jobs'),
  SavedSearch: createEntity('saved_searches'),
  ProcessingQueue: createEntity('processing_queue'),
  JobStatus: createEntity('job_status'),
  OpportunityContact: createEntity('opportunity_contacts'),
  ContactMethod: createEntity('contact_methods'),
  SourceSubmissionQueue: createEntity('source_submission_queue'),
  OutreachCampaign: createEntity('outreach_campaigns'),
  Funder: createEntity('funders'),
  FunderInteraction: createEntity('funder_interactions'),
  FunderReminder: createEntity('funder_reminders'),
  FunderMetadata: createEntity('funder_metadata'),
  ComplianceReport: createEntity('compliance_reports'),
  GrantAward: createEntity('grant_awards'),
  GrantAlert: createEntity('grant_alerts'),
  GrantMonitoringLog: createEntity('grant_monitoring_logs'),
  GrantRequirement: createEntity('grant_requirements'),
  GrantKPI: createEntity('grant_kpis'),
  ReportRequirement: createEntity('report_requirements'),
  ReportTemplate: createEntity('report_templates'),
  ProfileFact: createEntity('profile_facts'),
  ProfileVerification: createEntity('profile_verifications'),
  UniversityApplication: createEntity('university_applications'),
  TestScoreRelease: createEntity('test_score_releases'),
  TranscriptRequest: createEntity('transcript_requests'),
  CommonAppProfile: createEntity('common_app_profiles'),
  TaxDocument: createEntity('tax_documents'),
  TaxProfile: createEntity('tax_profiles'),
  TaxReturn: createEntity('tax_returns'),
  TaxDocumentConnection: createEntity('tax_document_connections'),
  Lead: createEntity('leads'),
  Activity: createEntity('activities'),
  AutomationSettings: createEntity('automation_settings'),
  AutomationLock: createEntity('automation_locks'),
  SubscriptionPlan: createEntity('subscription_plans'),
  UserSubscription: createEntity('user_subscriptions'),
  AddOn: createEntity('addons'),
  Message: createEntity('messages'),
  AgentMessage: createEntity('agent_messages'),
  NotificationPreference: createEntity('notification_preferences'),
  WelcomeMessage: createEntity('welcome_messages'),
  UserActivity: createEntity('user_activities'),
  OnboardingProgress: createEntity('onboarding_progress'),
  AuditTrail: createEntity('audit_trail'),
  PHIAuditLog: createEntity('phi_audit_logs'),
  ContaminationLog: createEntity('contamination_logs'),
  SystemCheckLog: createEntity('system_check_logs'),
  FunctionTestPayload: createEntity('function_test_payloads'),
  DiscoveredField: createEntity('discovered_fields'),
  ImmuneEvent: createEntity('immune_events'),
  ImmuneSignature: createEntity('immune_signatures'),
  ImmuneRoutingSnapshot: createEntity('immune_routing_snapshots'),
  ImmuneWorkerState: createEntity('immune_worker_states'),
  ImmuneMutationLog: createEntity('immune_mutation_logs'),
  ImmuneConfig: createEntity('immune_configs'),
  ImmuneSnapshot: createEntity('immune_snapshots'),
  ImmuneRuntimeState: createEntity('immune_runtime_states'),
  StaticAnalysisIssue: createEntity('static_analysis_issues'),
  ImmuneSelfTest: createEntity('immune_self_tests'),
  ImmunePatch: createEntity('immune_patches'),
  ImmuneHeartbeat: createEntity('immune_heartbeats'),
  State: createEntity('states'),
  ZipCode: createEntity('zip_codes'),
};

// Main export - drop-in replacement for base44
export const base44 = {
  entities,
  auth,
  functions,
  integrations,
};

export default base44;
