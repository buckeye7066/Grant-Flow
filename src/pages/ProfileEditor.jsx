import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Save, Sparkles, ChevronDown, ChevronRight, Upload, FileText,
  Trash2, Download, AlertTriangle, CheckCircle2, Loader2,
  X, Eye, Shield, MessageSquare, MinusCircle, Check
} from 'lucide-react'
import { organizationsApi, aiApi } from '../api/client'
import { PROFILE_SECTIONS } from '../data/profileSchema'
import { useAuth } from '../context/AuthContext'
import BillingManagement from '../components/BillingManagement'
import DocumentUploader from '../components/DocumentUploader'

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

function SectionHeader({ section, index, isExpanded, onToggle, onAiAssist, isAssisting, completionStatus, onMarkNA }) {
  return (
    <div className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
      <button
        onClick={onToggle}
        className="flex items-center gap-3 flex-1 text-left"
      >
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          completionStatus === 'complete' ? 'bg-green-100' :
          completionStatus === 'na' ? 'bg-slate-100' :
          completionStatus === 'partial' ? 'bg-amber-100' :
          'bg-blue-100'
        }`}>
          {completionStatus === 'complete' ? (
            <Check className="w-5 h-5 text-green-600" />
          ) : completionStatus === 'na' ? (
            <MinusCircle className="w-5 h-5 text-slate-400" />
          ) : (
            <span className={`font-semibold ${
              completionStatus === 'partial' ? 'text-amber-600' : 'text-blue-600'
            }`}>{index + 1}</span>
          )}
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            {section.title}
            {completionStatus === 'na' && (
              <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">N/A</span>
            )}
          </h3>
          <p className="text-sm text-slate-500">{section.description}</p>
        </div>
      </button>

      <div className="flex items-center gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onMarkNA(); }}
          className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-all ${
            completionStatus === 'na'
              ? 'bg-slate-200 text-slate-700'
              : 'border border-slate-300 text-slate-500 hover:bg-slate-100'
          }`}
          title="Mark as Not Applicable"
        >
          <MinusCircle className="w-4 h-4" />
          N/A
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onAiAssist(); }}
          disabled={isAssisting || completionStatus === 'na'}
          className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm flex items-center gap-1 hover:bg-purple-700 disabled:opacity-50"
        >
          {isAssisting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          AI Assist
        </button>

        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-slate-400" />
        )}
      </div>
    </div>
  )
}

function ProfileField({ field, value, onChange, onAiAssist, isAssisting, disabled }) {
  const id = `field-${field.id}`

  const renderInput = () => {
    const baseClass = `w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
      disabled ? 'bg-slate-100 text-slate-500' : ''
    }`

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            id={id}
            value={value || ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={field.rows || 3}
            disabled={disabled}
            className={baseClass}
          />
        )

      case 'select':
        return (
          <select
            id={id}
            value={value || ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            disabled={disabled}
            className={baseClass}
          >
            <option value="">Select...</option>
            {field.options?.map(opt => (
              <option key={opt.value || opt} value={opt.value || opt}>
                {opt.label || opt}
              </option>
            ))}
          </select>
        )

      case 'checkbox':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => onChange(field.id, e.target.checked)}
              disabled={disabled}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className={`text-sm ${disabled ? 'text-slate-400' : 'text-slate-600'}`}>
              {field.checkboxLabel || field.label}
            </span>
          </label>
        )

      case 'number':
        return (
          <input
            id={id}
            type="number"
            value={value || ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            step={field.step}
            disabled={disabled}
            className={baseClass}
          />
        )

      case 'date':
        return (
          <input
            id={id}
            type="date"
            value={value || ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            disabled={disabled}
            className={baseClass}
          />
        )

      default:
        return (
          <input
            id={id}
            type={field.type || 'text'}
            value={value || ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            className={baseClass}
          />
        )
    }
  }

  if (field.type === 'checkbox') {
    return <div className="py-1">{renderInput()}</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={id} className={`block text-sm font-medium ${disabled ? 'text-slate-400' : 'text-slate-700'}`}>
          {field.label}
          {field.required && !disabled && <span className="text-red-500 ml-1">*</span>}
        </label>
        {field.aiAssist && onAiAssist && !disabled && (
          <button
            onClick={() => onAiAssist(field)}
            disabled={isAssisting}
            className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
          >
            {isAssisting ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />}
            Ask Anya
          </button>
        )}
      </div>
      {renderInput()}
      {field.help && <p className="text-xs text-slate-500 mt-1">{field.help}</p>}
    </div>
  )
}

export default function ProfileEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isAdmin } = useAuth()
  const isNew = id === 'new'

  const [formData, setFormData] = useState({})
  const [expandedSections, setExpandedSections] = useState({ 0: true })
  const [sectionStatus, setSectionStatus] = useState({})
  const [saveStatus, setSaveStatus] = useState('saved')
  const [assistingField, setAssistingField] = useState(null)
  const [initialLoadDone, setInitialLoadDone] = useState(false)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['organization', id],
    queryFn: () => organizationsApi.get(id),
    enabled: !isNew
  })

  useEffect(() => {
    if (profile && !initialLoadDone) {
      let profileData = {}
      if (profile.profile_data) {
        try { profileData = JSON.parse(profile.profile_data) } catch {}
      }
      setFormData({ ...profile, ...profileData })

      if (profileData._sectionStatus) {
        setSectionStatus(profileData._sectionStatus)
      }
      setInitialLoadDone(true)
    }
  }, [profile, initialLoadDone])

  const getSectionCompletion = (section) => {
    if (sectionStatus[section.id] === 'na') return 'na'

    const fields = section.fields || []
    const filledCount = fields.filter(f => {
      const val = formData[f.id]
      return val !== undefined && val !== '' && val !== null
    }).length

    if (filledCount === 0) return 'empty'
    if (filledCount === fields.length) return 'complete'
    return 'partial'
  }

  const getOverallCompletion = () => {
    let completed = 0
    let total = PROFILE_SECTIONS.length

    PROFILE_SECTIONS.forEach(section => {
      const status = getSectionCompletion(section)
      if (status === 'complete' || status === 'na') completed++
    })

    return Math.round((completed / total) * 100)
  }

  const debouncedFormData = useDebounce(formData, 2000)

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const baseFields = ['name', 'email', 'phone', 'website', 'address', 'city', 'state', 'zip',
                         'organization_type', 'profile_type', 'mission', 'focus_areas', 'keywords']

      const baseData = {}
      const profileData = { _sectionStatus: sectionStatus }

      for (const [key, value] of Object.entries(data)) {
        if (baseFields.includes(key)) {
          baseData[key] = value
        } else if (key !== 'id' && key !== 'created_at' && key !== 'updated_at' && !key.startsWith('_')) {
          profileData[key] = value
        }
      }

      baseData.profile_data = JSON.stringify(profileData)

      if (isNew) {
        return organizationsApi.create(baseData)
      } else {
        return organizationsApi.update(id, baseData)
      }
    },
    onSuccess: (result) => {
      setSaveStatus('saved')
      queryClient.invalidateQueries(['organization', id])
      queryClient.invalidateQueries(['organizations'])
      if (isNew && result?.id) {
        navigate(`/profile/${result.id}`, { replace: true })
      }
    },
    onError: () => setSaveStatus('error')
  })

  useEffect(() => {
    if (Object.keys(debouncedFormData).length > 0 && debouncedFormData.name) {
      setSaveStatus('saving')
      saveMutation.mutate(debouncedFormData)
    }
  }, [debouncedFormData, sectionStatus])

  const handleSave = () => {
    if (formData.name) {
      setSaveStatus('saving')
      saveMutation.mutate(formData)
    }
  }

  const handleFieldChange = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }))
    setSaveStatus('unsaved')
  }

  const toggleSection = (index) => {
    setExpandedSections(prev => ({ ...prev, [index]: !prev[index] }))
  }

  const handleMarkNA = (sectionId) => {
    setSectionStatus(prev => ({
      ...prev,
      [sectionId]: prev[sectionId] === 'na' ? null : 'na'
    }))
    setSaveStatus('unsaved')
  }

  const handleSectionAiAssist = async (section) => {
    setAssistingField(`section-${section.id}`)
    try {
      const result = await aiApi.autofillSection({
        organizationId: id,
        sectionId: section.id,
        currentData: formData,
        fillAll: true
      })

      if (result?.fields) {
        setFormData(prev => ({ ...prev, ...result.fields }))
        setSaveStatus('unsaved')
      }
    } catch (err) {
      console.error('Section AI assist error:', err)
    }
    setAssistingField(null)
  }

  const handleFieldAiAssist = async (field, section) => {
    setAssistingField(field.id)
    try {
      const result = await aiApi.autofillSection({
        organizationId: id,
        sectionId: section.id,
        fieldId: field.id,
        currentData: formData,
        fieldLabel: field.label
      })

      if (result?.value) {
        handleFieldChange(field.id, result.value)
      }
    } catch (err) {
      console.error('AI assist error:', err)
    }
    setAssistingField(null)
  }

  const expandAllSections = () => {
    const allExpanded = {}
    PROFILE_SECTIONS.forEach((_, index) => {
      allExpanded[index] = true
    })
    setExpandedSections(allExpanded)
  }

  if (isLoading && !isNew) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const completion = getOverallCompletion()

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {isNew ? 'Create New Profile' : formData.name || 'Edit Profile'}
          </h1>
          <p className="text-slate-600 mt-1">
            {isNew ? 'Fill out the sections below' : 'Click sections to expand and edit'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right mr-2">
            <div className="text-sm text-slate-500">Profile Completion</div>
            <div className="text-2xl font-bold" style={{
              color: completion === 100 ? '#10B981' : completion >= 60 ? '#F59E0B' : '#6366F1'
            }}>
              {completion}%
            </div>
          </div>

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
            saveStatus === 'saved' ? 'bg-green-100 text-green-700' :
            saveStatus === 'saving' ? 'bg-blue-100 text-blue-700' :
            saveStatus === 'error' ? 'bg-red-100 text-red-700' :
            'bg-amber-100 text-amber-700'
          }`}>
            {saveStatus === 'saved' && <CheckCircle2 className="w-4 h-4" />}
            {saveStatus === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
            {saveStatus === 'error' && <AlertTriangle className="w-4 h-4" />}
            {saveStatus === 'unsaved' && <AlertTriangle className="w-4 h-4" />}
            <span className="capitalize">{saveStatus}</span>
          </div>

          <button
            onClick={handleSave}
            disabled={saveMutation.isPending || !formData.name}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${completion}%`,
              background: completion === 100 ? '#10B981' : 'linear-gradient(90deg, #6366F1, #8B5CF6)'
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>{PROFILE_SECTIONS.filter(s => getSectionCompletion(s) === 'complete' || getSectionCompletion(s) === 'na').length} of {PROFILE_SECTIONS.length} sections complete</span>
          <span>{completion === 100 ? '✓ Profile Complete!' : `${100 - completion}% remaining`}</span>
        </div>
      </div>

      {!isNew && (
        <div className="mb-6">
          <BillingManagement
            clientId={id}
            isAdmin={isAdmin}
          />
        </div>
      )}

      {!isNew && (
        <div className="mb-6">
          <DocumentUploader
            organizationId={id}
            onDataExtracted={(data) => {
              setFormData(prev => {
                const updated = { ...prev };
                Object.entries(data).forEach(([key, value]) => {
                  if (value && !prev[key]) {
                    updated[key] = value;
                  }
                });
                return updated;
              });
              setSaveStatus('unsaved');
              expandAllSections();
            }}
          />
        </div>
      )}

      <div className="space-y-4">
        {PROFILE_SECTIONS.map((section, index) => {
          const completionStatus = getSectionCompletion(section)
          const isNA = completionStatus === 'na'

          return (
            <div key={section.id} className={`bg-white rounded-xl border overflow-hidden ${
              isNA ? 'border-slate-200 bg-slate-50' : 'border-slate-200'
            }`}>
              <SectionHeader
                section={section}
                index={index}
                isExpanded={expandedSections[index]}
                onToggle={() => toggleSection(index)}
                onAiAssist={() => handleSectionAiAssist(section)}
                isAssisting={assistingField === `section-${section.id}`}
                completionStatus={completionStatus}
                onMarkNA={() => handleMarkNA(section.id)}
              />

              {expandedSections[index] && (
                <div className={`p-4 pt-0 border-t border-slate-100 ${isNA ? 'opacity-50' : ''}`}>
                  {isNA && (
                    <div className="mb-4 p-3 bg-slate-100 rounded-lg text-sm text-slate-600 flex items-center gap-2">
                      <MinusCircle className="w-4 h-4" />
                      This section is marked as Not Applicable. Click the N/A button again to enable editing.
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-4 pt-4">
                    {section.fields?.map(field => (
                      <div key={field.id} className={field.fullWidth ? 'md:col-span-2' : ''}>
                        <ProfileField
                          field={field}
                          value={formData[field.id]}
                          onChange={handleFieldChange}
                          onAiAssist={() => handleFieldAiAssist(field, section)}
                          isAssisting={assistingField === field.id}
                          disabled={isNA}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}