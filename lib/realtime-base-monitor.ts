import { ethers } from 'ethers'

interface RealtimeTransaction {
  hash: string
  from: string
  to: string
  value: string
  type: string
  timestamp: Date
  blockNumber: number
  gasUsed?: string
  gasPrice?: string
  chain: string
}

interface WalletSubscription {
  address: string
  userId: string
  callback: (transaction: RealtimeTransaction) => void
}

class RealtimeBaseMonitor {
  private provider: ethers.WebSocketProvider | null = null
  private subscriptions: Map<string, WalletSubscription[]> = new Map()
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 3000

  constructor() {
    this.initializeProvider()
  }

  private async initializeProvider() {
    try {
      const wsUrl = process.env.BASE_WS_URL || process.env.NEXT_PUBLIC_BASE_WS_URL || 'wss://base-mainnet.g.alchemy.com/v2/demo'
      console.log('[RealtimeBaseMonitor] Connecting to Base mainnet WebSocket:', wsUrl)
      
      this.provider = new ethers.WebSocketProvider(wsUrl)
      
      // Set up event listeners
      this.provider.on('error', this.handleError.bind(this))
      // Attempt to listen to underlying WebSocket close event when available
      try {
        const anyProvider: any = this.provider as any
        const ws = anyProvider?._websocket || anyProvider?._ws || anyProvider?.ws
        if (ws && typeof ws.on === 'function') {
          ws.on('close', () => this.handleDisconnect())
        }
      } catch {
        // Silently ignore if underlying WebSocket is not exposed
      }
      
      // Test connection
      await this.provider.getNetwork()
      this.isConnected = true
      this.reconnectAttempts = 0
      
      console.log('[RealtimeBaseMonitor] ✅ Connected to Base mainnet')
      
      // Start monitoring pending transactions
      this.startPendingTransactionMonitoring()
      
    } catch (error) {
      console.error('[RealtimeBaseMonitor] Failed to initialize provider:', error)
      this.handleReconnect()
    }
  }

  private startPendingTransactionMonitoring() {
    if (!this.provider) return

    console.log('[RealtimeBaseMonitor] Starting real-time transaction monitoring...')
    
    // Listen for pending transactions (throttled to avoid spam)
    let lastPendingCheck = 0
    this.provider.on('pending', async (txHash: string) => {
      const now = Date.now()
      if (now - lastPendingCheck < 1000) return // Throttle to 1 per second
      lastPendingCheck = now
      
      try {
        const tx = await this.provider!.getTransaction(txHash)
        if (tx && this.isWatchedTransaction(tx)) {
          await this.processTransaction(tx)
        }
      } catch (error) {
        // Ignore errors for pending transactions that might not exist yet
      }
    })

    // Listen for new blocks to catch confirmed transactions
    this.provider.on('block', async (blockNumber: number) => {
      try {
        const block = await this.provider!.getBlock(blockNumber, true)
        if (block && block.transactions) {
          for (const tx of block.transactions) {
            if (typeof tx === 'object' && this.isWatchedTransaction(tx)) {
              await this.processTransaction(tx)
            }
          }
        }
      } catch (error) {
        console.error('[RealtimeBaseMonitor] Error processing block:', error)
      }
    })
  }

  private isWatchedTransaction(tx: ethers.TransactionResponse): boolean {
    if (!tx.from || !tx.to) return false
    
    const fromLower = tx.from.toLowerCase()
    const toLower = tx.to.toLowerCase()
    
    return this.subscriptions.has(fromLower) || this.subscriptions.has(toLower)
  }

  private async processTransaction(tx: ethers.TransactionResponse) {
    try {
      const fromLower = tx.from?.toLowerCase() || ''
      const toLower = tx.to?.toLowerCase() || ''
      
      // Get relevant subscriptions
      const relevantSubscriptions = [
        ...(this.subscriptions.get(fromLower) || []),
        ...(this.subscriptions.get(toLower) || [])
      ]

      if (relevantSubscriptions.length === 0) return

      // Wait for transaction receipt to get more details
      let receipt = null
      try {
        receipt = await tx.wait()
      } catch (error) {
        // Transaction might be pending, use basic info
      }

      // Determine transaction type
      const txType = this.determineTransactionType(tx, receipt)
      
      // Create transaction object
      const realtimeTransaction: RealtimeTransaction = {
        hash: tx.hash,
        from: tx.from || '',
        to: tx.to || '',
        value: ethers.formatEther(tx.value || 0),
        type: txType,
        timestamp: new Date(),
        blockNumber: tx.blockNumber || 0,
        gasUsed: receipt?.gasUsed?.toString(),
        gasPrice: tx.gasPrice?.toString(),
        chain: 'base'
      }

      console.log('[RealtimeBaseMonitor] 🔥 New transaction detected:', realtimeTransaction.hash)

      // Notify all relevant subscriptions
      relevantSubscriptions.forEach(subscription => {
        try {
          subscription.callback(realtimeTransaction)
        } catch (error) {
          console.error('[RealtimeBaseMonitor] Error in subscription callback:', error)
        }
      })

    } catch (error) {
      console.error('[RealtimeBaseMonitor] Error processing transaction:', error)
    }
  }

  private determineTransactionType(tx: ethers.TransactionResponse, receipt: ethers.TransactionReceipt | null): string {
    // Check for contract interaction
    if (tx.data && tx.data !== '0x') {
      // Check for common patterns
      if (tx.data.startsWith('0xa9059cbb')) return 'transfer' // ERC20 transfer
      if (tx.data.startsWith('0xa0712d68')) return 'mint' // Common mint function
      if (tx.data.startsWith('0x095ea7b3')) return 'approve' // ERC20 approve
      if (tx.data.startsWith('0x40c10f19')) return 'mint' // Another mint pattern
      return 'contract'
    }

    // Check for zero address (burning/minting)
    if (tx.to === '0x0000000000000000000000000000000000000000') return 'burn'
    if (tx.from === '0x0000000000000000000000000000000000000000') return 'mint'

    // Regular ETH transfer
    return 'transfer'
  }

  public addWalletSubscription(address: string, userId: string, callback: (transaction: RealtimeTransaction) => void) {
    const normalizedAddress = address.toLowerCase()
    
    if (!this.subscriptions.has(normalizedAddress)) {
      this.subscriptions.set(normalizedAddress, [])
    }
    
    const subscription: WalletSubscription = {
      address: normalizedAddress,
      userId,
      callback
    }
    
    this.subscriptions.get(normalizedAddress)!.push(subscription)
    
    console.log(`[RealtimeBaseMonitor] ✅ Added real-time monitoring for wallet: ${address}`)
  }

  public removeWalletSubscription(address: string, userId: string) {
    const normalizedAddress = address.toLowerCase()
    const subscriptions = this.subscriptions.get(normalizedAddress)
    
    if (subscriptions) {
      const filteredSubs = subscriptions.filter(sub => sub.userId !== userId)
      
      if (filteredSubs.length === 0) {
        this.subscriptions.delete(normalizedAddress)
        console.log(`[RealtimeBaseMonitor] 🛑 Removed monitoring for wallet: ${normalizedAddress}`)
      } else {
        this.subscriptions.set(normalizedAddress, filteredSubs)
      }
    }
  }

  private handleError(error: any) {
    console.error('[RealtimeBaseMonitor] WebSocket error:', error)
    this.isConnected = false
    this.handleReconnect()
  }

  private handleDisconnect() {
    console.warn('[RealtimeBaseMonitor] WebSocket disconnected')
    this.isConnected = false
    this.handleReconnect()
  }

  private async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[RealtimeBaseMonitor] Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    console.log(`[RealtimeBaseMonitor] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
    
    setTimeout(() => {
      this.initializeProvider()
    }, this.reconnectDelay * this.reconnectAttempts)
  }

  public getConnectionStatus(): { connected: boolean; watchedWallets: number } {
    return {
      connected: this.isConnected,
      watchedWallets: this.subscriptions.size
    }
  }

  public disconnect() {
    if (this.provider) {
      this.provider.removeAllListeners()
      this.provider.destroy()
      this.provider = null
    }
    this.isConnected = false
    this.subscriptions.clear()
    console.log('[RealtimeBaseMonitor] Disconnected and cleaned up')
  }
}

// Create singleton instance
export const realtimeBaseMonitor = new RealtimeBaseMonitor()

export type { RealtimeTransaction }
