import { useAppStore } from './store'

// Demo transaction data for testing
export const demoTransactions = [
  {
    hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    walletId: "demo-wallet-1",
    fromAddress: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    toAddress: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    value: "1000000000000000000", // 1 ETH
    gasUsed: "21000",
    gasPrice: "20000000000",
    blockNumber: 12345678,
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    type: "transfer" as const,
    chain: "ethereum"
  },
  {
    hash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    walletId: "demo-wallet-2",
    fromAddress: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    toAddress: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    value: "500000000000000000", // 0.5 ETH
    gasUsed: "150000",
    gasPrice: "25000000000",
    blockNumber: 12345679,
    timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
    type: "swap" as const,
    chain: "base"
  },
  {
    hash: "0x7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456",
    walletId: "demo-wallet-3",
    fromAddress: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    toAddress: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    value: "0",
    gasUsed: "80000",
    gasPrice: "30000000000",
    blockNumber: 12345680,
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    type: "mint" as const,
    chain: "polygon"
  },
  {
    hash: "0x4567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123",
    walletId: "demo-wallet-1",
    fromAddress: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    toAddress: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    value: "2000000000000000000", // 2 ETH
    gasUsed: "120000",
    gasPrice: "22000000000",
    blockNumber: 12345681,
    timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    type: "defi" as const,
    chain: "arbitrum"
  }
]

// Function to load demo data into the store
export const loadDemoData = () => {
  const store = useAppStore.getState()
  
  // Add demo wallets
  const demoWallets = [
    {
      address: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
      label: "Demo Wallet 1",
      chain: "ethereum",
      isActive: true,
      filters: {
        minValue: "0",
        trackNFTs: true,
        trackTokens: true,
        trackDeFi: true,
        notifyOnMint: true,
        notifyOnTransfer: true,
      }
    },
    {
      address: "0x8ba1f109551bD432803012645Hac136c772c3c2b",
      label: "Demo Wallet 2",
      chain: "base",
      isActive: true,
      filters: {
        minValue: "100000000000000000", // 0.1 ETH
        trackNFTs: true,
        trackTokens: true,
        trackDeFi: true,
        notifyOnMint: true,
        notifyOnTransfer: true,
      }
    }
  ]

  // Add demo wallets to store
  demoWallets.forEach(wallet => {
    store.addWatchedWallet(wallet)
  })

  // Add demo transactions to store
  demoTransactions.forEach(tx => {
    store.addTransaction(tx)
  })

  console.log('Demo data loaded:', { wallets: demoWallets.length, transactions: demoTransactions.length })
}

// Function to clear demo data
export const clearDemoData = () => {
  const store = useAppStore.getState()
  store.clearTransactions()
  console.log('Demo data cleared')
}
