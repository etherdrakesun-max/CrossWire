'use client'

import Header from '../components/Header'
import Footer from '../components/Footer'
import { Scale } from 'lucide-react'

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Header />

      <main className="flex-grow about-wrapper animate-fade-in" style={{ padding: '60px 24px 100px' }}>
        <h1 className="flex items-center gap-3" style={{ fontSize: '36px', marginBottom: '24px' }}>
          <Scale className="text-success" size={32} />
          Terms of Service
        </h1>
        <p className="text-muted text-mono text-xs" style={{ marginBottom: '32px' }}>Last Updated: May 29, 2026</p>

        <div className="story-block" style={{ fontSize: '14px', lineHeight: '1.6' }}>
          <p>
            Welcome to CrossWire. By interacting with our web application interface or smart contracts, you agree to these Terms of Service. Please read them carefully.
          </p>

          <h3 style={{ fontSize: '18px', marginTop: '24px', color: 'var(--text-primary)' }}>1. Protocol Nature & Code Execution</h3>
          <p>
            CrossWire operates as a decentralized, non-custodial transaction routing service. When you submit wire transactions or bridge requests, the actions are executed programmatically by smart contract code. We do not hold custody of, control, or recover your funds.
          </p>

          <h3 style={{ fontSize: '18px', marginTop: '24px', color: 'var(--text-primary)' }}>2. Testnet Status & Disclaimer</h3>
          <p>
            The current deployment of the CrossWire interface and router contract operates entirely on the <strong>Arc Testnet (Chain ID 5042002)</strong>. All tokens utilized (Testnet USDC) have zero real-world value. The software is provided "as is" without warranty of any kind. Use at your own risk.
          </p>


          <h3 style={{ fontSize: '18px', marginTop: '24px', color: 'var(--text-primary)' }}>3. Compliance & Signatory Rules</h3>
          <p>
            You agree to comply with all applicable local rules and regulations. The protocol incorporates auto-enforcing dual-authorization limits ($10,000 USDC threshold) to safeguard treasury operations. Circumventing or exploiting signatory mechanisms is strictly prohibited.
          </p>

          <h3 style={{ fontSize: '18px', marginTop: '24px', color: 'var(--text-primary)' }}>4. Revisions to Terms</h3>
          <p>
            We reserve the right to revise or modify these terms at any time to reflect protocol upgrades or regulatory compliance adjustments. Continued usage of the protocol represents acceptance of updated policies.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
