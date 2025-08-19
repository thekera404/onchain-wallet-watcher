import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { wallets } = await request.json()

    if (!wallets || wallets.length === 0) {
      return NextResponse.json({ transactions: [] })
    }

    // In a real implementation, you'd fetch actual transaction data from Base network
    // For demo purposes, return mock data
    const mockTransactions = [
      {
        hash: "0x1234567890abcdef1234567890abcdef12345678",
        from: wallets[0],
        to: "0x8765432109876543210987654321098765432109",
        value: "0.5",
        type: "transfer",
        timestamp: Date.now() - 300000, // 5 minutes ago
        token: "ETH",
        usdValue: 1250,
      },
      {
        hash: "0xabcdef1234567890abcdef1234567890abcdef12",
        from: "0x1111222233334444555566667777888899990000",
        to: wallets[0],
        value: "1000",
        type: "mint",
        timestamp: Date.now() - 900000, // 15 minutes ago
        token: "USDC",
        usdValue: 1000,
      },
    ]

    return NextResponse.json({
      transactions: mockTransactions,
      lastUpdate: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Get activity error:", error)
    return NextResponse.json({ error: "Failed to get activity" }, { status: 500 })
  }
}
