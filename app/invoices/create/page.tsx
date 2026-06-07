'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
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
        <div className="page-container animate-fade-in">

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

          <form onSubmit={handleSubmit} className="card">
            <div className="card-header">
              <h2>Invoice Billing Details</h2>
            </div>
            <div className="card-body">
              
              {/* Header Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div className="form-group">
                  <label className="form-label">Client Payer Address (Optional)</label>
                  <RecipientAutocomplete
                    ownerAddr={address || ''}
                    value={payer}
                    onChange={(val) => setPayer(val)}
                  />
                  <p className="text-xs text-muted mt-1">Leave blank to generate an open link payable by any address.</p>
                </div>

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

              {/* Line Items */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
                  Itemized Line Details
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {lineItems.map((item, index) => (
                    <div key={index} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1.5fr auto', gap: '12px', alignItems: 'center' }}>
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
                          <Trash2 size={12} />
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
                  <span className="text-sm text-secondary">Calculated Invoice Total:</span>
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
                    {submitting ? 'Generating Invoice...' : 'Generate & Issue'}
                  </button>
                </div>
              </div>

            </div>
          </form>

        </div>
      </div>
    </div>
  )
}
