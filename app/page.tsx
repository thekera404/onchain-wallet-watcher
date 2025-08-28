'use client'

import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Eye, 
  Wallet, 
  TrendingUp, 
  Bell, 
  Sun, 
  Moon, 
  Plus, 
  X, 
  CheckCircle,
  Zap,
  Activity,
  Settings,
  User
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { realtimeBaseMonitor, type RealtimeTransaction } from '@/lib/realtime-base-monitor'


// Farcaster Mini App types

// Simplified Farcaster context types
interface FarcasterContext {
  user: {
    fid?: number
    username?: string
    displayName?: string
    pfpUrl?: string
  } | null
  client: {
    added: boolean
  }
}


// Minimal Farcaster action type used by this app
type FarcasterAction = {
  type: 'ADD_WALLET' | 'REMOVE_WALLET' | string
  payload?: {
    address?: string
    [key: string]: unknown
  }
}



export default function HomePage() {
  const { theme, setTheme } = useTheme()
  const [isLoading, setIsLoading] = useState(true)
  const [farcasterContext, setFarcasterContext] = useState<FarcasterContext>({
    user: null,
    client: { added: false }
  })
  const [actionResult, setActionResult] = useState<string | null>(null)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [realtimeStatus, setRealtimeStatus] = useState({ connected: false, watchedWallets: 0 })
  const initializedAtRef = useRef<Date>(new Date())

  // Zustand store
  const { 
    watchedWallets, 
    transactions, 
    addWatchedWallet, 
    removeWatchedWallet, 
    clearTransactions,
    clearAllWallets,
    addTransaction 
  } = useAppStore()

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log("[v0] Initializing Farcaster SDK...")
        
        // Import and call ready() first - this is critical
        const { sdk } = await import('@farcaster/miniapp-sdk')
        await sdk.actions.ready()
        console.log("[v0] Farcaster SDK ready")
        
        // Now initialize the mini app
        await initializeFarcasterMiniApp()
        
      } catch (error) {
        console.error("[v0] Failed to initialize Farcaster SDK:", error)
        // Still set loading to false even if SDK fails
        setIsLoading(false)
      }
    }

    // Clear any existing demo wallets on first load
    const demoAddresses = [
      "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
      "0x8ba1f109551bD432803012645Hac136c772c3c2b"
    ]
    
    const hasDemoWallets = watchedWallets.some(wallet => 
      demoAddresses.includes(wallet.address)
    )
    
    if (hasDemoWallets) {
      console.log('Removing demo wallets...')
      demoAddresses.forEach(address => {
        const demoWallet = watchedWallets.find(w => w.address === address)
        if (demoWallet) {
          removeWatchedWallet(demoWallet.id)
        }
      })
    }

    initializeApp()
  }, [])

  // Real-time transaction monitoring
  useEffect(() => {
    if (!farcasterContext.user || watchedWallets.length === 0) return

    const pollTransactions = async () => {
      try {
        const addresses = watchedWallets.map(w => w.address)
        console.log('🔍 Polling transactions for:', addresses)

        // Get real Base transactions for each wallet
        for (const address of addresses) {
          try {
            const response = await fetch('/api/get-base-transactions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                address,
                limit: 10
              }),
            })

            if (response.ok) {
              const data = await response.json()
              console.log(`📊 Found ${data.transactions?.length || 0} transactions for ${address}`)
              
              // Add only transactions that occurred after app initialization (avoid old history)
              if (data.transactions && data.transactions.length > 0) {
                const startedAt = initializedAtRef.current.getTime()
                data.transactions.forEach(async (tx: any) => {
                  const txTime = new Date(tx.timestamp || 0).getTime()
                  if (
                    txTime > startedAt &&
                    !transactions.some(existing => existing.hash === tx.hash)
                  ) {
                    const formattedTx = {
                      hash: tx.hash,
                      fromAddress: tx.from || tx.fromAddress,
                      toAddress: tx.to || tx.toAddress,
                      value: tx.value,
                      type: tx.type || 'transaction',
                      timestamp: tx.timestamp || new Date(),
                      walletId: address,
                      chain: 'base',
                      blockNumber: tx.blockNumber,
                      gasUsed: tx.gasUsed,
                      gasPrice: tx.gasPrice
                    }
                    addTransaction(formattedTx)
                    console.log('✅ New transaction added:', tx.hash)

                    // Send Farcaster notification
                    await sendTransactionNotification(
                      farcasterContext.user?.fid,
                      {
                        hash: tx.hash,
                        type: tx.type || 'transaction',
                        value: tx.value,
                        address
                      }
                    )
                  }
                })
              }
            } else {
              console.error(`Failed to get activity for ${address}:`, await response.text())
            }
          } catch (error) {
            console.error(`Error fetching activity for ${address}:`, error)
          }
        }
      } catch (error) {
        console.error('Error polling transactions:', error)
      }
    }

    // Poll every 30 seconds for new transactions
    const interval = setInterval(pollTransactions, 30000)
    
    // Initial poll
    pollTransactions()

    return () => clearInterval(interval)
  }, [farcasterContext.user, watchedWallets.length])

  // Initialize wallet monitoring on app start
  useEffect(() => {
    // Auto-start monitoring for existing wallets when user connects
    if (farcasterContext.user && watchedWallets.length > 0) {
      console.log(`🔄 Auto-starting monitoring for ${watchedWallets.length} existing wallets`)
      watchedWallets.forEach(wallet => {
        startWalletMonitoring(wallet.address)
      })
    }
  }, [farcasterContext.user?.fid])

  // Real-time Base monitoring setup
  useEffect(() => {
    // Set up real-time transaction callback
    const handleRealtimeTransaction = async (tx: RealtimeTransaction) => {
      console.log('🔥 Real-time transaction received:', tx.hash)
      
      // Check if transaction is not already in store
      if (!transactions.some(existing => existing.hash === tx.hash)) {
        // Format transaction for our store
        const txType = tx.type as 'transfer' | 'mint' | 'swap' | 'contract_interaction'
        const formattedTx = {
          hash: tx.hash,
          fromAddress: tx.from,
          toAddress: tx.to,
          value: tx.value,
          type: ['transfer', 'mint', 'swap', 'contract_interaction'].includes(tx.type) ? txType : 'transfer',
          timestamp: tx.timestamp,
          walletId: tx.from.toLowerCase() === watchedWallets.find(w => w.address.toLowerCase() === tx.from.toLowerCase())?.address.toLowerCase() ? tx.from : tx.to,
          chain: 'base' as const,
          blockNumber: tx.blockNumber,
          gasUsed: tx.gasUsed,
          gasPrice: tx.gasPrice
        }
        
        addTransaction(formattedTx)
        
        // Show notification and send to Farcaster
        setActionResult(`🔥 New ${tx.type} detected: ${tx.value} ETH`)
        setTimeout(() => setActionResult(null), 5000)
        
        await sendTransactionNotification(
          farcasterContext.user?.fid,
          {
            hash: tx.hash,
            type: tx.type,
            value: tx.value,
            address: tx.from === watchedWallets.find(w => w.address.toLowerCase() === tx.from.toLowerCase())?.address.toLowerCase() ? tx.from : tx.to
          }
        )
        
        console.log('✅ Real-time transaction added to feed:', tx.hash)
      }
    }

    // Subscribe all watched wallets to real-time monitoring
    const userId = farcasterContext.user?.fid?.toString() || 'anonymous'
    
    watchedWallets.forEach(wallet => {
      realtimeBaseMonitor.addWalletSubscription(
        wallet.address,
        userId,
        handleRealtimeTransaction
      )
    })

    // Update realtime status
    const updateStatus = () => {
      const status = realtimeBaseMonitor.getConnectionStatus()
      setRealtimeStatus(status)
    }
    
    updateStatus()
    const statusInterval = setInterval(updateStatus, 5000)

    // Cleanup function
    return () => {
      clearInterval(statusInterval)
      watchedWallets.forEach(wallet => {
        realtimeBaseMonitor.removeWalletSubscription(wallet.address, userId)
      })
    }
  }, [farcasterContext.user?.fid, watchedWallets])

  const initializeFarcasterMiniApp = async () => {
    try {
      // Check if we're in a Farcaster environment
      const isFarcasterEnv = window.location.hostname.includes('farcaster') || 
                             window.location.hostname.includes('warpcast') ||
                             window.location.hostname.includes('localhost') ||
                             window.location.hostname.includes('127.0.0.1')

      if (!isFarcasterEnv) {
        console.log("[v0] Not in Farcaster environment, using fallback mode")
        setIsLoading(false)
        return
      }

      // Use official Farcaster Mini App SDK
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk')
        
        // Get initial context
        let context = await sdk.context
        setFarcasterContext({
          user: context.user,
          client: { added: context.client.added }
        })

        // If not connected, attempt Quick Auth to auto-connect
        if (!context.user) {
          try {
            await sdk.quickAuth.getToken()
            // Refresh context after obtaining token
            context = await sdk.context
            if (context.user) {
              setFarcasterContext({
                user: context.user,
                client: { added: context.client.added }
              })
              await registerForNotifications(context.user)
            }
          } catch (e) {
            // Non-fatal; user can connect later via UI
          }
        } else {
          // Already connected; ensure notifications are registered
          await registerForNotifications(context.user)
        }

        // Context listeners may not be available in all SDK versions
        console.log('SDK context available:', !!context)
        
        console.log("[v0] Farcaster Mini App SDK initialized", context)
      } catch (sdkError) {
        console.warn("SDK not available, using fallback:", sdkError)
        // Fallback for non-Farcaster environments
        console.log("[v0] Farcaster SDK not available, using fallback")
      }
    } catch (error) {
      console.error("Failed to initialize Farcaster Mini App:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Authenticated fetch using Farcaster Quick Auth when available
  const authFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk')
      return await sdk.quickAuth.fetch(input as string, init as any)
    } catch {
      return fetch(input, init)
    }
  }

  const sendTransactionNotification = async (
    fid: number | undefined,
    tx: { hash: string; type: string; value: string; address: string }
  ) => {
    if (!fid) return
    try {
      await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'transaction_detected',
          data: { fid, transaction: tx }
        })
      })
    } catch (notifyError) {
      console.warn('Failed to send Farcaster notification:', notifyError)
    }
  }

  const handleFarcasterAction = async (action: FarcasterAction) => {
    console.log("Received Farcaster action:", action)
    
    switch (action.type) {
      case 'ADD_WALLET':
        {
          const addressToAdd = action.payload?.address
          if (addressToAdd) {
            await addWallet(addressToAdd)
            setActionResult(`Wallet ${addressToAdd} added successfully!`)
          }
        }
        break
      case 'REMOVE_WALLET':
        {
          const addressToRemove = action.payload?.address
          if (addressToRemove) {
            const wallet = watchedWallets.find(w => w.address === addressToRemove)
            if (wallet) {
              removeWatchedWallet(wallet.id)
              setActionResult(`Wallet ${addressToRemove} removed successfully!`)
            }
          }
        }
        break

      default:
        console.log("Unknown action type:", action.type)
    }

    // Clear action result after 3 seconds
    setTimeout(() => setActionResult(null), 3000)
  }

  const addWallet = async (address: string, label?: string) => {
    if (!address || watchedWallets.some(w => w.address === address)) {
      return false
    }

    if (watchedWallets.length >= 3) {
      setActionResult('Maximum wallet limit reached (3 wallets)')
      setTimeout(() => setActionResult(null), 3000)
      return false
    }

    // Add wallet to store
    addWatchedWallet({
      address,
      label: (label && label.trim()) ? label.trim() : `Wallet ${watchedWallets.length + 1}`,
      chain: 'base',
      isActive: true,
      filters: {
        minValue: '0.01',
        trackNFTs: true,
        trackTokens: true,
        trackDeFi: true,
        notifyOnMint: true,
        notifyOnTransfer: true
      }
    })

    // Start monitoring this wallet for real-time transactions
    await startWalletMonitoring(address)

    setActionResult(`Wallet ${address} added successfully!`)
    setTimeout(() => setActionResult(null), 3000)
    return true
  }

  const startWalletMonitoring = async (address: string) => {
    try {
      if (!farcasterContext.user) {
        console.warn('Cannot start monitoring: No Farcaster user connected')
        return
      }

      const userId = farcasterContext.user.fid?.toString() || 'anonymous'

      // Start API-based monitoring
      const response = await authFetch('/api/monitor-wallets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add',
          address,
          userId,
          fid: farcasterContext.user.fid
        }),
      })

      // Start real-time monitoring
      const handleRealtimeTransaction = async (tx: RealtimeTransaction) => {
        console.log('🔥 Real-time transaction for newly added wallet:', tx.hash)
        
        if (!transactions.some(existing => existing.hash === tx.hash)) {
          const txType = tx.type as 'transfer' | 'mint' | 'swap' | 'contract_interaction'
          const formattedTx = {
            hash: tx.hash,
            fromAddress: tx.from,
            toAddress: tx.to,
            value: tx.value,
            type: ['transfer', 'mint', 'swap', 'contract_interaction'].includes(tx.type) ? txType : 'transfer',
            timestamp: tx.timestamp,
            walletId: address,
            chain: 'base' as const,
            blockNumber: tx.blockNumber,
            gasUsed: tx.gasUsed,
            gasPrice: tx.gasPrice
          }
          
          addTransaction(formattedTx)
          setActionResult(`🔥 New ${tx.type} detected: ${tx.value} ETH`)
          setTimeout(() => setActionResult(null), 5000)

          await sendTransactionNotification(
            farcasterContext.user?.fid,
            {
              hash: tx.hash,
              type: tx.type,
              value: tx.value,
              address
            }
          )
        }
      }

      realtimeBaseMonitor.addWalletSubscription(address, userId, handleRealtimeTransaction)

      if (response.ok) {
        console.log(`✅ Started monitoring wallet: ${address}`)
        setActionResult(`Real-time monitoring enabled for ${address.slice(0, 6)}...${address.slice(-4)}`)
      } else {
        console.error('Failed to start monitoring:', await response.text())
      }
    } catch (error) {
      console.error('Error starting wallet monitoring:', error)
    }
  }

  const stopWalletMonitoring = async (address: string) => {
    try {
      if (!farcasterContext.user) {
        console.warn('Cannot stop monitoring: No Farcaster user connected')
        return
      }

      const userId = farcasterContext.user.fid?.toString() || 'anonymous'

      // Stop API-based monitoring
      const response = await authFetch('/api/monitor-wallets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'remove',
          address,
          userId
        }),
      })

      // Stop real-time monitoring
      realtimeBaseMonitor.removeWalletSubscription(address, userId)

      if (response.ok) {
        console.log(`🛑 Stopped monitoring wallet: ${address}`)
      } else {
        console.error('Failed to stop monitoring:', await response.text())
      }
    } catch (error) {
      console.error('Error stopping wallet monitoring:', error)
    }
  }

  const removeWallet = async (walletId: string, address?: string) => {
    // Find the wallet to get the address if not provided
    const wallet = watchedWallets.find(w => w.id === walletId)
    const walletAddress = address || wallet?.address
    
    if (!walletAddress) {
      console.error('Cannot remove wallet: address not found')
      return
    }
    
    // Remove from store (uses wallet ID)
    removeWatchedWallet(walletId)
    
    // Stop monitoring this wallet (uses address)
    await stopWalletMonitoring(walletAddress)

    setActionResult(`Wallet ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} removed successfully!`)
    setTimeout(() => setActionResult(null), 3000)
  }

  const registerForNotifications = async (user: any) => {
    try {
      // Register notification token for this user
      const notificationToken = `user-${user.fid}-${Date.now()}`
      const notificationUrl = `${window.location.origin}/api/send-notification`
      
      // Register via webhook endpoint
      const response = await fetch('/api/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'notifications_enabled',
          data: {
            fid: user.fid,
            username: user.username,
            notificationDetails: {
              url: notificationUrl,
              token: notificationToken
            }
          }
        }),
      })

      if (response.ok) {
        console.log('✅ Registered for notifications:', user.username)
        setActionResult(`Notifications enabled for @${user.username}`)
        
        // Also start monitoring existing wallets
        if (watchedWallets.length > 0) {
          for (const wallet of watchedWallets) {
            await startWalletMonitoring(wallet.address)
          }
        }
      } else {
        console.error('Failed to register notifications:', await response.text())
      }
    } catch (error) {
      console.error('Error registering for notifications:', error)
    }
  }

  const promptAddApp = async () => {
    try {
      setIsActionLoading(true)
      const { sdk } = await import('@farcaster/miniapp-sdk')
      await sdk.actions.addMiniApp()
      setActionResult('Mini App added to Farcaster successfully!')
    } catch (error) {
      console.error('Failed to add mini app:', error)
      setActionResult('Failed to add Mini App to Farcaster')
    } finally {
      setIsActionLoading(false)
      setTimeout(() => setActionResult(null), 3000)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-foreground">Initializing Onchain Wallet Watcher...</p>
          <p className="text-sm text-muted-foreground mt-2">Connecting to Farcaster...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-background"
      style={{ paddingBottom: 'calc(56px + env(safe-area-inset-bottom))' }}
    >
      {/* Header */}
      <nav className="bg-card/90 backdrop-blur-md border-b border-border/50 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-xl shadow-lg flex-shrink-0">
                <Eye className="h-5 w-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-card-foreground">Onchain Wallet Watcher</h1>
                <p className="text-sm text-muted-foreground">Track Base onchain activity</p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-base font-bold text-card-foreground">Wallet Watcher</h1>
                <p className="text-xs text-muted-foreground">Base activity</p>
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
              {/* Farcaster Status */}
              {farcasterContext.user && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-lg border border-green-500/20">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-green-600 font-medium">
                    @{farcasterContext.user?.username || 'Unknown'}
                  </span>
                </div>
              )}

              {/* Real-time Status Indicator */}
              <div className={`hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg border ${
                realtimeStatus.connected 
                  ? 'bg-red-500/10 border-red-500/20' 
                  : 'bg-gray-500/10 border-gray-500/20'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  realtimeStatus.connected ? 'bg-red-500 animate-pulse' : 'bg-gray-500'
                }`} />
                <span className={`text-xs font-medium ${
                  realtimeStatus.connected ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {realtimeStatus.connected ? 'LIVE Base' : 'Offline'}
                </span>
              </div>



              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 flex-shrink-0"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              {/* Add App Button */}
              {!farcasterContext.client.added && (
                <Button
                  onClick={promptAddApp}
                  size="sm"
                  disabled={isActionLoading}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {isActionLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <>
                      <Bell className="h-4 w-4 mr-1" />
                      Add App
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Action Result Toast */}
      {actionResult && (
        <div
          className="fixed left-0 right-0 z-50 flex justify-center"
          style={{ top: 'calc(16px + env(safe-area-inset-top))' }}
        >
          <div className="max-w-sm w-[calc(100%-32px)] bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm truncate">{actionResult}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Card */}
        {!farcasterContext.user ? (
          <Card className="mb-8 border-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl text-card-foreground">
                Welcome to Onchain Wallet Watcher!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Track your favorite Base wallets and get notified when they mint, swap, or transfer tokens.
              </p>
              <div className="text-xs text-muted-foreground/70 space-y-1">
                <p>• Add wallets to watch (up to 3)</p>
                <p>• Track high-value transactions</p>

                <p>⚠️ Connect to Farcaster for notifications</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-8 border-0 bg-gradient-to-r from-green-500/5 to-blue-500/5 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl text-card-foreground flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-500" />
                Connected to Farcaster!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Great! You're connected as @{farcasterContext.user?.username || 'Unknown'}. You can now receive real-time notifications!
              </p>
              <div className="text-xs text-muted-foreground/70 space-y-1">
                <p>✅ Connected as @{farcasterContext.user?.username || 'Unknown'}</p>
                <p>• Your profile is verified</p>
                <p>• Add wallets to watch (up to 3)</p>
                <p>• Get real-time notifications</p>
                <p>• Track high-value transactions</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <Card className="border-0 bg-card/70 backdrop-blur-sm shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Watching</p>
                  <p className="text-lg font-bold text-card-foreground">{watchedWallets.length}/3</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-card/70 backdrop-blur-sm shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Transactions</p>
                  <p className="text-lg font-bold text-card-foreground">{transactions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-card/70 backdrop-blur-sm shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="text-lg font-bold text-card-foreground">
                    {farcasterContext.client.added ? "ON" : "OFF"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="wallets" className="w-full">

          <TabsContent value="wallets" className="space-y-4 mt-6">
            {/* Add Wallet Form */}
            <Card className="border-0 bg-card/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Add Wallet to Watch</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => {
                  e.preventDefault()
                  const formData = new FormData(e.currentTarget)
                  const address = formData.get('address') as string
                  const label = (formData.get('label') as string) || undefined
                  if (address) {
                    addWallet(address, label)
                    e.currentTarget.reset()
                  }
                }} className="flex flex-col sm:flex-row gap-2">
                  <Input
                    name="address"
                    placeholder="Enter wallet address (0x...)"
                    className="flex-1 w-full"
                    required
                    pattern="^0x[a-fA-F0-9]{40}$"
                    title="Please enter a valid Ethereum address starting with 0x"
                  />
                  <Input
                    name="label"
                    placeholder="Optional name (e.g. My trading wallet)"
                    className="flex-1 w-full"
                    maxLength={40}
                  />
                  <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600 w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Watched Wallets List */}
            <div className="space-y-3">
              {watchedWallets.length === 0 ? (
                <Card className="border-0 bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-8 text-center">
                    <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-2">No wallets being watched</p>
                    <p className="text-sm text-muted-foreground/70">
                      Add a wallet above to start tracking its activity
                    </p>
                  </CardContent>
                </Card>
              ) : (
                watchedWallets.map((wallet) => (
                  <Card key={wallet.id} className="border-0 bg-card/70 backdrop-blur-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                            <Wallet className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-card-foreground">{wallet.label}</p>
                            <p className="text-sm text-muted-foreground font-mono">
                              {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {wallet.chain}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeWallet(wallet.id, wallet.address)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-500/10"
                            title="Remove wallet from watch list"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4 mt-6">
            {/* Activity Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h3 className="text-base sm:text-lg font-semibold">Transaction Activity</h3>
              <div className="flex flex-wrap items-center gap-2">
                {/* Debug Info */}
                <Badge variant="outline" className="text-xs">
                  {watchedWallets.length} wallets • {transactions.length} txs
                </Badge>
                {/* Real-time Status */}
                <Badge 
                  variant={realtimeStatus.connected ? "default" : "secondary"} 
                  className={`text-xs ${realtimeStatus.connected ? 'bg-green-500' : 'bg-gray-500'}`}
                >
                  {realtimeStatus.connected ? '🔴 LIVE' : '⚫ Offline'}
                </Badge>
                {transactions.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearTransactions}
                    className="text-muted-foreground"
                  >
                    Clear All
                  </Button>
                )}
                {farcasterContext.user && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Manual refresh
                      window.location.reload()
                    }}
                    className="text-muted-foreground"
                  >
                    Refresh
                  </Button>
                )}
              </div>
            </div>

            {/* Transactions List */}
            <div className="space-y-3">
              {transactions.length === 0 ? (
                <Card className="border-0 bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-8 text-center">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-2">No transactions yet</p>
                    <p className="text-sm text-muted-foreground/70">
                      Add wallets to watch and their transactions will appear here
                    </p>
                  </CardContent>
                </Card>
              ) : (
                [...transactions]
                  .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
                  .slice(0, 20)
                  .map((tx, index) => (
                  <Card key={tx.id || index} className="border-0 bg-card/70 backdrop-blur-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            tx.type === 'transfer' ? 'bg-gradient-to-r from-blue-500 to-purple-500' :
                            tx.type === 'swap' ? 'bg-gradient-to-r from-green-500 to-blue-500' :
                            tx.type === 'mint' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                            'bg-gradient-to-r from-gray-500 to-gray-600'
                          }`}>
                            {tx.type === 'transfer' ? <Zap className="h-4 w-4 text-white" /> :
                             tx.type === 'swap' ? <TrendingUp className="h-4 w-4 text-white" /> :
                             tx.type === 'mint' ? <Plus className="h-4 w-4 text-white" /> :
                             <Activity className="h-4 w-4 text-white" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-card-foreground capitalize">
                                {tx.type || 'Transaction'}
                              </p>
                              <Badge variant="outline" className="text-xs">
                                {(tx as any).chain || 'Base'}
                              </Badge>
                              {Date.now() - new Date(tx.timestamp || 0).getTime() < 60000 && (
                                <Badge className="text-xs bg-green-500">
                                  New
                                </Badge>
                              )}
                            </div>
                            {tx.hash ? (
                              <a
                                href={`https://basescan.org/tx/${tx.hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-mono text-blue-600 hover:underline"
                                title={tx.hash}
                              >
                                {tx.hash.slice(0, 8)}...{tx.hash.slice(-6)}
                              </a>
                            ) : (
                              <p className="text-sm text-muted-foreground font-mono">N/A</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {tx.timestamp ? new Date(tx.timestamp).toLocaleTimeString() : 'Unknown time'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-card-foreground">
                            {tx.value ? (
                              parseFloat(tx.value) > 0 ? `${parseFloat(tx.value).toFixed(4)} ETH` : 'Contract'
                            ) : 'N/A'}
                          </p>
                          {(tx as any).usdValue && (
                            <p className="text-xs text-green-600">
                              ${(tx as any).usdValue.toLocaleString()}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Block #{tx.blockNumber || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 mt-6">
            <Card className="border-0 bg-card/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Farcaster Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Connection Status */}
                <div className="flex items-center justify-between p-3 bg-card/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${farcasterContext.user ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm font-medium">Connection Status</span>
                  </div>
                  <Badge variant={farcasterContext.user ? "default" : "secondary"}>
                    {farcasterContext.user ? "Connected" : "Disconnected"}
                  </Badge>
                </div>

                {/* User Info */}
                {farcasterContext.user && (
                  <div className="p-3 bg-card/50 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      {farcasterContext.user?.pfpUrl && (
                        <img
                          src={farcasterContext.user.pfpUrl}
                          alt={farcasterContext.user?.username || 'User'}
                          className="w-10 h-10 rounded-full"
                        />
                      )}
                      <div>
                        <p className="font-medium">@{farcasterContext.user?.username || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">
                          FID: {farcasterContext.user?.fid || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Connected
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {farcasterContext.client.added ? "App Added" : "App Not Added"}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2">
                  {!farcasterContext.client.added && (
                    <Button
                      onClick={promptAddApp}
                      disabled={isActionLoading}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
                    >
                      {isActionLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      ) : (
                        <>
                          <Bell className="h-4 w-4 mr-2" />
                          Add to Farcaster
                        </>
                      )}
                    </Button>
                  )}
                  

                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="space-y-4 mt-6">
            <Card className="border-0 bg-card/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!farcasterContext.user ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Connect your Farcaster account to personalize your experience and receive notifications.
                    </p>
                    <Button
                      onClick={async () => {
                        try {
                          const { sdk } = await import('@farcaster/miniapp-sdk')
                          await sdk.quickAuth.getToken()
                          const context = await sdk.context
                          setFarcasterContext({
                            user: context.user,
                            client: { added: context.client.added }
                          })
                          if (context.user) {
                            await registerForNotifications(context.user)
                          }
                          setActionResult('Connected to Farcaster')
                          setTimeout(() => setActionResult(null), 3000)
                        } catch (e) {
                          setActionResult('Failed to connect Farcaster')
                          setTimeout(() => setActionResult(null), 3000)
                        }
                      }}
                      className="bg-gradient-to-r from-blue-600 to-purple-600"
                    >
                      Connect Farcaster
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    {farcasterContext.user?.pfpUrl && (
                      <img
                        src={farcasterContext.user.pfpUrl}
                        alt={farcasterContext.user?.username || 'User'}
                        className="w-16 h-16 rounded-full"
                      />
                    )}
                    <div>
                      <p className="text-lg font-semibold">{farcasterContext.user?.displayName || farcasterContext.user?.username || 'User'}</p>
                      <p className="text-sm text-muted-foreground">@{farcasterContext.user?.username || 'unknown'}</p>
                      <p className="text-xs text-muted-foreground">FID: {farcasterContext.user?.fid || 'N/A'}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Footer nav: icon-only tabs */}
          <TabsList
            className="fixed inset-x-0 bottom-0 w-screen grid grid-cols-4 bg-card/90 backdrop-blur border-t border-border/50 h-14 z-50"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <TabsTrigger value="wallets" className="flex items-center justify-center h-full">
              <Wallet className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Wallets</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center justify-center h-full">
              <Activity className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Activity</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center justify-center h-full">
              <Settings className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Settings</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center justify-center h-full">
              {farcasterContext.user?.pfpUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={farcasterContext.user.pfpUrl}
                  alt={farcasterContext.user?.username || 'Account'}
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : (
                <User className="h-5 w-5" aria-hidden="true" />
              )}
              <span className="sr-only">Account</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  )
}
