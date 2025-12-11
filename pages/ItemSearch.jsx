import React, { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { 
  Package, 
  Search,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  DollarSign
} from 'lucide-react'
import { organizationsApi, aiApi } from '../api/client'

export default function ItemSearch() {
  const [selectedOrg, setSelectedOrg] = useState('')
  const [itemRequest, setItemRequest] = useState('')
  const [distance, setDistance] = useState('nationwide')
  const [results, setResults] = useState(null)
  
  const { data: orgs = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: organizationsApi.list
  })
  
  const searchMutation = useMutation({
    mutationFn: aiApi.itemSearch,
    onSuccess: (data) => setResults(data)
  })
  
  const handleSearch = () => {
    if (!selectedOrg || !itemRequest.trim()) return
    searchMutation.mutate({
      profile_id: selectedOrg,
      item_request: itemRequest,
      distance_miles: distance
    })
  }
  
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Package className="w-8 h-8 text-green-600" />
          Item Search
        </h1>
        <p className="text-slate-600 mt-1">
          Find funding for specific items and equipment
        </p>
      </div>
      
      {/* Search Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Organization
            </label>
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select organization...</option>
              {orgs.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name} - {org.city}, {org.state}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              What item do you need?
            </label>
            <textarea
              value={itemRequest}
              onChange={(e) => setItemRequest(e.target.value)}
              placeholder="e.g., 12 passenger van, wheelchair ramp, commercial refrigerator, playground equipment..."
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Search Distance
            </label>
            <select
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="25">Within 25 miles</option>
              <option value="50">Within 50 miles</option>
              <option value="100">Within 100 miles</option>
              <option value="nationwide">Nationwide</option>
            </select>
          </div>
          
          <button
            onClick={handleSearch}
            disabled={!selectedOrg || !itemRequest.trim() || searchMutation.isPending}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {searchMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Search for Funding
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Error */}
      {searchMutation.isError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          Error: {searchMutation.error?.message || 'Search failed'}
        </div>
      )}
      
      {/* Results */}
      {results && (
        <div className="space-y-6">
          {results.summary && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-medium text-green-900 mb-1">Search Results</h3>
              <p className="text-green-800">{results.summary}</p>
            </div>
          )}
          
          {results.opportunities && results.opportunities.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Funding Opportunities</h2>
              <div className="grid gap-4">
                {results.opportunities.map((opp, idx) => (
                  <div key={idx} className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{opp.program_name}</h3>
                        <p className="text-sm text-slate-500">{opp.sponsor}</p>
                      </div>
                      {opp.confidence && (
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          opp.confidence >= 70 ? 'bg-green-100 text-green-700' :
                          opp.confidence >= 50 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {opp.confidence}% Match
                        </span>
                      )}
                    </div>
                    
                    <p className="text-slate-600 mb-4">{opp.description}</p>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-4">
                      {opp.program_type && (
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">
                          {opp.program_type}
                        </span>
                      )}
                      {(opp.amount_min || opp.amount_max) && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {opp.amount_max ? `Up to $${opp.amount_max.toLocaleString()}` : 'Amount varies'}
                        </span>
                      )}
                    </div>
                    
                    {opp.eligibility && (
                      <p className="text-sm text-slate-600 mb-4">
                        <strong>Eligibility:</strong> {opp.eligibility}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-3">
                      {opp.url && (
                        <a
                          href={opp.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Visit Website
                        </a>
                      )}
                      {opp.contact_phone && (
                        <a
                          href={`tel:${opp.contact_phone}`}
                          className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded text-sm hover:bg-slate-50"
                        >
                          <Phone className="w-4 h-4" />
                          {opp.contact_phone}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {results.next_steps && results.next_steps.length > 0 && (
            <div className="bg-blue-50 rounded-xl p-6">
              <h3 className="font-semibold text-blue-900 mb-3">Recommended Next Steps</h3>
              <ol className="list-decimal list-inside space-y-2">
                {results.next_steps.map((step, i) => (
                  <li key={i} className="text-blue-800">{step}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
