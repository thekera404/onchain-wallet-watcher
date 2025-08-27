import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json()

    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 })
    }

    console.log(`[TestTransactions] Testing for address: ${address}`)

    // Generate test transactions for debugging
    const testTransactions = [
      {
        hash: `0x${Math.random().toString(16).substr(2, 64)}`,
        from: address,
        to: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
        value: "0.1",
        type: "transfer",
        timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
        blockNumber: 12345678,
        gasUsed: "21000",
        gasPrice: "20000000000",
        chain: "base"
      },
      {
        hash: `0x${Math.random().toString(16).substr(2, 64)}`,
        from: "0x8765432109876543210987654321098765432109",
        to: address,
        value: "0.05",
        type: "transfer",
        timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
        blockNumber: 12345677,
        gasUsed: "21000",
        gasPrice: "18000000000",
        chain: "base"
      },
      {
        hash: `0x${Math.random().toString(16).substr(2, 64)}`,
        from: address,
        to: "0x0000000000000000000000000000000000000000",
        value: "0",
        type: "mint",
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        blockNumber: 12345676,
        gasUsed: "80000",
        gasPrice: "25000000000",
        chain: "base"
      }
    ]

    // Try to get real transactions from BaseScan/Etherscan API if available
    let realTransactions = []
    const apiKey = process.env.BASESCAN_API_KEY || process.env.ETHERSCAN_API_KEY
    if (apiKey) {
      try {
        const baseScanUrl = `https://api.basescan.org/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10&sort=desc&apikey=${apiKey}`
        
        const response = await fetch(baseScanUrl)
        const data = await response.json()
        
        if (data.status === "1" && data.result) {
          realTransactions = data.result.slice(0, 5).map((tx: any) => ({
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            value: (parseFloat(tx.value) / 1e18).toString(),
            type: tx.to === "0x0000000000000000000000000000000000000000" ? "mint" : "transfer",
            timestamp: new Date(parseInt(tx.timeStamp) * 1000),
            blockNumber: parseInt(tx.blockNumber),
            gasUsed: tx.gasUsed,
            gasPrice: tx.gasPrice,
            chain: "base"
          }))
        }
      } catch (error) {
        console.error("[TestTransactions] BaseScan API error:", error)
      }
    }

    const transactions = realTransactions.length > 0 ? realTransactions : testTransactions

    return NextResponse.json({
      success: true,
      address,
      transactions,
      source: realTransactions.length > 0 ? "basescan" : "mock",
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[TestTransactions] Error:", error)
    return NextResponse.json({ 
      error: "Failed to get test transactions",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
