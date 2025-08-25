import { type NextRequest, NextResponse } from "next/server"
import { blockchainMonitor } from "../../../lib/blockchain-monitor"

export async function POST(request: NextRequest) {
  try {
    const { wallets, since } = await request.json()

    if (!wallets || !Array.isArray(wallets)) {
      return NextResponse.json({ error: "Wallets array is required" }, { status: 400 })
    }

    if (!since) {
      return NextResponse.json({ error: "Since timestamp is required" }, { status: 400 })
    }

    console.log(`[CheckNewTransactions] Checking for new transactions since ${since} for ${wallets.length} wallets`)

    const sinceDate = new Date(since)
    const newTransactions: any[] = []

    try {
      // Get the latest block number
      const latestBlock = await blockchainMonitor.getLatestBlockNumber()
      const fromBlock = Math.max(0, latestBlock - 50) // Check last 50 blocks

      // Check each wallet for new transactions
      for (const wallet of wallets) {
        try {
          const transactions = await blockchainMonitor.getTransactionHistory(wallet, fromBlock, latestBlock)
          
          // Filter transactions that are newer than the since timestamp
          const recentTransactions = transactions.filter(tx => {
            const txDate = new Date(tx.timestamp)
            return txDate > sinceDate
          })

          newTransactions.push(...recentTransactions)
        } catch (error) {
          console.error(`[CheckNewTransactions] Error checking wallet ${wallet}:`, error)
        }
      }

      // Sort by timestamp (newest first)
      const sortedTransactions = newTransactions.sort((a, b) => b.timestamp - a.timestamp)

      return NextResponse.json({
        success: true,
        newTransactions: sortedTransactions,
        totalNew: sortedTransactions.length,
        walletsChecked: wallets.length,
        since: since,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error("[CheckNewTransactions] Error fetching new transactions:", error)
      
      return NextResponse.json({
        success: true,
        newTransactions: [],
        totalNew: 0,
        walletsChecked: wallets.length,
        since: since,
        error: "Failed to fetch new transactions",
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error("[CheckNewTransactions] Error:", error)
    return NextResponse.json({ 
      error: "Failed to check for new transactions",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
