'use client'

import Header from '../components/Header'
import Footer from '../components/Footer'
import { Landmark, Compass, Award, Heart } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Header />

      <main className="flex-grow about-wrapper animate-fade-in">
        <div className="about-header">
          <h1 style={{ fontSize: '40px', marginBottom: '16px' }}>Our Mission & Story</h1>
          <p className="text-muted" style={{ fontSize: '16px' }}>Re-engineering legacy cross-border payment infrastructure from scratch.</p>
        </div>

        <div className="story-block">
          <h2>The Hackathon Genesis</h2>
          <p>
            CrossWire was born during <strong>The Stablecoins Commerce Stack Challenge</strong> in 2026. Looking at standard wire transfer frameworks, our building team realized that corporate treasury rails are stuck in the 1970s. Relying on correspondent banks, manual Telex-like SWIFT messaging, and hefty hidden charges slows down modern business.
          </p>
          <p>
            Our goal was clear: build a drop-in replacement for SWIFT messaging by wrapping deterministic, sub-second stablecoin settlements directly in compliant corporate frameworks.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', margin: '40px 0' }}>
          <div style={{ padding: '24px', border: '1px solid var(--border)', background: 'var(--surface)' }}>
            <Compass size={32} className="text-success" style={{ marginBottom: '16px' }} />
            <h3 style={{ margin: 0, marginBottom: '8px' }}>Our Vision</h3>
            <p className="text-muted" style={{ fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
              A world where corporate settlement occurs instantly without intermediary banking hold-ups, enabling seamless, transparent commercial exchanges internationally.
            </p>
          </div>
          <div style={{ padding: '24px', border: '1px solid var(--border)', background: 'var(--surface)' }}>
            <Landmark size={32} className="text-success" style={{ marginBottom: '16px' }} />
            <h3 style={{ margin: 0, marginBottom: '8px' }}>Our Mission</h3>
            <p className="text-muted" style={{ fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
              To combine the regulatory security of legacy finance with the speed and efficiency of stablecoins, making payments as fast as messaging.
            </p>
          </div>
        </div>



        <div className="callout" style={{ justifyContent: 'center', background: 'rgba(0, 200, 83, 0.05)', borderColor: 'var(--success)' }}>
          <Heart className="text-success animate-pulse" size={18} />
          <span className="text-success">Built during the 2026 Stablecoins Commerce Stack Challenge.</span>
        </div>
      </main>

      <Footer />
    </div>
  )
}
