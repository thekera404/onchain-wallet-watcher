"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, Coins, RefreshCw, ExternalLink } from "lucide-react"

interface ActivityFeedProps {
  watchedWallets: string[]
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

export function ActivityFeed({ watchedWallets }: ActivityFeedProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // Mock transaction data for demo
  const mockTransactions: Transaction[] = [
    {
      id: "1",
      wallet: "0x4200...0006",
      type: "mint",
      amount: "1000",
      token: "USDC",
      timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
      hash: "0xabc123...",
    },
    {
      id: "2",
      wallet: "0x7166...75d3",
      type: "transfer",
      amount: "0.5",
      token: "ETH",
      timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
      hash: "0xdef456...",
    },
    {
      id: "3",
      wallet: "0x3154...2C35",
      type: "swap",
      amount: "2500",
      token: "USDC → ETH",
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      hash: "0x789abc...",
    },
  ]

  const fetchActivity = async () => {
    if (watchedWallets.length === 0) return

    setIsLoading(true)

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // In a real app, this would fetch from Base RPC or indexer
    setTransactions(mockTransactions)
    setLastUpdate(new Date())
    setIsLoading(false)
  }

  useEffect(() => {
    fetchActivity()
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
      {/* Header with refresh */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>
                {lastUpdate ? `Last updated ${formatTimeAgo(lastUpdate)}` : "Real-time Base transactions"}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchActivity} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Activity List */}
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
