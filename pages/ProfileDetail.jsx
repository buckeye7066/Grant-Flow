import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Save, Upload, FileText, Image, Trash2, User, Camera,
  Sparkles, Loader2, ChevronDown, ChevronRight, X, Check, AlertCircle
} from 'lucide-react'
import { organizationsApi } from '../api/client'
import { profileSchema } from '../data/profileSchema'

export default function ProfileDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [formData, setFormData] = useState({})
  const [documents, setDocuments] = useState([])
  const [profilePicture, setProfilePicture] = useState(null)
  const [expandedSections, setExpandedSections] = useState({})
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [extractedData, setExtractedData] = useState(null)
  const [showExtracted, setShowExtracted] = useState(false)
  const [billingData, setBillingData] = useState({
    subscription_tier: 'hope',
    client_category: 'individual',
    billing_status: 'active',
    ministry_discount: '',
    hardship_discount: '',
    grace_period: 'none',
    pro_bono: false,
    billing_notes: ''
  })
  
  const fileInputRef = useRef(null)
  const pictureInputRef = useRef(null)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['organization', id],
    queryFn: () => organizationsApi.get(id),
    enabled: !!id && id !== 'new'
  })

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (id === 'new') {
        return organizationsApi.create(data)
      }
      return organizationsApi.update(id, data)
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['organization', id])
      queryClient.invalidateQueries(['organizations'])
      if (id === 'new' && result?.id) {
        navigate(`/profile/${result.id}`)
      }
    }
  })

  useEffect(() => {
    if (profile) {
      let profileData = {}
      if (profile.profile_data) {
        try {
          profileData = typeof profile.profile_data === 'string' 
            ? JSON.parse(profile.profile_data) 
            : profile.profile_data
        } catch (e) {
          console.error('Parse error:', e)
        }
      }
      
      setFormData({
        name: profile.name || '',
        ...profileData
      })
      setDocuments(profileData._documents || [])
      setProfilePicture(profileData._profile_picture || null)
      
      // Load billing data
      setBillingData({
        subscription_tier: profileData._billing?.subscription_tier || 'hope',
        client_category: profileData._billing?.client_category || 'individual',
        billing_status: profileData._billing?.billing_status || 'active',
        ministry_discount: profileData._billing?.ministry_discount || '',
        hardship_discount: profileData._billing?.hardship_discount || '',
        grace_period: profileData._billing?.grace_period || 'none',
        pro_bono: profileData._billing?.pro_bono || false,
        billing_notes: profileData._billing?.billing_notes || ''
      })
    }
  }, [profile])

  const handleFieldChange = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }))
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const fileName = file.name.toLowerCase()
    const isPDF = fileName.endsWith('.pdf')
    const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName)

    if (!isPDF && !isImage) {
      alert('Please upload a PDF or image file (JPG, JPEG, PNG, WEBP)')
      return
    }

    setParsing(true)
    setExtractedData(null)
    setShowExtracted(true)

    try {
      let content = ''
      let fileType = 'text'

      if (isImage) {
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.readAsDataURL(file)
        })
        content = base64
        fileType = 'image'
      } else {
        const arrayBuffer = await file.arrayBuffer()
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
        
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        let text = ''
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const textContent = await page.getTextContent()
          text += textContent.items.map(item => item.str).join(' ') + '\n'
        }
        content = text
        fileType = 'text'
      }

      const response = await fetch('/api/ai/parse-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, fileType, fileName: file.name })
      })

      const data = await response.json()
      console.log('Parse response:', data)

      if (data.parsed && Object.keys(data.parsed).length > 0) {
        setExtractedData({
          fileName: file.name,
          fileType: isImage ? 'image' : 'pdf',
          fields: data.parsed
        })
      } else {
        setExtractedData({
          fileName: file.name,
          fileType: isImage ? 'image' : 'pdf',
          fields: {},
          error: 'No data could be extracted'
        })
      }
    } catch (err) {
      console.error('Upload error:', err)
      setExtractedData({
        fileName: file.name,
        fields: {},
        error: err.message
      })
    } finally {
      setParsing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const applyExtractedData = () => {
    if (extractedData?.fields) {
      setFormData(prev => ({ ...prev, ...extractedData.fields }))
      
      const newDoc = {
        id: Date.now(),
        name: extractedData.fileName,
        type: extractedData.fileType,
        uploadedAt: new Date().toISOString(),
        fieldsExtracted: Object.keys(extractedData.fields).length
      }
      setDocuments(prev => [...prev, newDoc])
    }
    setShowExtracted(false)
    setExtractedData(null)
  }

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!/\.(jpg|jpeg|png|webp)$/i.test(file.name)) {
      alert('Please upload an image file (JPG, JPEG, PNG, WEBP)')
      return
    }

    const base64 = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.readAsDataURL(file)
    })

    setProfilePicture(base64)
  }

  const removeDocument = (docId) => {
    setDocuments(prev => prev.filter(d => d.id !== docId))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const saveData = {
        name: formData.name || 'Untitled Profile',
        profile_data: {
          ...formData,
          _documents: documents,
          _profile_picture: profilePicture,
          _billing: billingData
        }
      }
      await saveMutation.mutateAsync(saveData)
      alert('Profile saved!')
    } catch (err) {
      console.error('Save error:', err)
      alert('Error saving profile')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveBilling = async () => {
    setSaving(true)
    try {
      const currentProfileData = profile?.profile_data 
        ? (typeof profile.profile_data === 'string' ? JSON.parse(profile.profile_data) : profile.profile_data)
        : {}
      
      const saveData = {
        name: profile?.name || formData.name || 'Untitled Profile',
        profile_data: {
          ...currentProfileData,
          ...formData,
          _documents: documents,
          _profile_picture: profilePicture,
          _billing: billingData
        }
      }
      await saveMutation.mutateAsync(saveData)
      alert('Billing settings saved!')
    } catch (err) {
      console.error('Save error:', err)
      alert('Error saving billing settings')
    } finally {
      setSaving(false)
    }
  }

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  const renderField = (field) => {
    const value = formData[field.id] ?? ''

    if (field.type === 'select') {
      return (
        <select
          value={value}
          onChange={(e) => handleFieldChange(field.id, e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Select...</option>
          {field.options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )
    }

    if (field.type === 'checkbox') {
      return (
        <label className="flex items-center gap-2 cursor-pointer bg-slate-100 px-3 py-2 rounded-lg">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => handleFieldChange(field.id, e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700">{field.label}</span>
        </label>
      )
    }

    if (field.type === 'textarea') {
      return (
        <textarea
          value={value}
          onChange={(e) => handleFieldChange(field.id, e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      )
    }

    return (
      <input
        type={field.type || 'text'}
        value={value}
        onChange={(e) => handleFieldChange(field.id, e.target.value)}
        placeholder={field.placeholder}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      />
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/profiles')} className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">
            {id === 'new' ? 'New Profile' : (profile?.name || 'Profile')}
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Profile
        </button>
      </div>

      {/* Profile Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-start gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
              {profilePicture ? (
                <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-slate-400" />
              )}
            </div>
            <button
              onClick={() => pictureInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={pictureInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handleProfilePictureUpload}
              className="hidden"
            />
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="Profile Name"
              className="text-2xl font-bold text-slate-900 border-0 border-b-2 border-transparent focus:border-blue-500 focus:ring-0 w-full pb-1 bg-transparent"
            />
            <p className="text-slate-500 mt-1">
              {documents.length} documents uploaded • Created {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Today'}
            </p>
          </div>
        </div>
      </div>

      {/* Billing Section */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 mb-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">Billing and Subscription</h2>
            <p className="text-purple-200">Admin Controls</p>
          </div>
          <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium uppercase">
            {billingData.subscription_tier}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm text-purple-200 mb-1">Subscription Tier</label>
            <select
              value={billingData.subscription_tier}
              onChange={(e) => setBillingData(prev => ({ ...prev, subscription_tier: e.target.value }))}
              className="w-full px-3 py-2 bg-white text-slate-900 rounded-lg"
            >
              <option value="hope">Hope</option>
              <option value="faith">Faith</option>
              <option value="grace">Grace</option>
              <option value="glory">Glory</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-purple-200 mb-1">Ministry Discount (%)</label>
            <input
              type="number"
              value={billingData.ministry_discount}
              onChange={(e) => setBillingData(prev => ({ ...prev, ministry_discount: e.target.value }))}
              placeholder="e.g., 15"
              className="w-full px-3 py-2 bg-white text-slate-900 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm text-purple-200 mb-1">Client Category</label>
            <select
              value={billingData.client_category}
              onChange={(e) => setBillingData(prev => ({ ...prev, client_category: e.target.value }))}
              className="w-full px-3 py-2 bg-white text-slate-900 rounded-lg"
            >
              <option value="individual">Individual</option>
              <option value="nonprofit">Nonprofit</option>
              <option value="church">Church</option>
              <option value="business">Business</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-purple-200 mb-1">Hardship Discount (%)</label>
            <input
              type="number"
              value={billingData.hardship_discount}
              onChange={(e) => setBillingData(prev => ({ ...prev, hardship_discount: e.target.value }))}
              placeholder="e.g., 25"
              className="w-full px-3 py-2 bg-white text-slate-900 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm text-purple-200 mb-1">Billing Status</label>
            <select
              value={billingData.billing_status}
              onChange={(e) => setBillingData(prev => ({ ...prev, billing_status: e.target.value }))}
              className="w-full px-3 py-2 bg-white text-slate-900 rounded-lg"
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
              <option value="trial">Trial</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-purple-200 mb-1">Grace Period</label>
            <select
              value={billingData.grace_period}
              onChange={(e) => setBillingData(prev => ({ ...prev, grace_period: e.target.value }))}
              className="w-full px-3 py-2 bg-white text-slate-900 rounded-lg"
            >
              <option value="none">None</option>
              <option value="7days">7 Days</option>
              <option value="14days">14 Days</option>
              <option value="30days">30 Days</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="flex items-center gap-2 cursor-pointer bg-white/10 px-4 py-3 rounded-lg">
            <input
              type="checkbox"
              checked={billingData.pro_bono}
              onChange={(e) => setBillingData(prev => ({ ...prev, pro_bono: e.target.checked }))}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="font-medium">Pro Bono Client</span>
          </label>
        </div>

        <div className="mt-4">
          <label className="block text-sm text-purple-200 mb-1">Billing Notes (Admin Only)</label>
          <textarea
            value={billingData.billing_notes}
            onChange={(e) => setBillingData(prev => ({ ...prev, billing_notes: e.target.value }))}
            placeholder="Internal notes..."
            rows={3}
            className="w-full px-3 py-2 bg-white text-slate-900 rounded-lg"
          />
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSaveBilling}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 font-medium"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Billing Settings
          </button>
        </div>
      </div>

      {/* Document Uploader */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-xl p-6 mb-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Upload className="w-6 h-6" />
          <div>
            <h2 className="text-xl font-bold">Document Uploader</h2>
            <p className="text-green-200">Upload documents to auto-fill profile fields</p>
          </div>
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          className="bg-white rounded-xl p-8 text-center cursor-pointer hover:bg-slate-50 transition-colors"
        >
          <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-900 font-medium">Drag & drop files or click to browse</p>
          <p className="text-slate-500 text-sm">PDF, Word, Images, Text (max 10MB each)</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.gif"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Extracted Data Preview */}
        {showExtracted && (
          <div className="mt-4 bg-white rounded-xl p-4 text-slate-900">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {extractedData?.fileType === 'image' ? (
                  <Image className="w-5 h-5 text-blue-500" />
                ) : (
                  <FileText className="w-5 h-5 text-red-500" />
                )}
                <span className="font-medium">{extractedData?.fileName || 'Processing...'}</span>
              </div>
              {!parsing && extractedData && (
                <Check className="w-5 h-5 text-green-500" />
              )}
            </div>

            <div className="bg-slate-50 rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span className="font-medium text-sm">Extracted Data</span>
                </div>
                <span className="text-sm text-green-600">
                  {parsing ? 'Processing...' : `${Object.keys(extractedData?.fields || {}).length} fields found`}
                </span>
              </div>

              {parsing ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                </div>
              ) : extractedData?.error ? (
                <div className="flex items-center gap-2 text-red-600 py-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{extractedData.error}</span>
                </div>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {Object.entries(extractedData?.fields || {}).map(([key, value]) => (
                    <div key={key} className="text-xs flex">
                      <span className="text-slate-500 w-32 flex-shrink-0">{key}:</span>
                      <span className="text-slate-900 truncate">{String(value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={applyExtractedData}
                disabled={parsing || !extractedData?.fields || Object.keys(extractedData.fields).length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                Apply to Profile
              </button>
              <button
                onClick={() => { setShowExtracted(false); setExtractedData(null) }}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Documents List */}
        {documents.length > 0 && !showExtracted && (
          <div className="mt-4 bg-white/10 rounded-xl p-4">
            <h3 className="font-medium mb-3">Uploaded Documents ({documents.length})</h3>
            <div className="space-y-2">
              {documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-3">
                    {doc.type === 'image' ? (
                      <Image className="w-4 h-4" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{doc.name}</p>
                      <p className="text-xs text-green-200">
                        {doc.fieldsExtracted} fields • {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeDocument(doc.id)}
                    className="p-1 hover:bg-white/20 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Profile Sections */}
      <div className="space-y-4">
        {profileSchema.map((section, sectionIndex) => (
          <div key={section.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">
                  {sectionIndex + 1}
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-slate-900">{section.title}</h3>
                  <p className="text-sm text-slate-500">{section.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded">
                  N/A
                </button>
                <button className="flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200">
                  <Sparkles className="w-3 h-3" />
                  AI Assist
                </button>
                {expandedSections[section.id] ? (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </button>

            {expandedSections[section.id] && (
              <div className="p-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                {section.fields.map(field => (
                  <div key={field.id} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                    {field.type !== 'checkbox' && (
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {field.label}
                      </label>
                    )}
                    {renderField(field)}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}