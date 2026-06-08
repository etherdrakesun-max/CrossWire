import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import webpush from 'web-push'

// Retrieve VAPID keys from environment or fallback to standard demo credentials
const PUBLIC_VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BFZ6-G_e5091_2b90_5382_4829_1711_3321_3910_512'
const PRIVATE_VAPID_KEY = process.env.VAPID_PRIVATE_KEY || 'M2z_7_v9720_0039_4822_9281_1234_5678_1920'

try {
  webpush.setVapidDetails(
    'mailto:support@crosswire.finance',
    PUBLIC_VAPID_KEY,
    PRIVATE_VAPID_KEY
  )
} catch (e) {
  console.warn('VAPID initialization warning (using mock fallback triggers):', e)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { walletAddr, title, body: msgBody, url } = body

    if (!title || !msgBody) {
      return NextResponse.json({ error: 'Missing title or body' }, { status: 400 })
    }

    const payload = JSON.stringify({
      title,
      body: msgBody,
      url: url || '/dashboard'
    })

    // If walletAddr is specified, notify only that wallet
    let subscriptions = []
    if (walletAddr) {
      const sub = await prisma.notificationSubscription.findUnique({
        where: { walletAddr: walletAddr.toLowerCase() }
      })
      if (sub) {
        subscriptions.push(sub)
      }
    } else {
      subscriptions = await prisma.notificationSubscription.findMany()
    }

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active push subscriptions found. Notification simulated in logs.',
        payload
      })
    }

    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: JSON.parse(sub.keys)
          }
          await webpush.sendNotification(pushSubscription, payload)
          return { id: sub.id, status: 'DELIVERED' }
        } catch (err: any) {
          console.error(`Web Push failed for subscription ${sub.id}:`, err)
          // If subscription has expired or is invalid, remove it from DB
          if (err.statusCode === 410 || err.statusCode === 404) {
            await prisma.notificationSubscription.delete({
              where: { id: sub.id }
            })
          }
          return { id: sub.id, status: 'FAILED', error: err.message }
        }
      })
    )

    return NextResponse.json({
      success: true,
      sentCount: results.filter(r => r.status === 'DELIVERED').length,
      results
    })
  } catch (err: any) {
    console.error('Failed to send push notifications:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
