import { ethers } from 'ethers'
import { useAppStore } from './store'

// Chain configurations
const CHAINS = {
  ethereum: {
    name: 'Ethereum',
    rpcUrl: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
    wsUrl: process.env.NEXT_PUBLIC_ETHEREUM_WS_URL || 'wss://eth-mainnet.g.alchemy.com/v2/demo',
    chainId: 1,
    blockExplorer: 'https://etherscan.io',
    nativeCurrency: { symbol: 'ETH', decimals: 18 }
  },
  base: {
    name: 'Base',
    rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org',
    wsUrl: process.env.NEXT_PUBLIC_BASE_WS_URL || 'wss://base-mainnet.g.alchemy.com/v2/demo',
    chainId: 8453,
    blockExplorer: 'https://basescan.org',
    nativeCurrency: { symbol: 'ETH', decimals: 18 }
  },
  polygon: {
    name: 'Polygon',
    rpcUrl: process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon-rpc.com',
    wsUrl: process.env.NEXT_PUBLIC_POLYGON_WS_URL || 'wss://polygon-mainnet.g.alchemy.com/v2/demo',
    chainId: 137,
    blockExplorer: 'https://polygonscan.com',
    nativeCurrency: { symbol: 'MATIC', decimals: 18 }
  },
  arbitrum: {
    name: 'Arbitrum',
    rpcUrl: process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    wsUrl: process.env.NEXT_PUBLIC_ARBITRUM_WS_URL || 'wss://arb-mainnet.g.alchemy.com/v2/demo',
    chainId: 42161,
    blockExplorer: 'https://arbiscan.io',
    nativeCurrency: { symbol: 'ETH', decimals: 18 }
  }
}

// Event signatures for different transaction types
const EVENT_SIGNATURES = {
  // ERC-20 Transfer
  erc20Transfer: 'Transfer(address,address,uint256)',
  // ERC-721 Transfer (NFT)
  erc721Transfer: 'Transfer(address,address,uint256)',
  // ERC-1155 Transfer
  erc1155Transfer: 'TransferSingle(address,address,address,uint256,uint256)',
  // Mint events
  mint: [
    'Mint(address,uint256)',
    'TokenMinted(address,uint256)',
    'NFTMinted(address,uint256)',
    'Minted(address,uint256)'
  ],
  // Swap events (Uniswap, SushiSwap, etc.)
  swap: [
    'Swap(address,uint256,uint256,uint256,uint256,address)',
    'TokenSwap(address,uint256,uint256,uint256,uint256,address)'
  ],
  // DeFi events
  defi: [
    'Stake(address,uint256)',
    'Unstake(address,uint256)',
    'Deposit(address,uint256)',
    'Withdraw(address,uint256)',
    'Borrow(address,uint256)',
    'Repay(address,uint256)'
  ]
}

interface TransactionData {
  hash: string
  from: string
  to: string
  value: string
  blockNumber: number
  timestamp: number
  type: 'transfer' | 'mint' | 'swap' | 'defi' | 'contract_interaction'
  token?: string
  tokenAddress?: string
  amount?: string
  usdValue?: number
  gasUsed?: string
  gasPrice?: string
  input?: string
  contractAddress?: string
  chain: string
}

interface WalletSubscription {
  id: string
  address: string
  chain: string
  userId: string
  fid: string
  filters?: {
    minValue?: string
    trackNFTs: boolean
    trackTokens: boolean
    trackDeFi: boolean
    notifyOnMint: boolean
    notifyOnTransfer: boolean
  }
}

class EnhancedBlockchainMonitor {
  private providers: Map<string, ethers.JsonRpcProvider> = new Map()
  private wsProviders: Map<string, ethers.WebSocketProvider> = new Map()
  private subscriptions: Map<string, WalletSubscription[]> = new Map()
  private isRunning = false
  private reconnectAttempts = new Map<string, number>()
  private maxReconnectAttempts = 5
  private rateLimiters = new Map<string, { count: number; lastReset: number }>()

  constructor() {
    this.initializeProviders()
  }

  private async initializeProviders() {
    try {
      // Initialize providers for all chains
      for (const [chainName, config] of Object.entries(CHAINS)) {
        await this.initializeChainProvider(chainName, config)
      }
      
      console.log('[EnhancedMonitor] All chain providers initialized')
      this.startMonitoring()
    } catch (error) {
      console.error('[EnhancedMonitor] Failed to initialize providers:', error)
    }
  }

  private async initializeChainProvider(chainName: string, config: any) {
    try {
      // HTTP Provider
      const provider = new ethers.JsonRpcProvider(config.rpcUrl)
      this.providers.set(chainName, provider)

      // WebSocket Provider
      if (config.wsUrl) {
        const wsProvider = new ethers.WebSocketProvider(config.wsUrl)
        this.setupWebSocketListeners(chainName, wsProvider)
        this.wsProviders.set(chainName, wsProvider)
      }

      this.reconnectAttempts.set(chainName, 0)
      console.log(`[EnhancedMonitor] ${chainName} provider initialized`)
    } catch (error) {
      console.error(`[EnhancedMonitor] Failed to initialize ${chainName} provider:`, error)
    }
  }

  private setupWebSocketListeners(chainName: string, provider: ethers.WebSocketProvider) {
    provider.on('pending', (txHash) => {
      this.handlePendingTransaction(txHash, chainName)
    })

    provider.on('block', (blockNumber) => {
      this.handleNewBlock(blockNumber, chainName)
    })

    provider.on('error', (error) => {
      console.error(`[EnhancedMonitor] ${chainName} WebSocket error:`, error)
      this.handleConnectionError(chainName)
    })

    provider.on('close', () => {
      console.log(`[EnhancedMonitor] ${chainName} WebSocket connection closed`)
      this.handleConnectionError(chainName)
    })
  }

  private async handlePendingTransaction(txHash: string, chainName: string) {
    try {
      const provider = this.providers.get(chainName)
      if (!provider) return

      const tx = await provider.getTransaction(txHash)
      if (!tx) return

      await this.processTransaction(tx, chainName, 'pending')
    } catch (error) {
      console.error(`[EnhancedMonitor] Error processing pending transaction:`, error)
    }
  }

  private async handleNewBlock(blockNumber: number, chainName: string) {
    try {
      const provider = this.providers.get(chainName)
      if (!provider) return

      const block = await provider.getBlock(blockNumber, true)
      if (!block?.transactions) return

      // Process all transactions in the block
      for (const tx of block.transactions) {
        if (typeof tx === 'string') continue
        await this.processTransaction(tx, chainName, 'confirmed')
      }
    } catch (error) {
      console.error(`[EnhancedMonitor] Error processing block ${blockNumber}:`, error)
    }
  }

  private async processTransaction(tx: ethers.TransactionResponse, chainName: string, status: 'pending' | 'confirmed') {
    try {
      // Check if we're watching any addresses involved in this transaction
      const store = useAppStore.getState()
      const watchedWallets = store.watchedWallets.filter(w => w.chain === chainName && w.isActive)
      
      const relevantWallets = watchedWallets.filter(w => 
        w.address.toLowerCase() === tx.from?.toLowerCase() ||
        w.address.toLowerCase() === tx.to?.toLowerCase()
      )

      if (relevantWallets.length === 0) return

      // Get transaction receipt for additional details
      const provider = this.providers.get(chainName)
      if (!provider) return

      const receipt = await provider.getTransactionReceipt(tx.hash)
      if (!receipt) return

      // Determine transaction type
      const txType = this.determineTransactionType(tx, receipt, chainName)

      // Check if transaction meets filter criteria
      for (const wallet of relevantWallets) {
        if (this.shouldProcessTransaction(wallet, tx, txType)) {
          await this.saveAndNotifyTransaction(wallet, tx, receipt, txType, chainName)
        }
      }
    } catch (error) {
      console.error(`[EnhancedMonitor] Error processing transaction ${tx.hash}:`, error)
    }
  }

  private determineTransactionType(tx: ethers.TransactionResponse, receipt: ethers.TransactionReceipt, chainName: string): string {
    // Check if it's a contract interaction
    if (tx.to && tx.data && tx.data !== '0x') {
      // Analyze the transaction data to determine type
      if (this.isSwapTransaction(tx.data)) return 'swap'
      if (this.isDeFiTransaction(tx.data)) return 'defi'
      if (this.isMintTransaction(tx.data)) return 'mint'
      return 'contract_interaction'
    }

    // Native token transfer
    if (tx.value && tx.value > 0n) return 'transfer'

    return 'contract_interaction'
  }

  private isSwapTransaction(data: string): boolean {
    // Check for common swap function signatures
    const swapSignatures = [
      '0xa9059cbb', // transfer(address,uint256)
      '0x23b872dd', // transferFrom(address,address,uint256)
      '0x38ed1739', // swapExactTokensForTokens
      '0x7ff36ab5', // swapExactTokensForETH
    ]
    
    return swapSignatures.some(sig => data.startsWith(sig))
  }

  private isDeFiTransaction(data: string): boolean {
    // Check for common DeFi function signatures
    const defiSignatures = [
      '0x2e17de78', // stake
      '0x3a98ef39', // unstake
      '0xd0e30db0', // deposit
      '0x2e1a7d4d', // withdraw
    ]
    
    return defiSignatures.some(sig => data.startsWith(sig))
  }

  private isMintTransaction(data: string): boolean {
    // Check for common mint function signatures
    const mintSignatures = [
      '0x40c10f19', // mint
      '0x6a627842', // mint
      '0x7d1db4a5', // mint
    ]
    
    return mintSignatures.some(sig => data.startsWith(sig))
  }

  private shouldProcessTransaction(wallet: any, tx: ethers.TransactionResponse, txType: string): boolean {
    const filters = wallet.filters
    if (!filters) return true

    // Check minimum value filter
    if (filters.minValue && tx.value) {
      const minValue = BigInt(filters.minValue)
      if (tx.value < minValue) return false
    }

    // Check type-specific filters
    switch (txType) {
      case 'mint':
        return filters.notifyOnMint
      case 'transfer':
        return filters.notifyOnTransfer
      case 'swap':
      case 'defi':
        return filters.trackDeFi
      default:
        return true
    }
  }

  private async saveAndNotifyTransaction(wallet: any, tx: ethers.TransactionResponse, receipt: ethers.TransactionReceipt, txType: string, chainName: string) {
    try {
      // Save transaction to store
      const store = useAppStore.getState()
      const transaction = {
        hash: tx.hash,
        walletId: wallet.id,
        fromAddress: tx.from || '',
        toAddress: tx.to || '',
        value: tx.value?.toString() || '0',
        gasUsed: receipt.gasUsed?.toString(),
        gasPrice: tx.gasPrice?.toString(),
        blockNumber: Number(receipt.blockNumber),
        timestamp: new Date(),
        type: txType as any,
        chain: chainName,
        metadata: {
          chain,
          logs: receipt.logs,
          status: receipt.status,
        }
      }

      store.addTransaction(transaction)

      // Send notification if user has notification tokens
      await this.sendNotification(wallet, transaction, chainName)
    } catch (error) {
      console.error('[EnhancedMonitor] Error saving transaction:', error)
    }
  }

  private async sendNotification(wallet: any, transaction: any, chainName: string) {
    try {
      const store = useAppStore.getState()
      const user = store.user
      if (!user) return

      // Get notification tokens for the user
      const tokens = Array.from(store.notificationTokens.entries())
        .filter(([fid]) => fid === user.fid.toString())
        .map(([, tokenData]) => tokenData)

      if (tokens.length === 0) return

      const chainConfig = CHAINS[chainName as keyof typeof CHAINS]
      const notification = {
        notificationId: `tx-${transaction.hash}`,
        title: `🔔 ${chainConfig.name} Activity Detected`,
        body: `${wallet.label || wallet.address.slice(0, 8)}... ${transaction.type} on ${chainConfig.name}`,
        targetUrl: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/transaction/${transaction.hash}`,
        tokens: tokens.map(t => t.token)
      }

      // Send notification to all user's tokens
      for (const tokenData of tokens) {
        try {
          const response = await fetch(tokenData.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(notification),
          })

          if (!response.ok) {
            console.error('Failed to send notification:', await response.text())
          }
        } catch (error) {
          console.error('Error sending notification:', error)
        }
      }
    } catch (error) {
      console.error('[EnhancedMonitor] Error sending notification:', error)
    }
  }

  private async handleConnectionError(chainName: string) {
    const attempts = this.reconnectAttempts.get(chainName) || 0
    
    if (attempts < this.maxReconnectAttempts) {
      this.reconnectAttempts.set(chainName, attempts + 1)
      
      console.log(`[EnhancedMonitor] Attempting to reconnect to ${chainName} (${attempts + 1}/${this.maxReconnectAttempts})`)
      
      setTimeout(() => {
        this.initializeChainProvider(chainName, CHAINS[chainName as keyof typeof CHAINS])
      }, Math.pow(2, attempts) * 1000) // Exponential backoff
    } else {
      console.error(`[EnhancedMonitor] Max reconnection attempts reached for ${chainName}`)
    }
  }

  public startMonitoring() {
    if (this.isRunning) return
    this.isRunning = true
    console.log('[EnhancedMonitor] Started monitoring all chains')
  }

  public stopMonitoring() {
    this.isRunning = false
    
    // Close all WebSocket connections
    for (const [chainName, provider] of this.wsProviders) {
      provider.destroy()
    }
    
    console.log('[EnhancedMonitor] Stopped monitoring all chains')
  }

  public getChainInfo(chainName: string) {
    return CHAINS[chainName as keyof typeof CHAINS]
  }

  public getAllChains() {
    return Object.keys(CHAINS)
  }

  public async getWalletBalance(address: string, chainName: string): Promise<string> {
    try {
      const provider = this.providers.get(chainName)
      if (!provider) throw new Error(`Provider not found for chain: ${chainName}`)

      const balance = await provider.getBalance(address)
      return balance.toString()
    } catch (error) {
      console.error(`[EnhancedMonitor] Error getting balance for ${address} on ${chainName}:`, error)
      return '0'
    }
  }

  public async validateAddress(address: string, chainName: string): Promise<boolean> {
    try {
      // Basic Ethereum address validation
      if (!ethers.isAddress(address)) return false

      // Check if address has any transactions
      const provider = this.providers.get(chainName)
      if (!provider) return false

      const txCount = await provider.getTransactionCount(address)
      return txCount > 0
    } catch (error) {
      console.error(`[EnhancedMonitor] Error validating address ${address} on ${chainName}:`, error)
      return false
    }
  }
}

// Export singleton instance
export const enhancedMonitor = new EnhancedBlockchainMonitor()
export { CHAINS, EVENT_SIGNATURES }
