/**
 * Client-side utility for Push Notification subscription management.
 */

const PUBLIC_VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BB0SrDKgGYs3aCt-b50SFtJw0jUvJwtm1u9rBD1ivA-oneAHrB00Ct6LghWd5KKO__ToWcyRk7LTHj7cXUeY65k'

/**
 * Convert VAPID public key base64 string to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Register service worker and subscribe to push service
 */
export async function registerPushSubscription(walletAddr: string): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications not supported on this browser.')
    return false
  }

  try {
    // 1. Request permission
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.warn('Notification permission denied by user.')
      return false
    }

    // 2. Fetch service worker registration
    const registration = await navigator.serviceWorker.ready

    // 3. Subscribe
    const subscribeOptions = {
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
    }

    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe(subscribeOptions)
    }

    // 4. Save to backend database
    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        walletAddr: walletAddr.toLowerCase(),
        subscription: subscription.toJSON()
      })
    })

    if (!response.ok) {
      throw new Error('Failed to register subscription with server')
    }

    console.log('Web Push Subscription successfully registered.')
    return true
  } catch (err) {
    console.error('Push notification registration failed:', err)
    return false
  }
}
