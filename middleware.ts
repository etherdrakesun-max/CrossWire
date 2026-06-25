import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Regular expression to validate Ethereum address format
const ETH_ADDRESS_REGEXP = /^0x[a-fA-F0-9]{40}$/

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only check API routes under /api
  if (pathname.startsWith('/api')) {
    // Define public endpoints that bypass authentication
    const isPublicApi = 
      pathname.startsWith('/api/stats') || 
      pathname.startsWith('/api/auth') || 
      pathname.startsWith('/api/sponsor')

    if (isPublicApi) {
      return NextResponse.next()
    }

    // Try to get the wallet address from query parameters
    let address = 
      request.nextUrl.searchParams.get('address') ||
      request.nextUrl.searchParams.get('userAddress') ||
      request.nextUrl.searchParams.get('ownerAddr')

    // If not in query params, check custom headers
    if (!address) {
      address = request.headers.get('x-user-address')
    }

    // If still not found and it is a mutating request, parse JSON body (using cloned request)
    if (!address && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      try {
        const clonedRequest = request.clone()
        const body = await clonedRequest.json()
        address = 
          body.address || 
          body.userAddress || 
          body.ownerAddr || 
          body.payeeAddr ||
          body.sender
      } catch (err) {
        // No body or body parsing failed
      }
    }

    // Reject the request if a valid wallet address is not provided
    if (!address || !ETH_ADDRESS_REGEXP.test(address)) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Unauthorized: A valid connected wallet session is required to perform this action.' 
        }),
        { 
          status: 401, 
          headers: { 'content-type': 'application/json' } 
        }
      )
    }
  }

  return NextResponse.next()
}

// Apply middleware to API paths
export const config = {
  matcher: '/api/:path*',
}
