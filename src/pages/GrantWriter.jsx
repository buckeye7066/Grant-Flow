import React, { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { FileText, Sparkles, Loader2, Download, Copy, CheckCircle2, Building, RefreshCw } from 'lucide-react'
import { pipelineApi, organizationsApi, opportunitiesApi, aiApi } from '../api/client'

const SECTIONS = [
  { id: 'executive_summary', label: 'Executive Summary' },
  { id: 'statement_of_need', label: 'Statement of Need' },
  { id: 'project_description', label: 'Project Description' },
  { id: 'goals_objectives', label: 'Goals & Objectives' },
  { id: 'methodology', label: 'Methodology' },
  { id: 'evaluation_plan', label: 'Evaluation Plan' },
  { id: 'budget_narrative', label: 'Budget Narrative' },
  { id: 'sustainability', label: 'Sustainability Plan' },
]

export default function GrantWriter() {
  const [searchParams] = useSearchParams()
  const itemId = searchParams.get('item')
  
  const [selectedItem, setSelectedItem] = useState(itemId || '')
  const [selectedSection, setSelectedSection] = useState('executive_summary')
  const [generatedContent, setGeneratedContent] = useState({})
  const [copied, setCopied] = useState(false)

  const { data: pipelineItems = [] } = useQuery({
    queryKey: ['pipeline'],
    queryFn: () => pipelineApi.list()
  })

  const { data: currentItem } = useQuery({
    queryKey: ['pipeline', selectedItem],
    queryFn: () => pipelineApi.get(selectedItem),
    enabled: !!selectedItem
  })

  const { data: organization } = useQuery({
    queryKey: ['organizations', currentItem?.organization_id],
    queryFn: () => organizationsApi.get(currentItem.organization_id),
    enabled: !!currentItem?.organization_id
  })

  const { data: opportunity } = useQuery({
    queryKey: ['opportunities', currentItem?.opportunity_id],
    queryFn: () => opportunitiesApi.get(currentItem.opportunity_id),
    enabled: !!currentItem?.opportunity_id
  })

  const generateMutation = useMutation({
    mutationFn: async ({ section }) => {
      const response = await aiApi.generateGrantSection({
        organization,
        opportunity,
        section,
        existingContent: generatedContent
      })
      return { section, content: response.content }
    },
    onSuccess: ({ section, content }) => {
      setGeneratedContent(prev => ({ ...prev, [section]: content }))
    }
  })

  const generateAllMutation = useMutation({
    mutationFn: async () => {
      const results = {}
      for (const section of SECTIONS) {
        const response = await aiApi.generateGrantSection({
          organization,
          opportunity,
          section: section.id,
          existingContent: results
        })
        results[section.id] = response.content
        setGeneratedContent(prev => ({ ...prev, [section.id]: response.content }))
      }
      return results
    }
  })

  const handleCopy = () => {
    const content = generatedContent[selectedSection] || ''
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    let fullDoc = `# Grant Application\n## ${opportunity?.title || 'Grant'}\n### ${organization?.name || 'Organization'}\n\n`
    SECTIONS.forEach(s => {
      if (generatedContent[s.id]) {
        fullDoc += `## ${s.label}\n\n${generatedContent[s.id]}\n\n---\n\n`
      }
    })
    const blob = new Blob([fullDoc], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `grant-${(opportunity?.title || 'application').slice(0,30).replace(/[^a-z0-9]/gi, '-')}.md`
    a.click()
  }

  useEffect(() => {
    if (itemId) setSelectedItem(itemId)
  }, [itemId])

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <FileText className="w-8 h-8 text-purple-600" />
          AI Grant Writer
        </h1>
        <p className="text-slate-600 mt-1">Generate MBA-level grant applications with AI</p>
      </div>

      {/* Pipeline Item Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Select Pipeline Item</label>
        <select
          value={selectedItem}
          onChange={(e) => { setSelectedItem(e.target.value); setGeneratedContent({}) }}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg"
        >
          <option value="">Choose a pipeline item...</option>
          {pipelineItems.map(item => (
            <option key={item.id} value={item.id}>
              {item.opportunity_title} - {item.organization_name}
            </option>
          ))}
        </select>
      </div>

      {currentItem && organization && opportunity && (
        <>
          {/* Context Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                Organization Profile
              </h3>
              <div className="space-y-2 text-sm">
                <p><strong>Name:</strong> {organization.name}</p>
                <p><strong>Mission:</strong> {organization.mission}</p>
                {organization.focus_areas && (
                  <div><strong>Focus Areas:</strong>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(Array.isArray(organization.focus_areas) ? organization.focus_areas : []).map((a,i) => (
                        <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{a}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-600" />
                Funding Opportunity
              </h3>
              <div className="space-y-2 text-sm">
                <p><strong>Title:</strong> {opportunity.title}</p>
                <p><strong>Sponsor:</strong> {opportunity.sponsor}</p>
                {opportunity.amount_max && <p><strong>Amount:</strong> Up to ${opportunity.amount_max.toLocaleString()}</p>}
                {opportunity.deadline && <p><strong>Deadline:</strong> {new Date(opportunity.deadline).toLocaleDateString()}</p>}
                {opportunity.description && <p><strong>Description:</strong> {opportunity.description.slice(0, 200)}...</p>}
              </div>
            </div>
          </div>

          {/* Generate All Button */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => generateAllMutation.mutate()}
              disabled={generateAllMutation.isPending}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {generateAllMutation.isPending ? (
                <><Loader2 className="w-5 h-5 animate-spin" />Generating All Sections...</>
              ) : (
                <><Sparkles className="w-5 h-5" />Generate Complete Grant</>
              )}
            </button>
            {Object.keys(generatedContent).length > 0 && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download className="w-5 h-5" />Download Full Grant
              </button>
            )}
          </div>

          {/* Section Tabs */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex overflow-x-auto border-b border-slate-200">
              {SECTIONS.map(section => (
                <button
                  key={section.id}
                  onClick={() => setSelectedSection(section.id)}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    selectedSection === section.id
                      ? 'border-purple-600 text-purple-600 bg-purple-50'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {generatedContent[section.id] && <CheckCircle2 className="w-3 h-3 inline mr-1 text-green-600" />}
                  {section.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{SECTIONS.find(s => s.id === selectedSection)?.label}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => generateMutation.mutate({ section: selectedSection })}
                    disabled={generateMutation.isPending}
                    className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
                  >
                    {generateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {generatedContent[selectedSection] ? 'Regenerate' : 'Generate'}
                  </button>
                  {generatedContent[selectedSection] && (
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm"
                    >
                      {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  )}
                </div>
              </div>

              {generatedContent[selectedSection] ? (
                <div className="prose max-w-none">
                  <div className="bg-slate-50 rounded-lg p-4 whitespace-pre-wrap text-sm leading-relaxed">
                    {generatedContent[selectedSection]}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-lg p-12 text-center">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Click "Generate" to create this section</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!selectedItem && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Select a Pipeline Item</h3>
          <p className="text-slate-500">Choose a grant opportunity from your pipeline to start writing</p>
        </div>
      )}
    </div>
  )
}
