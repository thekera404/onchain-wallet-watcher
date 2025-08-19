"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WalletTracker } from "@/components/wallet-tracker"
import { ActivityFeed } from "@/components/activity-feed"
import { NotificationSettings } from "@/components/notification-settings"
import { Eye, Wallet, TrendingUp } from "lucide-react"

export default function WalletWatcherApp() {
  const [isReady, setIsReady] = useState(false)
  const [context, setContext] = useState<any>(null)
  const [watchedWallets, setWatchedWallets] = useState<string[]>([])

  useEffect(() => {
    // Initialize Farcaster SDK
    const initializeApp = async () => {
      try {
        // Import SDK dynamically for better performance
        const { sdk } = await import("@farcaster/frame-sdk")

        // Get context information
        const frameContext = sdk.context
        setContext(frameContext)

        // Signal that the app is ready
        await sdk.actions.ready()
        setIsReady(true)
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
    }
  }

  const removeWallet = (address: string) => {
    setWatchedWallets(watchedWallets.filter((w) => w !== address))
  }

  if (!isReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Wallet Watcher...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Eye className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Wallet Watcher</h1>
              <p className="text-sm text-gray-600">Track Base wallets</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Watching</p>
                  <p className="text-xl font-bold">{watchedWallets.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-xl font-bold">0</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="wallets" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="wallets">Wallets</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="wallets" className="space-y-4">
            <WalletTracker watchedWallets={watchedWallets} onAddWallet={addWallet} onRemoveWallet={removeWallet} />
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <ActivityFeed watchedWallets={watchedWallets} />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <NotificationSettings context={context} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
