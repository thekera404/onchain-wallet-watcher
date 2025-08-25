import { type NextRequest, NextResponse } from "next/server"
import { notificationTokens } from "../webhook/route"

export async function POST(request: NextRequest) {
  try {
    const { fid, title, body, targetUrl, notificationId } = await request.json()

    if (!fid || !title || !body) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get notification token for this user
    const userToken = notificationTokens.get(fid.toString())
    
    if (!userToken) {
      console.log(`[NotificationService] No notification token found for FID: ${fid}`)
      return NextResponse.json({ 
        success: false, 
        error: "User not subscribed to notifications",
        fid: fid.toString()
      })
    }

    // Send notification to Farcaster
    const notificationPayload = {
      notificationId: notificationId || `wallet-activity-${fid}-${Date.now()}`,
      title,
      body,
      targetUrl: targetUrl || process.env.NEXT_PUBLIC_APP_URL || "https://etherdrops-watcher.vercel.app",
      tokens: [userToken.token],
    }

    console.log(`[NotificationService] Sending notification to FID ${fid}:`, notificationPayload)

    const response = await fetch(userToken.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notificationPayload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[NotificationService] Failed to send notification to FID ${fid}:`, errorText)
      return NextResponse.json({ 
        success: false, 
        error: "Failed to send notification",
        status: response.status,
        statusText: response.statusText
      })
    }

    const result = await response.json()
    console.log(`[NotificationService] Successfully sent notification to FID ${fid}:`, result)

    return NextResponse.json({
      success: true,
      notificationId: notificationPayload.notificationId,
      fid: fid.toString(),
      result
    })

  } catch (error) {
    console.error("[NotificationService] Error sending notification:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 })
  }
}
