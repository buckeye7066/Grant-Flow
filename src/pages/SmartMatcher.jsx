import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sparkles, Loader2, CheckCircle2, ExternalLink, Plus, DollarSign, Calendar, Building, CheckSquare, Square } from 'lucide-react'
import { organizationsApi, aiApi, pipelineApi } from '../api/client'

export default function SmartMatcher() {
  const queryClient = useQueryClient()
  const [selectedOrg, setSelectedOrg] = useState('')
  const [results, setResults] = useState(null)
  const [selectedMatches, setSelectedMatches] = useState(new Set())
  const [addingAll, setAddingAll] = useState(false)
  const [addedIds, setAddedIds] = useState(new Set())

  const { data: orgs = [] } = useQuery({ queryKey: ['organizations'], queryFn: organizationsApi.list })

  const matchMutation = useMutation({
    mutationFn: aiApi.smartMatch,
    onSuccess: (data) => { setResults(data); setSelectedMatches(new Set()); setAddedIds(new Set()) }
  })

  const handleMatch = () => { if (selectedOrg) matchMutation.mutate({ organization_id: selectedOrg, limit: 500 }) }

  const toggleSelect = (id) => {
    const s = new Set(selectedMatches)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelectedMatches(s)
  }

  const selectAll = () => { if (results?.matches) setSelectedMatches(new Set(results.matches.map((m,i) => m.id || 'm-'+i))) }
  const deselectAll = () => setSelectedMatches(new Set())

  const addToPipeline = async (match, idx) => {
    const id = match.id || 'm-'+idx
    try {
      await pipelineApi.create({ organization_id: selectedOrg, opportunity_id: match.opportunity?.id, stage: 'discovered', confidence_score: match.score, match_reasons: match.reasons || [], notes: match.analysis || '' })
      setAddedIds(p => new Set([...p, id]))
      queryClient.invalidateQueries(['pipeline'])
    } catch (e) { if (e.response?.status === 409) setAddedIds(p => new Set([...p, id])) }
  }

  const addSelectedToPipeline = async () => {
    setAddingAll(true)
    for (let i = 0; i < results.matches.length; i++) {
      const m = results.matches[i]
      if (selectedMatches.has(m.id || 'm-'+i)) await addToPipeline(m, i)
    }
    setSelectedMatches(new Set())
    setAddingAll(false)
  }

  const org = orgs.find(o => o.id === selectedOrg)
  const allSel = results?.matches?.length > 0 && selectedMatches.size === results.matches.length
  const scoreClass = (s) => s >= 80 ? 'bg-green-100 text-green-700' : s >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-700'

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3"><Sparkles className="w-8 h-8 text-blue-600" />Smart Matcher</h1>
        <p className="text-slate-600 mt-1">AI-powered grant matching</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">Select Organization</label>
            <select value={selectedOrg} onChange={(e) => { setSelectedOrg(e.target.value); setResults(null); setAddedIds(new Set()) }} className="w-full px-4 py-3 border border-slate-300 rounded-lg">
              <option value="">Choose...</option>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={handleMatch} disabled={!selectedOrg || matchMutation.isPending} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {matchMutation.isPending ? <><Loader2 className="w-5 h-5 animate-spin" />Matching...</> : <><Sparkles className="w-5 h-5" />Find Matches</>}
            </button>
          </div>
        </div>
        {org && <div className="mt-4 p-4 bg-slate-50 rounded-lg"><h4 className="font-medium">{org.name}</h4><p className="text-sm text-slate-600">{org.mission}</p></div>}
      </div>
      {matchMutation.isError && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">Error: {matchMutation.error?.message}</div>}
      {results && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-xl font-semibold">Found {results.matches?.length || 0} Matches</h2>
            {results.matches?.length > 0 && (
              <div className="flex gap-3">
                <button onClick={allSel ? deselectAll : selectAll} className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-slate-50">
                  {allSel ? <><CheckSquare className="w-4 h-4" />Deselect All</> : <><Square className="w-4 h-4" />Select All ({results.matches.length})</>}
                </button>
                {selectedMatches.size > 0 && (
                  <button onClick={addSelectedToPipeline} disabled={addingAll} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                    {addingAll ? <><Loader2 className="w-4 h-4 animate-spin" />Adding...</> : <><Plus className="w-4 h-4" />Add Selected ({selectedMatches.size})</>}
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="grid gap-4">
            {results.matches?.map((match, idx) => {
              const id = match.id || 'm-'+idx, sel = selectedMatches.has(id), added = addedIds.has(id), opp = match.opportunity || {}
              return (
                <div key={id} className={`bg-white rounded-xl border-2 p-6 ${added ? 'border-green-500 bg-green-50/30' : sel ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <button onClick={() => !added && toggleSelect(id)} className="mt-1">
                        {added ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : sel ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5 text-slate-400" />}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{opp.title || 'Opportunity'}</h3>
                          <span className={`px-2 py-1 rounded text-sm font-medium ${scoreClass(match.score)}`}>{Math.round(match.score)}% Match</span>
                          {added && <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">Added</span>}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
                          {opp.sponsor && <span className="flex items-center gap-1"><Building className="w-4 h-4" />{opp.sponsor}</span>}
                          {opp.amount_max && <span className="flex items-center gap-1"><DollarSign className="w-4 h-4" />Up to ${opp.amount_max.toLocaleString()}</span>}
                          {opp.deadline && <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{new Date(opp.deadline).toLocaleDateString()}</span>}
                        </div>
                        {match.analysis && <p className="text-slate-600 mb-3">{match.analysis}</p>}
                        {match.reasons?.length > 0 && <div className="flex flex-wrap gap-2">{match.reasons.map((r,i) => <span key={i} className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"><CheckCircle2 className="w-3 h-3" />{r}</span>)}</div>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      <button onClick={() => addToPipeline(match, idx)} disabled={added} className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm ${added ? 'bg-green-100 text-green-700' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                        {added ? <><CheckCircle2 className="w-4 h-4" />Added</> : <><Plus className="w-4 h-4" />Add to Pipeline</>}
                      </button>
                      {opp.url && <a href={opp.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm"><ExternalLink className="w-4 h-4" />View Details</a>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
