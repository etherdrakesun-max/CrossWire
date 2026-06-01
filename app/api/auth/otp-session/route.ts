import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/auth/otp-session
 * Initiates an email/social OTP session for the Expatriate / Contractor User-Controlled Wallet SDK.
 * Acquires a temporary User Token and Encryption Key from the Circle Developer Platform.
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 })
    }

    const apiKey = process.env.CIRCLE_API_KEY
    const appId = process.env.NEXT_PUBLIC_CIRCLE_APP_ID

    if (!apiKey || !appId) {
      // High-fidelity fallback mock for hackathon testing and demo purposes
      console.log('Circle UCW Credentials not fully configured. Running high-fidelity simulation...')
      await new Promise((r) => setTimeout(r, 1000))

      return NextResponse.json({
        success: true,
        simulated: true,
        userToken: `user_token_sim_${Math.random().toString(36).substring(2, 10)}`,
        encryptionKey: `enc_key_sim_${Math.random().toString(36).substring(2, 15)}`,
        appId: appId || 'mock-app-id-12345'
      })
    }

    // Call Circle Developer platform to register/fetch user session
    // Reference: https://developers.circle.com/wallets/user-controlled/authenticate
    const response = await fetch('https://api.circle.com/v1/w3s/users/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        userId: email.replace(/[@.]/g, '_'), // Standard unique identifier
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Circle API returned status ${response.status}: ${errText}`)
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      userToken: data.data.userToken,
      encryptionKey: data.data.encryptionKey,
      appId
    })
  } catch (err: any) {
    console.error('OTP Session Generation Failed:', err)
    return NextResponse.json({ error: err.message || 'Failed to acquire OTP token' }, { status: 500 })
  }
}
