'use client'

import { useState } from 'react'
import { useAccount } from '@/lib/use-crosswire-account'
import { addSandboxInvoice } from '@/lib/sandbox-store'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import toast from 'react-hot-toast'
import Sidebar from '../../components/Sidebar'
import Topbar from '../../components/Topbar'
import RecipientAutocomplete from '../../components/RecipientAutocomplete'
import { 
  FileText, 
  Trash2, 
  Plus, 
  ArrowLeft, 
  Calculator,
  ChevronLeft
} from 'lucide-react'

interface LineItem {
  description: string
  quantity: number
  unitPrice: string
}

export default function InvoiceCreatePage() {
  const { address } = useAccount()
  const router = useRouter()

  // Form Fields
  const [payer, setPayer] = useState('')
  const [memo, setMemo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unitPrice: '' }
  ])
  const [submitting, setSubmitting] = useState(false)

  // Calculations
  const calculateTotal = () => {
    return lineItems.reduce((acc, item) => {
      const price = parseFloat(item.unitPrice) || 0
      return acc + (item.quantity * price)
    }, 0)
  }

  // Add Item Line
  const handleAddItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: '' }])
  }

  // Remove Item Line
  const handleRemoveItem = (index: number) => {
    if (lineItems.length === 1) {
      toast.error('An invoice must have at least one line item')
      return
    }
    const updated = lineItems.filter((_, i) => i !== index)
    setLineItems(updated)
  }

  // Update Line Item
  const handleLineItemChange = (index: number, key: keyof LineItem, value: any) => {
    const updated = [...lineItems]
    updated[index] = {
      ...updated[index],
      [key]: value
    }
    setLineItems(updated)
  }

  // Submit Invoice Creation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address) {
      toast.error('Please connect your wallet first')
      return
    }

    // Validation
    const totalAmount = calculateTotal()
    if (totalAmount <= 0) {
      toast.error('Total invoice amount must be greater than 0')
      return
    }

    const invalidItems = lineItems.some(i => !i.description || !i.unitPrice || parseFloat(i.unitPrice) <= 0)
    if (invalidItems) {
      toast.error('Please fill in description and price for all line items')
      return
    }

    setSubmitting(true)
    const isSandbox = typeof window !== 'undefined' && localStorage.getItem('crosswire_sandbox') === 'true'

    if (isSandbox) {
      setTimeout(() => {
        addSandboxInvoice({
          payeeAddr: address || '0x3a92dB4F4B84F01A18d96b04C63E63e800000000',
          payerAddr: payer || null,
          amount: totalAmount.toFixed(2),
          memo,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          status: 'SENT',
          items: lineItems
        })
        toast.success('Invoice created in Sandbox mode!')
        setSubmitting(false)
        router.push('/invoices')
      }, 1000)
      return
    }

    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payeeAddr: address,
          payerAddr: payer || null,
          amount: totalAmount.toFixed(2),
          memo,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          status: 'SENT', // Default to SENT so it is immediately active/shareable
          items: lineItems
        })
      })

      if (res.ok) {
        toast.success('Invoice created successfully')
        router.push('/invoices')
      } else {
        const errData = await res.json()
        toast.error(errData.error || 'Failed to create invoice')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error occurred during invoice generation')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="layout-wrapper">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <div className="page-container animate-fade-in" style={{ maxWidth: '1400px' }}>

          <div style={{ marginBottom: '24px' }}>
            <button 
              onClick={() => router.push('/invoices')} 
              className="btn secondary btn-sm" 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '16px' }}
            >
              <ChevronLeft size={14} /> Back to Invoices
            </button>
            <h1 className="flex items-center gap-3">
              <FileText size={32} strokeWidth={1.5} className="text-primary" />
              Generate Professional Invoice
            </h1>
            <p className="text-muted text-sm mt-1">
              Add itemized charges, client address details, due date constraints, and output a signed settlement request
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px', alignItems: 'start' }}>
            
            {/* Left: Input Form */}
            <form onSubmit={handleSubmit} className="card">
              <div className="card-header">
                <h2>Invoice Billing Details</h2>
              </div>
              <div className="card-body">
                
                {/* Header Fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                  <div className="form-group">
                    <label className="form-label">Client Payer Address (Optional)</label>
                    <RecipientAutocomplete
                      ownerAddr={address || ''}
                      value={payer}
                      onChange={(val) => setPayer(val)}
                    />
                    <p className="text-xs text-muted mt-1">Leave blank to generate an open link payable by any address.</p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">Due Date (Optional)</label>
                      <input
                        type="date"
                        className="input-notion"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Invoice Memo / Reference</label>
                      <input
                        type="text"
                        className="input-notion"
                        placeholder="e.g. Q2 Consulting Services"
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Line Items */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
                    Itemized Line Details
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {lineItems.map((item, index) => (
                      <div key={index} className="line-item-row">
                        <div>
                          <input
                            type="text"
                            className="input-notion"
                            placeholder="Item Description (e.g. Smart Contract Audit)"
                            value={item.description}
                            onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            min="1"
                            className="input-notion"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => handleLineItemChange(index, 'quantity', Number(e.target.value))}
                            required
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            className="input-notion"
                            placeholder="Price (USDC)"
                            value={item.unitPrice}
                            onChange={(e) => handleLineItemChange(index, 'unitPrice', e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <button
                            type="button"
                            className="btn btn-icon danger"
                            onClick={() => handleRemoveItem(index)}
                            title="Remove item line"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="btn secondary btn-sm mt-3"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={12} /> Add Line Item
                  </button>
                </div>

                <hr style={{ borderColor: 'rgba(255, 255, 255, 0.08)', margin: '24px 0' }} />

                {/* Summary and Submission */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Calculator size={18} className="text-secondary" />
                    <span className="text-sm text-secondary">Total:</span>
                    <strong className="text-xl text-primary font-semibold">
                      {calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
                    </strong>
                  </div>
                  
                  <div className="flex gap-2">
                    <Link href="/invoices" className="btn secondary">
                      Cancel
                    </Link>
                    <button
                      type="submit"
                      className="btn primary"
                      disabled={submitting}
                    >
                      {submitting ? 'Generating...' : 'Generate & Issue'}
                    </button>
                  </div>
                </div>

              </div>
            </form>

            {/* Right: Beautiful, Real-time Print Preview */}
            <div className="card" style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: '"Inter", sans-serif', boxShadow: 'var(--shadow-md)' }}>
              
              {/* Invoice Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>CROSSWIRE</h3>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 0 0', fontWeight: 500 }}>ISO 20022 Settlement Protocol</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: '10px', fontWeight: 700, padding: '4px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>Draft Preview</span>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0 0' }}>Date: {new Date().toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                </div>
              </div>

              {/* Payee / Payer Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '16px 0' }}>
                <div>
                  <span style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Payee (Your Address)</span>
                  <strong style={{ fontSize: '12px', color: '#334155', display: 'block', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                    {address || '0xAddress...'}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Payer (Client Address)</span>
                  <strong style={{ fontSize: '12px', color: '#334155', display: 'block', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                    {payer || 'Open (Any Wallet Payer)'}
                  </strong>
                </div>
              </div>

              {/* Live Memo */}
              {memo && (
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', borderLeft: '3px solid #3b82f6' }}>
                  <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Invoice Memo</span>
                  <p style={{ fontSize: '13px', color: '#334155', margin: 0, fontStyle: 'italic' }}>"{memo}"</p>
                </div>
              )}

              {/* Items Table */}
              <div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 600 }}>Description</th>
                      <th style={{ textAlign: 'center', padding: '8px 0', fontWeight: 600, width: '50px' }}>Qty</th>
                      <th style={{ textAlign: 'right', padding: '8px 0', fontWeight: 600, width: '90px' }}>Price</th>
                      <th style={{ textAlign: 'right', padding: '8px 0', fontWeight: 600, width: '100px' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, idx) => {
                      const qty = item.quantity || 1
                      const price = parseFloat(item.unitPrice) || 0
                      const total = qty * price
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', color: '#334155' }}>
                          <td style={{ padding: '10px 0', fontWeight: 500 }}>{item.description || 'Untitled Line Item'}</td>
                          <td style={{ padding: '10px 0', textAlign: 'center', color: '#64748b' }}>{qty}</td>
                          <td style={{ padding: '10px 0', textAlign: 'right', color: '#64748b' }}>${price.toFixed(2)}</td>
                          <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 600 }}>${total.toFixed(2)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'end', marginTop: '12px' }}>
                <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: '#64748b' }}>
                  <span>Subtotal:</span>
                  <span style={{ fontWeight: 600, color: '#334155' }}>${calculateTotal().toFixed(2)} USDC</span>
                </div>
                <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: '#64748b' }}>
                  <span>Gas sponsorship:</span>
                  <span style={{ fontWeight: 600, color: '#10b981' }}>Sponsored $0.00</span>
                </div>
                <div style={{ display: 'flex', gap: '24px', fontSize: '15px', fontWeight: 700, borderTop: '2px solid #e2e8f0', paddingTop: '8px', color: '#0f172a' }}>
                  <span>Total Amount Due:</span>
                  <span>${calculateTotal().toFixed(2)} USDC</span>
                </div>
              </div>

              {/* Due Date Constraint */}
              {dueDate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#e11d48', fontWeight: 600, border: '1px dashed #fecdd3', background: '#fff1f2', padding: '8px 12px', borderRadius: '6px' }}>
                  <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#e11d48' }}></span>
                  Settlement Due Date: {new Date(dueDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </div>
              )}

              {/* ISO 20022 Compliance Footer note */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginTop: '12px', textAlign: 'center', fontSize: '11px', color: '#94a3b8' }}>
                This is a cryptographically verifiable payment request routing through the CrossWire smart contract gateway on the Arc network.
              </div>

            </div>

          </div>

        </div>
      </div>
    </div>
  )
}
