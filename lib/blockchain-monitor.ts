import { ethers } from 'ethers'
import { NotificationService } from './notification-service'

// ERC20 Transfer event signature
const ERC20_TRANSFER_EVENT = 'Transfer(address,address,uint256)'
const ERC20_TRANSFER_TOPIC = ethers.id(ERC20_TRANSFER_EVENT)

// ERC721 Transfer event signature
const ERC721_TRANSFER_EVENT = 'Transfer(address,address,uint256)'
const ERC721_TRANSFER_TOPIC = ethers.id(ERC721_TRANSFER_EVENT)

// Mint event signatures (common patterns)
const MINT_EVENTS = [
  'Mint(address,uint256)',
  'Transfer(address,address,uint256)',
  'TokenMinted(address,uint256)',
  'NFTMinted(address,uint256)'
]

interface TransactionData {
  hash: string
  from: string
  to: string
  value: string
  blockNumber: number
  timestamp: number
  type: 'transfer' | 'mint' | 'swap' | 'contract_interaction'
  token?: string
  tokenAddress?: string
  amount?: string
  usdValue?: number
  gasUsed?: string
  gasPrice?: string
  input?: string
  contractAddress?: string
}

interface WalletSubscription {
  address: string
  userId: string
  fid: string
  notificationToken: string
  lastCheckedBlock: number
}

class BlockchainMonitor {
  private provider: ethers.JsonRpcProvider | null = null
  private wsProvider: ethers.WebSocketProvider | null = null
  private subscriptions: Map<string, WalletSubscription[]> = new Map()
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private apiCallCount = 0
  private lastApiCallTime = 0
  private readonly API_RATE_LIMIT = 5 // calls per second for free tier

  constructor() {
    this.initializeProviders()
  }

  private async initializeProviders() {
    try {
      // Initialize HTTP provider for Base mainnet
      const baseRpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org'
      this.provider = new ethers.JsonRpcProvider(baseRpcUrl)

      // Initialize WebSocket provider for real-time monitoring
      const baseWsUrl = process.env.BASE_WS_URL || 'wss://base-mainnet.g.alchemy.com/v2/demo'
      this.wsProvider = new ethers.WebSocketProvider(baseWsUrl)

      this.isConnected = true
      this.reconnectAttempts = 0

      console.log('[BlockchainMonitor] Connected to Base network')

      // Set up WebSocket event listeners
      this.setupWebSocketListeners()

      // Start monitoring existing subscriptions
      this.startMonitoring()

    } catch (error) {
      console.error('[BlockchainMonitor] Failed to initialize providers:', error)
      this.handleConnectionError()
    }
  }

  private setupWebSocketListeners() {
    if (!this.wsProvider) return

    this.wsProvider.on('pending', (txHash) => {
      this.handlePendingTransaction(txHash)
    })

    this.wsProvider.on('block', (blockNumber) => {
      this.handleNewBlock(blockNumber)
    })

    this.wsProvider.on('error', (error) => {
      console.error('[BlockchainMonitor] WebSocket error:', error)
      this.handleConnectionError()
    })

    this.wsProvider.on('close', () => {
      console.log('[BlockchainMonitor] WebSocket connection closed')
      this.handleConnectionError()
    })
  }

  private async handleConnectionError() {
    this.isConnected = false
    this.reconnectAttempts++

    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
      console.log(`[BlockchainMonitor] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
      setTimeout(() => this.initializeProviders(), 5000 * this.reconnectAttempts)
    } else {
      console.error('[BlockchainMonitor] Max reconnection attempts reached')
    }
  }

  private async handlePendingTransaction(txHash: string) {
    if (!this.provider || !this.isConnected) return

    try {
      const tx = await this.provider.getTransaction(txHash)
      if (!tx) return

      const fromAddr = tx.from?.toLowerCase()
      const toAddr = tx.to?.toLowerCase()

      // Check if this transaction involves any of our watched wallets
      for (const [watchedAddress, subscriptions] of this.subscriptions) {
        if (fromAddr === watchedAddress || toAddr === watchedAddress) {
          await this.processTransaction(tx, subscriptions)
        }
      }
    } catch (error) {
      // Ignore errors for pending transactions that might not be available yet
    }
  }

  private async handleNewBlock(blockNumber: number) {
    console.log(`[BlockchainMonitor] New block: ${blockNumber}`)
    
    // Process all watched wallets for this block
    for (const [address, subscriptions] of this.subscriptions) {
      await this.checkWalletActivity(address, subscriptions, blockNumber)
    }
  }

  private async processTransaction(tx: ethers.TransactionResponse, subscriptions: WalletSubscription[]) {
    try {
      const receipt = await tx.wait()
      const txData = await this.analyzeTransaction(tx, receipt)
      
      if (txData && this.isSignificantTransaction(txData)) {
        await this.sendNotifications(txData, subscriptions)
      }
    } catch (error) {
      console.error('[BlockchainMonitor] Error processing transaction:', error)
    }
  }

  private async analyzeTransaction(tx: ethers.TransactionResponse, receipt: ethers.TransactionReceipt): Promise<TransactionData | null> {
    try {
      const block = await this.provider!.getBlock(tx.blockNumber!)
      const timestamp = block?.timestamp || Date.now()

      // Basic transaction data
      const txData: TransactionData = {
        hash: tx.hash,
        from: tx.from.toLowerCase(),
        to: tx.to?.toLowerCase() || '',
        value: ethers.formatEther(tx.value),
        blockNumber: tx.blockNumber!,
        timestamp: timestamp * 1000,
        type: 'transfer',
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: tx.gasPrice?.toString(),
        input: tx.data,
        contractAddress: tx.to?.toLowerCase()
      }

      // Analyze transaction type based on input data and logs
      if (tx.data && tx.data !== '0x') {
        txData.type = await this.determineTransactionType(tx, receipt)
      }

      // Get token information if it's a token transfer
      if (txData.type === 'transfer' && tx.to) {
        const tokenInfo = await this.getTokenInfo(tx.to)
        if (tokenInfo) {
          txData.token = tokenInfo.symbol
          txData.tokenAddress = tx.to
          txData.amount = tokenInfo.amount
        }
      }

      // Calculate USD value (approximate)
      txData.usdValue = await this.calculateUsdValue(txData)

      return txData
    } catch (error) {
      console.error('[BlockchainMonitor] Error analyzing transaction:', error)
      return null
    }
  }

  private async determineTransactionType(tx: ethers.TransactionResponse, receipt: ethers.TransactionReceipt): Promise<'transfer' | 'mint' | 'swap' | 'contract_interaction'> {
    try {
      // Check for mint events in logs
      for (const log of receipt.logs) {
        const logTopic = log.topics[0]
        
        // Check for mint events
        for (const mintEvent of MINT_EVENTS) {
          if (logTopic === ethers.id(mintEvent)) {
            return 'mint'
          }
        }

        // Check for ERC20 transfers
        if (logTopic === ERC20_TRANSFER_TOPIC) {
          const from = ethers.getAddress(log.topics[1].slice(26))
          const to = ethers.getAddress(log.topics[2].slice(26))
          
          // If from is zero address, it's likely a mint
          if (from === ethers.ZeroAddress) {
            return 'mint'
          }
        }
      }

      // Check for swap patterns in input data
      if (tx.data && tx.data.length > 10) {
        const methodId = tx.data.slice(0, 10)
        
        // Common swap method IDs
        const swapMethods = [
          '0xa9059cbb', // transfer
          '0x23b872dd', // transferFrom
          '0x38ed1739', // swapExactTokensForTokens
          '0x7ff36ab5', // swapExactETHForTokens
          '0x18cbafe5', // swapExactTokensForETH
        ]
        
        if (swapMethods.includes(methodId)) {
          return 'swap'
        }
      }

      return 'contract_interaction'
    } catch (error) {
      console.error('[BlockchainMonitor] Error determining transaction type:', error)
      return 'contract_interaction'
    }
  }

  private async getTokenInfo(tokenAddress: string): Promise<{ symbol: string; amount: string } | null> {
    try {
      // ERC20 token interface
      const tokenInterface = new ethers.Interface([
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
        'function name() view returns (string)'
      ])

      const contract = new ethers.Contract(tokenAddress, tokenInterface, this.provider!)
      const [symbol, decimals] = await Promise.all([
        contract.symbol(),
        contract.decimals()
      ])

      return { symbol, amount: '0' } // Amount will be calculated from logs
    } catch (error) {
      console.error('[BlockchainMonitor] Error getting token info:', error)
      return null
    }
  }

  private async calculateUsdValue(txData: TransactionData): Promise<number> {
    try {
      // For ETH transfers, use approximate price
      if (!txData.tokenAddress) {
        const ethValue = parseFloat(txData.value)
        return ethValue * 2500 // Approximate ETH price
      }

      // For token transfers, try to get price from a price feed
      // This is a simplified version - in production, you'd use a price oracle
      const tokenValue = parseFloat(txData.amount || '0')
      
      // Approximate prices for common tokens
      const tokenPrices: { [key: string]: number } = {
        'USDC': 1,
        'USDT': 1,
        'WETH': 2500,
        'cbETH': 2500,
        'DEGEN': 0.001,
        'HIGHER': 0.01
      }

      const price = tokenPrices[txData.token || ''] || 1
      return tokenValue * price
    } catch (error) {
      console.error('[BlockchainMonitor] Error calculating USD value:', error)
      return 0
    }
  }

  private isSignificantTransaction(txData: TransactionData): boolean {
    // Consider transactions significant if:
    // 1. USD value > $100
    // 2. It's a mint transaction
    // 3. It's a large ETH transfer (> 0.1 ETH)
    
    if (txData.type === 'mint') return true
    if (txData.usdValue && txData.usdValue > 100) return true
    if (txData.type === 'transfer' && parseFloat(txData.value) > 0.1) return true
    
    return false
  }

  private async sendNotifications(txData: TransactionData, subscriptions: WalletSubscription[]) {
    const activityType = txData.type === 'mint' ? 'New Mint' : 
                        txData.type === 'swap' ? 'Token Swap' : 
                        txData.type === 'transfer' ? 'Transfer' : 'Contract Interaction'

    const amount = txData.amount || txData.value
    const token = txData.token || 'ETH'

    for (const subscription of subscriptions) {
      try {
        await NotificationService.sendWalletActivityNotification(
          subscription.fid,
          txData.from,
          activityType,
          `${amount} ${token}`,
          token,
          txData.usdValue
        )
        
        console.log(`[BlockchainMonitor] Sent notification for ${activityType}: ${txData.hash}`)
      } catch (error) {
        console.error('[BlockchainMonitor] Failed to send notification:', error)
      }
    }
  }

  private async checkWalletActivity(address: string, subscriptions: WalletSubscription[], currentBlock: number) {
    try {
      // Get the latest block number for this wallet
      const latestBlock = subscriptions[0]?.lastCheckedBlock || currentBlock - 10
      
      // Get transaction history for the last few blocks
      const logs = await this.provider!.getLogs({
        fromBlock: latestBlock,
        toBlock: currentBlock,
        address: address
      })

      // Process each log
      for (const log of logs) {
        const tx = await this.provider!.getTransaction(log.transactionHash)
        if (tx) {
          await this.processTransaction(tx, subscriptions)
        }
      }

      // Update last checked block for all subscriptions
      for (const subscription of subscriptions) {
        subscription.lastCheckedBlock = currentBlock
      }
    } catch (error) {
      console.error(`[BlockchainMonitor] Error checking wallet activity for ${address}:`, error)
    }
  }

  // Rate limiting for API calls
  private async checkRateLimit(): Promise<boolean> {
    const now = Date.now()
    
    // Reset counter if more than 1 second has passed
    if (now - this.lastApiCallTime > 1000) {
      this.apiCallCount = 0
      this.lastApiCallTime = now
    }

    // Check if we're within rate limit
    if (this.apiCallCount >= this.API_RATE_LIMIT) {
      console.log('[BlockchainMonitor] Rate limit reached, waiting...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      return this.checkRateLimit()
    }

    this.apiCallCount++
    return true
  }

  // Enhanced transaction fetching with multiple data sources
  public async getTransactionHistory(address: string, fromBlock: number, toBlock: number): Promise<TransactionData[]> {
    await this.checkRateLimit()
    
    const transactions: TransactionData[] = []
    
    try {
      // Primary: Use RPC logs (most reliable, no API limits)
      const logs = await this.provider!.getLogs({
        fromBlock,
        toBlock,
        address: address
      })

      for (const log of logs) {
        const tx = await this.provider!.getTransaction(log.transactionHash)
        if (tx) {
          const receipt = await tx.wait()
          const txData = await this.analyzeTransaction(tx, receipt)
          if (txData) {
            transactions.push(txData)
          }
        }
      }

      // Secondary: Use BaseScan API if available (for additional metadata)
      if (process.env.BASESCAN_API_KEY && transactions.length === 0) {
        const baseScanTxs = await this.getBaseScanTransactions(address, fromBlock, toBlock)
        transactions.push(...baseScanTxs)
      }

    } catch (error) {
      console.error(`[BlockchainMonitor] Error fetching transaction history for ${address}:`, error)
    }

    return transactions
  }

  // BaseScan API integration with V2 API support
  private async getBaseScanTransactions(address: string, fromBlock: number, toBlock: number): Promise<TransactionData[]> {
    try {
      const apiKey = process.env.BASESCAN_API_KEY
      if (!apiKey) return []

      // Use Etherscan V2 API with chainid parameter for Base (chain ID 8453)
      const v2Url = 'https://api.etherscan.io/v2/api'
      const v2Params = new URLSearchParams({
        chainid: '8453', // Base chain ID
        module: 'account',
        action: 'txlist',
        address: address,
        startblock: fromBlock.toString(),
        endblock: toBlock.toString(),
        sort: 'desc',
        apikey: apiKey
      })

      console.log('[BlockchainMonitor] Using Etherscan V2 API for Base chain')
      const response = await fetch(`${v2Url}?${v2Params}`)
      
      // If V2 fails, fallback to V1 BaseScan API
      if (!response.ok) {
        console.log('[BlockchainMonitor] V2 API failed, trying V1 BaseScan...')
        const v1Url = `https://api.basescan.org/api`
        const v1Params = new URLSearchParams({
          module: 'account',
          action: 'txlist',
          address: address,
          startblock: fromBlock.toString(),
          endblock: toBlock.toString(),
          sort: 'desc',
          apikey: apiKey
        })
        
        const v1Response = await fetch(`${v1Url}?${v1Params}`)
        
        if (!v1Response.ok) {
          throw new Error(`BaseScan API error: ${v1Response.status}`)
        }
        
        const data = await v1Response.json()
        return this.parseTransactionData(data)
      }

      const data = await response.json()
      return this.parseTransactionData(data)

    } catch (error) {
      console.error('[BlockchainMonitor] BaseScan API error:', error)
      return []
    }
  }

  private parseTransactionData(data: any): TransactionData[] {
    if (data.status === '1' && data.result) {
      return data.result.slice(0, 10).map((tx: any) => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: (Number.parseInt(tx.value) / 1e18).toFixed(6),
        blockNumber: Number.parseInt(tx.blockNumber),
        timestamp: Number.parseInt(tx.timeStamp) * 1000,
        type: this.determineTransactionTypeFromData(tx),
        token: 'ETH',
        amount: (Number.parseInt(tx.value) / 1e18).toFixed(6),
        usdValue: Math.round((Number.parseInt(tx.value) / 1e18) * 2500),
        gasUsed: tx.gasUsed,
        gasPrice: tx.gasPrice,
        input: tx.input,
      }))
    }
    return []
  }

  private determineTransactionTypeFromData(tx: any): 'transfer' | 'mint' | 'swap' | 'contract_interaction' {
    if (tx.input && tx.input !== '0x') {
      if (tx.input.includes('a9059cbb')) return 'transfer'
      if (tx.input.includes('40c10f19')) return 'mint'
      if (tx.input.includes('38ed1739') || tx.input.includes('7ff36ab5')) return 'swap'
      return 'contract_interaction'
    }
    return 'transfer'
  }

  public addWalletSubscription(address: string, userId: string, fid: string, notificationToken: string) {
    const normalizedAddress = address.toLowerCase()

    if (!this.subscriptions.has(normalizedAddress)) {
      this.subscriptions.set(normalizedAddress, [])
    }

    const subscriptions = this.subscriptions.get(normalizedAddress)!

    // Remove existing subscription for this user if any
    const existingIndex = subscriptions.findIndex((sub) => sub.userId === userId)
    if (existingIndex !== -1) {
      subscriptions.splice(existingIndex, 1)
    }

    // Add new subscription
    subscriptions.push({
      address: normalizedAddress,
      userId,
      fid,
      notificationToken,
      lastCheckedBlock: 0
    })

    console.log(`[BlockchainMonitor] Added monitoring for wallet: ${normalizedAddress}`)
  }

  public removeWalletSubscription(address: string, userId: string) {
    const normalizedAddress = address.toLowerCase()
    const subscriptions = this.subscriptions.get(normalizedAddress)

    if (subscriptions) {
      const filteredSubs = subscriptions.filter((sub) => sub.userId !== userId)

      if (filteredSubs.length === 0) {
        this.subscriptions.delete(normalizedAddress)
        console.log(`[BlockchainMonitor] Removed monitoring for wallet: ${normalizedAddress}`)
      } else {
        this.subscriptions.set(normalizedAddress, filteredSubs)
      }
    }
  }

  public getMonitoredWallets(): string[] {
    return Array.from(this.subscriptions.keys())
  }

  public isMonitoring(address: string): boolean {
    return this.subscriptions.has(address.toLowerCase())
  }

  public async getLatestBlockNumber(): Promise<number> {
    if (!this.provider) {
      throw new Error('Provider not initialized')
    }
    return await this.provider.getBlockNumber()
  }

  private async startMonitoring() {
    // Start periodic monitoring for all subscribed wallets
    setInterval(async () => {
      if (!this.isConnected || !this.provider) return

      try {
        const currentBlock = await this.provider.getBlockNumber()
        
        for (const [address, subscriptions] of this.subscriptions) {
          await this.checkWalletActivity(address, subscriptions, currentBlock)
        }
      } catch (error) {
        console.error('[BlockchainMonitor] Error in periodic monitoring:', error)
      }
    }, 30000) // Check every 30 seconds
  }
}

// Singleton instance
export const blockchainMonitor = new BlockchainMonitor()
