import { type NextRequest, NextResponse } from "next/server"
import { verifyQuickAuth } from "@/lib/quick-auth"

// Store user wallets (in production, use a proper database)
const userWallets = new Map<string, string[]>()

export async function POST(request: NextRequest) {
  try {
    // Require Quick Auth for modifying monitored wallets
    const user = await verifyQuickAuth(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { action, address, userId, fid } = await request.json()

    if (action === "add" && address && userId) {
      const currentWallets = userWallets.get(userId) || []
      if (!currentWallets.includes(address)) {
        userWallets.set(userId, [...currentWallets, address])
        console.log("[MonitorWallets] Added wallet", address, "for user", userId)
      }
      return NextResponse.json({ success: true, message: "Wallet added to monitoring" })
    }

    if (action === "remove" && address && userId) {
      const currentWallets = userWallets.get(userId) || []
      const updatedWallets = currentWallets.filter(w => w !== address)
      userWallets.set(userId, updatedWallets)
      console.log("[MonitorWallets] Removed wallet", address, "for user", userId)
      return NextResponse.json({ success: true, message: "Wallet removed from monitoring" })
    }

    return NextResponse.json({ 
      success: true,
      monitoredWallets: Array.from(userWallets.entries()).reduce((acc, [user, wallets]) => {
        return acc + wallets.length
      }, 0),
      lastUpdate: new Date().toISOString()
    })

  } catch (error) {
    console.error("[MonitorWallets] Error:", error)
    return NextResponse.json({ 
      error: "Failed to monitor wallets",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export { userWallets }
