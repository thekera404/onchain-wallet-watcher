"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WalletTracker } from "@/components/wallet-tracker"
import { ActivityFeed } from "@/components/activity-feed"
import { NotificationSettings } from "@/components/notification-settings"
import { Eye, Wallet, TrendingUp, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function EtherDropsApp() {
  const [isReady, setIsReady] = useState(false)
  const [context, setContext] = useState<any>(null)
  const [watchedWallets, setWatchedWallets] = useState<string[]>([])
  const [sdk, setSdk] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)

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
      setWatchedWallets([...watchedWallets, address])
      startMonitoring(address)
    }
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading EtherDROPS Watcher...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-10 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-xl shadow-lg">
                <Eye className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Onchain Wallet Watcher</h1>
                <p className="text-sm text-gray-600">Track Base onchain activity</p>
              </div>
            </div>
            {!context?.client?.added && (
              <Button
                onClick={promptAddApp}
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Bell className="h-4 w-4 mr-1" />
                Add App
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Welcome Card for new users */}
        {watchedWallets.length === 0 && (
          <Card className="border-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Welcome to Onchain Wallet Watcher! 👋</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                Track your favorite Base wallets and get notified when they mint, swap, or transfer tokens.
              </p>
              <div className="text-xs text-gray-500">
                • Add wallets to watch
                <br />• Get real-time notifications
                <br />• Track high-value transactions
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-0 bg-white/70 backdrop-blur-sm shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-600">Watching</p>
                  <p className="text-lg font-bold">{watchedWallets.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-white/70 backdrop-blur-sm shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-xs text-gray-600">Active</p>
                  <p className="text-lg font-bold">0</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-white/70 backdrop-blur-sm shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-xs text-gray-600">Alerts</p>
                  <p className="text-lg font-bold">{context?.client?.added ? "ON" : "OFF"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="wallets" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/70 backdrop-blur-sm">
            <TabsTrigger value="wallets">Wallets</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="wallets" className="space-y-4">
            <WalletTracker watchedWallets={watchedWallets} onAddWallet={addWallet} onRemoveWallet={removeWallet} context={context} />
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
  )
}
