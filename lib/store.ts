import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  fid: number
  username?: string
  displayName?: string
  pfpUrl?: string
}

interface WatchedWallet {
  id: string
  address: string
  label?: string
  chain: string
  isActive: boolean
  filters?: WalletFilter
  createdAt: Date
}

interface WalletFilter {
  minValue?: string
  trackNFTs: boolean
  trackTokens: boolean
  trackDeFi: boolean
  notifyOnMint: boolean
  notifyOnTransfer: boolean
}

interface Transaction {
  id: string
  hash: string
  walletId: string
  fromAddress: string
  toAddress?: string
  value: string
  gasUsed?: string
  gasPrice?: string
  blockNumber: number
  timestamp: Date
  type: 'transfer' | 'mint' | 'swap' | 'contract_interaction'
  tokenSymbol?: string
  tokenName?: string
  metadata?: any
}

interface AppState {
  // User state
  user: User | null
  setUser: (user: User | null) => void
  
  // Wallet state
  watchedWallets: WatchedWallet[]
  addWatchedWallet: (wallet: Omit<WatchedWallet, 'id' | 'createdAt'>) => void
  removeWatchedWallet: (id: string) => void
  updateWatchedWallet: (id: string, updates: Partial<WatchedWallet>) => void
  
  // Transaction state
  transactions: Transaction[]
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void
  clearTransactions: () => void
  
  // Notification state
  notificationTokens: Map<string, { token: string; url: string }>
  addNotificationToken: (fid: string, token: string, url: string) => void
  removeNotificationToken: (fid: string) => void
  
  // UI state
  activeTab: 'wallets' | 'activity' | 'notifications'
  setActiveTab: (tab: 'wallets' | 'activity' | 'notifications') => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      watchedWallets: [],
      transactions: [],
      notificationTokens: new Map(),
      activeTab: 'wallets',
      
      // User actions
      setUser: (user) => set({ user }),
      
      // Wallet actions
      addWatchedWallet: (wallet) => {
        const newWallet: WatchedWallet = {
          ...wallet,
          id: crypto.randomUUID(),
          createdAt: new Date(),
        }
        set((state) => ({
          watchedWallets: [...state.watchedWallets, newWallet]
        }))
      },
      
      removeWatchedWallet: (id) => {
        set((state) => ({
          watchedWallets: state.watchedWallets.filter(w => w.id !== id)
        }))
      },
      
      updateWatchedWallet: (id, updates) => {
        set((state) => ({
          watchedWallets: state.watchedWallets.map(w => 
            w.id === id ? { ...w, ...updates } : w
          )
        }))
      },
      
      // Transaction actions
      addTransaction: (transaction) => {
        const newTransaction: Transaction = {
          ...transaction,
          id: crypto.randomUUID(),
        }
        set((state) => ({
          transactions: [newTransaction, ...state.transactions].slice(0, 100) // Keep last 100
        }))
      },
      
      clearTransactions: () => set({ transactions: [] }),
      
      // Notification actions
      addNotificationToken: (fid, token, url) => {
        set((state) => {
          const newTokens = new Map(state.notificationTokens)
          newTokens.set(fid, { token, url })
          return { notificationTokens: newTokens }
        })
      },
      
      removeNotificationToken: (fid) => {
        set((state) => {
          const newTokens = new Map(state.notificationTokens)
          newTokens.delete(fid)
          return { notificationTokens: newTokens }
        })
      },
      
      // UI actions
      setActiveTab: (tab) => set({ activeTab: tab }),
    }),
    {
      name: 'wallet-watcher-storage',
      partialize: (state) => ({
        watchedWallets: state.watchedWallets,
        transactions: state.transactions,
        activeTab: state.activeTab,
      }),
    }
  )
)
