import { useState, useEffect, useRef } from 'react'
import { Search, Star, User } from 'lucide-react'

interface Contact {
  id: number
  name: string
  address: string
  label: string
  isFavorite: boolean
}

interface RecipientAutocompleteProps {
  ownerAddr: string
  value: string
  onChange: (val: string) => void
  placeholder?: string
}

export default function RecipientAutocomplete({
  ownerAddr,
  value,
  onChange,
  placeholder = '0x...',
}: RecipientAutocompleteProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filtered, setFiltered] = useState<Contact[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch contacts for this user wallet address
  useEffect(() => {
    if (!ownerAddr) {
      setContacts([])
      return
    }

    const fetchContacts = async () => {
      try {
        const res = await fetch(`/api/contacts?ownerAddr=${ownerAddr}`)
        if (res.ok) {
          const data = await res.json()
          setContacts(data)
        }
      } catch (err) {
        console.error('Error fetching contacts for autocomplete:', err)
      }
    }

    fetchContacts()
  }, [ownerAddr])

  // Filter contacts based on query input
  useEffect(() => {
    if (!value) {
      // If empty, show all contacts (favorites first)
      setFiltered(contacts)
      return
    }

    const searchStr = value.toLowerCase()
    const matching = contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(searchStr) ||
        c.address.toLowerCase().includes(searchStr) ||
        c.label.toLowerCase().includes(searchStr)
    )
    setFiltered(matching)
  }, [value, contacts])

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const handleSelect = (address: string) => {
    onChange(address)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <input
        className="input-notion"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
      />

      {isOpen && filtered.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            background: 'var(--bg-card, #1c1c1e)',
            border: '1px solid var(--border, #2c2c2e)',
            borderRadius: '4px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            maxHeight: '220px',
            overflowY: 'auto',
            zIndex: 1000,
          }}
        >
          {filtered.map((contact) => (
            <div
              key={contact.id}
              onClick={() => handleSelect(contact.address)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                cursor: 'pointer',
                borderBottom: '1px solid var(--border, #2c2c2e)',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <User size={14} className="text-muted" style={{ minWidth: '14px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap' }}>
                      {contact.name}
                    </span>
                    {contact.label && (
                      <span
                        style={{
                          fontSize: '10px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          padding: '1px 4px',
                          borderRadius: '2px',
                          color: 'var(--text-muted, #8e8e93)',
                        }}
                      >
                        {contact.label}
                      </span>
                    )}
                  </div>
                  <span
                    className="text-mono"
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted, #8e8e93)',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {contact.address}
                  </span>
                </div>
              </div>
              {contact.isFavorite && (
                <Star size={14} fill="var(--accent, #f5a623)" stroke="var(--accent, #f5a623)" style={{ minWidth: '14px' }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
