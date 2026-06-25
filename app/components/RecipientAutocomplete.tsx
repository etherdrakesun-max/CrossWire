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
        <div className="autocomplete-dropdown">
          {filtered.map((contact) => (
            <div
              key={contact.id}
              onClick={() => handleSelect(contact.address)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                <User size={14} className="text-muted" style={{ minWidth: '14px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                      {contact.name}
                    </span>
                    {contact.label && (
                      <span
                        style={{
                          fontSize: '10px',
                          background: 'var(--bg-secondary)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          color: 'var(--text-secondary)',
                          fontWeight: 500
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
                      color: 'var(--text-secondary)',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      marginTop: '2px'
                    }}
                  >
                    {contact.address}
                  </span>
                </div>
              </div>
              {contact.isFavorite && (
                <Star size={14} fill="var(--warning, #FFAB00)" stroke="var(--warning, #FFAB00)" style={{ minWidth: '14px' }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
