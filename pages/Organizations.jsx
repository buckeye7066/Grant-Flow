import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2, Plus, Search, Edit, Trash2, Globe, MapPin,
  CheckCircle2, AlertCircle, Users, UserPlus, Shield
} from 'lucide-react'
import { organizationsApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import AdminCreateProfile from './AdminCreateProfile'

function ProfileCard({ profile, onDelete }) {
  const navigate = useNavigate()
  
  // Calculate completion
  let profileData = {}
  if (profile.profile_data) {
    try { profileData = JSON.parse(profile.profile_data) } catch {}
  }
  
  const completion = profile.completion_percent || 
    Math.min(100, Object.keys({ ...profile, ...profileData }).filter(k => 
      profile[k] || profileData[k]
    ).length * 5)

const focusAreas = typeof profile.focus_areas === 'string' 
  ? profile.focus_areas.split(',').map(s => s.trim()).filter(Boolean) 
  : []

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold ${
            profile.profile_type === 'student' ? 'bg-purple-500' :
            profile.profile_type === 'individual' ? 'bg-green-500' :
            profile.profile_type === 'small_business' ? 'bg-amber-500' :
            'bg-blue-500'
          }`}>
            {profile.name?.charAt(0) || '?'}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{profile.name}</h3>
            {profile.city && profile.state && (
              <div className="flex items-center gap-1 text-sm text-slate-500">
                <MapPin className="w-3 h-3" />
                {profile.city}, {profile.state}
              </div>
            )}
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          completion >= 80 ? 'bg-green-100 text-green-700' :
          completion >= 50 ? 'bg-amber-100 text-amber-700' :
          'bg-slate-100 text-slate-600'
        }`}>
          {completion}% Complete
        </span>
      </div>

      {profile.mission && (
        <p className="text-sm text-slate-600 mb-4 line-clamp-2">{profile.mission}</p>
      )}

      {focusAreas.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {focusAreas.slice(0, 4).map((area, i) => (
            <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
              {area}
            </span>
          ))}
          {focusAreas.length > 4 && (
            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
              +{focusAreas.length - 4} more
            </span>
          )}
        </div>
      )}

      {/* Completion bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span>Profile Completion</span>
          <span>{completion}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${
              completion >= 80 ? 'bg-green-500' :
              completion >= 50 ? 'bg-amber-500' :
              'bg-blue-500'
            }`}
            style={{ width: `${completion}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        {profile.website && (
          <a 
            href={profile.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <Globe className="w-4 h-4" />
            Website
          </a>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <Link
            to={`/profile/${profile.id}`}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            <Edit className="w-4 h-4" />
            Edit Profile
          </Link>
          <button
            onClick={() => onDelete(profile.id)}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Organizations() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [showAdminCreate, setShowAdminCreate] = useState(false)

  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: organizationsApi.list
  })

  const deleteMutation = useMutation({
    mutationFn: organizationsApi.delete,
    onSuccess: () => queryClient.invalidateQueries(['organizations'])
  })

  const handleDelete = (id) => {
    if (confirm('Delete this profile? This action cannot be undone.')) {
      deleteMutation.mutate(id)
    }
  }

  const filteredOrganizations = organizations.filter(org =>
    org.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.mission?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.city?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calculate stats
  const totalProfiles = organizations.length
  const completeProfiles = organizations.filter(o => {
    const completion = o.completion_percent || 0
    return completion >= 80
  }).length
  const needCompletion = totalProfiles - completeProfiles

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-600" />
            Organizations & Profiles
          </h1>
          <p className="text-slate-600 mt-1">Manage your organizations and individual profiles</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Admin Create Button */}
          {isAdmin && (
            <button
              onClick={() => setShowAdminCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              title="Admin: Create profile with billing"
            >
              <Shield className="w-5 h-5" />
              <UserPlus className="w-5 h-5" />
              Admin Create
            </button>
          )}
          
          {/* Regular Create Button */}
          <Link
            to="/profile/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Create New Profile
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{totalProfiles}</div>
              <div className="text-sm text-slate-500">Total Profiles</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{completeProfiles}</div>
              <div className="text-sm text-slate-500">Complete Profiles</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{needCompletion}</div>
              <div className="text-sm text-slate-500">Need Completion</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search profiles..."
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl"
          />
        </div>
      </div>

      {/* Profile Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
        </div>
      ) : filteredOrganizations.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            {searchTerm ? 'No profiles found' : 'No profiles yet'}
          </h3>
          <p className="text-slate-500 mb-4">
            {searchTerm ? 'Try a different search term' : 'Create your first profile to get started'}
          </p>
          {!searchTerm && (
            <Link
              to="/profile/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Create Profile
            </Link>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrganizations.map(org => (
            <ProfileCard
              key={org.id}
              profile={org}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Admin Create Modal */}
      {showAdminCreate && (
        <AdminCreateProfile
          onClose={() => setShowAdminCreate(false)}
          onCreated={(result) => {
            queryClient.invalidateQueries(['organizations'])
            queryClient.invalidateQueries(['clients'])
          }}
        />
      )}
    </div>
  )
}
