import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  Sparkles, ArrowRight, TrendingUp, Users, DollarSign, Target,
  FileText, Search, Brain, Calendar, ChevronRight, X, Heart,
  Rocket, Star, Award, CheckCircle2, MessageCircle, Zap
} from 'lucide-react'

// LJW Memorial Icon Component
export function LJWIcon({ size = 40, className = '' }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      className={className}
    >
      <defs>
        <linearGradient id="ljwGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#ljwGradient)" filter="url(#glow)" />
      <circle cx="50" cy="50" r="44" fill="white" fillOpacity="0.15" />
      <text 
        x="50" 
        y="58" 
        textAnchor="middle" 
        fill="white" 
        fontSize="28" 
        fontWeight="bold" 
        fontFamily="Georgia, serif"
        style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
      >
        LJW
      </text>
      <path 
        d="M50 75 L55 82 L50 79 L45 82 Z" 
        fill="white" 
        fillOpacity="0.8"
      />
    </svg>
  )
}

// Animated counter component
function AnimatedCounter({ value, prefix = '', suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0)
  const countRef = useRef(null)

  useEffect(() => {
    const target = parseInt(value.replace(/[^0-9]/g, ''))
    const increment = target / (duration / 16)
    let current = 0

    const timer = setInterval(() => {
      current += increment
      if (current >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(current))
      }
    }, 16)

    return () => clearInterval(timer)
  }, [value, duration])

  return <span>{prefix}{count.toLocaleString()}{suffix}</span>
}

// Anya Onboarding Modal
function AnyaOnboarding({ onComplete, userName }) {
  const [step, setStep] = useState(0)
  const [typing, setTyping] = useState(true)
  const [displayedText, setDisplayedText] = useState('')

  const messages = [
    {
      text: `Hello ${userName || 'there'}! 👋 I'm Anya, your AI-powered funding assistant. Welcome to GrantFlow!`,
      delay: 50
    },
    {
      text: `Did you notice the "LJW" in our logo? Those initials belong to a very special person - the loving father of our founder, who was his financial rock in life. This platform is built in his memory and honor. ❤️`,
      delay: 40
    },
    {
      text: `GrantFlow has helped secure over $26 million in grants and funding for individuals, businesses, and communities nationwide. And I'm here to help you be next! 🚀`,
      delay: 40
    },
    {
      text: `Let me show you what we can do together:\n\n✨ Smart Matcher - I'll find funding opportunities tailored just for you\n📝 Grant Writer - I help craft compelling applications\n🎯 Pipeline Tracker - Manage all your opportunities in one place\n📊 Profile Builder - The more I know, the better matches I find`,
      delay: 30
    },
    {
      text: `Ready to discover your funding potential? Complete your profile and let's find your perfect matches! I'm always here in the corner if you need help. 💜`,
      delay: 40
    }
  ]

  useEffect(() => {
    if (step < messages.length) {
      setTyping(true)
      setDisplayedText('')
      const text = messages[step].text
      let index = 0

      const typeTimer = setInterval(() => {
        if (index < text.length) {
          setDisplayedText(text.substring(0, index + 1))
          index++
        } else {
          setTyping(false)
          clearInterval(typeTimer)
        }
      }, messages[step].delay)

      return () => clearInterval(typeTimer)
    }
  }, [step])

  const handleNext = () => {
    if (step < messages.length - 1) {
      setStep(step + 1)
    } else {
      onComplete()
    }
  }

  const handleSkip = () => {
    onComplete()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 p-6 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-10" />
          <div className="relative flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Meet Anya</h2>
              <p className="text-white/80">Your AI Funding Assistant</p>
            </div>
          </div>
          
          {/* Progress dots */}
          <div className="flex gap-2 mt-4">
            {messages.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-8 bg-white' : i < step ? 'w-4 bg-white/60' : 'w-4 bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Message */}
        <div className="p-6 min-h-[200px]">
          <div className="prose prose-slate">
            <p className="whitespace-pre-line text-slate-700 leading-relaxed">
              {displayedText}
              {typing && <span className="animate-pulse">|</span>}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-slate-500 hover:text-slate-700 text-sm"
          >
            Skip intro
          </button>
          <button
            onClick={handleNext}
            disabled={typing}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50"
          >
            {step < messages.length - 1 ? 'Continue' : "Let's Go!"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scale-in {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in { animation: scale-in 0.3s ease-out; }
      `}</style>
    </div>
  )
}

// Announcement Banner
function AnnouncementBanner({ announcements }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [dismissed, setDismissed] = useState([])

  const activeAnnouncements = announcements.filter(a => !dismissed.includes(a.id))

  useEffect(() => {
    if (activeAnnouncements.length > 1) {
      const timer = setInterval(() => {
        setCurrentIndex(i => (i + 1) % activeAnnouncements.length)
      }, 8000)
      return () => clearInterval(timer)
    }
  }, [activeAnnouncements.length])

  if (activeAnnouncements.length === 0) return null

  const current = activeAnnouncements[currentIndex]
  const typeColors = {
    info: 'from-blue-500 to-blue-600',
    success: 'from-green-500 to-green-600',
    warning: 'from-amber-500 to-amber-600',
    urgent: 'from-red-500 to-red-600',
    feature: 'from-purple-500 to-purple-600'
  }

  return (
    <div className={`bg-gradient-to-r ${typeColors[current.type] || typeColors.info} text-white px-4 py-3 rounded-xl mb-6 relative overflow-hidden`}>
      <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            {current.type === 'feature' ? <Zap className="w-4 h-4" /> : 
             current.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> :
             <MessageCircle className="w-4 h-4" />}
          </div>
          <div>
            <div className="font-semibold">{current.title}</div>
            <div className="text-sm text-white/90">{current.message}</div>
          </div>
        </div>
        <button
          onClick={() => setDismissed([...dismissed, current.id])}
          className="p-1 hover:bg-white/20 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {activeAnnouncements.length > 1 && (
        <div className="flex gap-1 mt-2 justify-center">
          {activeAnnouncements.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentIndex ? 'bg-white w-4' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Quick Action Card
function QuickAction({ icon: Icon, title, description, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group bg-white rounded-2xl p-6 text-left border border-slate-200 hover:border-transparent hover:shadow-xl hover:scale-105 transition-all duration-300"
    >
      <div className={`w-14 h-14 ${color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        <Icon className="w-7 h-7 text-white" />
      </div>
      <h3 className="font-bold text-slate-900 text-lg mb-1">{title}</h3>
      <p className="text-slate-600 text-sm">{description}</p>
      <div className="flex items-center gap-1 mt-3 text-sm font-medium text-blue-600 group-hover:gap-2 transition-all">
        Get started <ChevronRight className="w-4 h-4" />
      </div>
    </button>
  )
}

// Main Landing Page
export default function LandingPage() {
  const navigate = useNavigate()
  const { client, isFirstLogin, markOnboardingComplete, preferences } = useAuth()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [announcements, setAnnouncements] = useState([])
  const [stats, setStats] = useState({
    totalFunding: '26000000',
    organizationsHelped: '1200',
    successRate: '78',
    activeOpportunities: '5000'
  })

  useEffect(() => {
    // Check if should show onboarding
    if (isFirstLogin || client?.has_seen_onboarding === 0) {
      setShowOnboarding(true)
    }

    // Fetch announcements
    fetch(`/api/analytics/announcements?clientId=${client?.id}`)
      .then(r => r.json())
      .then(setAnnouncements)
      .catch(console.error)
  }, [isFirstLogin, client])

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false)
    if (markOnboardingComplete) {
      await markOnboardingComplete()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Onboarding Modal */}
      {showOnboarding && (
        <AnyaOnboarding 
          onComplete={handleOnboardingComplete}
          userName={client?.name?.split(' ')[0]}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Announcements */}
        <AnnouncementBanner announcements={announcements} />

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-8 md:p-12 mb-8">
          {/* Animated background */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full filter blur-3xl animate-pulse" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-pink-300 rounded-full filter blur-3xl animate-pulse delay-1000" />
          </div>

          <div className="relative flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <LJWIcon size={50} />
                <div className="px-3 py-1 bg-white/20 rounded-full text-white text-sm backdrop-blur-sm">
                  ✨ Your funding journey starts here
                </div>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Welcome back, {client?.name?.split(' ')[0] || 'Friend'}!
              </h1>
              
              <p className="text-xl text-white/90 mb-6">
                Let's discover funding opportunities tailored just for you.
                Anya is ready to help you succeed.
              </p>

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => navigate('/smart-matcher')}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-purple-700 rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all"
                >
                  <Sparkles className="w-5 h-5" />
                  Find Funding Now
                </button>
                <button
                  onClick={() => navigate('/organizations')}
                  className="flex items-center gap-2 px-6 py-3 bg-white/20 text-white rounded-xl font-medium backdrop-blur-sm hover:bg-white/30 transition-all"
                >
                  <FileText className="w-5 h-5" />
                  Complete Profile
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-5 text-white text-center">
                <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-80" />
                <div className="text-3xl font-bold">
                  $<AnimatedCounter value={stats.totalFunding} suffix="M" />
                </div>
                <div className="text-sm text-white/80">Funding Secured</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-5 text-white text-center">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-80" />
                <div className="text-3xl font-bold">
                  <AnimatedCounter value={stats.organizationsHelped} suffix="+" />
                </div>
                <div className="text-sm text-white/80">Organizations Helped</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-5 text-white text-center">
                <Award className="w-8 h-8 mx-auto mb-2 opacity-80" />
                <div className="text-3xl font-bold">
                  <AnimatedCounter value={stats.successRate} suffix="%" />
                </div>
                <div className="text-sm text-white/80">Success Rate</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-5 text-white text-center">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-80" />
                <div className="text-3xl font-bold">
                  <AnimatedCounter value={stats.activeOpportunities} suffix="+" />
                </div>
                <div className="text-sm text-white/80">Opportunities</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Quick Actions</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <QuickAction
            icon={Search}
            title="Smart Matcher"
            description="AI-powered matching to find your perfect funding opportunities"
            color="bg-gradient-to-br from-blue-500 to-blue-600"
            onClick={() => navigate('/smart-matcher')}
          />
          <QuickAction
            icon={FileText}
            title="Grant Writer"
            description="Let Anya help you craft compelling grant applications"
            color="bg-gradient-to-br from-purple-500 to-purple-600"
            onClick={() => navigate('/grant-writer')}
          />
          <QuickAction
            icon={Target}
            title="My Pipeline"
            description="Track and manage all your funding applications"
            color="bg-gradient-to-br from-green-500 to-green-600"
            onClick={() => navigate('/pipeline')}
          />
          <QuickAction
            icon={Calendar}
            title="Opportunities"
            description="Browse available grants and funding sources"
            color="bg-gradient-to-br from-amber-500 to-amber-600"
            onClick={() => navigate('/opportunities')}
          />
        </div>

        {/* LJW Tribute Section */}
        <div className="bg-white rounded-2xl p-8 border border-slate-200 mb-8">
          <div className="flex items-center gap-6">
            <LJWIcon size={80} />
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                Built with Love <Heart className="w-5 h-5 text-red-500 fill-red-500" />
              </h3>
              <p className="text-slate-600">
                The "LJW" in our logo stands for a father who was the financial rock in our founder's life. 
                This platform is dedicated to his memory – helping others achieve financial stability and 
                success in the same way he helped his family. Every grant we help secure carries forward 
                his legacy of support and generosity.
              </p>
            </div>
          </div>
        </div>

        {/* Ask Anya floating button */}
        <button
          onClick={() => setShowOnboarding(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center text-white z-40"
        >
          <Sparkles className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}
