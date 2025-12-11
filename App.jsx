import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './context/AuthContext'
import {
  Home, Users, Search, Sparkles, GitBranch, FileText, Settings,
  LogOut, ChevronLeft, ChevronRight, BarChart3, Radar, Palette,
  Menu, X
} from 'lucide-react'

// Import pages
import Login from './pages/Login'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import Organizations from './pages/Organizations'
import ProfileEditor from './pages/ProfileEditor'
import Opportunities from './pages/Opportunities'
import SmartMatcher from './pages/SmartMatcher'
import Pipeline from './pages/Pipeline'
import GrantWriter from './pages/GrantWriter'
import AdminPanel from './pages/AdminPanel'
import AdminAnalytics from './pages/AdminAnalytics'
import CrawlerManagement from './pages/CrawlerManagement'
import UserPreferences from './pages/UserPreferences'
import { LJWIcon } from './pages/LandingPage'

const queryClient = new QueryClient()

// Sidebar navigation
function Sidebar({ collapsed, setCollapsed }) {
  const { client, isAdmin, logout, preferences } = useAuth()
  const location = useLocation()

  const navItems = [
    { path: '/home', icon: Home, label: 'Home', color: 'text-blue-600' },
    { path: '/dashboard', icon: BarChart3, label: 'Dashboard', color: 'text-purple-600' },
    { path: '/organizations', icon: Users, label: 'Profiles', color: 'text-green-600' },
    { path: '/opportunities', icon: Search, label: 'Opportunities', color: 'text-amber-600' },
    { path: '/smart-matcher', icon: Sparkles, label: 'Smart Matcher', color: 'text-pink-600' },
    { path: '/pipeline', icon: GitBranch, label: 'Pipeline', color: 'text-cyan-600' },
    { path: '/grant-writer', icon: FileText, label: 'Grant Writer', color: 'text-indigo-600' },
  ]

  const adminItems = [
    { path: '/admin', icon: Settings, label: 'Clients', color: 'text-slate-600' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics', color: 'text-violet-600' },
    { path: '/crawlers', icon: Radar, label: 'Funding Discovery', color: 'text-purple-600' },
  ]

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <aside 
      className={`fixed left-0 top-0 h-full bg-white border-r border-slate-200 flex flex-col transition-all duration-300 z-50 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
      style={{
        '--sidebar-bg': preferences?.dark_mode ? '#1E293B' : '#FFFFFF',
        backgroundColor: 'var(--sidebar-bg)'
      }}
    >
      {/* Logo */}
      <div className="p-4 border-b border-slate-200">
        <Link to="/home" className="flex items-center gap-3">
          <LJWIcon size={40} />
          {!collapsed && (
            <div>
              <div className="font-bold text-slate-900" style={{ color: 'var(--primary-color)' }}>
                GrantFlow
              </div>
              <div className="text-xs text-slate-500">Funding Made Simple</div>
            </div>
          )}
        </Link>
      </div>

      {/* User info */}
      {!collapsed && client && (
        <div className="p-4 border-b border-slate-200">
          <div className="text-sm font-medium text-slate-900">{client.name}</div>
          <div className="text-xs text-slate-500">{client.organization_name || client.email}</div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
              isActive(item.path)
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            style={isActive(item.path) ? { 
              backgroundColor: `${preferences?.primary_color || '#3B82F6'}15`,
              color: preferences?.primary_color || '#3B82F6'
            } : {}}
          >
            <item.icon className={`w-5 h-5 ${collapsed ? 'mx-auto' : ''} ${isActive(item.path) ? '' : item.color}`} />
            {!collapsed && <span className="font-medium">{item.label}</span>}
          </Link>
        ))}

        {/* Admin section */}
        {isAdmin && (
          <>
            <div className={`pt-4 pb-2 ${collapsed ? 'px-2' : 'px-3'}`}>
              {!collapsed && <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Admin</div>}
              {collapsed && <div className="border-t border-slate-200" />}
            </div>
            {adminItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isActive(item.path)
                    ? 'bg-purple-50 text-purple-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                style={isActive(item.path) ? { 
                  backgroundColor: `${preferences?.accent_color || '#8B5CF6'}15`,
                  color: preferences?.accent_color || '#8B5CF6'
                } : {}}
              >
                <item.icon className={`w-5 h-5 ${collapsed ? 'mx-auto' : ''} ${isActive(item.path) ? '' : item.color}`} />
                {!collapsed && <span className="font-medium">{item.label}</span>}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* Bottom actions */}
      <div className="p-3 border-t border-slate-200 space-y-1">
        <Link
          to="/preferences"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
            isActive('/preferences')
              ? 'bg-blue-50 text-blue-700'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Palette className={`w-5 h-5 ${collapsed ? 'mx-auto' : ''}`} />
          {!collapsed && <span className="font-medium">Personalize</span>}
        </Link>
        
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut className={`w-5 h-5 ${collapsed ? 'mx-auto' : ''}`} />
          {!collapsed && <span className="font-medium">Logout</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          {!collapsed && <span className="text-sm">Collapse</span>}
        </button>
      </div>
    </aside>
  )
}

// Protected route wrapper
function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/home" replace />
  }

  return children
}

// Main layout with sidebar
function AppLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)
  const { preferences } = useAuth()

  // Apply preference for collapsed sidebar
  React.useEffect(() => {
    if (preferences?.sidebar_collapsed !== undefined) {
      setSidebarCollapsed(preferences.sidebar_collapsed)
    }
  }, [preferences?.sidebar_collapsed])

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
      <main 
        className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}
        style={{
          '--primary-color': preferences?.primary_color || '#3B82F6',
          '--accent-color': preferences?.accent_color || '#8B5CF6'
        }}
      >
        {children}
      </main>
    </div>
  )
}

// App routes
function AppRoutes() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/home" replace /> : <Login />} />

      {/* Protected routes */}
      <Route path="/home" element={
        <ProtectedRoute>
          <AppLayout><LandingPage /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <AppLayout><Dashboard /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/organizations" element={
        <ProtectedRoute>
          <AppLayout><Organizations /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/profile/new" element={
        <ProtectedRoute>
          <AppLayout><ProfileEditor /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/profile/:id" element={
        <ProtectedRoute>
          <AppLayout><ProfileEditor /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/opportunities" element={
        <ProtectedRoute>
          <AppLayout><Opportunities /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/smart-matcher" element={
        <ProtectedRoute>
          <AppLayout><SmartMatcher /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/pipeline" element={
        <ProtectedRoute>
          <AppLayout><Pipeline /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/grant-writer" element={
        <ProtectedRoute>
          <AppLayout><GrantWriter /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/preferences" element={
        <ProtectedRoute>
          <AppLayout><UserPreferences /></AppLayout>
        </ProtectedRoute>
      } />

      {/* Admin routes */}
      <Route path="/admin" element={
        <ProtectedRoute adminOnly>
          <AppLayout><AdminPanel /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/analytics" element={
        <ProtectedRoute adminOnly>
          <AppLayout><AdminAnalytics /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/crawlers" element={
        <ProtectedRoute adminOnly>
          <AppLayout><CrawlerManagement /></AppLayout>
        </ProtectedRoute>
      } />

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}

// Main App
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
