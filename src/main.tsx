import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { WagmiProvider } from 'wagmi'

import App from './App.tsx'
import { config } from './wagmi.ts'

import './index.css'
import { WalletProvider } from './context/WalletContext.tsx'
import { Toaster } from 'react-hot-toast'
import { CirclesProvider } from './context/CirclesContext.tsx'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <WalletProvider>
          <CirclesProvider>
            <App />
            <Toaster toastOptions={{ position: 'bottom-right', duration: 3000 }} />
          </CirclesProvider>
        </WalletProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)
