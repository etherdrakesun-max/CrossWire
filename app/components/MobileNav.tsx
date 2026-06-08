'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Send, BookOpen, FileText, TrendingUp } from 'lucide-react'

export default function MobileNav() {
  const pathname = usePathname()

  const navItems = [
    { href: '/dashboard', icon: LayoutGrid, label: 'Home' },
    { href: '/send', icon: Send, label: 'Send' },
    { href: '/contacts', icon: BookOpen, label: 'Contacts' },
    { href: '/invoices', icon: FileText, label: 'Invoices' },
    { href: '/analytics', icon: TrendingUp, label: 'Analytics' }
  ]

  return (
    <div className="mobile-nav-container print:hidden">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href
        return (
          <Link 
            key={item.href} 
            href={item.href} 
            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
