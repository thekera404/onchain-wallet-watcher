"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, ExternalLink, Copy, Zap, CheckCircle, AlertCircle, User, Wallet } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface WalletTrackerProps {
  watchedWallets: string[]
  onAddWallet: (address: string) => boolean
  onRemoveWallet: (address: string) => void
  context?: any
}

export function WalletTracker({
  watchedWallets,
  onAddWallet,
  onRemoveWallet,
  context,
}: WalletTrackerProps) {
  const [newWallet, setNewWallet] = useState("")
  const [isValidating, setIsValidating] = useState(false)
  const [validationStatus, setValidationStatus] = useState<"idle" | "validating" | "valid" | "invalid">("idle")
  const { toast } = useToast()

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

    // Validate wallet on Base network
    try {
      const response = await fetch("/api/validate-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: newWallet.trim(),
        }),
      })

      const validationResult = await response.json()

      if (!validationResult.isValid) {
        setValidationStatus("invalid")
        toast({
          title: "Invalid Wallet",
          description: validationResult.error || "This wallet doesn't exist on Base network",
          variant: "destructive",
        })
        setIsValidating(false)
        return
      }

      setValidationStatus("valid")

      // Check wallet limit before adding
      if (watchedWallets.length >= 3) {
        setValidationStatus("invalid")
        
        // Send Farcaster notification about wallet limit reached
        if (context?.user?.fid) {
          try {
            await fetch("/api/send-notification", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fid: context.user.fid,
                title: "🚫 Wallet Limit Reached",
                body: "You've reached the maximum of 3 wallets. Remove one to add another.",
                targetUrl: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}`,
                notificationId: `wallet-limit-${context.user.fid}-${Date.now()}`,
              }),
            })
          } catch (error) {
            console.error("[WalletTracker] Failed to send wallet limit notification:", error)
          }
        }
        
        toast({
          title: "Wallet Limit Reached",
          description: "You can only track up to 3 wallets. Remove one to add another.",
          variant: "destructive",
        })
        setIsValidating(false)
        return
      }

      // Add wallet to monitoring system
      if (context?.user?.fid) {
        try {
          const monitorResponse = await fetch("/api/monitor-wallets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "add",
              address: newWallet.trim(),
              userId: context.user.fid,
              fid: context.user.fid,
            }),
          })

          if (!monitorResponse.ok) {
            throw new Error("Failed to add wallet to monitoring")
          }

          const monitorData = await monitorResponse.json()
          console.log("[WalletTracker] Wallet added to monitoring:", monitorData)
        } catch (error) {
          console.error("[WalletTracker] Error adding wallet to monitoring:", error)
          toast({
            title: "Warning",
            description: "Wallet added but monitoring may not be active",
            variant: "destructive",
          })
        }
      }

      const success = onAddWallet(newWallet.trim())
      if (success) {
        setNewWallet("")
        setValidationStatus("idle")

        // Send Farcaster notification for wallet addition
        if (context?.user?.fid) {
          try {
            await fetch("/api/send-notification", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fid: context.user.fid,
                title: "🔍 New Wallet Added",
                body: `Now tracking ${newWallet.trim().slice(0, 6)}...${newWallet.trim().slice(-4)} on Base network`,
                targetUrl: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}?wallet=${newWallet.trim()}`,
                notificationId: `wallet-added-${context.user.fid}-${Date.now()}`,
              }),
            })
          } catch (error) {
            console.error("[WalletTracker] Failed to send wallet addition notification:", error)
          }
        }

        toast({
          title: "Wallet Added Successfully",
          description: "Now tracking wallet activity on Base with real-time notifications",
        })
      }

    } catch (error) {
      console.error("[WalletTracker] Error validating wallet:", error)
      setValidationStatus("invalid")
      toast({
        title: "Validation Error",
        description: "Failed to validate wallet. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsValidating(false)
    }
  }

  const removeWallet = async (address: string) => {
    if (context?.user?.fid) {
      try {
        await fetch("/api/monitor-wallets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "remove",
            address: address,
            userId: context.user.fid,
          }),
        })

        // Send Farcaster notification for wallet removal
        try {
          await fetch("/api/send-notification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fid: context.user.fid,
              title: "❌ Wallet Removed",
              body: `Stopped tracking ${address.slice(0, 6)}...${address.slice(-4)}`,
              targetUrl: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}`,
              notificationId: `wallet-removed-${context.user.fid}-${Date.now()}`,
            }),
          })
        } catch (error) {
          console.error("[WalletTracker] Failed to send wallet removal notification:", error)
        }
      } catch (error) {
        console.error("[WalletTracker] Error removing wallet from monitoring:", error)
      }
    }

    onRemoveWallet(address)
    toast({
      title: "Wallet Removed",
      description: "No longer tracking this wallet",
    })
  }

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
    toast({
      title: "Copied",
      description: "Address copied to clipboard",
    })
  }

  const openInBasescan = (address: string) => {
    window.open(`https://basescan.org/address/${address}`, "_blank")
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getValidationIcon = () => {
    switch (validationStatus) {
      case "validating":
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
      case "valid":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "invalid":
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {/* Add Wallet Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Wallet to Watch
          </CardTitle>
          <CardDescription>
            {context?.user 
              ? `Track builders, DAOs, or friends on Base network with real-time notifications, ${context.user.username || 'friend'}`
              : "Track builders, DAOs, or friends on Base network with real-time notifications"
            }
            {watchedWallets.length > 0 && (
              <span className="block mt-1 text-xs text-muted-foreground">
                {watchedWallets.length}/3 wallets being tracked
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {watchedWallets.length >= 3 ? (
            <div className="text-center py-4 text-muted-foreground">
              <div className="bg-yellow-100 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <AlertCircle className="h-5 w-5 text-yellow-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Wallet Limit Reached</p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  You can only track up to 3 wallets. Remove one to add another.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="relative">
                <Input
                  placeholder="0x... (Ethereum address)"
                  value={newWallet}
                  onChange={(e) => {
                    setNewWallet(e.target.value)
                    setValidationStatus("idle")
                  }}
                  className="font-mono text-sm pr-10"
                />
                {validationStatus !== "idle" && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {getValidationIcon()}
                  </div>
                )}
              </div>
              <Button 
                onClick={validateAndAddWallet} 
                disabled={!newWallet.trim() || isValidating} 
                className="w-full"
              >
                {isValidating ? "Validating..." : "Add Wallet"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Watched Wallets List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            Watched Wallets
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardTitle>
          <CardDescription>
            {watchedWallets.length === 0
              ? "No wallets being tracked yet"
              : `Tracking ${watchedWallets.length} wallet${watchedWallets.length > 1 ? "s" : ""} in real-time`}
            {watchedWallets.length > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Wallet Limit</span>
                  <span>{watchedWallets.length}/3</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      watchedWallets.length === 1 ? 'bg-blue-500 w-1/3' :
                      watchedWallets.length === 2 ? 'bg-yellow-500 w-2/3' :
                      watchedWallets.length === 3 ? 'bg-red-500 w-full' : 'w-0'
                    }`}
                  />
                </div>
                {watchedWallets.length === 2 && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                    ⚠️ You can add 1 more wallet
                  </p>
                )}
                {watchedWallets.length === 3 && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    🚫 Wallet limit reached
                  </p>
                )}
              </div>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {watchedWallets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Add your first wallet to start tracking</p>
            </div>
          ) : (
            watchedWallets.map((wallet) => (
              <div key={wallet} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex-1">
                  <p className="font-mono text-sm font-medium">{formatAddress(wallet)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      Base
                    </Badge>
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      Real-time
                    </Badge>
                    <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                      Active
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => copyAddress(wallet)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openInBasescan(wallet)}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeWallet(wallet)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Your Farcaster Wallets */}
      {context?.user && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-5 h-5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">
                  {context.user.username ? context.user.username.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
              Your Farcaster Wallets
            </CardTitle>
            <CardDescription>
              {context.user.username 
                ? `${context.user.username}'s wallets linked to Farcaster account`
                : "Your wallets linked to Farcaster account"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Farcaster Account Info */}
            <div className="p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-white">
                    {context.user.username ? context.user.username.charAt(0).toUpperCase() : 'U'}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-sm text-card-foreground">
                    {context.user.username || `FID: ${context.user.fid}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Farcaster ID: {context.user.fid}
                  </p>
                </div>
              </div>
            </div>

            {/* User's Wallets Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-card-foreground">Linked Wallets</h4>
                <Badge variant="outline" className="text-xs">
                  {watchedWallets.length}/3 used
                </Badge>
              </div>
              
              {/* Placeholder for user's actual wallets - this would be populated from Farcaster API */}
              <div className="text-center py-6 text-muted-foreground">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                  <Wallet className="h-6 w-6 opacity-50" />
                </div>
                <p className="text-sm font-medium mb-1">No linked wallets found</p>
                <p className="text-xs">
                  {context.user.username 
                    ? `${context.user.username} hasn't linked any wallets to their Farcaster account yet`
                    : "You haven't linked any wallets to your Farcaster account yet"
                  }
                </p>
                <div className="mt-3 text-xs text-muted-foreground/70">
                  <p>To link wallets, you can:</p>
                  <ul className="mt-1 space-y-1 text-left max-w-xs mx-auto">
                    <li>• Connect your wallet in Farcaster</li>
                    <li>• Use Farcaster's wallet linking feature</li>
                    <li>• Add wallets manually below</li>
                  </ul>
                </div>
              </div>

              {/* Quick Add Section */}
              <div className="pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-2">
                  Or add wallets manually to track:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { name: "Base Team", address: "0x4200000000000000000000000000000000000006" },
                    { name: "Coinbase", address: "0x71660c4005BA85c37ccec55d0C4493E66Fe775d3" },
                  ].map((wallet) => (
                    <div key={wallet.address} className="flex items-center justify-between p-2 border rounded-lg bg-muted/30">
                      <div>
                        <p className="font-medium text-xs">{wallet.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{formatAddress(wallet.address)}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAddWallet(wallet.address)}
                        disabled={watchedWallets.includes(wallet.address) || watchedWallets.length >= 3}
                        className="text-xs h-7 px-2"
                      >
                        {watchedWallets.includes(wallet.address) ? "Added" : watchedWallets.length >= 3 ? "Limit" : "Add"}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fallback for non-connected users */}
      {!context?.user && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Connect to See Your Wallets
            </CardTitle>
            <CardDescription>
              Connect your Farcaster account to see your linked wallets
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-6 text-muted-foreground">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
              <User className="h-6 w-6 opacity-50" />
            </div>
            <p className="text-sm font-medium mb-1">Farcaster Account Required</p>
            <p className="text-xs">
              Sign in with your Farcaster account to view and manage your linked wallets
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
