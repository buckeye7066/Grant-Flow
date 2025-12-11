import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Users, Plus, Search, Mail, Phone, Building2, CreditCard,
  ChevronDown, ChevronRight, Trash2, Copy, Check, Eye, EyeOff,
  DollarSign, AlertCircle, Clock, FileText, Heart, Gift
} from 'lucide-react'
import { clientsApi } from '../api/client'
import { SERVICES, CLIENT_CATEGORIES } from '../data/serviceTiers'

function ClientCard({ client, onUpdate, onDelete, onAddService, onUpdateService }) {
  const [expanded, setExpanded] = useState(false)
  const [showCode, setShowCode] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyCode = () => {
    navigator.clipboard.writeText(client.access_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const categoryInfo = CLIENT_CATEGORIES[client.client_category] || {}
  
  const totalDue = client.services?.reduce((sum, s) => sum + (s.amount_due || 0), 0) || 0
  const totalPaid = client.services?.reduce((sum, s) => sum + (s.amount_paid || 0), 0) || 0
  const balance = totalDue - totalPaid

  // Pro bono calculation (what would have been charged)
  const proBonoValue = client.pro_bono ? totalDue : 0

  return (
    <div className={`bg-white rounded-xl border ${client.pro_bono ? 'border-pink-300 bg-pink-50/30' : 'border-slate-200'} overflow-hidden`}>
      {/* Pro Bono Banner */}
      {client.pro_bono && (
        <div className="bg-pink-100 px-4 py-2 flex items-center gap-2 text-pink-700 text-sm">
          <Heart className="w-4 h-4 fill-pink-500" />
          <span className="font-medium">Pro Bono Client</span>
          <span className="text-pink-600">- Services tracked for tax records (${totalDue.toLocaleString()} value)</span>
        </div>
      )}
      
      {/* Hardship Banner */}
      {client.hardship_flag && !client.pro_bono && (
        <div className="bg-amber-100 px-4 py-2 flex items-center gap-2 text-amber-700 text-sm">
          <Gift className="w-4 h-4" />
          <span className="font-medium">Hardship Pricing Applied</span>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
              client.pro_bono ? 'bg-pink-500' : 
              client.is_admin ? 'bg-purple-600' : 'bg-blue-600'
            }`}>
              {client.name?.charAt(0) || '?'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900">{client.name}</h3>
                {client.is_admin && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">Admin</span>
                )}
              </div>
              {client.organization_name && (
                <div className="flex items-center gap-1 text-sm text-slate-500">
                  <Building2 className="w-3 h-3" />
                  {client.organization_name}
                </div>
              )}
              <div className="flex items-center gap-1 text-sm text-slate-500">
                <span className={`px-2 py-0.5 rounded text-xs ${categoryInfo.color || 'bg-slate-100 text-slate-600'}`}>
                  {categoryInfo.name || client.client_category}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Contact & Access Code */}
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="flex items-center gap-1 text-slate-500">
              <Mail className="w-3 h-3" />
              {client.email}
            </div>
            {client.phone && (
              <div className="flex items-center gap-1 text-slate-500">
                <Phone className="w-3 h-3" />
                {client.phone}
              </div>
            )}
          </div>
          <div>
            <div className="text-slate-500 text-xs mb-1">Access Code</div>
            <div className="flex items-center gap-2">
              <code className="px-2 py-1 bg-slate-100 rounded text-sm font-mono">
                {showCode ? client.access_code : '••••••••'}
              </code>
              <button onClick={() => setShowCode(!showCode)} className="p-1 hover:bg-slate-100 rounded">
                {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button onClick={copyCode} className="p-1 hover:bg-slate-100 rounded">
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Billing Status Toggles */}
        <div className="mt-4 flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={client.pro_bono || false}
              onChange={(e) => onUpdate(client.id, { pro_bono: e.target.checked ? 1 : 0 })}
              className="w-4 h-4 text-pink-600 rounded"
            />
            <span className="text-sm text-slate-600 flex items-center gap-1">
              <Heart className="w-4 h-4 text-pink-500" />
              Pro Bono
            </span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={client.hardship_flag || false}
              onChange={(e) => onUpdate(client.id, { hardship_flag: e.target.checked ? 1 : 0 })}
              disabled={client.pro_bono}
              className="w-4 h-4 text-amber-600 rounded disabled:opacity-50"
            />
            <span className={`text-sm ${client.pro_bono ? 'text-slate-400' : 'text-slate-600'} flex items-center gap-1`}>
              <Gift className="w-4 h-4 text-amber-500" />
              Hardship Pricing
            </span>
          </label>
        </div>

        {/* Quick Stats */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="text-center p-2 bg-slate-50 rounded-lg">
            <div className="text-lg font-bold text-slate-900">{client.services?.length || 0}</div>
            <div className="text-xs text-slate-500">Services</div>
          </div>
          <div className="text-center p-2 bg-slate-50 rounded-lg">
            <div className={`text-lg font-bold ${client.pro_bono ? 'text-pink-600' : 'text-green-600'}`}>
              ${totalPaid.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500">{client.pro_bono ? 'Value Given' : 'Paid'}</div>
          </div>
          <div className="text-center p-2 bg-slate-50 rounded-lg">
            <div className={`text-lg font-bold ${balance > 0 && !client.pro_bono ? 'text-amber-600' : 'text-slate-400'}`}>
              {client.pro_bono ? '$0' : `$${balance.toLocaleString()}`}
            </div>
            <div className="text-xs text-slate-500">Balance</div>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          {/* Services */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-slate-900">Services</h4>
              <button
                onClick={() => onAddService(client)}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Service
              </button>
            </div>
            
            {client.services?.length > 0 ? (
              <div className="space-y-2">
                {client.services.map(service => {
                  const serviceInfo = SERVICES[service.service_id] || {}
                  return (
                    <div key={service.id} className="bg-white p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-slate-900">{serviceInfo.name || service.service_id}</div>
                          <div className="text-sm text-slate-500">
                            {client.pro_bono ? (
                              <span className="text-pink-600">Pro Bono (${service.amount_due?.toLocaleString()} value)</span>
                            ) : (
                              <>
                                ${service.amount_paid?.toLocaleString() || 0} / ${service.amount_due?.toLocaleString() || 0}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            service.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                            service.payment_status === 'partial' ? 'bg-amber-100 text-amber-700' :
                            client.pro_bono ? 'bg-pink-100 text-pink-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {client.pro_bono ? 'Pro Bono' : service.payment_status || 'pending'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Milestone Tracking */}
                      {!client.pro_bono && (
                        <div className="mt-2 flex items-center gap-4 text-xs">
                          <label className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={service.milestone_1_paid}
                              onChange={(e) => onUpdateService(service.id, { milestone_1_paid: e.target.checked ? 1 : 0 })}
                              className="w-3 h-3"
                            />
                            <span>40% Kickoff</span>
                          </label>
                          <label className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={service.milestone_2_paid}
                              onChange={(e) => onUpdateService(service.id, { milestone_2_paid: e.target.checked ? 1 : 0 })}
                              className="w-3 h-3"
                            />
                            <span>40% Draft</span>
                          </label>
                          <label className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={service.milestone_3_paid}
                              onChange={(e) => onUpdateService(service.id, { milestone_3_paid: e.target.checked ? 1 : 0 })}
                              className="w-3 h-3"
                            />
                            <span>20% Final</span>
                          </label>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-sm text-slate-500 italic">No services added yet</div>
            )}
          </div>

          {/* Billing Notes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Billing Notes (for tax records)
            </label>
            <textarea
              value={client.billing_notes || ''}
              onChange={(e) => onUpdate(client.id, { billing_notes: e.target.value })}
              placeholder="Document any billing arrangements, pro bono justification, etc."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              rows={2}
            />
          </div>

          {/* Pro Bono Tax Summary */}
          {client.pro_bono && totalDue > 0 && (
            <div className="mb-4 p-3 bg-pink-50 border border-pink-200 rounded-lg">
              <div className="flex items-center gap-2 text-pink-700 font-medium mb-2">
                <FileText className="w-4 h-4" />
                Pro Bono Tax Documentation
              </div>
              <div className="text-sm text-pink-600 space-y-1">
                <div>Total Service Value: <strong>${totalDue.toLocaleString()}</strong></div>
                <div>Services Provided: {client.services?.length || 0}</div>
                <div className="text-xs text-pink-500 mt-2">
                  This value is tracked for tax deduction documentation purposes.
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {client.notes && (
            <div className="mb-4">
              <div className="text-sm font-medium text-slate-700 mb-1">Notes</div>
              <div className="text-sm text-slate-600">{client.notes}</div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              onClick={() => onDelete(client.id)}
              className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-sm flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function AddClientModal({ onClose, onAdd }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    organization_name: '',
    client_category: 'small_org',
    annual_budget: '',
    pro_bono: false,
    hardship_flag: false,
    billing_notes: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onAdd({
      ...formData,
      pro_bono: formData.pro_bono ? 1 : 0,
      hardship_flag: formData.hardship_flag ? 1 : 0
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Add New Client</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Organization</label>
            <input
              type="text"
              value={formData.organization_name}
              onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Client Category</label>
            <select
              value={formData.client_category}
              onChange={(e) => setFormData({ ...formData, client_category: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              {Object.entries(CLIENT_CATEGORIES).map(([key, cat]) => (
                <option key={key} value={key}>{cat.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Annual Budget</label>
            <input
              type="number"
              value={formData.annual_budget}
              onChange={(e) => setFormData({ ...formData, annual_budget: e.target.value })}
              placeholder="e.g., 150000"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          {/* Billing Options */}
          <div className="p-3 bg-slate-50 rounded-lg space-y-3">
            <div className="text-sm font-medium text-slate-700">Billing Options</div>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.pro_bono}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  pro_bono: e.target.checked,
                  hardship_flag: e.target.checked ? false : formData.hardship_flag
                })}
                className="w-4 h-4 text-pink-600 rounded"
              />
              <span className="text-sm text-slate-600 flex items-center gap-1">
                <Heart className="w-4 h-4 text-pink-500" />
                Pro Bono (no charge, tracked for tax purposes)
              </span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.hardship_flag}
                onChange={(e) => setFormData({ ...formData, hardship_flag: e.target.checked })}
                disabled={formData.pro_bono}
                className="w-4 h-4 text-amber-600 rounded disabled:opacity-50"
              />
              <span className={`text-sm ${formData.pro_bono ? 'text-slate-400' : 'text-slate-600'} flex items-center gap-1`}>
                <Gift className="w-4 h-4 text-amber-500" />
                Hardship Pricing (discounted rates)
              </span>
            </label>
          </div>

          {formData.pro_bono && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Pro Bono Justification (for tax records)
              </label>
              <textarea
                value={formData.billing_notes}
                onChange={(e) => setFormData({ ...formData, billing_notes: e.target.value })}
                placeholder="Document why this client qualifies for pro bono services..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                rows={2}
              />
            </div>
          )}
          
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Client
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddServiceModal({ client, onClose, onAdd }) {
  const [formData, setFormData] = useState({
    service_id: '',
    amount_due: ''
  })

  const handleServiceChange = (serviceId) => {
    const service = SERVICES[serviceId]
    const categoryPricing = service?.pricing?.[client.client_category]
    const suggestedPrice = categoryPricing?.base || categoryPricing?.min || 0
    
    setFormData({
      service_id: serviceId,
      amount_due: client.pro_bono ? suggestedPrice : suggestedPrice // Track value even for pro bono
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onAdd(client.id, formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-slate-900 mb-4">
          Add Service for {client.name}
          {client.pro_bono && (
            <span className="ml-2 text-sm font-normal text-pink-600">(Pro Bono)</span>
          )}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Service</label>
            <select
              value={formData.service_id}
              onChange={(e) => handleServiceChange(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="">Select a service...</option>
              {Object.entries(SERVICES).map(([key, service]) => (
                <option key={key} value={key}>{service.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {client.pro_bono ? 'Service Value (for tax records)' : 'Amount Due'}
            </label>
            <input
              type="number"
              value={formData.amount_due}
              onChange={(e) => setFormData({ ...formData, amount_due: e.target.value })}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
            {client.pro_bono && (
              <p className="text-xs text-pink-600 mt-1">
                This value will be tracked for tax documentation but client will not be billed.
              </p>
            )}
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Service
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminPanel() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddClient, setShowAddClient] = useState(false)
  const [addServiceClient, setAddServiceClient] = useState(null)
  const [filterProBono, setFilterProBono] = useState(false)

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: clientsApi.list
  })

  const createMutation = useMutation({
    mutationFn: clientsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['clients'])
      setShowAddClient(false)
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => clientsApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['clients'])
  })

  const deleteMutation = useMutation({
    mutationFn: clientsApi.delete,
    onSuccess: () => queryClient.invalidateQueries(['clients'])
  })

  const addServiceMutation = useMutation({
    mutationFn: ({ clientId, data }) => clientsApi.addService(clientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clients'])
      setAddServiceClient(null)
    }
  })

  const updateServiceMutation = useMutation({
    mutationFn: ({ serviceId, data }) => clientsApi.updateService(serviceId, data),
    onSuccess: () => queryClient.invalidateQueries(['clients'])
  })

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.organization_name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesProBono = !filterProBono || c.pro_bono
    return matchesSearch && matchesProBono
  })

  // Calculate stats
  const totalClients = clients.length
  const activeClients = clients.filter(c => c.is_active).length
  const proBonoClients = clients.filter(c => c.pro_bono).length
  const totalRevenue = clients.reduce((sum, c) => {
    if (c.pro_bono) return sum // Don't count pro bono as revenue
    return sum + (c.services?.reduce((s, svc) => s + (svc.amount_paid || 0), 0) || 0)
  }, 0)
  const proBonoValue = clients.reduce((sum, c) => {
    if (!c.pro_bono) return sum
    return sum + (c.services?.reduce((s, svc) => s + (svc.amount_due || 0), 0) || 0)
  }, 0)
  const outstandingBalance = clients.reduce((sum, c) => {
    if (c.pro_bono) return sum // Pro bono has no balance
    const due = c.services?.reduce((s, svc) => s + (svc.amount_due || 0), 0) || 0
    const paid = c.services?.reduce((s, svc) => s + (svc.amount_paid || 0), 0) || 0
    return sum + (due - paid)
  }, 0)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-purple-600" />
            Client Management
          </h1>
          <p className="text-slate-600 mt-1">Manage clients, services, and billing</p>
        </div>
        
        <button
          onClick={() => setShowAddClient(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Add Client
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            <div>
              <div className="text-2xl font-bold text-slate-900">{totalClients}</div>
              <div className="text-sm text-slate-500">Total Clients</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <Check className="w-8 h-8 text-green-600" />
            <div>
              <div className="text-2xl font-bold text-slate-900">{activeClients}</div>
              <div className="text-sm text-slate-500">Active</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <Heart className="w-8 h-8 text-pink-600" />
            <div>
              <div className="text-2xl font-bold text-pink-600">{proBonoClients}</div>
              <div className="text-sm text-slate-500">Pro Bono</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-green-600" />
            <div>
              <div className="text-2xl font-bold text-green-600">${totalRevenue.toLocaleString()}</div>
              <div className="text-sm text-slate-500">Revenue</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <Gift className="w-8 h-8 text-pink-600" />
            <div>
              <div className="text-2xl font-bold text-pink-600">${proBonoValue.toLocaleString()}</div>
              <div className="text-sm text-slate-500">Pro Bono Value</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search clients..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg"
          />
        </div>
        
        <label className="flex items-center gap-2 cursor-pointer px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">
          <input
            type="checkbox"
            checked={filterProBono}
            onChange={(e) => setFilterProBono(e.target.checked)}
            className="w-4 h-4 text-pink-600 rounded"
          />
          <Heart className="w-4 h-4 text-pink-500" />
          <span className="text-sm text-slate-600">Pro Bono Only</span>
        </label>
      </div>

      {/* Client List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          {searchTerm || filterProBono ? 'No clients match your search' : 'No clients yet. Add your first client!'}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredClients.map(client => (
            <ClientCard
              key={client.id}
              client={client}
              onUpdate={(id, data) => updateMutation.mutate({ id, data })}
              onDelete={(id) => {
                if (confirm('Delete this client?')) {
                  deleteMutation.mutate(id)
                }
              }}
              onAddService={setAddServiceClient}
              onUpdateService={(serviceId, data) => updateServiceMutation.mutate({ serviceId, data })}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showAddClient && (
        <AddClientModal
          onClose={() => setShowAddClient(false)}
          onAdd={(data) => createMutation.mutate(data)}
        />
      )}

      {addServiceClient && (
        <AddServiceModal
          client={addServiceClient}
          onClose={() => setAddServiceClient(null)}
          onAdd={(clientId, data) => addServiceMutation.mutate({ clientId, data })}
        />
      )}
    </div>
  )
}
