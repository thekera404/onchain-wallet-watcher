"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Trash2, ExternalLink, Copy, Wallet, Settings, Filter, CheckCircle, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAppStore } from "@/lib/store"

interface EnhancedWalletTrackerProps {
  context?: any
}

export function EnhancedWalletTracker({ context }: EnhancedWalletTrackerProps) {
  const [newWallet, setNewWallet] = useState("")
  const [newWalletLabel, setNewWalletLabel] = useState("")
  const [selectedChain, setSelectedChain] = useState("base")
  const [isValidating, setIsValidating] = useState(false)
  const [validationStatus, setValidationStatus] = useState<"idle" | "validating" | "valid" | "invalid">("idle")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [editingWallet, setEditingWallet] = useState<any>(null)
  
  const { toast } = useToast()
  const { watchedWallets, addWatchedWallet, removeWatchedWallet, updateWatchedWallet } = useAppStore()

  // Chain configurations
  const CHAINS = {
    ethereum: { name: 'Ethereum', blockExplorer: 'https://etherscan.io' },
    base: { name: 'Base', blockExplorer: 'https://basescan.org' },
    polygon: { name: 'Polygon', blockExplorer: 'https://polygonscan.com' },
    arbitrum: { name: 'Arbitrum', blockExplorer: 'https://arbiscan.io' }
  }

  const validateAndAddWallet = async () => {
    if (!newWallet.trim()) return

    setIsValidating(true)
    setValidationStatus("validating")

    // Basic Ethereum address validation
    const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(newWallet.trim())

    if (!isValidAddress) {
      setValidationStatus("invalid")
      toast({
        title: "Invalid Address",
        description: "Please enter a valid Ethereum address",
        variant: "destructive",
      })
      setIsValidating(false)
      return
    }

    setValidationStatus("valid")

    // Check wallet limit before adding
    if (watchedWallets.length >= 5) {
      setValidationStatus("invalid")
      toast({
        title: "Wallet Limit Reached",
        description: "You can only track up to 5 wallets. Remove one to add another.",
        variant: "destructive",
      })
      setIsValidating(false)
      return
    }

    // Add wallet with default filters
    const wallet = {
      address: newWallet.trim(),
      label: newWalletLabel.trim() || `Wallet ${watchedWallets.length + 1}`,
      chain: selectedChain,
      isActive: true,
      filters: {
        minValue: "0",
        trackNFTs: true,
        trackTokens: true,
        trackDeFi: true,
        notifyOnMint: true,
        notifyOnTransfer: true,
      }
    }

    addWatchedWallet(wallet)
    
    // Reset form
    setNewWallet("")
    setNewWalletLabel("")
    setSelectedChain("base")
    setValidationStatus("idle")
    setShowAddDialog(false)

    toast({
      title: "Wallet Added",
      description: `${wallet.label} is now being monitored on ${CHAINS[selectedChain as keyof typeof CHAINS]?.name}`,
    })
  }

  const handleRemoveWallet = async (walletId: string) => {
    const wallet = watchedWallets.find(w => w.id === walletId)
    if (!wallet) return

    removeWatchedWallet(walletId)
    toast({
      title: "Wallet Removed",
      description: `${wallet.label} is no longer being monitored`,
    })
  }

  const handleToggleWallet = (walletId: string, isActive: boolean) => {
    updateWatchedWallet(walletId, { isActive })
    
    toast({
      title: isActive ? "Wallet Activated" : "Wallet Deactivated",
      description: `Monitoring ${isActive ? 'started' : 'stopped'} for this wallet`,
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: "Address copied to clipboard",
    })
  }

  return (
    <div className="space-y-6">
      {/* Add Wallet Section */}
      <Card className="border-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg text-card-foreground flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-600" />
            Add New Wallet to Watch
          </CardTitle>
          <CardDescription>
            Monitor wallet activities across multiple chains with customizable notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Wallet
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Wallet List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-card-foreground">
            Watched Wallets ({watchedWallets.length}/5)
          </h3>
          <Badge variant="secondary" className="text-xs">
            {watchedWallets.filter(w => w.isActive).length} Active
          </Badge>
        </div>

        {watchedWallets.length === 0 ? (
          <Card className="border-0 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="text-lg font-medium text-card-foreground mb-2">No wallets added yet</h4>
              <p className="text-muted-foreground mb-4">
                Start by adding a wallet address to monitor its onchain activities
              </p>
              <Button
                onClick={() => setShowAddDialog(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Wallet
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {watchedWallets.map((wallet) => (
              <Card key={wallet.id} className="border-0 bg-card/70 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        <Badge variant="outline" className="text-xs">
                          {CHAINS[wallet.chain as keyof typeof CHAINS]?.name || wallet.chain}
                        </Badge>
                      </div>
                      <div>
                        <CardTitle className="text-base text-card-foreground">
                          {wallet.label}
                        </CardTitle>
                        <CardDescription className="text-sm font-mono">
                          {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={wallet.isActive}
                        onCheckedChange={(checked) => handleToggleWallet(wallet.id, checked)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingWallet(wallet)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveWallet(wallet.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(wallet.address)}
                        className="h-8 px-2 text-xs"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`${CHAINS[wallet.chain as keyof typeof CHAINS]?.blockExplorer}/address/${wallet.address}`, '_blank')}
                        className="h-8 px-2 text-xs"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Explorer
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Wallet Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Wallet</DialogTitle>
            <DialogDescription>
              Enter a wallet address and select a chain to start monitoring
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="wallet-address">Wallet Address</Label>
              <Input
                id="wallet-address"
                placeholder="0x..."
                value={newWallet}
                onChange={(e) => setNewWallet(e.target.value)}
                className="font-mono"
              />
            </div>
            <div>
              <Label htmlFor="wallet-label">Label (Optional)</Label>
              <Input
                id="wallet-label"
                placeholder="e.g., My Wallet, Friend's Wallet"
                value={newWalletLabel}
                onChange={(e) => setNewWalletLabel(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="chain-select">Blockchain Network</Label>
              <Select value={selectedChain} onValueChange={setSelectedChain}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CHAINS).map(([key, chain]) => (
                    <SelectItem key={key} value={key}>
                      {chain.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {validationStatus === "validating" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Validating wallet address...
              </div>
            )}
            {validationStatus === "valid" && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                Valid wallet address
              </div>
            )}
            {validationStatus === "invalid" && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                Invalid wallet address
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={validateAndAddWallet}
              disabled={!newWallet.trim() || isValidating}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isValidating ? "Adding..." : "Add Wallet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
