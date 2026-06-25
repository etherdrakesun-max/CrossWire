import type { Metadata } from 'next'
import { Web3Provider } from '@/lib/web3-provider'
import { ModalProvider } from '@/lib/modal-context'
import Modal from '@/app/components/Modal'
import FeatureEducationModalManager from '@/app/components/FeatureEducationModalManager'
import { Toaster } from 'react-hot-toast'
import MobileNav from '@/app/components/MobileNav'
import ClientAuthWrapper from '@/app/components/ClientAuthWrapper'
import './globals.css'

export const metadata: Metadata = {
  title: 'CrossWire — Professional Wire Transfer Protocol',
  description: 'Replace SWIFT with stablecoin rails. Cross-border USDC settlement on Arc Testnet with sub-second finality, corporate authorization governance, and full audit trails.',
  keywords: 'USDC, cross-border, wire transfer, Arc, stablecoin, CCTP, Circle',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/favicon-64x64.png', sizes: '64x64', type: 'image/png' },
      { url: '/favicon-128x128.png', sizes: '128x128', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/safari-pinned-tab.svg',
        color: '#3b82f6',
      },
    ],
  },
  manifest: '/site.webmanifest',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
        <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/favicon-48x48.png" type="image/png" sizes="48x48" />
        <link rel="icon" href="/favicon-64x64.png" type="image/png" sizes="64x64" />
        <link rel="icon" href="/favicon-128x128.png" type="image/png" sizes="128x128" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#3b82f6" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        <Web3Provider>
          <ModalProvider>
            <ClientAuthWrapper>{children}</ClientAuthWrapper>
            <MobileNav />
            <Modal />
            <FeatureEducationModalManager />
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  borderRadius: '2px',
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  fontSize: '13px',
                  fontFamily: 'Inter, sans-serif',
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)',
                  padding: '12px 16px',
                },
                duration: 5000,
              }}
            />
          </ModalProvider>
        </Web3Provider>

        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').then(function(reg) {
                console.log('ServiceWorker registration successful with scope: ', reg.scope);
              }, function(err) {
                console.log('ServiceWorker registration failed: ', err);
              });
            });
          }
        ` }} />
      </body>
    </html>
  )
}


