import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  Palette, Type, Layout, Sun, Moon, Sparkles, Check,
  RotateCcw, Save, Eye, Sliders, Maximize2, Minimize2
} from 'lucide-react'

// Color presets
const COLOR_PRESETS = [
  { name: 'Ocean Blue', primary: '#3B82F6', accent: '#0EA5E9' },
  { name: 'Royal Purple', primary: '#8B5CF6', accent: '#A855F7' },
  { name: 'Forest Green', primary: '#10B981', accent: '#059669' },
  { name: 'Sunset Orange', primary: '#F97316', accent: '#FB923C' },
  { name: 'Rose Pink', primary: '#EC4899', accent: '#F472B6' },
  { name: 'Crimson Red', primary: '#EF4444', accent: '#F87171' },
  { name: 'Golden Amber', primary: '#F59E0B', accent: '#FBBF24' },
  { name: 'Slate Gray', primary: '#64748B', accent: '#94A3B8' },
  { name: 'Teal', primary: '#14B8A6', accent: '#2DD4BF' },
  { name: 'Indigo', primary: '#6366F1', accent: '#818CF8' },
]

// Font options
const FONT_OPTIONS = [
  { id: 'Inter', name: 'Inter', sample: 'Modern & Clean' },
  { id: 'Georgia', name: 'Georgia', sample: 'Classic & Elegant' },
  { id: 'Roboto', name: 'Roboto', sample: 'Friendly & Open' },
  { id: 'Poppins', name: 'Poppins', sample: 'Bold & Contemporary' },
  { id: 'Merriweather', name: 'Merriweather', sample: 'Traditional & Readable' },
  { id: 'Source Sans Pro', name: 'Source Sans Pro', sample: 'Professional & Neutral' },
]

// Font size options
const FONT_SIZES = [
  { id: 'small', name: 'Small', scale: '0.875' },
  { id: 'medium', name: 'Medium', scale: '1' },
  { id: 'large', name: 'Large', scale: '1.125' },
  { id: 'xl', name: 'Extra Large', scale: '1.25' },
]

// Theme presets (complete themes)
const THEME_PRESETS = [
  { 
    id: 'default', 
    name: 'GrantFlow Classic',
    primary: '#3B82F6',
    accent: '#8B5CF6',
    font: 'Inter',
    dark: false
  },
  { 
    id: 'professional', 
    name: 'Professional',
    primary: '#1E3A8A',
    accent: '#3730A3',
    font: 'Source Sans Pro',
    dark: false
  },
  { 
    id: 'creative', 
    name: 'Creative',
    primary: '#EC4899',
    accent: '#8B5CF6',
    font: 'Poppins',
    dark: false
  },
  { 
    id: 'nature', 
    name: 'Nature',
    primary: '#059669',
    accent: '#0D9488',
    font: 'Merriweather',
    dark: false
  },
  { 
    id: 'dark', 
    name: 'Dark Mode',
    primary: '#6366F1',
    accent: '#A855F7',
    font: 'Inter',
    dark: true
  },
  { 
    id: 'high-contrast', 
    name: 'High Contrast',
    primary: '#000000',
    accent: '#FBBF24',
    font: 'Arial',
    dark: false
  },
]

// Color picker component
function ColorPicker({ value, onChange, label }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-12 h-12 rounded-lg cursor-pointer border-2 border-slate-200"
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm w-28"
        />
      </div>
    </div>
  )
}

// Preview card
function PreviewCard({ preferences }) {
  const style = {
    '--primary': preferences.primary_color,
    '--accent': preferences.accent_color,
    fontFamily: preferences.font_family,
  }

  return (
    <div 
      className={`rounded-2xl overflow-hidden border-2 ${preferences.dark_mode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}
      style={style}
    >
      {/* Preview header */}
      <div 
        className="p-4"
        style={{ background: `linear-gradient(135deg, ${preferences.primary_color}, ${preferences.accent_color})` }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg" />
          <div>
            <div className="text-white font-bold">GrantFlow Preview</div>
            <div className="text-white/70 text-sm">How your dashboard will look</div>
          </div>
        </div>
      </div>

      {/* Preview content */}
      <div className="p-4 space-y-3">
        <div className={`text-lg font-bold ${preferences.dark_mode ? 'text-white' : 'text-slate-900'}`}>
          Welcome Back!
        </div>
        <p className={`text-sm ${preferences.dark_mode ? 'text-slate-400' : 'text-slate-600'}`}>
          This is how your text will appear with the selected font and colors.
        </p>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 rounded-lg text-white text-sm font-medium"
            style={{ backgroundColor: preferences.primary_color }}
          >
            Primary Button
          </button>
          <button
            className="px-4 py-2 rounded-lg text-white text-sm font-medium"
            style={{ backgroundColor: preferences.accent_color }}
          >
            Accent Button
          </button>
        </div>
        <div className={`p-3 rounded-lg ${preferences.dark_mode ? 'bg-slate-800' : 'bg-slate-100'}`}>
          <div 
            className="text-sm font-medium"
            style={{ color: preferences.primary_color }}
          >
            Sample Card
          </div>
          <div className={`text-xs ${preferences.dark_mode ? 'text-slate-400' : 'text-slate-500'}`}>
            Card content preview
          </div>
        </div>
      </div>
    </div>
  )
}

export default function UserPreferences() {
  const { client, preferences: savedPreferences, updatePreferences } = useAuth()
  const [preferences, setPreferences] = useState({
    theme: 'default',
    primary_color: '#3B82F6',
    accent_color: '#8B5CF6',
    font_family: 'Inter',
    font_size: 'medium',
    dark_mode: false,
    compact_mode: false,
    show_animations: true,
    sidebar_collapsed: false
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Load saved preferences
  useEffect(() => {
    if (savedPreferences) {
      setPreferences({ ...preferences, ...savedPreferences })
    }
  }, [savedPreferences])

  // Handle preference changes
  const handleChange = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  // Apply theme preset
  const applyTheme = (theme) => {
    setPreferences(prev => ({
      ...prev,
      theme: theme.id,
      primary_color: theme.primary,
      accent_color: theme.accent,
      font_family: theme.font,
      dark_mode: theme.dark
    }))
    setSaved(false)
  }

  // Apply color preset
  const applyColorPreset = (preset) => {
    setPreferences(prev => ({
      ...prev,
      primary_color: preset.primary,
      accent_color: preset.accent
    }))
    setSaved(false)
  }

  // Save preferences
  const handleSave = async () => {
    setSaving(true)
    try {
      await updatePreferences(preferences)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Save error:', err)
    }
    setSaving(false)
  }

  // Reset to defaults
  const handleReset = () => {
    setPreferences({
      theme: 'default',
      primary_color: '#3B82F6',
      accent_color: '#8B5CF6',
      font_family: 'Inter',
      font_size: 'medium',
      dark_mode: false,
      compact_mode: false,
      show_animations: true,
      sidebar_collapsed: false
    })
    setSaved(false)
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Palette className="w-8 h-8 text-purple-600" />
            Personalize Your Experience
          </h1>
          <p className="text-slate-600 mt-1">
            Customize colors, fonts, and layout to make GrantFlow yours
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50"
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Settings */}
        <div className="lg:col-span-2 space-y-8">
          {/* Theme Presets */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Theme Presets
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {THEME_PRESETS.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => applyTheme(theme)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    preferences.theme === theme.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex gap-2 mb-2">
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: theme.primary }}
                    />
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: theme.accent }}
                    />
                  </div>
                  <div className="font-medium text-slate-900 text-sm">{theme.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Palette className="w-5 h-5 text-blue-600" />
              Colors
            </h2>
            
            {/* Color presets */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">Quick Presets</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map(preset => (
                  <button
                    key={preset.name}
                    onClick={() => applyColorPreset(preset)}
                    className="group relative"
                    title={preset.name}
                  >
                    <div
                      className="w-10 h-10 rounded-full border-2 border-white shadow-md hover:scale-110 transition-transform"
                      style={{ background: `linear-gradient(135deg, ${preset.primary}, ${preset.accent})` }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Custom colors */}
            <div className="grid md:grid-cols-2 gap-6">
              <ColorPicker
                label="Primary Color"
                value={preferences.primary_color}
                onChange={v => handleChange('primary_color', v)}
              />
              <ColorPicker
                label="Accent Color"
                value={preferences.accent_color}
                onChange={v => handleChange('accent_color', v)}
              />
            </div>
          </div>

          {/* Typography */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Type className="w-5 h-5 text-green-600" />
              Typography
            </h2>
            
            {/* Font family */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">Font Family</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {FONT_OPTIONS.map(font => (
                  <button
                    key={font.id}
                    onClick={() => handleChange('font_family', font.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      preferences.font_family === font.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    style={{ fontFamily: font.id }}
                  >
                    <div className="font-bold text-slate-900">{font.name}</div>
                    <div className="text-sm text-slate-500">{font.sample}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Font size */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Font Size</label>
              <div className="flex gap-3">
                {FONT_SIZES.map(size => (
                  <button
                    key={size.id}
                    onClick={() => handleChange('font_size', size.id)}
                    className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                      preferences.font_size === size.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div 
                      className="font-medium text-slate-900"
                      style={{ fontSize: `${parseFloat(size.scale) * 16}px` }}
                    >
                      Aa
                    </div>
                    <div className="text-xs text-slate-500">{size.name}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Layout & Display */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Layout className="w-5 h-5 text-amber-600" />
              Layout & Display
            </h2>
            
            <div className="space-y-4">
              {/* Dark mode */}
              <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100">
                <div className="flex items-center gap-3">
                  {preferences.dark_mode ? <Moon className="w-5 h-5 text-purple-600" /> : <Sun className="w-5 h-5 text-amber-500" />}
                  <div>
                    <div className="font-medium text-slate-900">Dark Mode</div>
                    <div className="text-sm text-slate-500">Use dark theme for the interface</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.dark_mode}
                  onChange={e => handleChange('dark_mode', e.target.checked)}
                  className="w-5 h-5 text-purple-600 rounded"
                />
              </label>

              {/* Compact mode */}
              <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100">
                <div className="flex items-center gap-3">
                  <Minimize2 className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="font-medium text-slate-900">Compact Mode</div>
                    <div className="text-sm text-slate-500">Reduce spacing for more content</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.compact_mode}
                  onChange={e => handleChange('compact_mode', e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
              </label>

              {/* Animations */}
              <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-pink-600" />
                  <div>
                    <div className="font-medium text-slate-900">Animations</div>
                    <div className="text-sm text-slate-500">Enable smooth transitions and effects</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.show_animations}
                  onChange={e => handleChange('show_animations', e.target.checked)}
                  className="w-5 h-5 text-pink-600 rounded"
                />
              </label>

              {/* Collapsed sidebar */}
              <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100">
                <div className="flex items-center gap-3">
                  <Maximize2 className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="font-medium text-slate-900">Expanded Sidebar</div>
                    <div className="text-sm text-slate-500">Show full sidebar by default</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={!preferences.sidebar_collapsed}
                  onChange={e => handleChange('sidebar_collapsed', !e.target.checked)}
                  className="w-5 h-5 text-green-600 rounded"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-slate-600" />
              Live Preview
            </h2>
            <PreviewCard preferences={preferences} />
            
            <div className="mt-4 p-4 bg-blue-50 rounded-xl">
              <div className="text-sm text-blue-800">
                <strong>Tip:</strong> Your preferences will be applied across all pages after saving.
                Some changes may require a page refresh.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
