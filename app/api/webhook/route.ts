import { type NextRequest, NextResponse } from "next/server"
import { parseWebhookEvent, verifyAppKeyWithNeynar } from "@farcaster/miniapp-node"

// Store notification tokens (in production, use a proper database)
const notificationTokens = new Map<string, { token: string; url: string }>()

export async function POST(request: NextRequest) {
  try {
    const requestJson = await request.json()

    // Verify the webhook event
    const data = await parseWebhookEvent(requestJson, verifyAppKeyWithNeynar)

    console.log("[v0] EtherDROPS webhook event received:", data.event)

    switch (data.event) {
      case "miniapp_added":
        console.log("[v0] EtherDROPS mini app added for FID:", data.fid)
        if (data.notificationDetails) {
          notificationTokens.set(data.fid.toString(), {
            token: data.notificationDetails.token,
            url: data.notificationDetails.url,
          })
          console.log("[v0] Notification token saved for FID:", data.fid)

          try {
            await fetch(data.notificationDetails.url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                notificationId: `welcome-${data.fid}-${Date.now()}`,
                title: "🎉 EtherDROPS Watcher Added!",
                body: "Start tracking Base wallets for real-time activity alerts",
                targetUrl: process.env.NEXT_PUBLIC_APP_URL || "https://etherdrops-watcher.vercel.app",
                tokens: [data.notificationDetails.token],
              }),
            })
          } catch (error) {
            console.error("[v0] Failed to send welcome notification:", error)
          }
        }
        break

      case "notifications_enabled":
        console.log("[v0] Notifications enabled for FID:", data.fid)
        if (data.notificationDetails) {
          notificationTokens.set(data.fid.toString(), {
            token: data.notificationDetails.token,
            url: data.notificationDetails.url,
          })
        }
        break

      case "notifications_disabled":
        console.log("[v0] Notifications disabled for FID:", data.fid)
        notificationTokens.delete(data.fid.toString())
        break

      case "miniapp_removed":
        console.log("[v0] EtherDROPS mini app removed for FID:", data.fid)
        notificationTokens.delete(data.fid.toString())
        break
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] EtherDROPS webhook error:", error)
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 })
  }
}

// Export notification tokens for use in other API routes
export { notificationTokens }
