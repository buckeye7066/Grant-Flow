import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Organizations
export const organizationsApi = {
  list: () => api.get('/organizations').then(r => r.data),
  get: (id) => api.get(`/organizations/${id}`).then(r => r.data),
  create: (data) => api.post('/organizations', data).then(r => r.data),
  update: (id, data) => api.put(`/organizations/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/organizations/${id}`).then(r => r.data),
}

// Opportunities
export const opportunitiesApi = {
  list: (params) => api.get('/opportunities', { params }).then(r => r.data),
  get: (id) => api.get(`/opportunities/${id}`).then(r => r.data),
  search: (query) => api.get(`/opportunities/search/${query}`).then(r => r.data),
  create: (data) => api.post('/opportunities', data).then(r => r.data),
  update: (id, data) => api.put(`/opportunities/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/opportunities/${id}`).then(r => r.data),
}

// Pipeline
export const pipelineApi = {
  list: (params) => api.get('/pipeline', { params }).then(r => r.data),
  summary: (params) => api.get('/pipeline/summary', { params }).then(r => r.data),
  get: (id) => api.get(`/pipeline/${id}`).then(r => r.data),
  create: (data) => api.post('/pipeline', data).then(r => r.data),
  update: (id, data) => api.put(`/pipeline/${id}`, data).then(r => r.data),
  move: (id, stage) => api.post(`/pipeline/${id}/move`, { stage }).then(r => r.data),
  delete: (id) => api.delete(`/pipeline/${id}`).then(r => r.data),
}

// Matches
export const matchesApi = {
  list: (params) => api.get('/matches', { params }).then(r => r.data),
  get: (id) => api.get(`/matches/${id}`).then(r => r.data),
  addToPipeline: (id) => api.post(`/matches/${id}/add-to-pipeline`).then(r => r.data),
  delete: (id) => api.delete(`/matches/${id}`).then(r => r.data),
}

// AI
export const aiApi = {
  smartMatch: (data) => api.post('/ai/smart-match', data).then(r => r.data),
  itemSearch: (data) => api.post('/ai/item-search', data).then(r => r.data),
  analyzeMatch: (data) => api.post('/ai/analyze-match', data).then(r => r.data),
  generateGrantSection: (data) => api.post('/ai/generate-grant-section', data).then(r => r.data),
}

// Import
export const importApi = {
  base44: (data) => api.post('/import/base44', { data }).then(r => r.data),
  stats: () => api.get('/import/stats').then(r => r.data),
}

// Health check
export const healthCheck = () => api.get('/health').then(r => r.data)

export default api
