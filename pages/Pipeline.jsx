import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Zap, FileText, Send, Award, Clock, ChevronRight, Loader2, Building, DollarSign, Calendar, Sparkles, Eye } from 'lucide-react'
import { pipelineApi, aiApi } from '../api/client'
import { Link } from 'react-router-dom'

const STAGES = [
  { id: 'discovered', label: 'Discovered', color: 'bg-slate-500', icon: Eye },
  { id: 'interested', label: 'Interested', color: 'bg-blue-500', icon: Sparkles },
  { id: 'researching', label: 'Researching', color: 'bg-purple-500', icon: FileText },
  { id: 'drafting', label: 'Drafting', color: 'bg-yellow-500', icon: FileText },
  { id: 'ready_to_submit', label: 'Ready to Submit', color: 'bg-orange-500', icon: Send },
  { id: 'awarded', label: 'Awarded', color: 'bg-green-500', icon: Award },
]

export default function Pipeline() {
  const queryClient = useQueryClient()
  const [selectedStage, setSelectedStage] = useState(null)
  const [processingId, setProcessingId] = useState(null)
  const [processingAll, setProcessingAll] = useState(false)

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['pipeline'],
    queryFn: () => pipelineApi.list()
  })

  const { data: summary = {} } = useQuery({
    queryKey: ['pipeline', 'summary'],
    queryFn: () => pipelineApi.summary()
  })

  const moveMutation = useMutation({
    mutationFn: ({ id, stage }) => pipelineApi.move(id, stage),
    onSuccess: () => queryClient.invalidateQueries(['pipeline'])
  })

  const getNextStage = (current) => {
    const idx = STAGES.findIndex(s => s.id === current)
    return idx < STAGES.length - 1 ? STAGES[idx + 1].id : null
  }

  const processItem = async (item) => {
    const nextStage = getNextStage(item.stage)
    if (!nextStage) return
    setProcessingId(item.id)
    await moveMutation.mutateAsync({ id: item.id, stage: nextStage })
    setProcessingId(null)
  }

  const processAll = async () => {
    setProcessingAll(true)
    const toProcess = items.filter(i => i.stage !== 'awarded' && i.stage !== 'ready_to_submit')
    for (const item of toProcess) {
      await processItem(item)
    }
    setProcessingAll(false)
  }

  const stageItems = selectedStage ? items.filter(i => i.stage === selectedStage) : items
  const remainingCount = items.filter(i => i.stage !== 'awarded' && i.stage !== 'ready_to_submit').length

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Zap className="w-8 h-8 text-yellow-500" />
          Grant Pipeline
        </h1>
        <p className="text-slate-600 mt-1">Track and manage your grant applications</p>
      </div>

      {/* Stage Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {STAGES.map(stage => {
          const count = summary[stage.id] || 0
          const Icon = stage.icon
          const isSelected = selectedStage === stage.id
          return (
            <button
              key={stage.id}
              onClick={() => setSelectedStage(isSelected ? null : stage.id)}
              className={`p-4 rounded-xl border-2 transition-all ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200 hover:border-slate-300'} bg-white`}
            >
              <div className={`w-10 h-10 rounded-lg ${stage.color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold text-slate-900">{count}</div>
                <div className="text-sm text-slate-500">{stage.label}</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => processItem(items.find(i => i.stage !== 'awarded' && i.stage !== 'ready_to_submit'))}
          disabled={remainingCount === 0 || processingAll}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Zap className="w-5 h-5" />
          Process Next ({remainingCount} remaining)
        </button>
        <button
          onClick={processAll}
          disabled={remainingCount === 0 || processingAll}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {processingAll ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
          Process All ({remainingCount})
        </button>
        <Link
          to="/grant-writer"
          className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <FileText className="w-5 h-5" />
          AI Grant Writer
        </Link>
      </div>

      {/* Selected Stage Label */}
      {selectedStage && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-lg font-medium">Showing:</span>
          <span className={`px-3 py-1 rounded-full text-white text-sm ${STAGES.find(s => s.id === selectedStage)?.color}`}>
            {STAGES.find(s => s.id === selectedStage)?.label}
          </span>
          <button onClick={() => setSelectedStage(null)} className="text-sm text-blue-600 hover:underline">Clear filter</button>
        </div>
      )}

      {/* Pipeline Items */}
      <div className="space-y-4">
        {stageItems.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Zap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No items in pipeline</h3>
            <p className="text-slate-500 mb-4">Use Smart Matcher to find and add opportunities</p>
            <Link to="/smart-matcher" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Sparkles className="w-4 h-4" />Go to Smart Matcher
            </Link>
          </div>
        ) : (
          stageItems.map(item => {
            const nextStage = getNextStage(item.stage)
            const currentStage = STAGES.find(s => s.id === item.stage)
            return (
              <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">{item.opportunity_title || 'Untitled Opportunity'}</h3>
                      <span className={`px-2 py-1 rounded text-xs text-white ${currentStage?.color}`}>{currentStage?.label}</span>
                      {item.confidence_score && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{Math.round(item.confidence_score)}% Match</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
                      {item.opportunity_sponsor && <span className="flex items-center gap-1"><Building className="w-4 h-4" />{item.opportunity_sponsor}</span>}
                      {item.amount_max && <span className="flex items-center gap-1"><DollarSign className="w-4 h-4" />Up to ${item.amount_max.toLocaleString()}</span>}
                      {item.opportunity_deadline && <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{new Date(item.opportunity_deadline).toLocaleDateString()}</span>}
                    </div>
                    <p className="text-sm text-slate-500">Organization: {item.organization_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {nextStage && (
                      <button
                        onClick={() => processItem(item)}
                        disabled={processingId === item.id}
                        className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                      >
                        {processingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                        Move to {STAGES.find(s => s.id === nextStage)?.label}
                      </button>
                    )}
                    <Link
                      to={`/grant-writer?item=${item.id}`}
                      className="flex items-center gap-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                    >
                      <FileText className="w-4 h-4" />
                      Write Grant
                    </Link>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
