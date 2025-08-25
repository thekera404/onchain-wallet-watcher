import { type NextRequest, NextResponse } from "next/server"
import { blockchainMonitor } from "../../../lib/blockchain-monitor"

export async function POST(request: NextRequest) {
  try {
    const { address, limit = 10 } = await request.json()

    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 })
    }

    console.log(`[GetWalletActivity] Fetching activity for ${address}`)

    try {
      // Get the latest block number
      const latestBlock = await blockchainMonitor.getLatestBlockNumber()
      const fromBlock = Math.max(0, latestBlock - 100) // Get last 100 blocks

      // Get transaction history using the blockchain monitor
      const transactions = await blockchainMonitor.getTransactionHistory(address, fromBlock, latestBlock)

      // Limit the number of transactions
      const limitedTransactions = transactions.slice(0, limit)

      return NextResponse.json({
        success: true,
        address: address,
        transactions: limitedTransactions,
        totalFound: transactions.length,
        blockRange: { from: fromBlock, to: latestBlock },
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error(`[GetWalletActivity] Error fetching transactions for ${address}:`, error)
      
      // Return empty result if there's an error
      return NextResponse.json({
        success: true,
        address: address,
        transactions: [],
        totalFound: 0,
        error: "Failed to fetch transactions",
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error("[GetWalletActivity] Error:", error)
    return NextResponse.json({ 
      error: "Failed to get wallet activity",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
