'use client'

import Header from '../components/Header'
import Footer from '../components/Footer'
import { ShieldCheck } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Header />

      <main className="flex-grow about-wrapper animate-fade-in" style={{ padding: '60px 24px 100px' }}>
        <h1 className="flex items-center gap-3" style={{ fontSize: '36px', marginBottom: '24px' }}>
          <ShieldCheck className="text-success" size={32} />
          Privacy Policy
        </h1>
        <p className="text-muted text-mono text-xs" style={{ marginBottom: '32px' }}>Last Updated: May 29, 2026</p>

        <div className="story-block" style={{ fontSize: '14px', lineHeight: '1.6' }}>
          <p>
            This Privacy Policy describes how CrossWire ("we", "our", or "us") manages information gathered from users of the CrossWire protocol interface and application.
          </p>

          <h3 style={{ fontSize: '18px', marginTop: '24px', color: 'var(--text-primary)' }}>1. Information Recorded on Blockchains</h3>
          <p>
            When you execute stablecoin wire transfers or bridge operations through the CrossWire router contract, transaction details (including sending/recipient addresses, USDC quantities, transaction hashes, and metadata like SWIFT purpose codes) are immutably written onto public blockchain ledgers (specifically the Arc blockchain). Public ledger records are accessible to any external observer.
          </p>

          <h3 style={{ fontSize: '18px', marginTop: '24px', color: 'var(--text-primary)' }}>2. Off-Chain Information Collected</h3>
          <p>
            We do not run centralized database systems that track your physical identities, real-world locations, or private keys. The app UI is built serverless and client-side. We may store waitlist sign-up emails if explicitly provided through our waitlist subscription form.
          </p>

          <h3 style={{ fontSize: '18px', marginTop: '24px', color: 'var(--text-primary)' }}>3. Cookies & Analytics</h3>
          <p>
            We do not inject third-party ad tracking or cookie-based profiling tools. Minimal, privacy-preserving, self-hosted web traffic counters may be utilized to measure overall site performance and reliability.
          </p>

          <h3 style={{ fontSize: '18px', marginTop: '24px', color: 'var(--text-primary)' }}>4. Security Measures</h3>
          <p>
            Protocol security rules (such as multi-signature approvals for payments exceeding $10,000 USDC) are governed programmatically by smart contract code deployed on the Arc network, reducing reliance on centralized administrative interventions.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
