import type { Metadata } from 'next'
import { Web3Provider } from '@/lib/web3-provider'
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
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                borderRadius: '6px',
                background: 'var(--notion-bg)',
                color: 'var(--notion-text)',
                border: '1px solid var(--notion-border)',
                fontSize: '14px',
                boxShadow: 'var(--notion-shadow-md)',
              },
              duration: 5000,
            }}
          />
        </Web3Provider>
      </body>
    </html>
  )
}
