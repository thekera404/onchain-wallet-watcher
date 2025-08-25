"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WalletTracker } from "@/components/wallet-tracker"
import { ActivityFeed } from "@/components/activity-feed"
import { NotificationSettings } from "@/components/notification-settings"
import { Eye, Wallet, TrendingUp, Bell, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"

export default function EtherDropsApp() {
  const [isReady, setIsReady] = useState(false)
  const [context, setContext] = useState<any>(null)
  const [watchedWallets, setWatchedWallets] = useState<string[]>([])
  const [sdk, setSdk] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    // Initialize Farcaster SDK
    const initializeApp = async () => {
      try {
        // Import SDK dynamically for better performance
        const { sdk: farcasterSdk } = await import("@farcaster/frame-sdk")
        setSdk(farcasterSdk)

        // Get context information
        const frameContext = farcasterSdk.context
        setContext(frameContext)
        setIsConnected(true)

        // Signal that the app is ready
        await farcasterSdk.actions.ready()
        setIsReady(true)

        console.log("[v0] Farcaster SDK initialized", frameContext)
      } catch (error) {
        console.error("Failed to initialize Farcaster SDK:", error)
        // Fallback for development/testing
        setIsReady(true)
      }
    }

    initializeApp()
  }, [])

  const addWallet = (address: string) => {
    if (address && !watchedWallets.includes(address)) {
      if (watchedWallets.length >= 3) {
        // Show error toast or handle limit reached
        return false
      }
      setWatchedWallets([...watchedWallets, address])
      startMonitoring(address)
      return true
    }
    return false
  }

  const removeWallet = (address: string) => {
    setWatchedWallets(watchedWallets.filter((w) => w !== address))
  }

  const startMonitoring = async (address: string) => {
    try {
      await fetch("/api/monitor-wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          address,
          userId: context?.user?.fid,
        }),
      })
    } catch (error) {
      console.error("Failed to start monitoring:", error)
    }
  }

  const promptAddApp = async () => {
    if (sdk) {
      try {
        await sdk.actions.addMiniApp()
      } catch (error) {
        console.error("Failed to add mini app:", error)
      }
    }
  }

  if (!isReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-foreground">Loading Onchain Wallet Watcher...</p>
          {!context?.user && (
            <p className="text-sm text-muted-foreground mt-2">Connecting to Farcaster...</p>
          )}
        </div>
      </div>
    )
  }

  // Show loading while waiting for Farcaster connection
  if (!context?.user) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <nav className="bg-card/90 backdrop-blur-md border-b border-border/50 sticky top-0 z-10 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
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
              
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 flex-shrink-0"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </nav>

        {/* Loading State */}
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center space-y-6">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-card-foreground">Connecting to Farcaster</h2>
            <p className="text-muted-foreground">Please wait while we connect your account...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Responsive Navbar */}
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
              {/* User Profile Display - Responsive */}
              {context?.user && (
                <>
                  {/* Desktop Profile */}
                  <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-card/50 rounded-lg border border-border/50 hover:bg-card/70 transition-colors">
                    {/* Avatar - Show actual Farcaster avatar if available, otherwise fallback to initial */}
                    {context.user.pfp ? (
                      <img 
                        src={context.user.pfp} 
                        alt={`${context.user.username || 'User'}'s avatar`}
                        className="w-8 h-8 rounded-full object-cover border-2 border-border/50"
                        onError={(e) => {
                          // Fallback to initial if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center ${context.user.pfp ? 'hidden' : ''}`}>
                      <span className="text-sm font-bold text-white">
                        {context.user.username ? context.user.username.charAt(0).toUpperCase() : 'U'}
                      </span>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm font-medium text-card-foreground">
                        {context.user.username || `FID: ${context.user.fid}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {watchedWallets.length}/3 wallets
                      </p>
                    </div>
                  </div>
                  
                  {/* Mobile Profile */}
                  <div className="sm:hidden flex items-center gap-2 px-3 py-2 bg-card/50 rounded-lg border border-border/50 hover:bg-card/70 transition-colors">
                    {/* Avatar - Show actual Farcaster avatar if available, otherwise fallback to initial */}
                    {context.user.pfp ? (
                      <img 
                        src={context.user.pfp} 
                        alt={`${context.user.username || 'User'}'s avatar`}
                        className="w-6 h-6 rounded-full object-cover border border-border/50"
                        onError={(e) => {
                          // Fallback to initial if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center ${context.user.pfp ? 'hidden' : ''}`}>
                      <span className="text-xs font-bold text-white">
                        {context.user.username ? context.user.username.charAt(0).toUpperCase() : 'U'}
                      </span>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-xs font-medium text-card-foreground">
                        {watchedWallets.length}/3
                      </p>
                    </div>
                  </div>
                </>
              )}
              
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 flex-shrink-0"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              
              {/* Add App Button - Responsive */}
              {!context?.client?.added && (
                <>
                  {/* Desktop Button */}
                  <Button
                    onClick={promptAddApp}
                    size="sm"
                    className="hidden sm:flex bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Bell className="h-4 w-4 mr-1" />
                    Add App
                  </Button>
                  
                  {/* Mobile Button */}
                  <Button
                    onClick={promptAddApp}
                    size="sm"
                    className="sm:hidden bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 p-2"
                  >
                    <Bell className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-md mx-auto space-y-4">
        {/* Welcome Card for new users */}
        {watchedWallets.length === 0 && (
          <Card className="border-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-card-foreground flex items-center gap-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                {context?.user ? (
                  <>
                    Welcome back, {context.user.username || `FID: ${context.user.fid}`}!
                  </>
                ) : (
                  "Welcome to Onchain Wallet Watcher!"
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                {context?.user 
                  ? `Great! Your Farcaster profile is now connected. You can see your username and avatar in the header above. Now let's start tracking some Base wallets!`
                  : "Track your favorite Base wallets and get notified when they mint, swap, or transfer tokens."
                }
              </p>
              <div className="text-xs text-muted-foreground/70">
                {context?.user ? (
                  <>
                    ✅ Connected as @{context.user.username || `FID: ${context.user.fid}`}
                    <br />• Your profile avatar is displayed in the header
                    <br />• Add wallets to watch (up to 3)
                    <br />• Get real-time notifications
                    <br />• Track high-value transactions
                  </>
                ) : (
                  <>
                    • Add wallets to watch
                    <br />• Get real-time notifications
                    <br />• Track high-value transactions
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
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
                  <p className="text-xs text-muted-foreground">Active</p>
                  <p className="text-lg font-bold text-card-foreground">0</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-card/70 backdrop-blur-sm shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Alerts</p>
                  <p className="text-lg font-bold text-card-foreground">{context?.client?.added ? "ON" : "OFF"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Profile Stats */}
        {context?.user && (
          <Card className="border-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-card-foreground flex items-center gap-3">
                {/* Avatar - Show actual Farcaster avatar if available, otherwise fallback to initial */}
                {context.user.pfp ? (
                  <img 
                    src={context.user.pfp} 
                    alt={`${context.user.username || 'User'}'s avatar`}
                    className="w-8 h-8 rounded-full object-cover border-2 border-border/50"
                    onError={(e) => {
                      // Fallback to initial if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center ${context.user.pfp ? 'hidden' : ''}`}>
                  <span className="text-sm font-bold text-white">
                    {context.user.username ? context.user.username.charAt(0).toUpperCase() : 'U'}
                  </span>
                </div>
                Your Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-card/50 rounded-lg border border-border/30">
                  <p className="text-xs text-muted-foreground">Farcaster ID</p>
                  <p className="text-sm font-mono font-medium text-card-foreground">{context.user.fid}</p>
                </div>
                <div className="text-center p-3 bg-card/50 rounded-lg border border-border/30">
                  <p className="text-xs text-muted-foreground">Username</p>
                  <p className="text-sm font-medium text-card-foreground">
                    {context.user.username || 'Not set'}
                  </p>
                </div>
              </div>
              <div className="text-center p-3 bg-card/50 rounded-lg border border-border/30">
                <p className="text-xs text-muted-foreground">App Status</p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${context?.client?.added ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <p className="text-sm font-medium text-card-foreground">
                    {context?.client?.added ? 'Added to Farcaster' : 'Not added yet'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="wallets" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-card/70 backdrop-blur-sm">
            <TabsTrigger value="wallets">Wallets</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="wallets" className="space-y-4">
            <WalletTracker 
              watchedWallets={watchedWallets} 
              onAddWallet={addWallet} 
              onRemoveWallet={removeWallet} 
              context={context} 
            />
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <ActivityFeed watchedWallets={watchedWallets} />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <NotificationSettings context={context} sdk={sdk} />
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </div>
  )
}
