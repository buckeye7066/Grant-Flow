import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, ExternalLink, Calendar, DollarSign, Building, X, Sparkles, Loader2, Globe, Phone, Mail, CheckCircle, ArrowRight } from 'lucide-react'
import { opportunitiesApi, organizationsApi } from '../api/client'

function OpportunityModal({ opportunity, onClose, onSave }) {
  const [formData, setFormData] = useState(opportunity || {
    title: '', sponsor: '', sponsor_type: 'foundation', description: '',
    funding_type: 'grant', categories: [], amount_min: '', amount_max: '',
    deadline: '', url: '', eligibility: ''
  })
  const [categoryInput, setCategoryInput] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      ...formData,
      amount_min: formData.amount_min ? parseFloat(formData.amount_min) : null,
      amount_max: formData.amount_max ? parseFloat(formData.amount_max) : null
    })
  }

  const addCategory = () => {
    if (categoryInput.trim()) {
      setFormData({ ...formData, categories: [...(formData.categories || []), categoryInput.trim()] })
      setCategoryInput('')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-slate-900">{opportunity ? 'Edit' : 'Add'} Opportunity</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
            <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sponsor</label>
              <input type="text" value={formData.sponsor} onChange={(e) => setFormData({ ...formData, sponsor: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sponsor Type</label>
              <select value={formData.sponsor_type} onChange={(e) => setFormData({ ...formData, sponsor_type: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="foundation">Foundation</option>
                <option value="federal">Federal</option>
                <option value="state">State</option>
                <option value="local">Local Government</option>
                <option value="corporate">Corporate</option>
                <option value="nonprofit">Nonprofit</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" rows={4} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Min Amount</label>
              <input type="number" value={formData.amount_min} onChange={(e) => setFormData({ ...formData, amount_min: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max Amount</label>
              <input type="number" value={formData.amount_max} onChange={(e) => setFormData({ ...formData, amount_max: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Deadline</label>
              <input type="date" value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">URL</label>
            <input type="url" value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Categories</label>
            <div className="flex gap-2 mb-2">
              <input type="text" value={categoryInput} onChange={(e) => setCategoryInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())} className="flex-1 px-3 py-2 border border-slate-300 rounded-lg" placeholder="Add category..." />
              <button type="button" onClick={addCategory} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(formData.categories || []).map((cat, i) => (
                <span key={i} className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm flex items-center gap-1">
                  {cat}<button type="button" onClick={() => setFormData({ ...formData, categories: formData.categories.filter((_, idx) => idx !== i) })}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{opportunity ? 'Save' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AIResultsModal({ onClose, opportunities, loading, onAddToDatabase }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">AI-Discovered Opportunities</h2>
              <p className="text-sm text-slate-500">{opportunities.length} opportunities found for this profile</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
              <p className="text-slate-900 font-medium">Searching for opportunities...</p>
              <p className="text-slate-500 text-sm mt-1">Checking federal, state, local, and private sources</p>
            </div>
          ) : opportunities.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500">No opportunities found. Try selecting a different profile.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {opportunities.map((opp, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                          opp.type === 'grant' ? 'bg-green-100 text-green-700' :
                          opp.type === 'scholarship' ? 'bg-blue-100 text-blue-700' :
                          opp.type === 'loan' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>{opp.type?.toUpperCase() || 'PROGRAM'}</span>
                        {opp.deadline && <span className="text-xs text-slate-500">Deadline: {opp.deadline}</span>}
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900">{opp.name}</h3>
                      <p className="text-sm text-slate-600 mt-1">{opp.organization}</p>
                      
                      {opp.amount && (
                        <div className="flex items-center gap-1 mt-2 text-green-600 font-medium">
                          <DollarSign className="w-4 h-4" />
                          {opp.amount}
                        </div>
                      )}
                      
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800"><strong>Why this matches:</strong> {opp.why_match}</p>
                      </div>
                      
                      {opp.eligibility && (
                        <p className="text-sm text-slate-600 mt-2"><strong>Eligibility:</strong> {opp.eligibility}</p>
                      )}
                      
                      {opp.how_to_apply && (
                        <p className="text-sm text-slate-600 mt-2"><strong>How to apply:</strong> {opp.how_to_apply}</p>
                      )}
                      
                      <div className="flex items-center gap-4 mt-3">
                        {opp.url && (
                          <a href={opp.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
                            <Globe className="w-4 h-4" />
                            Visit Website
                          </a>
                        )}
                        {opp.contact && (
                          <span className="flex items-center gap-1 text-sm text-slate-500">
                            <Phone className="w-4 h-4" />
                            {opp.contact}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => onAddToDatabase(opp)}
                      className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      Add to DB
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Opportunities() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingOpp, setEditingOpp] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAIModal, setShowAIModal] = useState(false)
  const [aiOpportunities, setAiOpportunities] = useState([])
  const [aiLoading, setAiLoading] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState('')

  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => opportunitiesApi.list({ limit: 25000 })
  })

  const { data: profiles = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: organizationsApi.list
  })

  const createMutation = useMutation({
    mutationFn: opportunitiesApi.create,
    onSuccess: () => { queryClient.invalidateQueries(['opportunities']); setShowModal(false) }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => opportunitiesApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['opportunities']); setEditingOpp(null) }
  })

  const handleSave = (data) => {
    if (editingOpp) updateMutation.mutate({ id: editingOpp.id, data })
    else createMutation.mutate(data)
  }

  const handleAIAssist = async () => {
    setShowAIModal(true)
    setAiLoading(true)
    setAiOpportunities([])
    try {
      const response = await fetch('/api/ai/find-opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: selectedProfile || null })
      })
      const data = await response.json()
      setAiOpportunities(data.opportunities || [])
    } catch (err) {
      console.error('AI assist error:', err)
    } finally {
      setAiLoading(false)
    }
  }

  const handleAddToDatabase = async (opp) => {
    try {
      await opportunitiesApi.create({
        title: opp.name,
        sponsor: opp.organization,
        description: `${opp.why_match}\n\nEligibility: ${opp.eligibility || 'See website'}\n\nHow to apply: ${opp.how_to_apply || 'See website'}`,
        url: opp.url,
        deadline: opp.deadline && !opp.deadline.includes('Rolling') ? opp.deadline : null,
        funding_type: opp.type || 'grant',
        amount_max: opp.amount ? parseInt(opp.amount.replace(/[^0-9]/g, '')) || null : null,
        status: 'active'
      })
      queryClient.invalidateQueries(['opportunities'])
      alert('Added to database!')
    } catch (err) {
      console.error('Add error:', err)
      alert('Failed to add')
    }
  }

  const filtered = opportunities.filter(opp =>
    opp.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    opp.sponsor?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Funding Opportunities</h1>
          <p className="text-slate-600 mt-1">{opportunities.length} opportunities available</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-5 h-5" />
          Add Opportunity
        </button>
      </div>

      {/* AI Assist Bar */}
      <div className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-slate-900">AI Opportunity Finder</span>
            </div>
            <p className="text-sm text-slate-600">Find grants, scholarships, assistance programs, and more based on profile</p>
          </div>
          <select value={selectedProfile} onChange={(e) => setSelectedProfile(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white">
            <option value="">Select a profile</option>
            {profiles.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
          <button onClick={handleAIAssist} disabled={!selectedProfile} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            <Sparkles className="w-4 h-4" />
            Find Opportunities
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input type="text" placeholder="Search opportunities..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No opportunities found</h3>
          <p className="text-slate-500">Try the AI Finder or add a new opportunity</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(opp => (
            <div key={opp.id} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900">{opp.title}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                    {opp.sponsor && (<span className="flex items-center gap-1"><Building className="w-4 h-4" />{opp.sponsor}</span>)}
                    {(opp.amount_min || opp.amount_max) && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        {opp.amount_min && opp.amount_max ? `$${opp.amount_min.toLocaleString()} - $${opp.amount_max.toLocaleString()}` : opp.amount_max ? `Up to $${opp.amount_max.toLocaleString()}` : `From $${opp.amount_min.toLocaleString()}`}
                      </span>
                    )}
                    {opp.deadline && (<span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{new Date(opp.deadline).toLocaleDateString()}</span>)}
                  </div>
                  {opp.description && (<p className="mt-3 text-slate-600 line-clamp-2">{opp.description}</p>)}
                </div>
                <div className="flex items-center gap-2">
                  {opp.url && (<a href={opp.url} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><ExternalLink className="w-5 h-5" /></a>)}
                  <button onClick={() => setEditingOpp(opp)} className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Edit</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(showModal || editingOpp) && (
        <OpportunityModal opportunity={editingOpp} onClose={() => { setShowModal(false); setEditingOpp(null) }} onSave={handleSave} />
      )}
      {showAIModal && (
        <AIResultsModal onClose={() => setShowAIModal(false)} opportunities={aiOpportunities} loading={aiLoading} onAddToDatabase={handleAddToDatabase} />
      )}
    </div>
  )
}