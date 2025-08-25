interface NotificationData {
  fid: string
  title: string
  body: string
  targetUrl: string
  notificationId: string
}

export class NotificationService {
  static async sendWalletActivityNotification(
    fid: string,
    walletAddress: string,
    activityType: string,
    amount: string,
    token: string,
    usdValue?: number,
    transactionHash?: string,
    blockNumber?: number,
  ) {
    const notificationId = `etherdrops-${walletAddress.slice(-8)}-${Date.now()}`

    const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`
    const formatUsdValue = (value?: number) => (value ? ` ($${value.toLocaleString()})` : "")

    // Enhanced notification content based on activity type
    let title = ""
    let body = ""
    
    switch (activityType.toLowerCase()) {
      case 'new mint':
        title = "🎨 New Mint Detected!"
        body = `${formatAddress(walletAddress)} minted ${amount} ${token}${formatUsdValue(usdValue)}`
        break
      case 'token swap':
        title = "🔄 Token Swap Alert!"
        body = `${formatAddress(walletAddress)} swapped ${amount} ${token}${formatUsdValue(usdValue)}`
        break
      case 'transfer':
        title = "💸 Transfer Detected!"
        body = `${formatAddress(walletAddress)} transferred ${amount} ${token}${formatUsdValue(usdValue)}`
        break
      case 'contract interaction':
        title = "⚡ Contract Activity!"
        body = `${formatAddress(walletAddress)} interacted with contract: ${amount} ${token}${formatUsdValue(usdValue)}`
        break
      default:
        title = `🚨 ${activityType} Alert`
        body = `${formatAddress(walletAddress)}: ${amount} ${token}${formatUsdValue(usdValue)}`
    }

    // Add transaction details to URL if available
    let targetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://etherdrops-watcher.vercel.app"}?wallet=${walletAddress}&activity=${activityType.toLowerCase()}`
    if (transactionHash) {
      targetUrl += `&tx=${transactionHash}`
    }
    if (blockNumber) {
      targetUrl += `&block=${blockNumber}`
    }

    try {
      const response = await fetch("/api/send-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid,
          title,
          body,
          targetUrl,
          notificationId,
        }),
      })

      const result = await response.json()
      console.log("[v0] EtherDROPS notification sent:", result)
      return result
    } catch (error) {
      console.error("[v0] Failed to send EtherDROPS notification:", error)
      throw error
    }
  }

  static async sendDailySummary(fid: string, walletCount: number, totalActivity: number) {
    const notificationId = `daily-summary-${fid}-${new Date().toDateString()}`
    const title = "📊 Daily Wallet Summary"
    const body = `${walletCount} wallets tracked, ${totalActivity} transactions detected`
    const targetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://etherdrops-watcher.vercel.app"}?view=summary`

    try {
      const response = await fetch("/api/send-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid,
          title,
          body,
          targetUrl,
          notificationId,
        }),
      })

      const result = await response.json()
      console.log("[v0] Daily summary sent:", result)
      return result
    } catch (error) {
      console.error("[v0] Failed to send daily summary:", error)
      throw error
    }
  }

  static async sendBulkNotifications(notifications: NotificationData[]) {
    const promises = notifications.map((notification) =>
      fetch("/api/send-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notification),
      }),
    )

    try {
      const responses = await Promise.all(promises)
      const results = await Promise.all(responses.map((r) => r.json()))
      console.log("[v0] EtherDROPS bulk notifications sent:", results)
      return results
    } catch (error) {
      console.error("[v0] Failed to send bulk notifications:", error)
      throw error
    }
  }

  static async sendWalletAddedNotification(fid: string, walletAddress: string, username?: string) {
    const notificationId = `wallet-added-${fid}-${Date.now()}`
    const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`
    
    const title = "🔍 New Wallet Added!"
    const body = username 
      ? `${username} added ${formatAddress(walletAddress)} to watch list`
      : `New wallet ${formatAddress(walletAddress)} added to watch list`
    
    const targetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://etherdrops-watcher.vercel.app"}?wallet=${walletAddress}`

    try {
      const response = await fetch("/api/send-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid,
          title,
          body,
          targetUrl,
          notificationId,
        }),
      })

      const result = await response.json()
      console.log("[v0] Wallet added notification sent:", result)
      return result
    } catch (error) {
      console.error("[v0] Failed to send wallet added notification:", error)
      throw error
    }
  }

  static async sendWalletRemovedNotification(fid: string, walletAddress: string, username?: string) {
    const notificationId = `wallet-removed-${fid}-${Date.now()}`
    const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`
    
    const title = "❌ Wallet Removed"
    const body = username 
      ? `${username} removed ${formatAddress(walletAddress)} from watch list`
      : `Wallet ${formatAddress(walletAddress)} removed from watch list`
    
    const targetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://etherdrops-watcher.vercher.app"}?view=wallets`

    try {
      const response = await fetch("/api/send-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid,
          title,
          body,
          targetUrl,
          notificationId,
        }),
      })

      const result = await response.json()
      console.log("[v0] Wallet removed notification sent:", result)
      return result
    } catch (error) {
      console.error("[v0] Failed to send wallet removed notification:", error)
      throw error
    }
  }
}
