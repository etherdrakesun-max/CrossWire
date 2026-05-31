'use client'

import Link from 'next/link'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="marketing-footer">
      <div className="marketing-footer-container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="logo-group">
              <div className="logo-icon"></div>
              <span className="logo-text">CrossWire</span>
            </div>
            <p className="footer-description">
              Professional wire transfer protocol built on Arc blockchain. Secure, sub-second settlements powered by USDC & CCTP.
            </p>
          </div>

          <div className="footer-links-group">
            <div className="footer-column">
              <h4>Protocol</h4>
              <Link href="/dashboard">App Dashboard</Link>
              <Link href="/send">Send Wire</Link>
              <Link href="/bridge">CCTP Bridge</Link>
              <Link href="/batch">Batch Wires</Link>
            </div>

            <div className="footer-column">
              <h4>Resources</h4>
              <Link href="/docs">Documentation</Link>
              <Link href="/docs#quick-start">Quick Start</Link>
              <Link href="/faq">FAQ</Link>
              <Link href="/integrations">Circle Stack</Link>
            </div>

            <div className="footer-column">
              <h4>Company</h4>
              <Link href="/about">About Us</Link>
              <Link href="/support">Support & Feedback</Link>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
              <a href="https://arcscan.app" target="_blank" rel="noopener noreferrer">Arc Explorer</a>
            </div>

            <div className="footer-column">
              <h4>Legal</h4>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">Terms of Service</Link>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-copy">
            &copy; {currentYear} CrossWire. All rights reserved. Deployed on Arc Testnet (Chain ID 5042002).
          </div>
          <div className="footer-status">
            <span className="status-dot"></span>
            Arc Testnet Operational
          </div>
        </div>
      </div>
    </footer>
  )
}
