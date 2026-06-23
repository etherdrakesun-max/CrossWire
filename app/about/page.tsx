'use client'

import Header from '../components/Header'
import Footer from '../components/Footer'
import { Landmark, Compass, Shield, Zap } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Header />

      <main className="flex-grow about-wrapper animate-fade-in" style={{ padding: '60px 24px 100px' }}>
        <div className="about-header" style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{ fontSize: '42px', fontWeight: 600, marginBottom: '16px' }}>About CrossWire</h1>
          <p className="text-muted" style={{ fontSize: '18px', maxWidth: '600px', margin: '0 auto', lineHeight: 1.5 }}>
            Next-Generation Corporate Liquidity Routing & Instant Settlement Infrastructure.
          </p>
        </div>

        <div className="story-block" style={{ fontSize: '15px', lineHeight: '1.7', maxWidth: '800px', margin: '0 auto 48px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Re-engineering Cross-Border Settlement</h2>
          <p>
            CrossWire was established with a clear mandate: to modernize global corporate treasury rails. Traditional cross-border wire transfers are constrained by multi-tier correspondent banking networks, manual intervention, opaque fee structures, and slow reconciliations. By bringing deterministic, sub-second stablecoin settlements into compliant, enterprise-grade frameworks, CrossWire replaces obsolete legacy rails with a drop-in corporate settlement system.
          </p>
          <p style={{ marginTop: '16px' }}>
            We bridge the gap between traditional corporate accounting and decentralized blockchain efficiency. Enterprises can seamlessly route high-speed USD stablecoins directly within their standard treasury workflows, resolving the liquidity bottlenecks and high fees that typically hinder international commerce.
          </p>
        </div>

        <div className="grid-two-equal" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', maxWidth: '800px', margin: '0 auto 48px' }}>
          <div style={{ padding: '32px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: '4px' }}>
            <Compass size={32} className="text-success" style={{ marginBottom: '16px' }} />
            <h3 style={{ margin: 0, marginBottom: '12px', fontSize: '18px' }}>Our Vision</h3>
            <p className="text-muted" style={{ fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
              We envision a borderless global economy where corporate capital flows instantly and securely, free from the constraints of legacy intermediary banking holds.
            </p>
          </div>
          <div style={{ padding: '32px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: '4px' }}>
            <Landmark size={32} className="text-success" style={{ marginBottom: '16px' }} />
            <h3 style={{ margin: 0, marginBottom: '12px', fontSize: '18px' }}>Our Mission</h3>
            <p className="text-muted" style={{ fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
              To combine the legal compliance and security of legacy finance with the speed and finality of modern stablecoin networks, making institutional transfers as simple as messaging.
            </p>
          </div>
        </div>

        <div className="commitments-section" style={{ maxWidth: '800px', margin: '0 auto 48px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '24px', textAlign: 'center' }}>Our Core Commitments</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <Shield size={24} className="text-success" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <h4 style={{ margin: 0, marginBottom: '6px', fontSize: '15px', fontWeight: 600 }}>Uncompromising Compliance</h4>
                <p className="text-muted" style={{ fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
                  Every transaction routed through the CrossWire protocol undergoes automated pre-flight checks and sanctions screening, ensuring full alignment with global compliance standards.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <Zap size={24} className="text-success" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <h4 style={{ margin: 0, marginBottom: '6px', fontSize: '15px', fontWeight: 600 }}>Deterministic Settlement</h4>
                <p className="text-muted" style={{ fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
                  By leveraging direct contract integration on the Arc network, we achieve sub-second execution times with immediate on-chain settlement, completely bypassing multi-day settlement cycles.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
