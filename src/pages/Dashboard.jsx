import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { 
  Building2, 
  Search, 
  GitBranch, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2
} from 'lucide-react'
import { importApi, pipelineApi } from '../api/client'

function StatCard({ title, value, icon: Icon, color, link }) {
  return (
    <Link 
      to={link}
      className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </Link>
  )
}

function PipelineStage({ name, count, color }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <span className="text-sm font-medium text-slate-700">{name}</span>
      </div>
      <span className="text-lg font-bold text-slate-900">{count}</span>
    </div>
  )
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: importApi.stats
  })
  
  const { data: pipelineSummary } = useQuery({
    queryKey: ['pipeline-summary'],
    queryFn: () => pipelineApi.summary()
  })
  
  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }
  
  const stages = [
    { name: 'Discovered', key: 'discovered', color: 'bg-slate-400' },
    { name: 'Interested', key: 'interested', color: 'bg-blue-400' },
    { name: 'Researching', key: 'researching', color: 'bg-purple-400' },
    { name: 'Preparing', key: 'preparing', color: 'bg-yellow-400' },
    { name: 'Drafting', key: 'drafting', color: 'bg-orange-400' },
    { name: 'Submitted', key: 'submitted', color: 'bg-green-400' },
    { name: 'Awarded', key: 'awarded', color: 'bg-emerald-500' },
  ]
  
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">Welcome to GrantFlow Local</p>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Organizations"
          value={stats?.organizations || 0}
          icon={Building2}
          color="bg-blue-500"
          link="/organizations"
        />
        <StatCard
          title="Opportunities"
          value={stats?.opportunities || 0}
          icon={Search}
          color="bg-green-500"
          link="/opportunities"
        />
        <StatCard
          title="Pipeline Items"
          value={stats?.pipeline_items || 0}
          icon={GitBranch}
          color="bg-purple-500"
          link="/pipeline"
        />
        <StatCard
          title="Matches Found"
          value={stats?.matches || 0}
          icon={Sparkles}
          color="bg-orange-500"
          link="/smart-matcher"
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-purple-600" />
            Pipeline Overview
          </h2>
          <div className="space-y-2">
            {stages.map(stage => (
              <PipelineStage
                key={stage.key}
                name={stage.name}
                count={pipelineSummary?.[stage.key] || 0}
                color={stage.color}
              />
            ))}
          </div>
          <Link
            to="/pipeline"
            className="mt-4 flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            View full pipeline <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/smart-matcher"
              className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <div className="p-2 rounded-lg bg-blue-100">
                <Sparkles className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Run Smart Match</p>
                <p className="text-sm text-slate-500">Find grants for your organizations</p>
              </div>
            </Link>
            
            <Link
              to="/item-search"
              className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-green-300 hover:bg-green-50 transition-colors"
            >
              <div className="p-2 rounded-lg bg-green-100">
                <Search className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Item Search</p>
                <p className="text-sm text-slate-500">Find funding for specific items</p>
              </div>
            </Link>
            
            <Link
              to="/organizations"
              className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition-colors"
            >
              <div className="p-2 rounded-lg bg-purple-100">
                <Building2 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Add Organization</p>
                <p className="text-sm text-slate-500">Create a new profile</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
