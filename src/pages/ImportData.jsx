import React, { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Upload, 
  FileJson,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Database,
  RefreshCw
} from 'lucide-react'
import { importApi } from '../api/client'

export default function ImportData() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)
  const [importResults, setImportResults] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['stats'],
    queryFn: importApi.stats
  })
  
  const importMutation = useMutation({
    mutationFn: importApi.base44,
    onSuccess: (data) => {
      setImportResults(data)
      queryClient.invalidateQueries()
      refetchStats()
    }
  })
  
  const handleFileSelect = async (file) => {
    if (!file) return
    
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      if (!data.entities) {
        alert('Invalid export file: missing "entities" field')
        return
      }
      
      importMutation.mutate(data)
    } catch (err) {
      alert('Failed to parse file: ' + err.message)
    }
  }
  
  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.json')) {
      handleFileSelect(file)
    }
  }
  
  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }
  
  const handleDragLeave = () => {
    setDragOver(false)
  }
  
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Upload className="w-8 h-8 text-purple-600" />
          Import Data
        </h1>
        <p className="text-slate-600 mt-1">
          Import your data from Base44 export
        </p>
      </div>
      
      {/* Current Stats */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-slate-600" />
            Current Database
          </h2>
          <button
            onClick={() => refetchStats()}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
        
        {statsLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-900">{stats?.organizations || 0}</p>
              <p className="text-sm text-slate-500">Organizations</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-900">{stats?.opportunities || 0}</p>
              <p className="text-sm text-slate-500">Opportunities</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-900">{stats?.pipeline_items || 0}</p>
              <p className="text-sm text-slate-500">Pipeline Items</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-900">{stats?.matches || 0}</p>
              <p className="text-sm text-slate-500">Matches</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Import Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Import from Base44</h2>
        
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
            dragOver 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={(e) => handleFileSelect(e.target.files[0])}
            className="hidden"
          />
          
          {importMutation.isPending ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <p className="text-lg font-medium text-slate-900">Importing...</p>
              <p className="text-slate-500">Please wait while we import your data</p>
            </div>
          ) : (
            <>
              <FileJson className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-slate-900 mb-2">
                Drop your export file here
              </p>
              <p className="text-slate-500 mb-4">
                or click to browse for your grantflow-export-*.json file
              </p>
              <p className="text-sm text-slate-400">
                Supports JSON exports from Base44
              </p>
            </>
          )}
        </div>
      </div>
      
      {/* Import Results */}
      {importResults && (
        <div className={`rounded-xl border p-6 ${
          importResults.success 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start gap-3">
            {importResults.success ? (
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            )}
            <div className="flex-1">
              <h3 className={`font-semibold ${
                importResults.success ? 'text-green-900' : 'text-red-900'
              }`}>
                {importResults.success ? 'Import Successful!' : 'Import Failed'}
              </h3>
              
              {importResults.results?.imported && (
                <div className="mt-3 space-y-1">
                  <p className="text-sm font-medium text-green-800">Imported:</p>
                  {Object.entries(importResults.results.imported).map(([entity, count]) => (
                    <p key={entity} className="text-sm text-green-700">
                      • {entity}: {count} records
                    </p>
                  ))}
                </div>
              )}
              
              {importResults.results?.errors && importResults.results.errors.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-sm font-medium text-red-800">Errors:</p>
                  {importResults.results.errors.map((err, i) => (
                    <p key={i} className="text-sm text-red-700">
                      • {err.entity}: {err.error}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Instructions */}
      <div className="mt-8 p-6 bg-blue-50 rounded-xl">
        <h3 className="font-semibold text-blue-900 mb-3">How to Export from Base44</h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-800">
          <li>In your Base44 app, add the DataExport page (provided in /scripts folder)</li>
          <li>Navigate to the DataExport page in your Base44 app</li>
          <li>Click "Export All Data" to download a JSON file</li>
          <li>Drag and drop the file above, or click to browse</li>
        </ol>
        <p className="mt-4 text-sm text-blue-700">
          The import will merge data - existing records with the same ID will be updated.
        </p>
      </div>
    </div>
  )
}
