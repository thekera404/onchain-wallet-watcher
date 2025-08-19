"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, ExternalLink, Copy, Zap } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface WalletTrackerProps {
  watchedWallets: string[]
  onAddWallet: (address: string) => void
  onRemoveWallet: (address: string) => void
  notificationToken?: string
  userId?: string
}

export function WalletTracker({
  watchedWallets,
  onAddWallet,
  onRemoveWallet,
  notificationToken,
  userId,
}: WalletTrackerProps) {
  const [newWallet, setNewWallet] = useState("")
  const [isValidating, setIsValidating] = useState(false)
  const { toast } = useToast()

  const validateAndAddWallet = async () => {
    if (!newWallet.trim()) return

    setIsValidating(true)

    // Basic Ethereum address validation
    const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(newWallet.trim())

    if (!isValidAddress) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid Ethereum address",
        variant: "destructive",
      })
      setIsValidating(false)
      return
    }

    if (notificationToken && userId) {
      try {
        const response = await fetch("/api/subscribe-wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: newWallet.trim(),
            userId,
            notificationToken,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to subscribe wallet")
        }

        const data = await response.json()
        console.log("[v0] Wallet subscribed to real-time monitoring:", data)
      } catch (error) {
        console.error("[v0] Error subscribing wallet:", error)
        toast({
          title: "Warning",
          description: "Wallet added but real-time notifications may not work",
          variant: "destructive",
        })
      }
    }

    onAddWallet(newWallet.trim())
    setNewWallet("")
    setIsValidating(false)

    toast({
      title: "Wallet Added",
      description: "Now tracking wallet activity on Base with real-time notifications",
    })
  }

  const removeWallet = async (address: string) => {
    if (userId) {
      try {
        await fetch("/api/subscribe-wallet", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: address,
            userId,
          }),
        })
      } catch (error) {
        console.error("[v0] Error unsubscribing wallet:", error)
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
            Track builders, DAOs, or friends on Base network with real-time notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="0x... (Ethereum address)"
            value={newWallet}
            onChange={(e) => setNewWallet(e.target.value)}
            className="font-mono text-sm"
          />
          <Button onClick={validateAndAddWallet} disabled={!newWallet.trim() || isValidating} className="w-full">
            {isValidating ? "Validating..." : "Add Wallet"}
          </Button>
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
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {watchedWallets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Add your first wallet to start tracking</p>
            </div>
          ) : (
            watchedWallets.map((wallet) => (
              <div key={wallet} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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

      {/* Popular Wallets to Track */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Popular Base Builders</CardTitle>
          <CardDescription>Quick add popular wallets to track</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { name: "Base Team", address: "0x4200000000000000000000000000000000000006" },
            { name: "Coinbase", address: "0x71660c4005BA85c37ccec55d0C4493E66Fe775d3" },
            { name: "Base Bridge", address: "0x3154Cf16ccdb4C6d922629664174b904d80F2C35" },
          ].map((wallet) => (
            <div key={wallet.address} className="flex items-center justify-between p-2 border rounded-lg">
              <div>
                <p className="font-medium text-sm">{wallet.name}</p>
                <p className="font-mono text-xs text-gray-600">{formatAddress(wallet.address)}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddWallet(wallet.address)}
                disabled={watchedWallets.includes(wallet.address)}
              >
                {watchedWallets.includes(wallet.address) ? "Added" : "Track"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
