export interface SandboxWire {
  id: number
  sender: string
  recipient: string
  amount: string // in raw units (e.g. 6 decimals string)
  refHash: string
  status: 'INITIATED' | 'APPROVED' | 'EXECUTED' | 'CANCELLED'
  memo: string
  timestamp: string
  txHash: string
  purposeCode: number
  events: Array<{
    eventType: 'Initiated' | 'Approved' | 'Executed' | 'Cancelled'
    actor: string
    txHash: string
    timestamp: string
  }>
}

export interface SandboxInvoice {
  id: number
  slug: string
  payeeAddr: string
  payerAddr: string | null
  amount: string // e.g. "250.00"
  memo: string
  dueDate: string | null
  status: 'SENT' | 'PAID' | 'CANCELLED'
  timestamp: string
  txHash: string | null
  paidAt: string | null
  items: Array<{
    description: string
    quantity: number
    unitPrice: string
  }>
}

export function getSandboxWires(): SandboxWire[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem('crosswire_sandbox_wires')
  return data ? JSON.parse(data) : []
}

export function addSandboxWire(wire: Omit<SandboxWire, 'id'>): SandboxWire {
  const current = getSandboxWires()
  const nextId = current.length > 0 ? Math.max(...current.map(w => w.id)) + 1 : 90001
  const newWire: SandboxWire = {
    ...wire,
    id: nextId
  }
  localStorage.setItem('crosswire_sandbox_wires', JSON.stringify([newWire, ...current]))
  return newWire
}

export function updateSandboxWireStatus(id: number, status: SandboxWire['status'], actor: string): SandboxWire | null {
  const current = getSandboxWires()
  const index = current.findIndex(w => w.id === id)
  if (index === -1) return null
  
  const wire = current[index]
  const updatedWire: SandboxWire = {
    ...wire,
    status,
    events: [
      ...wire.events,
      {
        eventType: status === 'EXECUTED' ? 'Executed' : status === 'APPROVED' ? 'Approved' : 'Cancelled',
        actor,
        txHash: '0xmocktxhash' + Math.random().toString(16).substring(2, 8),
        timestamp: new Date().toISOString()
      }
    ]
  }
  current[index] = updatedWire
  localStorage.setItem('crosswire_sandbox_wires', JSON.stringify(current))
  return updatedWire
}

// Sandbox Invoices
export function getSandboxInvoices(): SandboxInvoice[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem('crosswire_sandbox_invoices')
  if (data) return JSON.parse(data)
  
  // Return some seed draft invoices for Acme Corp (Sandbox)
  const defaultInvoices: SandboxInvoice[] = [
    {
      id: 80001,
      slug: 'sandbox-invoice-design-spec',
      payeeAddr: '0x3a92dB4F4B84F01A18d96b04C63E63e800000000',
      payerAddr: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      amount: '4500.00',
      memo: 'UI/UX Design Specification & Assets',
      dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
      status: 'SENT',
      timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
      txHash: null,
      paidAt: null,
      items: [
        { description: 'Figma wireframing & prototyping sessions', quantity: 1, unitPrice: '3000.00' },
        { description: 'Asset exports & illustration package', quantity: 1, unitPrice: '1500.00' }
      ]
    },
    {
      id: 80002,
      slug: 'sandbox-invoice-smart-audit',
      payeeAddr: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      payerAddr: '0x3a92dB4F4B84F01A18d96b04C63E63e800000000',
      amount: '12000.00',
      memo: 'Smart Contract Audit & Formal Verification',
      dueDate: new Date(Date.now() + 86400000 * 14).toISOString(),
      status: 'SENT',
      timestamp: new Date(Date.now() - 86400000 * 4).toISOString(),
      txHash: null,
      paidAt: null,
      items: [
        { description: 'CrossWireRouter audit review hours', quantity: 40, unitPrice: '300.00' }
      ]
    }
  ]
  localStorage.setItem('crosswire_sandbox_invoices', JSON.stringify(defaultInvoices))
  return defaultInvoices
}

export function addSandboxInvoice(invoice: Omit<SandboxInvoice, 'id' | 'slug' | 'timestamp' | 'txHash' | 'paidAt'>): SandboxInvoice {
  const current = getSandboxInvoices()
  const nextId = current.length > 0 ? Math.max(...current.map(i => i.id)) + 1 : 80001
  const slug = 'invoice-' + Math.random().toString(36).substring(2, 10)
  
  const newInvoice: SandboxInvoice = {
    ...invoice,
    id: nextId,
    slug,
    timestamp: new Date().toISOString(),
    txHash: null,
    paidAt: null
  }
  
  localStorage.setItem('crosswire_sandbox_invoices', JSON.stringify([newInvoice, ...current]))
  return newInvoice
}

export function updateSandboxInvoiceStatus(id: number, status: SandboxInvoice['status'], payerAddr?: string): SandboxInvoice | null {
  const current = getSandboxInvoices()
  const index = current.findIndex(i => i.id === id)
  if (index === -1) return null
  
  const invoice = current[index]
  const updatedInvoice: SandboxInvoice = {
    ...invoice,
    status,
    payerAddr: payerAddr || invoice.payerAddr,
    paidAt: status === 'PAID' ? new Date().toISOString() : invoice.paidAt,
    txHash: status === 'PAID' ? '0xmock_pay_tx_' + Math.random().toString(16).substring(2, 10) : invoice.txHash
  }
  
  current[index] = updatedInvoice
  localStorage.setItem('crosswire_sandbox_invoices', JSON.stringify(current))
  return updatedInvoice
}
