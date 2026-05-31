import type { Metadata } from 'next'
import { Web3Provider } from '@/lib/web3-provider'
import { ModalProvider } from '@/lib/modal-context'
import Modal from '@/app/components/Modal'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'CrossWire — Professional Wire Transfer Protocol',
  description: 'Replace SWIFT with stablecoin rails. Cross-border USDC settlement on Arc Testnet with sub-second finality, multi-sig compliance, and full audit trail.',
  keywords: 'USDC, cross-border, wire transfer, Arc, stablecoin, CCTP, Circle',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Web3Provider>
          <ModalProvider>
            {children}
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
      </body>
    </html>
  )
}

