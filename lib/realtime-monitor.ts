import { ethers } from "ethers"
import { NotificationService } from "./notification-service"

interface WalletSubscription {
  address: string
  userId: string
  notificationToken: string
}

class RealtimeWalletMonitor {
  private provider: ethers.WebSocketProvider | null = null
  private subscriptions: Map<string, WalletSubscription[]> = new Map()
  private notificationService: NotificationService
  private isConnected = false

  constructor() {
    this.notificationService = new NotificationService()
    this.connect()
  }

  private async connect() {
    try {
      const baseWsUrl = process.env.BASE_WS_URL || "wss://base-mainnet.g.alchemy.com/v2/demo"
      this.provider = new ethers.WebSocketProvider(baseWsUrl)

      console.log("[v0] Connected to Base WebSocket provider")
      this.isConnected = true

      // Listen for pending transactions
      this.provider.on("pending", (txHash) => this.handlePendingTransaction(txHash))

      // Handle connection errors
      this.provider.on("error", (error) => {
        console.error("[v0] WebSocket error:", error)
        this.reconnect()
      })
    } catch (error) {
      console.error("[v0] Failed to connect to Base WebSocket:", error)
      setTimeout(() => this.reconnect(), 5000)
    }
  }

  private async reconnect() {
    console.log("[v0] Attempting to reconnect...")
    this.isConnected = false
    if (this.provider) {
      this.provider.removeAllListeners()
    }
    setTimeout(() => this.connect(), 5000)
  }

  private async handlePendingTransaction(txHash: string) {
    if (!this.provider || !this.isConnected) return

    try {
      const tx = await this.provider.getTransaction(txHash)
      if (!tx) return

      const fromAddr = tx.from?.toLowerCase()
      const toAddr = tx.to?.toLowerCase()

      // Check if this transaction involves any of our watched wallets
      for (const [watchedAddress, subscriptions] of this.subscriptions) {
        if (fromAddr === watchedAddress || toAddr === watchedAddress) {
          await this.processTransaction(tx, subscriptions)
        }
      }
    } catch (error) {
      // Ignore errors for pending transactions that might not be available yet
    }
  }

  private async processTransaction(tx: any, subscriptions: WalletSubscription[]) {
    const value = Number.parseFloat(ethers.formatEther(tx.value))
    const isSignificant = value > 0.01 // Only notify for transactions > 0.01 ETH

    if (isSignificant) {
      const notification = {
        title: "🔔 Base Transaction Detected",
        body: `${value.toFixed(4)} ETH transaction from ${tx.from?.slice(0, 6)}...${tx.from?.slice(-4)}`,
        targetUrl: `https://basescan.org/tx/${tx.hash}`,
        timestamp: new Date().toISOString(),
      }

      for (const subscription of subscriptions) {
        await this.notificationService.sendNotification(subscription.notificationToken, notification)
      }

      console.log("[v0] Sent real-time notification for transaction:", tx.hash)
    }
  }

  public addWalletSubscription(address: string, userId: string, notificationToken: string) {
    const normalizedAddress = address.toLowerCase()

    if (!this.subscriptions.has(normalizedAddress)) {
      this.subscriptions.set(normalizedAddress, [])
    }

    const subscriptions = this.subscriptions.get(normalizedAddress)!

    // Remove existing subscription for this user if any
    const existingIndex = subscriptions.findIndex((sub) => sub.userId === userId)
    if (existingIndex !== -1) {
      subscriptions.splice(existingIndex, 1)
    }

    // Add new subscription
    subscriptions.push({ address: normalizedAddress, userId, notificationToken })

    console.log(`[v0] Added real-time monitoring for wallet: ${normalizedAddress}`)
  }

  public removeWalletSubscription(address: string, userId: string) {
    const normalizedAddress = address.toLowerCase()
    const subscriptions = this.subscriptions.get(normalizedAddress)

    if (subscriptions) {
      const filteredSubs = subscriptions.filter((sub) => sub.userId !== userId)

      if (filteredSubs.length === 0) {
        this.subscriptions.delete(normalizedAddress)
        console.log(`[v0] Removed monitoring for wallet: ${normalizedAddress}`)
      } else {
        this.subscriptions.set(normalizedAddress, filteredSubs)
      }
    }
  }

  public getMonitoredWallets(): string[] {
    return Array.from(this.subscriptions.keys())
  }

  public isMonitoring(address: string): boolean {
    return this.subscriptions.has(address.toLowerCase())
  }
}

// Singleton instance
export const realtimeMonitor = new RealtimeWalletMonitor()
