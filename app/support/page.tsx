'use client'

import { useState } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { Send, Bug, MessageSquare, HelpCircle, CheckCircle2 } from 'lucide-react'

export default function SupportPage() {
  const [name, setName] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [type, setType] = useState<string>('bug')
  const [message, setMessage] = useState<string>('')
  const [submitted, setSubmitted] = useState<boolean>(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !message) return
    setSubmitted(true)
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Header />

      <main className="flex-grow support-container animate-fade-in">
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '36px', marginBottom: '16px' }}>Support & Relations</h1>
          <p className="text-muted">Report bugs, request integrations, or coordinate developer partnership requests.</p>
        </div>

        {submitted ? (
          <div className="callout" style={{ borderColor: 'var(--success)', background: 'var(--success-bg)', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <CheckCircle2 className="text-success" size={48} style={{ marginBottom: '16px' }} />
            <h3 style={{ margin: 0, marginBottom: '8px' }}>Support Ticket Created!</h3>
            <p className="text-muted" style={{ margin: 0 }}>We will review your submission and contact you back at <strong>{email}</strong> within 24 business hours.</p>
            <button onClick={() => setSubmitted(false)} className="btn primary mt-6" style={{ fontSize: '13px' }}>
              Create Another Request
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ border: '1px solid var(--border)', padding: '32px', background: 'var(--surface)', borderRadius: '2px' }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input 
                type="text" 
                className="input-notion" 
                required 
                placeholder="Eric Jones"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Business Email</label>
              <input 
                type="email" 
                className="input-notion" 
                required 
                placeholder="ejones@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Inquiry Type</label>
              <select 
                className="input-notion" 
                style={{ appearance: 'none', background: 'var(--bg-primary)' }}
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="bug">Report an App Bug / Issue</option>
                <option value="feature">Request Protocol Feature</option>
                <option value="integration">Circle Platform / SDK Support</option>
                <option value="partner">Corporate Partnerships</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Detailed Message</label>
              <textarea 
                className="input-notion" 
                rows={5} 
                required 
                placeholder="Describe your issue or request in detail..."
                style={{ resize: 'vertical' }}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <button type="submit" className="btn primary" style={{ width: '100%' }}>
              Submit Support Ticket
            </button>
          </form>
        )}

        {/* Alternate Channels */}
        <div style={{ marginTop: '48px', borderTop: '1px solid var(--border)', paddingTop: '32px', textAlign: 'center' }}>
          <h3 style={{ marginBottom: '16px' }}>Direct Communication Channels</h3>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <a 
              href="https://discord.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn text-sm flex items-center gap-2"
            >
              <MessageSquare size={16} /> Discord
            </a>
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn text-sm flex items-center gap-2"
            >
              <Bug size={16} /> Report on GitHub
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
