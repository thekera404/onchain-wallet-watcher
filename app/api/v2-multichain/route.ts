import { type NextRequest, NextResponse } from "next/server"

// Supported chain IDs for Etherscan V2 API
const SUPPORTED_CHAINS = {
  ETHEREUM: 1,
  BASE: 8453,
  ARBITRUM: 42161,
  OPTIMISM: 10,
  POLYGON: 137,
  BSC: 56,
  AVALANCHE: 43114,
  FANTOM: 250,
  CRONOS: 25,
  POLYGON_ZKEVM: 1101,
  LINEA: 59144,
  SCROLL: 534352,
  MANTLE: 5000,
  BLAST: 81457,
  MODE: 34443,
  FRAXTAL: 252,
  ZORA: 7777777,
  LISK: 1891,
  MANTLE_TESTNET: 5001,
  BASE_SEPOLIA: 84532,
  ARBITRUM_SEPOLIA: 421614,
  OPTIMISM_SEPOLIA: 11155420,
  POLYGON_AMOY: 80002,
  BSC_TESTNET: 97,
  AVALANCHE_FUJI: 43113,
  FANTOM_TESTNET: 4002,
  CRONOS_TESTNET: 338,
  LINEA_TESTNET: 59140,
  SCROLL_SEPOLIA: 534351,
  MANTLE_TESTNET_2: 5001,
  BLAST_SEPOLIA: 168587773,
  MODE_TESTNET: 919,
  FRAXTAL_TESTNET: 2522,
  ZORA_TESTNET: 999999999,
  LISK_TESTNET: 4202,
  ETHEREUM_SEPOLIA: 11155111,
  ETHEREUM_GOERLI: 5,
  ETHEREUM_HOLESKY: 17000
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')
    const chainId = searchParams.get('chainid') || '8453' // Default to Base
    const action = searchParams.get('action') || 'balance'

    if (!address) {
      return NextResponse.json({ error: "Address parameter is required" }, { status: 400 })
    }

    const apiKey = process.env.BASESCAN_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    // Validate chain ID
    const chainIdNum = parseInt(chainId)
    if (!Object.values(SUPPORTED_CHAINS).includes(chainIdNum)) {
      return NextResponse.json({ 
        error: "Unsupported chain ID", 
        supportedChains: Object.entries(SUPPORTED_CHAINS).map(([name, id]) => ({ name, id }))
      }, { status: 400 })
    }

    // Use Etherscan V2 API with chainid parameter
    const v2Url = 'https://api.etherscan.io/v2/api'
    const params = new URLSearchParams({
      chainid: chainId,
      module: 'account',
      action: action,
      address: address,
      tag: 'latest',
      apikey: apiKey
    })

    console.log(`[V2Multichain] Querying chain ${chainId} for address ${address}`)
    
    const response = await fetch(`${v2Url}?${params}`)
    
    if (!response.ok) {
      throw new Error(`V2 API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      chainId: chainIdNum,
      address: address,
      action: action,
      data: data,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[V2Multichain] Error:', error)
    return NextResponse.json({ 
      error: "Failed to query V2 API",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Example of querying multiple chains as shown in the documentation
export async function POST(request: NextRequest) {
  try {
    const { address, chains = [8453, 42161, 10] } = await request.json()

    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 })
    }

    const apiKey = process.env.BASESCAN_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    const results = []

    // Query multiple chains with a single API key (as shown in the documentation)
    for (const chain of chains) {
      try {
        const v2Url = 'https://api.etherscan.io/v2/api'
        const params = new URLSearchParams({
          chainid: chain.toString(),
          module: 'account',
          action: 'balance',
          address: address,
          tag: 'latest',
          apikey: apiKey
        })

        const response = await fetch(`${v2Url}?${params}`)
        
        if (response.ok) {
          const data = await response.json()
          results.push({
            chainId: chain,
            success: true,
            data: data
          })
        } else {
          results.push({
            chainId: chain,
            success: false,
            error: `HTTP ${response.status}`
          })
        }
      } catch (error) {
        results.push({
          chainId: chain,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      address: address,
      results: results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[V2Multichain] Error:', error)
    return NextResponse.json({ 
      error: "Failed to query multiple chains",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Export supported chains for reference
export { SUPPORTED_CHAINS }
