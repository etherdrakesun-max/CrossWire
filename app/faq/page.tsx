'use client'

import { useState } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { HelpCircle, Search, ChevronDown } from 'lucide-react'

interface FAQItem {
  id: number
  question: string
  answer: string
  category: string
}

const FAQS: FAQItem[] = [
  {
    id: 1,
    category: 'general',
    question: 'What is CrossWire?',
    answer: 'CrossWire is an open-source, corporate stablecoin wire transfer routing engine that utilizes the Arc Testnet and Circle CCTP to execute cross-border settlements instantly with SWIFT-compatible accounting logs.'
  },
  {
    id: 2,
    category: 'general',
    question: 'Who is CrossWire built for?',
    answer: 'CrossWire is built for corporate finance departments, international payroll offices, supply-chain logistics providers, and Web3 developers who need fast, predictable, and compliant stablecoin transfer solutions.'
  },
  {
    id: 3,
    category: 'technology',
    question: 'How do transaction gas fees work on CrossWire?',
    answer: 'Thanks to Arc network design, you pay all network execution fees directly in USDC. There is no requirement to purchase, wrap, or manage separate native gas tokens like ETH, MATIC, or native network assets.'
  },
  {
    id: 4,
    category: 'technology',
    question: 'What is Circle CCTP and how does it fit into CrossWire?',
    answer: 'Circle\'s Cross-Chain Transfer Protocol (CCTP) is a utility that enables native USDC transfers across blockchains. It burns USDC on a source chain and mints a matching amount on the destination chain (e.g. from Arbitrum Sepolia to Arc).'
  },
  {
    id: 5,
    category: 'security',
    question: 'Is my transaction data public?',
    answer: 'While transaction transfers and hashes are publicly recorded on the Arc blockchain for audit compliance, sensitive references can be keccak256 hashed on-chain to protect commercial secrets while preserving verifiable audit trails.'
  },
  {
    id: 6,
    category: 'security',
    question: 'What are the compliance rules for high-value transfers?',
    answer: 'All individual transfer requests exceeding $10,000 USDC automatically trigger the secondary signatory approval engine. The assets remain in a secure escrow hold until authorized by corporate signatories.'
  },
]

export default function FAQPage() {
  const [search, setSearch] = useState<string>('')
  const [openItems, setOpenItems] = useState<number[]>([1]) // First item open by default
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const toggleFAQ = (id: number) => {
    if (openItems.includes(id)) {
      setOpenItems(openItems.filter(item => item !== id))
    } else {
      setOpenItems([...openItems, id])
    }
  }

  const filteredFAQs = FAQS.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(search.toLowerCase()) || 
                          faq.answer.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Header />

      <main className="flex-grow faq-wrapper animate-fade-in">
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 className="flex items-center gap-3 justify-center" style={{ fontSize: '36px', marginBottom: '16px' }}>
            <HelpCircle size={36} className="text-success" />
            Frequently Asked Questions
          </h1>
          <p className="text-muted">Quick answers to common inquiries about the CrossWire protocol.</p>
        </div>

        {/* Search & Category Filter */}
        <div className="faq-search-box">
          <div style={{ position: 'relative', marginBottom: '24px' }}>
            <Search 
              size={18} 
              className="text-tertiary" 
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} 
            />
            <input 
              type="text" 
              placeholder="Search questions or terms..." 
              className="input-notion" 
              style={{ paddingLeft: '40px' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="tabs" style={{ margin: 0, justifyContent: 'center' }}>
            {['all', 'general', 'technology', 'security'].map(cat => (
              <span 
                key={cat} 
                onClick={() => setActiveCategory(cat)}
                className={`tab ${activeCategory === cat ? 'active' : ''}`}
                style={{ textTransform: 'capitalize' }}
              >
                {cat}
              </span>
            ))}
          </div>
        </div>

        {/* FAQs Accordion */}
        <div className="faq-accordion">
          {filteredFAQs.length === 0 ? (
            <div className="empty-state">
              No results found matching "{search}".
            </div>
          ) : (
            filteredFAQs.map(faq => (
              <div 
                key={faq.id} 
                className={`faq-item ${openItems.includes(faq.id) ? 'active' : ''}`}
              >
                <button className="faq-question" onClick={() => toggleFAQ(faq.id)}>
                  {faq.question}
                  <ChevronDown size={16} className="faq-icon-arrow text-muted" />
                </button>
                <div className="faq-answer">
                  <p>{faq.answer}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
