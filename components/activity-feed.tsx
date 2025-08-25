"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, Coins, RefreshCw, ExternalLink, Bell, Zap } from "lucide-react"
import { NotificationService } from "@/lib/notification-service"

interface ActivityFeedProps {
  watchedWallets: string[]
  context?: any
}

interface Transaction {
  id: string
  wallet: string
  type: "mint" | "transfer" | "swap" | "contract_interaction"
  amount: string
  token: string
  timestamp: Date
  hash: string
  usdValue?: number
  from: string
  to: string
}

export function ActivityFeed({ watchedWallets, context }: ActivityFeedProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [realTimeUpdates, setRealTimeUpdates] = useState<Transaction[]>([])

  const fetchActivity = async () => {
    if (watchedWallets.length === 0) return

    setIsLoading(true)

    try {
      // Get real-time transaction data for all watched wallets
      const allTransactions: Transaction[] = []
      
      for (const wallet of watchedWallets) {
        try {
          const response = await fetch("/api/get-wallet-activity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              address: wallet,
              limit: 5 // Get last 5 transactions per wallet
            }),
          })

          if (response.ok) {
            const data = await response.json()
            if (data.transactions) {
              const formattedTxs = data.transactions.map((tx: any, index: number) => ({
                id: `${tx.hash}-${index}`,
                wallet: wallet.slice(0, 6) + "..." + wallet.slice(-4),
                type: tx.type,
                amount: tx.amount || tx.value,
                token: tx.token || "ETH",
                timestamp: new Date(tx.timestamp),
                hash: tx.hash,
                usdValue: tx.usdValue,
                from: tx.from,
                to: tx.to
              }))
              allTransactions.push(...formattedTxs)
            }
          }
        } catch (error) {
          console.error(`[ActivityFeed] Error fetching activity for ${wallet}:`, error)
        }
      }

      // Sort by timestamp (newest first) and limit to 20 transactions
      const sortedTransactions = allTransactions
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 20)

      setTransactions(sortedTransactions)
      setLastUpdate(new Date())

      console.log(`[ActivityFeed] Fetched ${sortedTransactions.length} transactions for ${watchedWallets.length} wallets`)

    } catch (error) {
      console.error("[ActivityFeed] Failed to fetch activity:", error)
      // Fallback to mock data for demonstration
      setTransactions([
        {
          id: "1",
          wallet: "0x4200...0006",
          type: "mint",
          amount: "1000",
          token: "USDC",
          timestamp: new Date(Date.now() - 1000 * 60 * 5),
          hash: "0xabc123...",
          from: "0x4200000000000000000000000000000000000006",
          to: "0x0000000000000000000000000000000000000000"
        },
        {
          id: "2",
          wallet: "0x7166...75d3",
          type: "transfer",
          amount: "0.5",
          token: "ETH",
          timestamp: new Date(Date.now() - 1000 * 60 * 15),
          hash: "0xdef456...",
          from: "0x71660c4005BA85c37ccec55d0C4493E66Fe775d3",
          to: "0x0000000000000000000000000000000000000000"
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  // Real-time updates using Server-Sent Events or polling
  useEffect(() => {
    if (watchedWallets.length === 0) return

    setIsMonitoring(true)
    
    // Initial fetch
    fetchActivity()

    // Set up real-time monitoring
    const interval = setInterval(() => {
      fetchActivity()
    }, 30000) // Check every 30 seconds

    // Also check for new transactions more frequently
    const quickInterval = setInterval(() => {
      checkForNewTransactions()
    }, 10000) // Check every 10 seconds

    return () => {
      clearInterval(interval)
      clearInterval(quickInterval)
      setIsMonitoring(false)
    }
  }, [watchedWallets])

  const checkForNewTransactions = async () => {
    if (watchedWallets.length === 0) return

    try {
      // Check for new transactions since last update
      const response = await fetch("/api/check-new-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          wallets: watchedWallets,
          since: lastUpdate?.toISOString() || new Date(Date.now() - 60000).toISOString()
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.newTransactions && data.newTransactions.length > 0) {
          // Add new transactions to the top
          const newTxs = data.newTransactions.map((tx: any, index: number) => ({
            id: `${tx.hash}-new-${index}`,
            wallet: tx.from.slice(0, 6) + "..." + tx.from.slice(-4),
            type: tx.type,
            amount: tx.amount || tx.value,
            token: tx.token || "ETH",
            timestamp: new Date(tx.timestamp),
            hash: tx.hash,
            usdValue: tx.usdValue,
            from: tx.from,
            to: tx.to
          }))

          setTransactions(prev => [...newTxs, ...prev].slice(0, 20))
          setRealTimeUpdates(prev => [...newTxs, ...prev].slice(0, 5))
          setLastUpdate(new Date())

          // Send notifications for new transactions
          if (context?.user?.fid) {
            for (const tx of data.newTransactions) {
              try {
                await NotificationService.sendWalletActivityNotification(
                  context.user.fid.toString(),
                  tx.from,
                  tx.type.toUpperCase(),
                  tx.amount || tx.value,
                  tx.token || "ETH",
                  tx.usdValue
                )
              } catch (error) {
                console.error("[ActivityFeed] Failed to send notification:", error)
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("[ActivityFeed] Error checking for new transactions:", error)
    }
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "mint":
        return <Coins className="h-4 w-4 text-green-600" />
      case "transfer":
        return <ArrowUpRight className="h-4 w-4 text-blue-600" />
      case "swap":
        return <RefreshCw className="h-4 w-4 text-purple-600" />
      case "contract_interaction":
        return <Zap className="h-4 w-4 text-orange-600" />
      default:
        return <ArrowUpRight className="h-4 w-4 text-gray-600" />
    }
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "mint":
        return "bg-green-100 text-green-800"
      case "transfer":
        return "bg-blue-100 text-blue-800"
      case "swap":
        return "bg-purple-100 text-purple-800"
      case "contract_interaction":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  const formatUsdValue = (value?: number) => {
    if (!value) return ""
    return ` ($${value.toLocaleString()})`
  }

  const openTransaction = (hash: string) => {
    window.open(`https://basescan.org/tx/${hash}`, "_blank")
  }

  const allTransactions = [...realTimeUpdates, ...transactions].slice(0, 20)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Real-time Activity
                {isMonitoring && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-600">Live</span>
                  </div>
                )}
              </CardTitle>
              <CardDescription>
                {lastUpdate ? `Last updated ${formatTimeAgo(lastUpdate)}` : "Real-time Base transactions"}
                {context?.client?.notificationDetails && (
                  <div className="flex items-center gap-1 mt-1">
                    <Bell className="h-3 w-3 text-blue-600" />
                    <span className="text-xs text-blue-600">Notifications enabled</span>
                  </div>
                )}
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-muted-foreground">
                    Monitoring {watchedWallets.length} wallet{watchedWallets.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchActivity} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
      </Card>

      {watchedWallets.length === 0 ? (
        <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
          <ArrowUpRight className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Add wallets to see their activity</p>
        </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-muted-foreground">Loading activity...</p>
          </CardContent>
        </Card>
      ) : allTransactions.length === 0 ? (
        <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
          <ArrowUpRight className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No recent activity found</p>
          <p className="text-sm mt-1">Transactions will appear here when detected</p>
        </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {allTransactions.map((tx) => (
            <Card key={tx.id} className={`hover:shadow-md transition-shadow ${
              realTimeUpdates.some(rt => rt.id === tx.id) ? 'ring-2 ring-green-200 bg-green-50/50' : ''
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">{getTransactionIcon(tx.type)}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className={getTransactionColor(tx.type)}>{tx.type.toUpperCase()}</Badge>
                        <span className="font-mono text-sm text-muted-foreground">{tx.wallet}</span>
                        {realTimeUpdates.some(rt => rt.id === tx.id) && (
                          <Badge className="bg-green-100 text-green-800 text-xs">NEW</Badge>
                        )}
                      </div>
                      <p className="font-medium">
                        {tx.amount} {tx.token}{formatUsdValue(tx.usdValue)}
                      </p>
                      <p className="text-sm text-muted-foreground">{formatTimeAgo(tx.timestamp)}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => openTransaction(tx.hash)}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
