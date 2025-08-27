import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { address, limit = 20 } = await request.json()

    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 })
    }

    console.log(`[GetBaseTransactions] Fetching Base transactions for: ${address}`)

    // Use Etherscan V2 MultiChain API for Base mainnet data (chainid=8453)
    const apiKey = process.env.BASESCAN_API_KEY || process.env.ETHERSCAN_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({ 
        error: "No API key configured",
        transactions: [],
        source: "none"
      })
    }

    try {
      // Etherscan V2 MultiChain endpoints
      const base = `https://api.etherscan.io/v2/api?chainid=8453`
      const normalTxUrl = `${base}&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=${limit}&sort=desc&apikey=${apiKey}`
      const internalTxUrl = `${base}&module=account&action=txlistinternal&address=${address}&startblock=0&endblock=99999999&page=1&offset=${limit}&sort=desc&apikey=${apiKey}`
      const tokenTxUrl = `${base}&module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&page=1&offset=${limit}&sort=desc&apikey=${apiKey}`

      const [normalResponse, internalResponse, tokenResponse] = await Promise.all([
        fetch(normalTxUrl),
        fetch(internalTxUrl), 
        fetch(tokenTxUrl)
      ])

      const [normalData, internalData, tokenData] = await Promise.all([
        normalResponse.json(),
        internalResponse.json(),
        tokenResponse.json()
      ])

      const allTransactions = []

      // Process normal transactions
      if (normalData.status === "1" && normalData.result) {
        normalData.result.forEach((tx: any) => {
          allTransactions.push({
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            value: (parseFloat(tx.value) / 1e18).toString(),
            type: tx.to === "0x0000000000000000000000000000000000000000" ? "burn" : "transfer",
            timestamp: new Date(parseInt(tx.timeStamp) * 1000),
            blockNumber: parseInt(tx.blockNumber),
            gasUsed: tx.gasUsed,
            gasPrice: tx.gasPrice,
            chain: "base",
            isError: tx.isError === "1"
          })
        })
      }

      // Process internal transactions
      if (internalData.status === "1" && internalData.result) {
        internalData.result.forEach((tx: any) => {
          allTransactions.push({
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            value: (parseFloat(tx.value) / 1e18).toString(),
            type: "internal",
            timestamp: new Date(parseInt(tx.timeStamp) * 1000),
            blockNumber: parseInt(tx.blockNumber),
            gasUsed: tx.gasUsed,
            chain: "base",
            isError: tx.isError === "1"
          })
        })
      }

      // Process token transactions
      if (tokenData.status === "1" && tokenData.result) {
        tokenData.result.forEach((tx: any) => {
          const decimals = parseInt(tx.tokenDecimal) || 18
          const value = (parseFloat(tx.value) / Math.pow(10, decimals)).toString()
          
          allTransactions.push({
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            value: value,
            type: "token",
            timestamp: new Date(parseInt(tx.timeStamp) * 1000),
            blockNumber: parseInt(tx.blockNumber),
            gasUsed: tx.gasUsed,
            gasPrice: tx.gasPrice,
            chain: "base",
            tokenSymbol: tx.tokenSymbol,
            tokenName: tx.tokenName,
            tokenAddress: tx.contractAddress
          })
        })
      }

      // Sort by timestamp (newest first) and limit results
      const sortedTransactions = allTransactions
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit)

      return NextResponse.json({
        success: true,
        address,
        transactions: sortedTransactions,
        totalFound: allTransactions.length,
        source: "basescan",
        timestamp: new Date().toISOString()
      })

    } catch (apiError) {
      console.error("[GetBaseTransactions] Etherscan V2 API error:", apiError)
      return NextResponse.json({
        success: false,
        address,
        transactions: [],
        error: "Failed to fetch from Etherscan V2 API",
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error("[GetBaseTransactions] Error:", error)
    return NextResponse.json({ 
      error: "Failed to get Base transactions",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
