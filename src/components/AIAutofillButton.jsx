import React, { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { aiApi } from '../api/client'

export default function AIAutofillButton({ section, profileData, onAutofill }) {
  const [loading, setLoading] = useState(false)

  const handleAutofill = async () => {
    setLoading(true)
    try {
      const response = await aiApi.autofillSection({
        section,
        existingData: profileData
      })
      onAutofill(response.suggestions)
    } catch (err) {
      console.error('Autofill error:', err)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={handleAutofill}
      disabled={loading}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          AI Analyzing...
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4" />
          AI Assist
        </>
      )}
    </button>
  )
}
