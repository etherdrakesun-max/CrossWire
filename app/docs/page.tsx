'use client'

import { useState } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { Terminal, Copy, Check, BookOpen, Key, Cpu, HelpCircle } from 'lucide-react'

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<string>('intro')
  const [copied, setCopied] = useState<boolean>(false)

  const codeString = `import { initiateWire } from '@crosswire/sdk';

// Initiate a professional wire transfer using stablecoin rails
const tx = await initiateWire({
  recipient: '0x71C4B1c62fdc51c2411649692482390f772e73A9',
  amount: 25000, // 25,000 USDC
  purposeCode: 'GDDS', // Goods Trade (ISO 20022 Purpose Code)
  reference: 'INV-2026-904', // Custom reference
  memo: 'Q1 Consulting Services'
});

console.log(\`Wire Transfer Initiated! Transaction Hash: \${tx.hash}\`);`

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const sections = [
    { id: 'intro', label: 'Introduction' },
    { id: 'quick-start', label: 'Quick Start' },
    { id: 'purpose-codes', label: 'ISO 20022 Purpose Codes' },
    { id: 'multisig', label: 'Multi-Sig Compliance' },
    { id: 'contracts', label: 'Contract References' },
  ]

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Header />

      <div className="docs-wrapper">
        {/* Sidebar Nav */}
        <aside className="docs-sidebar">
          <div className="docs-nav-group">
            <div className="docs-nav-title">Protocol Docs</div>
            {sections.map(sec => (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                onClick={() => setActiveSection(sec.id)}
                className={`docs-nav-link ${activeSection === sec.id ? 'active' : ''}`}
              >
                {sec.label}
              </a>
            ))}
          </div>
        </aside>

        {/* Content Panel */}
        <main className="docs-content animate-fade-in">
          {/* Introduction */}
          <section id="intro" style={{ scrollMarginTop: '100px' }}>
            <h1 className="flex items-center gap-3" style={{ fontSize: '36px', marginBottom: '16px' }}>
              <BookOpen className="text-success" size={32} />
              Protocol Documentation
            </h1>
            <p className="text-muted" style={{ fontSize: '15px', lineHeight: '1.6' }}>
              Welcome to the CrossWire documentation. CrossWire is an enterprise-grade payment routing protocol designed to replace SWIFT communications with immediate, stablecoin-based settlement on the Arc blockchain.
            </p>
            <h2 style={{ fontSize: '20px', marginTop: '32px' }}>Why Build on Arc & Circle?</h2>
            <p className="text-muted" style={{ lineHeight: '1.6' }}>
              Traditional wire transfers depend on correspondent banking networks, creating delays of up to 5 days, manual reconciliations, and unpredictable intermediary fees. CrossWire leverages:
            </p>
            <ul className="text-muted" style={{ paddingLeft: '20px', margin: '16px 0', lineHeight: '1.8' }}>
              <li><strong>USDC Native Gas on Arc</strong>: Transactions are executed directly using USDC gas precompiles. Developers and users do not need to purchase or handle volatile native network tokens.</li>
              <li><strong>Circle CCTP (Cross-Chain Transfer Protocol)</strong>: Bridges assets securely across EVM networks by burning USDC on source networks and minting on destination networks, removing bridging pools.</li>
              <li><strong>ISO 20022 standard metadata</strong>: Links on-chain transactions directly to traditional corporate accounting structures.</li>
            </ul>
          </section>

          {/* Quick Start */}
          <section id="quick-start" style={{ scrollMarginTop: '100px', marginTop: '60px' }}>
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', marginBottom: '40px' }} />
            <h2 className="flex items-center gap-2" style={{ fontSize: '24px' }}>
              <Cpu size={24} className="text-success" />
              Quick Start
            </h2>
            <p className="text-muted" style={{ lineHeight: '1.6' }}>
              Test your first wire transfer using the CrossWire UI or Web3 SDK integrations in under 3 minutes.
            </p>

            <h3 style={{ fontSize: '16px', marginTop: '24px' }}>1. Acquire Testnet Funds</h3>
            <p className="text-muted" style={{ lineHeight: '1.6' }}>
              Visit the <a href="https://faucet.circle.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--success)', textDecoration: 'underline' }}>Circle Faucet</a> to request Testnet USDC on Arbitrum Sepolia, Base Sepolia, or Ethereum Sepolia.
            </p>

            <h3 style={{ fontSize: '16px', marginTop: '20px' }}>2. Bridge Assets</h3>
            <p className="text-muted" style={{ lineHeight: '1.6' }}>
              Access the CCTP Bridge in our app dashboard to burn USDC on Sepolia networks and mint native USDC on Arc Testnet. Settlement finalizes in sub-second times.
            </p>

            <h3 style={{ fontSize: '16px', marginTop: '20px' }}>3. Execute a SWIFT-styled Wire</h3>
            <p className="text-muted" style={{ lineHeight: '1.6' }}>
              Use our Send page to supply recipient addresses, amount, purpose codes, and invoice references.
            </p>

            <div className="code-box">
              <div className="flex justify-between items-center" style={{ marginBottom: '12px' }}>
                <span className="text-xs text-muted text-mono flex items-center gap-2">
                  <Terminal size={14} /> QuickStart.ts
                </span>
                <button onClick={handleCopy} className="btn ghost" style={{ padding: '4px 8px', fontSize: '12px' }}>
                  {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="text-mono" style={{ fontSize: '12px', overflowX: 'auto', color: 'var(--text-primary)' }}>
                <code>{codeString}</code>
              </pre>
            </div>
          </section>

          {/* ISO 20022 Purpose Codes */}
          <section id="purpose-codes" style={{ scrollMarginTop: '100px', marginTop: '60px' }}>
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', marginBottom: '40px' }} />
            <h2 className="flex items-center gap-2" style={{ fontSize: '24px' }}>
              <Key size={24} className="text-success" />
              ISO 20022 Purpose Codes
            </h2>
            <p className="text-muted" style={{ lineHeight: '1.6' }}>
              CrossWireRouter embeds transaction classification tags that mirror SWIFT purpose messaging standards, improving regulatory checks and enterprise invoice reconciliations.
            </p>
            <table className="database-table" style={{ fontSize: '12px', marginTop: '16px' }}>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>SWIFT Name</th>
                  <th>Common Use Case</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>GDDS</code></td>
                  <td>Goods Trade</td>
                  <td>Supplier payments for inventory and materials</td>
                </tr>
                <tr>
                  <td><code>SCVE</code></td>
                  <td>Services</td>
                  <td>Contractor invoices, consulting, marketing fees</td>
                </tr>
                <tr>
                  <td><code>SALA</code></td>
                  <td>Salary</td>
                  <td>Employee payroll, remote workforce rewards</td>
                </tr>
                <tr>
                  <td><code>TREA</code></td>
                  <td>Treasury</td>
                  <td>Internal treasury transfers, rebalancing</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Multi-Sig Compliance */}
          <section id="multisig" style={{ scrollMarginTop: '100px', marginTop: '60px' }}>
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', marginBottom: '40px' }} />
            <h2 className="flex items-center gap-2" style={{ fontSize: '24px' }}>
              <HelpCircle size={24} className="text-success" />
              Multi-Sig Compliance
            </h2>
            <p className="text-muted" style={{ lineHeight: '1.6' }}>
              Security rules are written directly into smart contracts. Any single wire transfer transaction exceeding <strong>$10,000 USDC</strong> requires multi-signature validation.
            </p>
            <div className="callout" style={{ background: 'var(--bg-secondary)' }}>
              <div>
                <strong>Signatory Requirement:</strong>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  A minimum of 2-out-of-3 signatory signatures must be recorded in the contract ledger before the pending transfer is authorized and executed.
                </p>
              </div>
            </div>
          </section>

          {/* Contract References */}
          <section id="contracts" style={{ scrollMarginTop: '100px', marginTop: '60px' }}>
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', marginBottom: '40px' }} />
            <h2 style={{ fontSize: '24px' }}>Contract References</h2>
            <p className="text-muted" style={{ lineHeight: '1.6' }}>
              CrossWire is deployed and active on the Arc Testnet. Explore the addresses and ABI declarations below to integrate directly.
            </p>

            <table className="database-table" style={{ fontSize: '12px', marginTop: '16px' }}>
              <thead>
                <tr>
                  <th>Contract Name</th>
                  <th>Network</th>
                  <th>On-chain Address</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>CrossWireRouter</td>
                  <td>Arc Testnet</td>
                  <td className="text-mono"><code>0x28972Ea3B462bCc711BCE1a1D13426e64906a46C</code></td>
                </tr>
                <tr>
                  <td>USDC ERC20 Gas Token</td>
                  <td>Arc Testnet</td>
                  <td className="text-mono"><code>0x07865c6E87B9F70255377e024ace6630C1Eaa37F</code></td>
                </tr>
                <tr>
                  <td>Circle CCTP MessageTransmitter</td>
                  <td>Ethereum Sepolia</td>
                  <td className="text-mono"><code>0x7865c6E87B9F70255377e024ace6630C1Eaa37F</code></td>
                </tr>
              </tbody>
            </table>
          </section>
        </main>
      </div>

      <Footer />
    </div>
  )
}
