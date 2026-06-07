'use client'

import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { RainbowKitProvider, darkTheme, getDefaultConfig } from '@rainbow-me/rainbowkit'
import { arcTestnet } from './arc-config'
import { sepolia, baseSepolia, arbitrumSepolia } from 'wagmi/chains'
import '@rainbow-me/rainbowkit/styles.css'

import { circleModularWalletConnector } from './modular-wallet'

const config = getDefaultConfig({
  appName: 'CrossWire',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo_project_id',
  chains: [arcTestnet, sepolia, baseSepolia, arbitrumSepolia],
  transports: {
    [arcTestnet.id]: http('https://rpc.testnet.arc.network'),
    [sepolia.id]: http('https://rpc.ankr.com/eth_sepolia'),
    [baseSepolia.id]: http('https://sepolia.base.org'),
    [arbitrumSepolia.id]: http('https://sepolia-rollup.arbitrum.io/rpc'),
  },
  ssr: true,
})

// Inject custom Circle Modular Passkey connector
if (config && config.connectors) {
  ;(config.connectors as any).push(circleModularWalletConnector())
}

const queryClient = new QueryClient()

export function Web3Provider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message = event.reason?.message || '';
      if (
        message.includes('subscribe') || 
        message.includes('Connection interrupted') || 
        message.includes('WebSocket') ||
        message.includes('socket')
      ) {
        event.preventDefault();
      }
    };

    const handleError = (event: ErrorEvent) => {
      const message = event.message || '';
      if (
        message.includes('subscribe') || 
        message.includes('Connection interrupted') || 
        message.includes('WebSocket') ||
        message.includes('socket')
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#2383e2',
            accentColorForeground: 'white',
            borderRadius: 'small',
            fontStack: 'system',
          })}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

