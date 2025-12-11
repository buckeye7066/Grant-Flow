import React from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { 
  Home, 
  Building, 
  Search, 
  Sparkles, 
  Zap, 
  FileText,
  Settings,
  Upload
} from 'lucide-react'

// Pages
import Dashboard from './pages/Dashboard'
import Organizations from './pages/Organizations'
import Opportunities from './pages/Opportunities'
import SmartMatcher from './pages/SmartMatcher'
import Pipeline from './pages/Pipeline'
import GrantWriter from './pages/GrantWriter'
import ImportData from './pages/ImportData'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

const navItems = [
  { path: '/', icon: Home, label: 'Dashboard' },
  { path: '/organizations', icon: Building, label: 'Organizations' },
  { path: '/opportunities', icon: Search, label: 'Opportunities' },
  { path: '/smart-matcher', icon: Sparkles, label: 'Smart Matcher' },
  { path: '/pipeline', icon: Zap, label: 'Pipeline' },
  { path: '/grant-writer', icon: FileText, label: 'Grant Writer' },
]

function Sidebar() {
  return (
    <div className="w-64 bg-slate-900 text-white min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-blue-400" />
          GrantFlow Local
        </h1>
      </div>
      <nav className="space-y-2">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-8 pt-8 border-t border-slate-700">
        <NavLink
          to="/import"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
              isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`
          }
        >
          <Upload className="w-5 h-5" />
          Import Data
        </NavLink>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="flex min-h-screen bg-slate-50">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/organizations" element={<Organizations />} />
              <Route path="/opportunities" element={<Opportunities />} />
              <Route path="/smart-matcher" element={<SmartMatcher />} />
              <Route path="/pipeline" element={<Pipeline />} />
              <Route path="/grant-writer" element={<GrantWriter />} />
              <Route path="/import" element={<ImportData />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
