import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BarChart3, Users, Eye, Clock, TrendingUp, Activity,
  Calendar, FileText, Plus, Trash2, Edit2, Check, X,
  ChevronDown, ChevronRight, Bell, Megaphone, AlertCircle,
  CheckCircle2, Info, Zap, Search, Download, RefreshCw
} from 'lucide-react'

// Analytics API
const analyticsApi = {
  getSummary: (days) => fetch(`/api/analytics/admin/summary?days=${days}`).then(r => r.json()),
  getUsers: (limit, offset) => fetch(`/api/analytics/admin/users?limit=${limit}&offset=${offset}`).then(r => r.json()),
  getUserActivity: (clientId) => fetch(`/api/analytics/admin/users/${clientId}/activity`).then(r => r.json()),
  getPages: (days) => fetch(`/api/analytics/admin/pages?days=${days}`).then(r => r.json()),
  getTimeline: (days) => fetch(`/api/analytics/admin/timeline?days=${days}`).then(r => r.json()),
  getAnnouncements: () => fetch('/api/analytics/admin/announcements').then(r => r.json()),
  createAnnouncement: (data) => fetch('/api/analytics/announcements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),
  updateAnnouncement: (id, data) => fetch(`/api/analytics/announcements/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),
  deleteAnnouncement: (id) => fetch(`/api/analytics/announcements/${id}`, {
    method: 'DELETE'
  }).then(r => r.json())
}

// Stat Card Component
function StatCard({ icon: Icon, label, value, subValue, color, trend }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className={`w-4 h-4 ${trend < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <div className="text-3xl font-bold text-slate-900">{value}</div>
        <div className="text-sm text-slate-500">{label}</div>
        {subValue && <div className="text-xs text-slate-400 mt-1">{subValue}</div>}
      </div>
    </div>
  )
}

// Activity Timeline Chart (Simple CSS version)
function ActivityChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="text-center py-8 text-slate-500">No activity data</div>
  }

  const maxViews = Math.max(...data.map(d => d.page_views))

  return (
    <div className="space-y-2">
      {data.map((day, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-20 text-xs text-slate-500">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
          <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-end pr-2"
              style={{ width: `${Math.max((day.page_views / maxViews) * 100, 5)}%` }}
            >
              <span className="text-xs text-white font-medium">{day.page_views}</span>
            </div>
          </div>
          <div className="w-16 text-xs text-slate-600">{day.active_users} users</div>
        </div>
      ))}
    </div>
  )
}

// User Activity Row
function UserRow({ user, onViewActivity }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border-b border-slate-100 last:border-0">
      <div 
        className="flex items-center gap-4 p-4 hover:bg-slate-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
          {user.name?.charAt(0) || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-900 flex items-center gap-2">
            {user.name}
            {user.is_admin && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">Admin</span>}
            {user.pro_bono && <span className="px-2 py-0.5 bg-pink-100 text-pink-700 text-xs rounded-full">Pro Bono</span>}
          </div>
          <div className="text-sm text-slate-500 truncate">{user.email}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-slate-900">{user.login_count || 0} logins</div>
          <div className="text-xs text-slate-500">
            {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-slate-900">{user.total_page_views || 0} views</div>
          <div className="text-xs text-slate-500">{user.total_sessions || 0} sessions</div>
        </div>
        {expanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
      </div>
      
      {expanded && (
        <div className="px-4 pb-4 bg-slate-50">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Organization:</span>
              <span className="ml-2 text-slate-900">{user.organization_name || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500">Last Page:</span>
              <span className="ml-2 text-slate-900">{user.last_page || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500">Created:</span>
              <span className="ml-2 text-slate-900">{new Date(user.created_at).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-slate-500">Onboarding:</span>
              <span className={`ml-2 ${user.has_seen_onboarding ? 'text-green-600' : 'text-amber-600'}`}>
                {user.has_seen_onboarding ? 'Completed' : 'Pending'}
              </span>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onViewActivity(user.id) }}
            className="mt-3 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <Eye className="w-4 h-4" /> View Full Activity
          </button>
        </div>
      )}
    </div>
  )
}

// Announcement Form
function AnnouncementForm({ announcement, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: announcement?.title || '',
    message: announcement?.message || '',
    type: announcement?.type || 'info',
    priority: announcement?.priority || 0,
    expiresAt: announcement?.expires_at || ''
  })

  const types = [
    { id: 'info', name: 'Info', color: 'bg-blue-500' },
    { id: 'success', name: 'Success', color: 'bg-green-500' },
    { id: 'warning', name: 'Warning', color: 'bg-amber-500' },
    { id: 'urgent', name: 'Urgent', color: 'bg-red-500' },
    { id: 'feature', name: 'New Feature', color: 'bg-purple-500' }
  ]

  return (
    <div className="bg-slate-50 rounded-xl p-4 space-y-4">
      <input
        type="text"
        value={form.title}
        onChange={e => setForm({ ...form, title: e.target.value })}
        placeholder="Announcement title"
        className="w-full px-4 py-2 border border-slate-300 rounded-lg"
      />
      <textarea
        value={form.message}
        onChange={e => setForm({ ...form, message: e.target.value })}
        placeholder="Announcement message"
        rows={3}
        className="w-full px-4 py-2 border border-slate-300 rounded-lg"
      />
      <div className="flex gap-4">
        <select
          value={form.type}
          onChange={e => setForm({ ...form, type: e.target.value })}
          className="px-3 py-2 border border-slate-300 rounded-lg"
        >
          {types.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <input
          type="number"
          value={form.priority}
          onChange={e => setForm({ ...form, priority: parseInt(e.target.value) })}
          placeholder="Priority"
          className="w-24 px-3 py-2 border border-slate-300 rounded-lg"
        />
        <input
          type="datetime-local"
          value={form.expiresAt}
          onChange={e => setForm({ ...form, expiresAt: e.target.value })}
          className="px-3 py-2 border border-slate-300 rounded-lg"
          placeholder="Expires"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg">
          Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {announcement ? 'Update' : 'Create'}
        </button>
      </div>
    </div>
  )
}

// Main Analytics Dashboard
export default function AdminAnalytics() {
  const queryClient = useQueryClient()
  const [timeRange, setTimeRange] = useState(30)
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [userActivity, setUserActivity] = useState(null)

  // Queries
  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useQuery({
    queryKey: ['analytics-summary', timeRange],
    queryFn: () => analyticsApi.getSummary(timeRange)
  })

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['analytics-users'],
    queryFn: () => analyticsApi.getUsers(100, 0)
  })

  const { data: pages } = useQuery({
    queryKey: ['analytics-pages', timeRange],
    queryFn: () => analyticsApi.getPages(timeRange)
  })

  const { data: timeline } = useQuery({
    queryKey: ['analytics-timeline', timeRange],
    queryFn: () => analyticsApi.getTimeline(timeRange)
  })

  const { data: announcements, refetch: refetchAnnouncements } = useQuery({
    queryKey: ['announcements'],
    queryFn: analyticsApi.getAnnouncements
  })

  // View user activity
  const handleViewActivity = async (clientId) => {
    const activity = await analyticsApi.getUserActivity(clientId)
    setUserActivity(activity)
    setSelectedUser(clientId)
  }

  // Save announcement
  const handleSaveAnnouncement = async (form) => {
    if (editingAnnouncement) {
      await analyticsApi.updateAnnouncement(editingAnnouncement.id, form)
    } else {
      await analyticsApi.createAnnouncement(form)
    }
    refetchAnnouncements()
    setShowAnnouncementForm(false)
    setEditingAnnouncement(null)
  }

  // Delete announcement
  const handleDeleteAnnouncement = async (id) => {
    if (confirm('Delete this announcement?')) {
      await analyticsApi.deleteAnnouncement(id)
      refetchAnnouncements()
    }
  }

  // Toggle announcement active
  const handleToggleAnnouncement = async (announcement) => {
    await analyticsApi.updateAnnouncement(announcement.id, {
      isActive: announcement.is_active ? 0 : 1
    })
    refetchAnnouncements()
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            Analytics Dashboard
          </h1>
          <p className="text-slate-600 mt-1">Monitor user activity and system usage</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={timeRange}
            onChange={e => setTimeRange(parseInt(e.target.value))}
            className="px-4 py-2 border border-slate-300 rounded-lg"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={() => refetchSummary()}
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={Users}
          label="Total Users"
          value={summary?.totalUsers || 0}
          subValue={`${summary?.newUsers || 0} new this period`}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatCard
          icon={Activity}
          label="Active Users"
          value={summary?.activeUsers || 0}
          subValue={`${summary?.period || '30 days'}`}
          color="bg-gradient-to-br from-green-500 to-green-600"
        />
        <StatCard
          icon={Eye}
          label="Page Views"
          value={summary?.totalPageViews?.toLocaleString() || 0}
          subValue={`${summary?.totalSessions || 0} sessions`}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
        />
        <StatCard
          icon={Clock}
          label="Avg Session"
          value={`${summary?.avgSessionMinutes || 0}m`}
          subValue={`${summary?.proBonoClients || 0} pro bono clients`}
          color="bg-gradient-to-br from-amber-500 to-amber-600"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Activity Timeline */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Activity Timeline
          </h2>
          <ActivityChart data={timeline} />
        </div>

        {/* Top Pages */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            Top Pages
          </h2>
          <div className="space-y-3">
            {pages?.slice(0, 10).map((page, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="text-sm text-slate-700 truncate flex-1">
                  {page.page_path}
                </div>
                <div className="text-sm font-medium text-slate-900 ml-2">
                  {page.views}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Announcements Section */}
      <div className="mt-8 bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-amber-600" />
            System Announcements
          </h2>
          <button
            onClick={() => setShowAnnouncementForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Announcement
          </button>
        </div>

        {showAnnouncementForm && (
          <AnnouncementForm
            announcement={editingAnnouncement}
            onSave={handleSaveAnnouncement}
            onCancel={() => { setShowAnnouncementForm(false); setEditingAnnouncement(null) }}
          />
        )}

        <div className="space-y-3 mt-4">
          {announcements?.map(ann => {
            const typeIcons = {
              info: Info,
              success: CheckCircle2,
              warning: AlertCircle,
              urgent: AlertCircle,
              feature: Zap
            }
            const typeColors = {
              info: 'bg-blue-100 text-blue-700',
              success: 'bg-green-100 text-green-700',
              warning: 'bg-amber-100 text-amber-700',
              urgent: 'bg-red-100 text-red-700',
              feature: 'bg-purple-100 text-purple-700'
            }
            const Icon = typeIcons[ann.type] || Info

            return (
              <div key={ann.id} className={`p-4 rounded-xl ${ann.is_active ? 'bg-slate-50' : 'bg-slate-100 opacity-60'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${typeColors[ann.type]}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{ann.title}</div>
                      <div className="text-sm text-slate-600">{ann.message}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        Created: {new Date(ann.created_at).toLocaleDateString()}
                        {ann.expires_at && ` • Expires: ${new Date(ann.expires_at).toLocaleDateString()}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleAnnouncement(ann)}
                      className={`p-1.5 rounded ${ann.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}
                    >
                      {ann.is_active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => { setEditingAnnouncement(ann); setShowAnnouncementForm(true) }}
                      className="p-1.5 bg-slate-200 rounded hover:bg-slate-300"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAnnouncement(ann.id)}
                      className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
          {(!announcements || announcements.length === 0) && (
            <div className="text-center py-8 text-slate-500">
              No announcements yet. Create one to communicate with all users.
            </div>
          )}
        </div>
      </div>

      {/* Users Section */}
      <div className="mt-8 bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" />
            User Activity
          </h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search users..."
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          {users?.map(user => (
            <UserRow 
              key={user.id} 
              user={user}
              onViewActivity={handleViewActivity}
            />
          ))}
          {(!users || users.length === 0) && (
            <div className="text-center py-8 text-slate-500">No users found</div>
          )}
        </div>
      </div>

      {/* User Activity Modal */}
      {userActivity && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{userActivity.client?.name}</h3>
                <p className="text-sm text-slate-500">{userActivity.client?.email}</p>
              </div>
              <button onClick={() => setUserActivity(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <h4 className="font-medium text-slate-900 mb-3">Recent Sessions</h4>
              <div className="space-y-2 mb-6">
                {userActivity.sessions?.slice(0, 10).map((s, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-lg text-sm">
                    <div className="flex justify-between">
                      <span>Login: {new Date(s.login_time).toLocaleString()}</span>
                      {s.is_first_login && <span className="text-purple-600">First login</span>}
                    </div>
                    {s.logout_time && <div className="text-slate-500">Logout: {new Date(s.logout_time).toLocaleString()}</div>}
                  </div>
                ))}
              </div>
              
              <h4 className="font-medium text-slate-900 mb-3">Recent Page Views</h4>
              <div className="space-y-1">
                {userActivity.pageViews?.slice(0, 20).map((pv, i) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-slate-100">
                    <span className="text-slate-700">{pv.page_path}</span>
                    <span className="text-slate-500">{new Date(pv.timestamp).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
