'use client'

import { useEffect, useState } from 'react'
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
  Database,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Zap,
  Activity,
  Settings
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { loadDemoData, clearDemoData } from '@/lib/demo-data'

// Farcaster Mini App types

// Traditional Farcaster Mini App types
interface FarcasterUser {
  fid: number
  username: string
  displayName: string
  pfp: string
  verified: boolean
}

interface FarcasterContext {
  user: FarcasterUser | null
  client: {
    added: boolean
    verified: boolean
  }
}

interface FarcasterAction {
  type: string
  payload: any
}

export default function HomePage() {
  const { theme, setTheme } = useTheme()
  const [isLoading, setIsLoading] = useState(true)
  const [farcasterContext, setFarcasterContext] = useState<FarcasterContext>({
    user: null,
    client: { added: false, verified: false }
  })
  const [actionResult, setActionResult] = useState<string | null>(null)
  const [isActionLoading, setIsActionLoading] = useState(false)

  // Zustand store
  const { 
    watchedWallets, 
    transactions, 
    addWatchedWallet, 
    removeWatchedWallet, 
    clearTransactions 
  } = useAppStore()

  useEffect(() => {
    initializeFarcasterMiniApp()
  }, [])

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
        const context = await sdk.context
        setFarcasterContext({
          user: context.user,
          client: { added: context.client.added, verified: context.client.verified }
        })
        
        // Listen for context changes
        sdk.on('context', (newContext: any) => {
          setFarcasterContext({
            user: newContext.user,
            client: { added: newContext.client.added, verified: newContext.client.verified }
          })
        })

        // Listen for actions
        sdk.on('action', (action: FarcasterAction) => {
          handleFarcasterAction(action)
        })

        // IMPORTANT: Call ready() to hide splash screen
        await sdk.actions.ready()
        
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

  const handleFarcasterAction = async (action: FarcasterAction) => {
    console.log("Received Farcaster action:", action)
    
    switch (action.type) {
      case 'ADD_WALLET':
        if (action.payload?.address) {
          addWatchedWallet(action.payload.address)
          setActionResult(`Wallet ${action.payload.address} added successfully!`)
        }
        break
      case 'REMOVE_WALLET':
        if (action.payload?.address) {
          removeWatchedWallet(action.payload.address)
          setActionResult(`Wallet ${action.payload.address} removed successfully!`)
        }
        break
      case 'LOAD_DEMO':
        loadDemoData()
        setActionResult('Demo data loaded successfully!')
        break
      default:
        console.log("Unknown action type:", action.type)
    }

    // Clear action result after 3 seconds
    setTimeout(() => setActionResult(null), 3000)
  }

  const addWallet = async (address: string) => {
    if (!address || watchedWallets.some(w => w.address === address)) {
      return false
    }

    if (watchedWallets.length >= 5) {
      setActionResult('Maximum wallet limit reached (5 wallets)')
      setTimeout(() => setActionResult(null), 3000)
      return false
    }

    // Add wallet to store
    addWatchedWallet({
      id: Date.now().toString(),
      address,
      label: `Wallet ${watchedWallets.length + 1}`,
      chain: 'base',
      addedAt: new Date().toISOString(),
      filters: {
        minValue: '0.01',
        trackNFTs: true,
        trackTokens: true,
        trackDeFi: true,
        notifyOnMint: true,
        notifyOnTransfer: true
      }
    })

    // Send Farcaster action if available
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk')
      await sdk.actions.sendAction({
        type: 'WALLET_ADDED',
        payload: { address }
      })
    } catch (error) {
      console.warn('Failed to send Farcaster action:', error)
    }

    setActionResult(`Wallet ${address} added successfully!`)
    setTimeout(() => setActionResult(null), 3000)
    return true
  }

  const removeWallet = async (address: string) => {
    removeWatchedWallet(address)
    
    // Send Farcaster action if available
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk')
      await sdk.actions.sendAction({
        type: 'WALLET_REMOVED',
        payload: { address }
      })
    } catch (error) {
      console.warn('Failed to send Farcaster action:', error)
    }

    setActionResult(`Wallet ${address} removed successfully!`)
    setTimeout(() => setActionResult(null), 3000)
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
    <div className="min-h-screen bg-background">
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
                    @{farcasterContext.user.username}
                  </span>
                </div>
              )}

              {/* Demo Data Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={loadDemoData}
                className="p-2 flex-shrink-0 text-green-600 hover:text-green-700"
                title="Load Demo Data"
              >
                <Database className="h-4 w-4" />
              </Button>

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
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            {actionResult}
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
                <p>• Add wallets to watch (up to 5)</p>
                <p>• Track high-value transactions</p>
                <p>• Use demo data for testing</p>
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
                Great! You're connected as @{farcasterContext.user.username}. You can now receive real-time notifications!
              </p>
              <div className="text-xs text-muted-foreground/70 space-y-1">
                <p>✅ Connected as @{farcasterContext.user.username}</p>
                <p>• Your profile is verified</p>
                <p>• Add wallets to watch (up to 5)</p>
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
                  <p className="text-lg font-bold text-card-foreground">{watchedWallets.length}/5</p>
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
          <TabsList className="grid w-full grid-cols-3 bg-card/70 backdrop-blur-sm">
            <TabsTrigger value="wallets" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Wallets
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

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
                  if (address) {
                    addWallet(address)
                    e.currentTarget.reset()
                  }
                }} className="flex gap-2">
                  <Input
                    name="address"
                    placeholder="Enter wallet address (0x...)"
                    className="flex-1"
                    required
                  />
                  <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600">
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
                            onClick={() => removeWallet(wallet.address)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-500/10"
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
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Transaction Activity</h3>
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
                transactions.slice(0, 20).map((tx, index) => (
                  <Card key={index} className="border-0 bg-card/70 backdrop-blur-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                            <Zap className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-card-foreground">
                              {tx.type || 'Transaction'}
                            </p>
                            <p className="text-sm text-muted-foreground font-mono">
                              {tx.hash?.slice(0, 6)}...{tx.hash?.slice(-4) || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-card-foreground">
                            {tx.value ? `${tx.value} ETH` : 'N/A'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Base
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
                      <img
                        src={farcasterContext.user.pfp}
                        alt={farcasterContext.user.username}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <p className="font-medium">@{farcasterContext.user.username}</p>
                        <p className="text-sm text-muted-foreground">
                          FID: {farcasterContext.user.fid}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {farcasterContext.user.verified ? "Verified" : "Unverified"}
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
                  
                  <Button
                    variant="outline"
                    onClick={loadDemoData}
                    className="w-full"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Load Demo Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
