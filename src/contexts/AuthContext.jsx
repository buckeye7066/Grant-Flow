import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [client, setClient] = useState(null)
  const [services, setServices] = useState([])
  const [features, setFeatures] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [isFirstLogin, setIsFirstLogin] = useState(false)
  const [preferences, setPreferences] = useState(null)
  const [loading, setLoading] = useState(true)
  const location = useLocation()
  const lastPageRef = useRef(null)
  const pageStartRef = useRef(Date.now())

  // Track page views
  useEffect(() => {
    if (client && sessionId && location.pathname !== lastPageRef.current) {
      const timeOnPage = lastPageRef.current ? Math.round((Date.now() - pageStartRef.current) / 1000) : null

      fetch('/api/analytics/pageview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          sessionId,
          pagePath: location.pathname,
          pageTitle: document.title,
          timeOnPage
        })
      }).catch(console.error)

      lastPageRef.current = location.pathname
      pageStartRef.current = Date.now()
    }
  }, [location.pathname, client, sessionId])

  // Check for existing session on mount
  useEffect(() => {
    const stored = localStorage.getItem('grantflow_session')
    if (stored) {
      try {
        const data = JSON.parse(stored)
        setClient(data.client)
        setServices(data.services || [])
        setFeatures(data.features || [])
        setSessionId(data.sessionId)
        loadPreferences(data.client.id)
      } catch (err) {
        localStorage.removeItem('grantflow_session')
      }
    }
    setLoading(false)
  }, [])

  // Load user preferences
  const loadPreferences = async (clientId) => {
    try {
      const res = await fetch(`/api/analytics/preferences/${clientId}`)
      const prefs = await res.json()
      setPreferences(prefs)
      applyPreferences(prefs)
    } catch (err) {
      console.error('Error loading preferences:', err)
    }
  }

  // Apply preferences to document
  const applyPreferences = (prefs) => {
    if (!prefs) return

    const root = document.documentElement
    root.style.setProperty('--primary-color', prefs.primary_color || '#3B82F6')
    root.style.setProperty('--accent-color', prefs.accent_color || '#8B5CF6')
    root.style.fontFamily = prefs.font_family || 'Inter'
    
    const fontSizes = { small: '14px', medium: '16px', large: '18px', xl: '20px' }
    root.style.fontSize = fontSizes[prefs.font_size] || '16px'

    if (prefs.dark_mode) {
      document.body.classList.add('dark')
    } else {
      document.body.classList.remove('dark')
    }

    if (!prefs.show_animations) {
      root.style.setProperty('--animation-duration', '0s')
    } else {
      root.style.setProperty('--animation-duration', '0.3s')
    }
  }

  // Update preferences
  const updatePreferences = async (newPrefs) => {
    if (!client) return

    try {
      const res = await fetch(`/api/analytics/preferences/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPrefs)
      })
      const updated = await res.json()
      setPreferences(updated)
      applyPreferences(updated)
      return updated
    } catch (err) {
      console.error('Error updating preferences:', err)
      throw err
    }
  }

  // Login
  const login = async (accessCode) => {
    const res = await fetch('/api/clients/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_code: accessCode })
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Login failed')
    }

    const data = await res.json()

    // Create session
    const sessionRes = await fetch('/api/analytics/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: data.client.id,
        userAgent: navigator.userAgent
      })
    })
    
    const sessionData = await sessionRes.json()

    setClient(data.client)
    setServices(data.services || [])
    setFeatures(data.features || [])
    setSessionId(sessionData.sessionId)
    setIsFirstLogin(sessionData.isFirstLogin || !sessionData.hasSeenOnboarding)

    localStorage.setItem('grantflow_session', JSON.stringify({
      client: data.client,
      services: data.services,
      features: data.features,
      sessionId: sessionData.sessionId
    }))

    await loadPreferences(data.client.id)

    return data
  }

  // Logout
  const logout = async () => {
    if (sessionId) {
      await fetch(`/api/analytics/session/${sessionId}/end`, {
        method: 'POST'
      }).catch(console.error)
    }

    setClient(null)
    setServices([])
    setFeatures([])
    setSessionId(null)
    setIsFirstLogin(false)
    setPreferences(null)
    localStorage.removeItem('grantflow_session')

    document.documentElement.style.setProperty('--primary-color', '#3B82F6')
    document.documentElement.style.setProperty('--accent-color', '#8B5CF6')
    document.documentElement.style.fontFamily = 'Inter'
    document.documentElement.style.fontSize = '16px'
    document.body.classList.remove('dark')
  }

  // Mark onboarding as complete
  const markOnboardingComplete = async () => {
    if (!client) return

    await fetch('/api/analytics/onboarding-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: client.id })
    })

    setClient(prev => ({ ...prev, has_seen_onboarding: 1 }))
    setIsFirstLogin(false)

    const stored = localStorage.getItem('grantflow_session')
    if (stored) {
      const data = JSON.parse(stored)
      data.client.has_seen_onboarding = 1
      localStorage.setItem('grantflow_session', JSON.stringify(data))
    }
  }

  // Check feature access
  const hasFeature = useCallback((feature) => {
    if (client?.is_admin) return true
    return features.includes(feature)
  }, [client, features])

  const isAdmin = client?.is_admin === 1 || client?.is_admin === true

  const value = {
    client,
    services,
    features,
    sessionId,
    isFirstLogin,
    preferences,
    loading,
    isAuthenticated: !!client,
    isAdmin,
    login,
    logout,
    hasFeature,
    updatePreferences,
    markOnboardingComplete
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext