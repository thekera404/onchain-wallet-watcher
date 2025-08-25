"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExternalLink, Copy, RefreshCw, TrendingUp, Zap, Gift, ArrowRight, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAppStore } from "@/lib/store"

interface EnhancedActivityFeedProps {
  watchedWallets: any[]
}

export function EnhancedActivityFeed({ watchedWallets }: EnhancedActivityFeedProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'mints' | 'swaps' | 'transfers' | 'defi'>('all')
  const [selectedChain, setSelectedChain] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const { toast } = useToast()
  const { transactions, clearTransactions } = useAppStore()

  const CHAINS = {
    ethereum: { name: 'Ethereum', blockExplorer: 'https://etherscan.io', color: 'bg-blue-500' },
    base: { name: 'Base', blockExplorer: 'https://basescan.org', color: 'bg-blue-600' },
    polygon: { name: 'Polygon', blockExplorer: 'https://polygonscan.com', color: 'bg-purple-500' },
    arbitrum: { name: 'Arbitrum', blockExplorer: 'https://arbiscan.io', color: 'bg-blue-700' }
  }

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'mint': return <Gift className="h-4 w-4 text-green-600" />
      case 'swap': return <ArrowRight className="h-4 w-4 text-blue-600" />
      case 'defi': return <Zap className="h-4 w-4 text-purple-600" />
      case 'transfer': return <ArrowLeft className="h-4 w-4 text-gray-600" />
      default: return <TrendingUp className="h-4 w-4 text-gray-600" />
    }
  }

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'mint': return 'bg-green-100 text-green-800 border-green-200'
      case 'swap': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'defi': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'transfer': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: "Transaction hash copied to clipboard",
    })
  }

  const refreshTransactions = async () => {
    setIsRefreshing(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast({
        title: "Refreshed",
        description: "Activity feed has been updated",
      })
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh transactions",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const clearAllTransactions = () => {
    clearTransactions()
    toast({
      title: "Cleared",
      description: "All transactions have been cleared",
    })
  }

  const filteredTransactions = transactions.filter(tx => {
    if (activeTab !== 'all' && tx.type !== activeTab) return false
    if (selectedChain !== 'all' && tx.chain !== selectedChain) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        tx.hash.toLowerCase().includes(query) ||
        tx.fromAddress.toLowerCase().includes(query) ||
        (tx.toAddress && tx.toAddress.toLowerCase().includes(query)) ||
        tx.type.toLowerCase().includes(query)
      )
    }
    return true
  })

  if (watchedWallets.length === 0) {
    return (
      <Card className="border-0 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-8 text-center">
          <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h4 className="text-lg font-medium text-card-foreground mb-2">No Activity Yet</h4>
          <p className="text-muted-foreground">
            Add some wallets to watch and their activities will appear here
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 bg-card/70 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-card-foreground">Recent Activity</CardTitle>
              <CardDescription>
                Real-time transactions from your watched wallets
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshTransactions}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllTransactions}
                className="text-red-500 hover:text-red-700"
              >
                Clear All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search transactions, addresses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={selectedChain} onValueChange={setSelectedChain}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Chain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Chains</SelectItem>
                {Object.entries(CHAINS).map(([key, chain]) => (
                  <SelectItem key={key} value={key}>
                    {chain.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-card/70 backdrop-blur-sm">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="mints">Mints</TabsTrigger>
          <TabsTrigger value="swaps">Swaps</TabsTrigger>
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
          <TabsTrigger value="defi">DeFi</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredTransactions.length === 0 ? (
            <Card className="border-0 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-medium text-card-foreground mb-2">No Transactions Found</h4>
                <p className="text-muted-foreground">
                  {searchQuery || selectedChain !== 'all' || activeTab !== 'all'
                    ? "Try adjusting your filters or search terms"
                    : "Transactions will appear here as they happen"
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((tx) => (
                <Card key={tx.hash} className="border-0 bg-card/70 backdrop-blur-sm hover:bg-card/80 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="flex items-center gap-2 mt-1">
                          {getTransactionTypeIcon(tx.type)}
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getTransactionTypeColor(tx.type)}`}
                          >
                            {tx.type}
                          </Badge>
                          <div className={`w-3 h-3 rounded-full ${CHAINS[tx.chain as keyof typeof CHAINS]?.color || 'bg-gray-500'}`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-card-foreground">
                              {tx.fromAddress.slice(0, 8)}...{tx.fromAddress.slice(-6)}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            {tx.toAddress && (
                              <span className="text-sm font-medium text-card-foreground">
                                {tx.toAddress.slice(0, 8)}...{tx.toAddress.slice(-6)}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Value: {tx.value}</span>
                            {tx.gasUsed && <span>Gas: {tx.gasUsed}</span>}
                            <span>Block: {tx.blockNumber}</span>
                          </div>
                          
                          <div className="mt-2">
                            <code className="text-xs text-muted-foreground font-mono">
                              {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                            </code>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(tx.hash)}
                          className="h-8 px-2 text-xs"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const chainConfig = CHAINS[tx.chain as keyof typeof CHAINS]
                            if (chainConfig) {
                              window.open(`${chainConfig.blockExplorer}/tx/${tx.hash}`, '_blank')
                            }
                          }}
                          className="h-8 px-2 text-xs"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
