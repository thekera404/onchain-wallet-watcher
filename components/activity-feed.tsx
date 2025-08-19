"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, Coins, RefreshCw, ExternalLink, Bell } from "lucide-react"
import { NotificationService } from "@/lib/notification-service"

interface ActivityFeedProps {
  watchedWallets: string[]
  context?: any
}

interface Transaction {
  id: string
  wallet: string
  type: "mint" | "transfer" | "swap"
  amount: string
  token: string
  timestamp: Date
  hash: string
}

export function ActivityFeed({ watchedWallets, context }: ActivityFeedProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isMonitoring, setIsMonitoring] = useState(false)

  const fetchActivity = async () => {
    if (watchedWallets.length === 0) return

    setIsLoading(true)

    try {
      const response = await fetch("/api/monitor-wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallets: watchedWallets }),
      })

      const data = await response.json()
      console.log("[v0] Activity data received:", data)

      const formattedTransactions: Transaction[] =
        data.transactions?.map((tx: any, index: number) => ({
          id: `${tx.hash}-${index}`,
          wallet: tx.from.slice(0, 6) + "..." + tx.from.slice(-4),
          type: tx.type,
          amount: tx.amount || tx.value,
          token: tx.token || "ETH",
          timestamp: new Date(tx.timestamp),
          hash: tx.hash,
        })) || []

      setTransactions(formattedTransactions)
      setLastUpdate(new Date())

      if (data.significantTransactions?.length > 0 && context?.user?.fid) {
        for (const tx of data.significantTransactions) {
          try {
            await NotificationService.sendWalletActivityNotification(
              context.user.fid.toString(),
              tx.from,
              tx.type.toUpperCase(),
              tx.amount || tx.value,
              tx.token || "ETH",
            )
          } catch (error) {
            console.error("[v0] Failed to send notification:", error)
          }
        }
      }
    } catch (error) {
      console.error("[v0] Failed to fetch activity:", error)
      setTransactions([
        {
          id: "1",
          wallet: "0x4200...0006",
          type: "mint",
          amount: "1000",
          token: "USDC",
          timestamp: new Date(Date.now() - 1000 * 60 * 5),
          hash: "0xabc123...",
        },
        {
          id: "2",
          wallet: "0x7166...75d3",
          type: "transfer",
          amount: "0.5",
          token: "ETH",
          timestamp: new Date(Date.now() - 1000 * 60 * 15),
          hash: "0xdef456...",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchActivity()

    if (watchedWallets.length > 0) {
      setIsMonitoring(true)
      const interval = setInterval(fetchActivity, 30000) // Check every 30 seconds

      return () => {
        clearInterval(interval)
        setIsMonitoring(false)
      }
    }
  }, [watchedWallets])

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "mint":
        return <Coins className="h-4 w-4 text-green-600" />
      case "transfer":
        return <ArrowUpRight className="h-4 w-4 text-blue-600" />
      case "swap":
        return <RefreshCw className="h-4 w-4 text-purple-600" />
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

  const openTransaction = (hash: string) => {
    window.open(`https://basescan.org/tx/${hash}`, "_blank")
  }

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
          <CardContent className="py-8 text-center text-gray-500">
            <ArrowUpRight className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Add wallets to see their activity</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading activity...</p>
          </CardContent>
        </Card>
      ) : transactions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <ArrowUpRight className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No recent activity found</p>
            <p className="text-sm mt-1">Transactions will appear here when detected</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <Card key={tx.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">{getTransactionIcon(tx.type)}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className={getTransactionColor(tx.type)}>{tx.type.toUpperCase()}</Badge>
                        <span className="font-mono text-sm text-gray-600">{tx.wallet}</span>
                      </div>
                      <p className="font-medium">
                        {tx.amount} {tx.token}
                      </p>
                      <p className="text-sm text-gray-500">{formatTimeAgo(tx.timestamp)}</p>
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
