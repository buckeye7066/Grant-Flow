import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  UserPlus, Sparkles, DollarSign, Gift, Heart, Tag, Package,
  ChevronDown, ChevronRight, Loader2, Check, X, Wand2, FileText,
  Building2, User, GraduationCap, Users as UsersIcon
} from 'lucide-react'
import { clientsApi, organizationsApi, aiApi } from '../api/client'
import { SERVICES, CLIENT_CATEGORIES } from '../data/serviceTiers'

// Profile type options
const PROFILE_TYPES = [
  { id: 'nonprofit', name: 'Nonprofit Organization', icon: Building2, color: 'blue' },
  { id: 'individual', name: 'Individual', icon: User, color: 'green' },
  { id: 'student', name: 'Student', icon: GraduationCap, color: 'purple' },
  { id: 'small_business', name: 'Small Business', icon: Building2, color: 'amber' },
  { id: 'family', name: 'Family/Household', icon: UsersIcon, color: 'pink' },
]

// Add-on services
const ADD_ONS = [
  { id: 'priority_support', name: 'Priority Support', price: 150, description: '24/7 email support with 4-hour response' },
  { id: 'monthly_check_in', name: 'Monthly Check-in Call', price: 200, description: '30-minute strategy call each month' },
  { id: 'deadline_alerts', name: 'Deadline Alert Service', price: 50, description: 'SMS/email alerts for upcoming deadlines' },
  { id: 'document_review', name: 'Document Review Package', price: 300, description: 'Review of 5 supporting documents' },
  { id: 'budget_prep', name: 'Budget Preparation', price: 250, description: 'Professional budget creation assistance' },
  { id: 'letter_support', name: 'Letter of Support Package', price: 175, description: 'Help obtaining 3 letters of support' },
]

// Discount presets
const DISCOUNT_PRESETS = [
  { id: 'none', name: 'No Discount', percent: 0 },
  { id: 'new_client', name: 'New Client (10%)', percent: 10 },
  { id: 'referral', name: 'Referral (15%)', percent: 15 },
  { id: 'returning', name: 'Returning Client (20%)', percent: 20 },
  { id: 'hardship', name: 'Hardship (25%)', percent: 25 },
  { id: 'nonprofit_special', name: 'Nonprofit Special (30%)', percent: 30 },
  { id: 'custom', name: 'Custom Discount', percent: null },
]

export default function AdminCreateProfile({ onClose, onCreated }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [step, setStep] = useState(1)
  const [parsing, setParsing] = useState(false)
  const [rawInput, setRawInput] = useState('')
  const [parsedData, setParsedData] = useState(null)
  
  // Form state
  const [formData, setFormData] = useState({
    // Client info
    name: '',
    email: '',
    phone: '',
    organization_name: '',
    
    // Billing
    client_category: 'small_org',
    profile_type: 'nonprofit',
    pro_bono: false,
    hardship_flag: false,
    
    // Services
    selected_services: [],
    add_ons: [],
    
    // Discount
    discount_type: 'none',
    discount_percent: 0,
    discount_reason: '',
    
    // Notes
    billing_notes: '',
    internal_notes: ''
  })

  // Calculate pricing
  const calculatePricing = () => {
    let subtotal = 0
    
    // Services
    formData.selected_services.forEach(serviceId => {
      const service = SERVICES[serviceId]
      if (service) {
        const pricing = service.pricing?.[formData.client_category]
        subtotal += pricing?.base || pricing?.min || 0
      }
    })
    
    // Add-ons
    formData.add_ons.forEach(addonId => {
      const addon = ADD_ONS.find(a => a.id === addonId)
      if (addon) subtotal += addon.price
    })
    
    const discount = subtotal * (formData.discount_percent / 100)
    const total = formData.pro_bono ? 0 : subtotal - discount
    
    return { subtotal, discount, total }
  }

  // AI Parse raw input
  const handleParseInput = async () => {
    if (!rawInput.trim()) return
    
    setParsing(true)
    try {
      const response = await fetch('/api/ai/parse-profile-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: rawInput })
      })
      
      const result = await response.json()
      
      if (result.parsed) {
        setParsedData(result.parsed)
        setFormData(prev => ({
          ...prev,
          name: result.parsed.name || prev.name,
          email: result.parsed.email || prev.email,
          phone: result.parsed.phone || prev.phone,
          organization_name: result.parsed.organization || prev.organization_name,
          profile_type: result.parsed.profile_type || prev.profile_type,
        }))
      }
    } catch (err) {
      console.error('Parse error:', err)
    }
    setParsing(false)
  }

  // Create client and profile
  const createMutation = useMutation({
    mutationFn: async () => {
      // 1. Create client
      const client = await clientsApi.create({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        organization_name: formData.organization_name,
        client_category: formData.client_category,
        pro_bono: formData.pro_bono ? 1 : 0,
        hardship_flag: formData.hardship_flag ? 1 : 0,
        billing_notes: formData.billing_notes,
        notes: formData.internal_notes
      })
      
      // 2. Add services
      const pricing = calculatePricing()
      for (const serviceId of formData.selected_services) {
        const service = SERVICES[serviceId]
        const servicePricing = service?.pricing?.[formData.client_category]
        const amount = servicePricing?.base || servicePricing?.min || 0
        const discountedAmount = formData.pro_bono ? 0 : amount * (1 - formData.discount_percent / 100)
        
        await clientsApi.addService(client.id, {
          service_id: serviceId,
          amount_due: discountedAmount
        })
      }
      
      // 3. Create organization/profile
      const org = await organizationsApi.create({
        name: formData.organization_name || formData.name,
        profile_type: formData.profile_type,
        email: formData.email,
        phone: formData.phone,
        client_id: client.id,
        profile_data: JSON.stringify({
          ...parsedData,
          add_ons: formData.add_ons,
          discount_type: formData.discount_type,
          discount_percent: formData.discount_percent
        })
      })
      
      return { client, organization: org }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['clients'])
      queryClient.invalidateQueries(['organizations'])
      if (onCreated) onCreated(result)
      if (onClose) onClose()
      navigate(`/profile/${result.organization.id}`)
    }
  })

  const { subtotal, discount, total } = calculatePricing()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserPlus className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Create New Client Profile</h2>
                <p className="text-white/80">Admin-only profile creation with billing</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Step indicator */}
          <div className="flex gap-2 mt-4">
            {[1, 2, 3, 4].map(s => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-white' : 'bg-white/30'}`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Quick Input */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-purple-600" />
                  Quick Input (Optional)
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Paste any information you have about this client - email, notes, intake form, etc. 
                  AI will automatically extract the relevant details.
                </p>
                <textarea
                  value={rawInput}
                  onChange={e => setRawInput(e.target.value)}
                  placeholder="Paste client information here... (email, intake notes, application text, etc.)"
                  className="w-full h-48 px-4 py-3 border border-slate-300 rounded-xl"
                />
                <button
                  onClick={handleParseInput}
                  disabled={!rawInput.trim() || parsing}
                  className="mt-3 flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {parsing ? 'Parsing...' : 'Auto-Parse Information'}
                </button>
              </div>

              {parsedData && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                    <Check className="w-5 h-5" />
                    Information Extracted
                  </div>
                  <div className="text-sm text-green-600 space-y-1">
                    {parsedData.name && <div>Name: {parsedData.name}</div>}
                    {parsedData.email && <div>Email: {parsedData.email}</div>}
                    {parsedData.phone && <div>Phone: {parsedData.phone}</div>}
                    {parsedData.organization && <div>Organization: {parsedData.organization}</div>}
                  </div>
                </div>
              )}

              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Or Enter Manually</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Client Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Organization Name</label>
                    <input
                      type="text"
                      value={formData.organization_name}
                      onChange={e => setFormData({ ...formData, organization_name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Profile Type & Tier */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4">Profile Type</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {PROFILE_TYPES.map(type => (
                    <button
                      key={type.id}
                      onClick={() => setFormData({ ...formData, profile_type: type.id })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        formData.profile_type === type.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <type.icon className={`w-6 h-6 text-${type.color}-600 mb-2`} />
                      <div className="font-medium text-slate-900">{type.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4">Client Tier (Pricing)</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {Object.entries(CLIENT_CATEGORIES).map(([key, cat]) => (
                    <button
                      key={key}
                      onClick={() => setFormData({ ...formData, client_category: key })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        formData.client_category === key
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-bold text-slate-900">{cat.name}</div>
                      <div className="text-sm text-slate-500">{cat.description}</div>
                      {cat.multiplier && (
                        <div className="text-xs text-blue-600 mt-1">
                          {cat.multiplier}x base pricing
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Billing Flags */}
              <div className="flex gap-4">
                <label className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.pro_bono ? 'border-pink-500 bg-pink-50' : 'border-slate-200'
                }`}>
                  <input
                    type="checkbox"
                    checked={formData.pro_bono}
                    onChange={e => setFormData({ 
                      ...formData, 
                      pro_bono: e.target.checked,
                      hardship_flag: e.target.checked ? false : formData.hardship_flag
                    })}
                    className="w-5 h-5 text-pink-600 rounded"
                  />
                  <div>
                    <div className="font-medium text-slate-900 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-pink-500" />
                      Pro Bono
                    </div>
                    <div className="text-xs text-slate-500">No charge, tracked for tax purposes</div>
                  </div>
                </label>

                <label className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.hardship_flag ? 'border-amber-500 bg-amber-50' : 'border-slate-200'
                } ${formData.pro_bono ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <input
                    type="checkbox"
                    checked={formData.hardship_flag}
                    onChange={e => setFormData({ ...formData, hardship_flag: e.target.checked })}
                    disabled={formData.pro_bono}
                    className="w-5 h-5 text-amber-600 rounded"
                  />
                  <div>
                    <div className="font-medium text-slate-900 flex items-center gap-2">
                      <Gift className="w-4 h-4 text-amber-500" />
                      Hardship Pricing
                    </div>
                    <div className="text-xs text-slate-500">Apply hardship discount rates</div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Step 3: Services & Add-ons */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  Select Services
                </h3>
                <div className="grid gap-3">
                  {Object.entries(SERVICES).map(([key, service]) => {
                    const pricing = service.pricing?.[formData.client_category]
                    const price = pricing?.base || pricing?.min || 0
                    const isSelected = formData.selected_services.includes(key)
                    
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          const services = isSelected
                            ? formData.selected_services.filter(s => s !== key)
                            : [...formData.selected_services, key]
                          setFormData({ ...formData, selected_services: services })
                        }}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-slate-900">{service.name}</div>
                            <div className="text-sm text-slate-500">{service.description}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-slate-900">
                              {formData.pro_bono ? (
                                <span className="text-pink-600">$0 (Pro Bono)</span>
                              ) : (
                                `$${price.toLocaleString()}`
                              )}
                            </div>
                            {isSelected && <Check className="w-5 h-5 text-blue-600 ml-auto" />}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-green-600" />
                  Add-on Services
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {ADD_ONS.map(addon => {
                    const isSelected = formData.add_ons.includes(addon.id)
                    return (
                      <button
                        key={addon.id}
                        onClick={() => {
                          const addons = isSelected
                            ? formData.add_ons.filter(a => a !== addon.id)
                            : [...formData.add_ons, addon.id]
                          setFormData({ ...formData, add_ons: addons })
                        }}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          isSelected ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-slate-900 text-sm">{addon.name}</div>
                            <div className="text-xs text-slate-500">{addon.description}</div>
                          </div>
                          <div className="font-bold text-slate-900 text-sm">
                            {formData.pro_bono ? '$0' : `$${addon.price}`}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Discounts & Review */}
          {step === 4 && (
            <div className="space-y-6">
              {!formData.pro_bono && (
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-amber-600" />
                    Discount
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {DISCOUNT_PRESETS.map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => setFormData({ 
                          ...formData, 
                          discount_type: preset.id,
                          discount_percent: preset.percent ?? formData.discount_percent
                        })}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          formData.discount_type === preset.id
                            ? 'border-amber-500 bg-amber-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-medium text-slate-900 text-sm">{preset.name}</div>
                        {preset.percent !== null && (
                          <div className="text-xs text-amber-600">{preset.percent}% off</div>
                        )}
                      </button>
                    ))}
                  </div>
                  
                  {formData.discount_type === 'custom' && (
                    <div className="flex gap-4 items-end">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Custom Discount %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={formData.discount_percent}
                          onChange={e => setFormData({ ...formData, discount_percent: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                        <input
                          type="text"
                          value={formData.discount_reason}
                          onChange={e => setFormData({ ...formData, discount_reason: e.target.value })}
                          placeholder="Reason for discount"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Billing Summary */}
              <div className="bg-slate-50 rounded-xl p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Billing Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Services ({formData.selected_services.length})</span>
                    <span className="font-medium">${(subtotal - ADD_ONS.filter(a => formData.add_ons.includes(a.id)).reduce((s, a) => s + a.price, 0)).toLocaleString()}</span>
                  </div>
                  {formData.add_ons.length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Add-ons ({formData.add_ons.length})</span>
                      <span className="font-medium">${ADD_ONS.filter(a => formData.add_ons.includes(a.id)).reduce((s, a) => s + a.price, 0).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-medium">${subtotal.toLocaleString()}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount ({formData.discount_percent}%)</span>
                      <span>-${discount.toLocaleString()}</span>
                    </div>
                  )}
                  {formData.pro_bono && (
                    <div className="flex justify-between text-sm text-pink-600">
                      <span>Pro Bono Adjustment</span>
                      <span>-${subtotal.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-2 mt-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className={formData.pro_bono ? 'text-pink-600' : ''}>${total.toLocaleString()}</span>
                    </div>
                    {formData.pro_bono && (
                      <div className="text-xs text-pink-500 text-right">
                        (${subtotal.toLocaleString()} value tracked for tax purposes)
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Billing Notes</label>
                  <textarea
                    value={formData.billing_notes}
                    onChange={e => setFormData({ ...formData, billing_notes: e.target.value })}
                    placeholder="Payment arrangements, pro bono justification, etc."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg h-24"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Internal Notes (Admin Only)</label>
                  <textarea
                    value={formData.internal_notes}
                    onChange={e => setFormData({ ...formData, internal_notes: e.target.value })}
                    placeholder="Private notes about this client..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg h-24"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg"
          >
            {step > 1 ? 'Back' : 'Cancel'}
          </button>
          
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">Step {step} of 4</span>
            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && !formData.name}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !formData.name || !formData.email}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Create Client & Profile
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
