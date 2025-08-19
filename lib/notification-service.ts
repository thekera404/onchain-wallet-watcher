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
  ) {
    const notificationId = `etherdrops-${walletAddress.slice(-8)}-${Date.now()}`

    const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`
    const formatUsdValue = (value?: number) => (value ? ` ($${value.toLocaleString()})` : "")

    const title = `🚨 ${activityType} Alert`
    const body = `${formatAddress(walletAddress)}: ${amount} ${token}${formatUsdValue(usdValue)}`
    const targetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://etherdrops-watcher.vercel.app"}?wallet=${walletAddress}&activity=${activityType.toLowerCase()}`

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
}
