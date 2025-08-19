import { type NextRequest, NextResponse } from "next/server"
import { notificationTokens } from "../webhook/route"

export async function POST(request: NextRequest) {
  try {
    const { fid, title, body, targetUrl, notificationId } = await request.json()

    const tokenData = notificationTokens.get(fid.toString())
    if (!tokenData) {
      return NextResponse.json({ error: "No notification token found" }, { status: 404 })
    }

    console.log("[v0] Sending notification to FID:", fid)

    const response = await fetch(tokenData.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notificationId,
        title,
        body,
        targetUrl,
        tokens: [tokenData.token],
      }),
    })

    const result = await response.json()
    console.log("[v0] Notification response:", result)

    return NextResponse.json(result)
  } catch (error) {
    console.error("[v0] Send notification error:", error)
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 })
  }
}
