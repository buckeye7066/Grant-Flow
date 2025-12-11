import React, { useState, useEffect, useRef } from 'react'
import { 
  Save, X, Upload, FileText, Image, Trash2, User, 
  Sparkles, Loader2, ChevronDown, ChevronRight, Camera
} from 'lucide-react'
import { profileSchema } from '../data/profileSchema'

export default function ProfileEditor({ profile, onSave, onCancel }) {
  const [formData, setFormData] = useState({})
  const [documents, setDocuments] = useState([])
  const [profilePicture, setProfilePicture] = useState(null)
  const [expandedSections, setExpandedSections] = useState({ basic: true })
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef(null)
  const pictureInputRef = useRef(null)

  useEffect(() => {
    if (profile) {
      const profileData = profile.profile_data ? 
        (typeof profile.profile_data === 'string' ? JSON.parse(profile.profile_data) : profile.profile_data) 
        : {}
      setFormData({
        name: profile.name || '',
        ...profileData
      })
      setDocuments(profileData._documents || [])
      setProfilePicture(profileData._profile_picture || null)
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
    const isImage = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png') || fileName.endsWith('.webp')

    if (!isPDF && !isImage) {
      alert('Please upload a PDF or image file (JPG, JPEG, PNG, WEBP)')
      return
    }

    setParsing(true)

    try {
      let content = ''
      let fileType = 'text'

      if (isImage) {
        // Convert image to base64
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.readAsDataURL(file)
        })
        content = base64
        fileType = 'image'
      } else {
        // Extract text from PDF using pdf.js
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

      // Send to AI for parsing
      const response = await fetch('/api/ai/parse-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, fileType, fileName: file.name })
      })

      const data = await response.json()

      if (data.parsed) {
        // Merge parsed data into form
        setFormData(prev => ({ ...prev, ...data.parsed }))
        
        // Add to documents list
        const newDoc = {
          id: Date.now(),
          name: file.name,
          type: isImage ? 'image' : 'pdf',
          uploadedAt: new Date().toISOString(),
          fieldsExtracted: Object.keys(data.parsed).length
        }
        setDocuments(prev => [...prev, newDoc])
        
        alert(`Extracted ${Object.keys(data.parsed).length} fields from ${file.name}`)
      } else {
        alert('Could not extract data from file')
      }
    } catch (err) {
      console.error('Upload error:', err)
      alert('Error processing file: ' + err.message)
    } finally {
      setParsing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.jpg') && !fileName.endsWith('.jpeg') && !fileName.endsWith('.png') && !fileName.endsWith('.webp')) {
      alert('Please upload an image file (JPG, JPEG, PNG, WEBP)')
      return
    }

    // Convert to base64
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
          _profile_picture: profilePicture
        }
      }
      await onSave(saveData)
    } catch (err) {
      console.error('Save error:', err)
      alert('Error saving profile')
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
        <label className="flex items-center gap-2 cursor-pointer">
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-white">
          <h2 className="text-xl font-bold text-slate-900">
            {profile?.id ? 'Edit Profile' : 'New Profile'}
          </h2>
          <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Profile Header with Picture */}
          <div className="flex items-start gap-6 mb-8 pb-6 border-b border-slate-200">
            {/* Profile Picture */}
            <div className="flex-shrink-0">
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
            </div>

            {/* Name and Upload */}
            <div className="flex-1">
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="Profile Name"
                className="text-2xl font-bold text-slate-900 border-0 border-b-2 border-transparent focus:border-blue-500 focus:ring-0 w-full pb-1 bg-transparent"
              />
              
              {/* Document Upload */}
              <div className="mt-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={parsing}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
                >
                  {parsing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload Document
                    </>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG - AI will extract profile data</p>
              </div>
            </div>
          </div>

          {/* Uploaded Documents List */}
          {documents.length > 0 && (
            <div className="mb-6 bg-slate-50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Uploaded Documents ({documents.length})
              </h3>
              <div className="space-y-2">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-200">
                    <div className="flex items-center gap-3">
                      {doc.type === 'image' ? (
                        <Image className="w-4 h-4 text-blue-500" />
                      ) : (
                        <FileText className="w-4 h-4 text-red-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-slate-900">{doc.name}</p>
                        <p className="text-xs text-slate-500">
                          {doc.fieldsExtracted} fields extracted • {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeDocument(doc.id)}
                      className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Profile Sections */}
          <div className="space-y-4">
            {profileSchema.map(section => (
              <div key={section.id} className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{section.icon}</span>
                    <span className="font-medium text-slate-900">{section.title}</span>
                  </div>
                  {expandedSections[section.id] ? (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  )}
                </button>

                {expandedSections[section.id] && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Profile
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}