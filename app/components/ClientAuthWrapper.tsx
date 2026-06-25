'use client'

import React, { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAccount } from '@/lib/use-crosswire-account'
import AuthGate from './AuthGate'

interface ClientAuthWrapperProps {
  children: React.ReactNode
}

export default function ClientAuthWrapper({ children }: ClientAuthWrapperProps) {
  const pathname = usePathname()
  const { address } = useAccount()

  // Define public paths that bypass authentication checks
  const isPublicPath = (path: string): boolean => {
    if (path === '/' || path === '/favicon.ico' || path === '/site.webmanifest') return true
    
    const publicPrefixes = ['/docs', '/faq', '/about', '/support', '/terms', '/privacy', '/pay']
    return publicPrefixes.some(prefix => path.startsWith(prefix))
  }

  // Global fetch monkey-patch to append the authentication header to all relative API calls
  useEffect(() => {
    if (typeof window === 'undefined' || !address) return

    const originalFetch = window.fetch
    window.fetch = async function (input, init) {
      let url = ''
      if (typeof input === 'string') {
        url = input
      } else if (input instanceof URL) {
        url = input.toString()
      } else if (input && typeof input === 'object' && 'url' in input) {
        url = (input as Request).url
      }

      // Intercept calls to internal API routes
      const isRelativeApi = url.startsWith('/api/') || url.startsWith('api/')
      const isAbsoluteApi = url.startsWith(window.location.origin + '/api/')

      if (isRelativeApi || isAbsoluteApi) {
        const options = init || {}
        const headers = new Headers(options.headers || {})

        if (!headers.has('x-user-address')) {
          headers.set('x-user-address', address)
        }

        options.headers = headers
        return originalFetch(input, options)
      }

      return originalFetch(input, init)
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [address])

  // If path is public, bypass AuthGate
  if (isPublicPath(pathname)) {
    return <>{children}</>
  }

  // Otherwise, wrap in AuthGate to protect the page
  return <AuthGate>{children}</AuthGate>
}
