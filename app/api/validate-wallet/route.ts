import { type NextRequest, NextResponse } from "next/server"
import { ethers } from "ethers"

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json()

    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 })
    }

    // Basic Ethereum address validation
    if (!ethers.isAddress(address)) {
      return NextResponse.json({
        isValid: false,
        error: "Invalid Ethereum address format"
      })
    }

    // Check if address exists on Base network
    try {
      const baseRpcUrl = process.env.BASE_RPC_URL || "https://mainnet.base.org"
      const provider = new ethers.JsonRpcProvider(baseRpcUrl)

      // Get the balance and transaction count
      const [balance, transactionCount] = await Promise.all([
        provider.getBalance(address),
        provider.getTransactionCount(address)
      ])

      // Consider wallet valid if it has any balance or has made transactions
      const isValid = balance > 0n || transactionCount > 0

      return NextResponse.json({
        isValid,
        address: ethers.getAddress(address), // Normalized address
        balance: ethers.formatEther(balance),
        transactionCount: transactionCount.toString(),
        network: "Base"
      })

    } catch (error) {
      console.error("[ValidateWallet] Error checking wallet on Base:", error)
      
      // If we can't check on Base, still validate the address format
      return NextResponse.json({
        isValid: true, // Assume valid if we can't check
        address: ethers.getAddress(address),
        error: "Could not verify wallet activity on Base network",
        network: "Base"
      })
    }

  } catch (error) {
    console.error("[ValidateWallet] Error:", error)
    return NextResponse.json({ 
      error: "Failed to validate wallet" 
    }, { status: 500 })
  }
}
