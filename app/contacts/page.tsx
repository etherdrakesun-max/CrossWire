'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import toast from 'react-hot-toast'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import {
  BookOpen,
  Search,
  Plus,
  Trash2,
  Star,
  Download,
  Upload,
  UserPlus,
  Edit2,
  Check,
  X,
  FileSpreadsheet
} from 'lucide-react'
import { useModal } from '@/lib/modal-context'
import Papa from 'papaparse'

interface Contact {
  id: number
  name: string
  address: string
  label: string
  isFavorite: boolean
  lastUsedAt: string | null
}

export default function ContactsPage() {
  const { address, isConnected } = useAccount()
  const { showModal, updateModal } = useModal()

  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Form State for creating a contact
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newIsFavorite, setNewIsFavorite] = useState(false)

  // Editing State
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editLabel, setEditLabel] = useState('')
  const [editIsFavorite, setEditIsFavorite] = useState(false)

  // Fetch contacts
  const fetchContacts = async () => {
    if (!address) {
      setContacts([])
      setLoading(false)
      return
    }

    try {
      const url = `/api/contacts?ownerAddr=${address}&search=${encodeURIComponent(searchQuery)}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setContacts(data)
      }
    } catch (err) {
      console.error('Error fetching contacts:', err)
      toast.error('Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContacts()
  }, [address, searchQuery])

  // Handle create
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address) {
      toast.error('Please connect your wallet first')
      return
    }

    if (!newName || !newAddress) {
      toast.error('Name and Address are required')
      return
    }

    if (!newAddress.startsWith('0x') || newAddress.length !== 42) {
      toast.error('Invalid beneficiary address format')
      return
    }

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerAddr: address,
          name: newName,
          address: newAddress,
          label: newLabel,
          isFavorite: newIsFavorite,
        }),
      })

      if (res.ok) {
        toast.success('Contact saved successfully!')
        setIsAdding(false)
        setNewName('')
        setNewAddress('')
        setNewLabel('')
        setNewIsFavorite(false)
        fetchContacts()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to save contact')
      }
    } catch (e) {
      console.error(e)
      toast.error('Error saving contact')
    }
  }

  // Toggle Favorite
  const toggleFavorite = async (contact: Contact) => {
    try {
      const res = await fetch('/api/contacts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: contact.id,
          isFavorite: !contact.isFavorite,
        }),
      })

      if (res.ok) {
        toast.success(contact.isFavorite ? 'Removed from favorites' : 'Added to favorites')
        fetchContacts()
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Handle Delete
  const handleDeleteContact = async (id: number) => {
    showModal({
      type: 'confirm',
      title: 'Delete Recipient',
      description: 'Are you sure you want to delete this contact from your address book?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/contacts?id=${id}`, {
            method: 'DELETE',
          })
          if (res.ok) {
            toast.success('Contact deleted')
            fetchContacts()
          }
        } catch (e) {
          console.error(e)
          toast.error('Failed to delete contact')
        }
      },
    })
  }

  // Start Editing
  const startEdit = (contact: Contact) => {
    setEditingId(contact.id)
    setEditName(contact.name)
    setEditLabel(contact.label)
    setEditIsFavorite(contact.isFavorite)
  }

  // Save Edit
  const saveEdit = async (id: number) => {
    try {
      const res = await fetch('/api/contacts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          name: editName,
          label: editLabel,
          isFavorite: editIsFavorite,
        }),
      })

      if (res.ok) {
        toast.success('Contact updated')
        setEditingId(null)
        fetchContacts()
      } else {
        toast.error('Failed to update contact')
      }
    } catch (e) {
      console.error(e)
    }
  }

  // CSV Import handler
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !address) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsedContacts = results.data.map((row: any) => ({
          name: row.name || row.Name || '',
          address: row.address || row.Address || row.recipient || '',
          label: row.label || row.Label || row.tag || '',
          isFavorite: String(row.favorite || row.isFavorite).toLowerCase() === 'true',
        }))

        const valid = parsedContacts.filter((c) => c.name && c.address.startsWith('0x') && c.address.length === 42)

        if (valid.length === 0) {
          toast.error('No valid contacts found in CSV (requires "name" and "address" headers)')
          return
        }

        showModal({
          type: 'loading',
          title: 'Importing Contacts',
          description: `Importing ${valid.length} contacts from CSV file...`
        })

        try {
          const res = await fetch('/api/contacts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ownerAddr: address,
              contacts: valid,
            }),
          })

          if (res.ok) {
            const result = await res.json()
            updateModal({
              type: 'success',
              title: 'Import Successful',
              description: `Successfully imported ${result.count} contacts to your address book.`,
              confirmText: 'Acknowledge'
            })
            fetchContacts()
          } else {
            throw new Error('Bulk API request failed')
          }
        } catch (err) {
          console.error(err)
          updateModal({
            type: 'error',
            title: 'Import Failed',
            description: 'Could not upload bulk contacts to the server database.'
          })
        }
      },
    })
  }

  // Export CSV template
  const downloadCSVTemplate = () => {
    const csvContent = 'name,address,label,favorite\nJohn Doe,0x0000000000000000000000000000000000000000,Corporate,true\nJane Smith,0x0000000000000000000000000000000000000000,Supplier,false'
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'crosswire_contacts_template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="layout-wrapper">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <div className="page-container animate-fade-in">
          <div className="flex justify-between items-center" style={{ marginBottom: '8px' }}>
            <h1 className="flex items-center gap-3" style={{ margin: 0 }}>
              <BookOpen size={32} strokeWidth={1.5} className="text-primary" />
              Address Book
            </h1>
            
            <div className="flex gap-2">
              <button className="btn flex items-center gap-2" onClick={downloadCSVTemplate}>
                <Download size={14} />
                Template
              </button>
              <label className="btn flex items-center gap-2" style={{ cursor: 'pointer', margin: 0 }}>
                <Upload size={14} />
                Import CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  style={{ display: 'none' }}
                  disabled={!isConnected}
                />
              </label>
              <button 
                className="btn primary flex items-center gap-2"
                onClick={() => setIsAdding(!isAdding)}
                disabled={!isConnected}
              >
                <Plus size={16} />
                Add Contact
              </button>
            </div>
          </div>
          <p className="text-muted text-sm" style={{ marginBottom: '24px' }}>
            Manage beneficiary recipient accounts and corporate wallets for fast wire transfers.
          </p>

          {/* Add Contact Card */}
          {isAdding && (
            <div className="card animate-slide-up" style={{ marginBottom: '24px', maxWidth: '600px' }}>
              <div className="card-header">
                <span style={{ fontSize: '14px', fontWeight: 600 }}>Create New Beneficiary Recipient</span>
              </div>
              <form onSubmit={handleAddContact} className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Full Name</label>
                    <input
                      className="input-notion"
                      placeholder="e.g. Acme Corp Treasury"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Category / Label</label>
                    <input
                      className="input-notion"
                      placeholder="e.g. Vendor, Payouts"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Beneficiary Address (Standard hex format)</label>
                  <input
                    className="input-notion text-mono"
                    placeholder="0x..."
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group flex items-center gap-2" style={{ marginBottom: '20px' }}>
                  <input
                    type="checkbox"
                    id="newFavorite"
                    checked={newIsFavorite}
                    onChange={(e) => setNewIsFavorite(e.target.checked)}
                    style={{ margin: 0, width: '16px', height: '16px' }}
                  />
                  <label htmlFor="newFavorite" style={{ cursor: 'pointer', fontSize: '13px' }}>
                    Mark as Favorite (Pins this beneficiary to top of search lists)
                  </label>
                </div>

                <div className="flex gap-2">
                  <button type="submit" className="btn primary">Save Recipient</button>
                  <button type="button" className="btn" onClick={() => setIsAdding(false)}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* Search Bar */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-body flex gap-3 items-center" style={{ padding: '12px 16px' }}>
              <Search size={16} className="text-muted" />
              <input
                className="input-notion"
                style={{ border: 'none', padding: 0, background: 'transparent', flex: 1 }}
                placeholder="Search by beneficiary name, address, or tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Contacts Directory List */}
          <div className="card">
            <div className="card-header">
              <span style={{ fontSize: '14px', fontWeight: 600 }}>Directory Index</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {!isConnected ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <p className="text-muted text-sm">Please connect your wallet to view or update your address book.</p>
                </div>
              ) : loading ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <p className="text-muted text-sm">Querying database directory...</p>
                </div>
              ) : contacts.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <p className="text-muted text-sm">No recipients found matching your filter criteria.</p>
                </div>
              ) : (
                <table className="database-table">
                  <thead>
                    <tr>
                      <th>Favorite</th>
                      <th>Beneficiary Name</th>
                      <th>Tags</th>
                      <th>USDC Wallet Address</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((contact) => (
                      <tr key={contact.id}>
                        <td>
                          <button
                            onClick={() => toggleFavorite(contact)}
                            className="btn ghost" style={{ padding: '4px' }}
                          >
                            <Star size={16} style={{ color: contact.isFavorite ? 'var(--warning)' : 'var(--text-tertiary)' }} fill={contact.isFavorite ? 'var(--warning)' : 'none'} />
                          </button>
                        </td>
                        <td>
                          {editingId === contact.id ? (
                            <input
                              className="input-notion"
                              style={{ padding: '4px 8px', fontSize: '13px' }}
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                            />
                          ) : (
                            <span style={{ fontWeight: 500 }}>{contact.name}</span>
                          )}
                        </td>
                        <td>
                          {editingId === contact.id ? (
                            <input
                              className="input-notion"
                              style={{ padding: '4px 8px', fontSize: '13px' }}
                              value={editLabel}
                              onChange={(e) => setEditLabel(e.target.value)}
                            />
                          ) : contact.label ? (
                            <span className="badge gray">
                              {contact.label}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="text-mono">
                          {contact.address}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                            {editingId === contact.id ? (
                              <>
                                <button
                                  className="btn flex items-center gap-1" style={{ padding: '4px 10px', fontSize: '12px', color: 'var(--success)', borderColor: 'var(--success)' }}
                                  onClick={() => saveEdit(contact.id)}
                                >
                                  <Check size={12} /> Save
                                </button>
                                <button
                                  className="btn flex items-center gap-1" style={{ padding: '4px 10px', fontSize: '12px' }}
                                  onClick={() => setEditingId(null)}
                                >
                                  <X size={12} /> Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEdit(contact)}
                                  className="btn ghost" style={{ padding: '4px' }}
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteContact(contact.id)}
                                  className="btn ghost" style={{ padding: '4px', color: 'var(--danger)' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
