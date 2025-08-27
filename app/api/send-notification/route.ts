import { type NextRequest, NextResponse } from "next/server"

// Lightweight local notification forwarder
// Expects: { notificationId, title, body, targetUrl, tokens: string[] }
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()

    const { notificationId, title, body, targetUrl, tokens } = payload || {}

    if (!notificationId || !title || !body || !Array.isArray(tokens)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    // In production, integrate with your push service. For now, echo success.
    console.log("[send-notification]", { notificationId, title, body, targetUrl, tokensCount: tokens.length })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[send-notification] Error:", error)
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 })
  }
}


