import { prisma } from './db'
import webpush from 'web-push'

const PUBLIC_VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BFZ6-G_e5091_2b90_5382_4829_1711_3321_3910_512'
const PRIVATE_VAPID_KEY = process.env.VAPID_PRIVATE_KEY || 'M2z_7_v9720_0039_4822_9281_1234_5678_1920'

try {
  webpush.setVapidDetails(
    'mailto:support@crosswire.finance',
    PUBLIC_VAPID_KEY,
    PRIVATE_VAPID_KEY
  )
} catch (e) {
  console.warn('VAPID initialization warning:', e)
}

/**
 * Dispatch web push notification to a specific wallet address
 */
export async function sendPushNotification(walletAddr: string, title: string, body: string, url: string = '/dashboard') {
  try {
    const sub = await prisma.notificationSubscription.findUnique({
      where: { walletAddr: walletAddr.toLowerCase() }
    })

    if (!sub) {
      console.log(`Notification subscription not found for wallet ${walletAddr}. Logged: [${title}] ${body}`)
      return false
    }

    const payload = JSON.stringify({ title, body, url })
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: JSON.parse(sub.keys)
    }

    await webpush.sendNotification(pushSubscription, payload)
    console.log(`Push notification sent successfully to ${walletAddr}`)
    return true
  } catch (err: any) {
    console.error(`Failed to dispatch push notification to ${walletAddr}:`, err)
    // Clean up invalid subscriptions
    if (err.statusCode === 410 || err.statusCode === 404) {
      try {
        await prisma.notificationSubscription.delete({
          where: { walletAddr: walletAddr.toLowerCase() }
        })
      } catch (dbErr) {
        console.error('Failed to prune expired subscription:', dbErr)
      }
    }
    return false
  }
}
