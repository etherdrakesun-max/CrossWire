'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import toast from 'react-hot-toast'
import Sidebar from '../../components/Sidebar'
import Topbar from '../../components/Topbar'
import { 
  ShieldCheck, 
  UserCheck, 
  Upload, 
  Globe, 
  FileText,
  AlertTriangle,
  CheckCircle,
  Building,
  User,
  HelpCircle
} from 'lucide-react'

export default function KycPage() {
  const { address, isConnected } = useAccount()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Form states
  const [fullName, setFullName] = useState('')
  const [country, setCountry] = useState('US')
  const [docType, setDocType] = useState('PASSPORT')
  const [docId, setDocId] = useState('')
  const [tier, setTier] = useState('BASIC')
  const [submitting, setSubmitting] = useState(false)

  const fetchProfile = async () => {
    if (!address) return
    setLoading(true)
    try {
      const res = await fetch(`/api/compliance/kyc?wallet=${address}`)
      if (res.ok) {
        setProfile(await res.json())
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load compliance profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isConnected && address) {
      fetchProfile()
    } else {
      setLoading(false)
    }
  }, [isConnected, address])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected || !address) {
      toast.error('Please connect your corporate wallet')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/compliance/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddr: address,
          fullName,
          country,
          documentId: docId || 'DOC-US-' + Math.floor(Math.random()*1000000),
          requestedTier: tier
        })
      })

      if (res.ok) {
        toast.success('KYC Profile updated successfully!')
        fetchProfile()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Submission failed')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error submitting compliance profile')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="layout-wrapper">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <div className="page-container animate-fade-in">
          
          <div style={{ marginBottom: '24px' }}>
            <h1 className="flex items-center gap-3">
              <ShieldCheck size={32} className="text-primary" />
              Corporate KYC & Identity Onboarding
            </h1>
            <p className="text-muted text-sm mt-1">
              Verify your business identity parameters to establish compliance tiers and unlock higher transfer ceilings.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '24px', alignItems: 'start' }}>
            
            {/* Status Panel */}
            <div className="card">
              <div className="card-header">
                <h2>Verification Status</h2>
              </div>
              <div className="card-body flex flex-col gap-4">
                {!isConnected ? (
                  <p className="text-sm text-secondary">Connect your wallet to evaluate your KYC tier status.</p>
                ) : loading ? (
                  <p className="text-sm text-secondary animate-pulse">Checking status...</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="p-4 rounded-xl bg-slate-950 flex flex-col gap-3" style={{ border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-secondary">Active Risk Tier</span>
                        <span className={`badge ${
                          profile?.tier === 'UNVERIFIED' ? 'gray' : 
                          profile?.tier === 'BASIC' ? 'primary' :
                          profile?.tier === 'ENHANCED' ? 'info' : 'success'
                        }`}>
                          {profile?.tier || 'UNVERIFIED'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-secondary">Verification Result</span>
                        <span className={`badge ${
                          profile?.status === 'APPROVED' ? 'success' :
                          profile?.status === 'REJECTED' ? 'danger' : 'warning'
                        }`}>
                          {profile?.status || 'UNVERIFIED'}
                        </span>
                      </div>
                    </div>

                    {profile?.status === 'APPROVED' && (
                      <div className="p-3 bg-success/10 border border-success/30 rounded-lg flex items-center gap-2">
                        <CheckCircle className="text-success" size={16} />
                        <span className="text-xs text-success font-semibold">Your identity verification is currently valid.</span>
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      <h3 className="text-sm font-semibold text-slate-100">Tier Limits Reference</h3>
                      <div className="flex flex-col gap-2 mt-1 text-xs text-secondary">
                        <div className="flex justify-between py-1 border-b border-white/5">
                          <span>UNVERIFIED</span>
                          <strong>$100/day | $500/month</strong>
                        </div>
                        <div className="flex justify-between py-1 border-b border-white/5">
                          <span>BASIC</span>
                          <strong>$10,000/day | $50,000/month</strong>
                        </div>
                        <div className="flex justify-between py-1 border-b border-white/5">
                          <span>ENHANCED</span>
                          <strong>$100,000/day | $500,000/month</strong>
                        </div>
                        <div className="flex justify-between py-1">
                          <span>INSTITUTIONAL</span>
                          <strong>$10M/day | $50M/month</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submission Form */}
            <div className="card">
              <div className="card-header">
                <h2>Submit Verification Documents</h2>
              </div>
              <div className="card-body">
                {!isConnected ? (
                  <p className="text-sm text-secondary">Connect your wallet to configure identity verification.</p>
                ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="form-group">
                      <label className="form-label">Full Corporate Representative Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 text-secondary" size={16} />
                        <input
                          type="text"
                          className="input-notion pl-10"
                          placeholder="e.g. John Doe"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div className="form-group">
                        <label className="form-label">Incorporation Country</label>
                        <select
                          className="input-notion"
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                        >
                          <option value="US">United States</option>
                          <option value="GB">United Kingdom</option>
                          <option value="DE">Germany</option>
                          <option value="SG">Singapore</option>
                          <option value="KP">North Korea (Restricted)</option>
                          <option value="RU">Russia (Restricted)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Target Tier Tier Level</label>
                        <select
                          className="input-notion"
                          value={tier}
                          onChange={(e) => setTier(e.target.value)}
                        >
                          <option value="BASIC">Basic Verification</option>
                          <option value="ENHANCED">Enhanced Verification</option>
                          <option value="INSTITUTIONAL">Institutional Verification</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '20px' }}>
                      <div className="form-group">
                        <label className="form-label">Document Type</label>
                        <select
                          className="input-notion"
                          value={docType}
                          onChange={(e) => setDocType(e.target.value)}
                        >
                          <option value="PASSPORT">Passport</option>
                          <option value="DRIVERS_LICENSE">Driver's License</option>
                          <option value="GOVERNMENT_ID">National ID Card</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Document Serial / ID Number</label>
                        <input
                          type="text"
                          className="input-notion"
                          placeholder="e.g. N12345678"
                          value={docId}
                          onChange={(e) => setDocId(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Document File Upload</label>
                      <div 
                        className="flex flex-col items-center justify-center p-6 bg-slate-950 rounded-xl cursor-pointer"
                        style={{ border: '2px dashed rgba(255, 255, 255, 0.1)' }}
                      >
                        <Upload size={24} className="text-secondary mb-2" />
                        <span className="text-xs text-secondary">Drag & Drop identity document scan here, or click to browse</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn primary w-full mt-2"
                    >
                      {submitting ? 'Submitting Verification...' : 'Submit Identity Verification'}
                    </button>
                  </form>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  )
}
