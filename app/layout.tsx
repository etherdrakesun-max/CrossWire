import type { Metadata } from 'next'
import { Web3Provider } from '@/lib/web3-provider'
import { ModalProvider } from '@/lib/modal-context'
import Modal from '@/app/components/Modal'
import { Toaster } from 'react-hot-toast'
import MobileNav from '@/app/components/MobileNav'
import './globals.css'

export const metadata: Metadata = {
  title: 'CrossWire — Professional Wire Transfer Protocol',
  description: 'Replace SWIFT with stablecoin rails. Cross-border USDC settlement on Arc Testnet with sub-second finality, multi-sig compliance, and full audit trail.',
  keywords: 'USDC, cross-border, wire transfer, Arc, stablecoin, CCTP, Circle',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        <Web3Provider>
          <ModalProvider>
            {children}
            <MobileNav />
            <Modal />
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


