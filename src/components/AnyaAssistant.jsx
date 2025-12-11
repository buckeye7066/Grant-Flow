import React, { useState } from 'react'
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react'
import { aiApi } from '../api/client'

export default function AnyaAssistant({ context, fieldName, fieldDescription }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const openWithContext = () => {
    setIsOpen(true)
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `Hi! I'm Anya, your grant application assistant. ${fieldDescription ? `I can help you understand "${fieldName}" - ${fieldDescription}` : 'How can I help you with your profile?'}`
      }])
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    
    const userMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await aiApi.askAnya({
        question: input,
        context: context,
        fieldName: fieldName,
        fieldDescription: fieldDescription
      })
      setMessages(prev => [...prev, { role: 'assistant', content: response.answer }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I couldn't process that. Please try again." }])
    }
    setLoading(false)
  }

  return (
    <>
      <button
        onClick={openWithContext}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded"
        title="Ask Anya for help"
      >
        <MessageCircle className="w-3 h-3" />
        Ask Anya
      </button>

      {isOpen && (
        <div className="fixed bottom-4 right-4 w-96 h-[500px] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold">Anya</h3>
                <p className="text-xs text-white/80">Grant Assistant</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-lg text-sm ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-100 text-slate-800'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 p-3 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask me anything..."
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
