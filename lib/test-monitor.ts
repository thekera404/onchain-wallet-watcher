// Test file for blockchain monitor functionality
import { blockchainMonitor } from './blockchain-monitor'

// Test function to verify the monitor is working
export async function testBlockchainMonitor() {
  console.log('[Test] Starting blockchain monitor test...')
  
  try {
    // Test adding a wallet subscription
    const testAddress = '0x4200000000000000000000000000000000000006' // Base Team
    const testUserId = 'test-user-123'
    const testFid = '12345'
    const testToken = 'test-notification-token'
    
    console.log('[Test] Adding test wallet subscription...')
    blockchainMonitor.addWalletSubscription(testAddress, testUserId, testFid, testToken)
    
    // Check if wallet is being monitored
    const isMonitoring = blockchainMonitor.isMonitoring(testAddress)
    console.log('[Test] Wallet monitoring status:', isMonitoring)
    
    // Get monitored wallets
    const monitoredWallets = blockchainMonitor.getMonitoredWallets()
    console.log('[Test] Monitored wallets:', monitoredWallets)
    
    // Test removing wallet subscription
    console.log('[Test] Removing test wallet subscription...')
    blockchainMonitor.removeWalletSubscription(testAddress, testUserId)
    
    const isStillMonitoring = blockchainMonitor.isMonitoring(testAddress)
    console.log('[Test] Wallet still monitoring after removal:', isStillMonitoring)
    
    console.log('[Test] Blockchain monitor test completed successfully!')
    return true
    
  } catch (error) {
    console.error('[Test] Blockchain monitor test failed:', error)
    return false
  }
}

// Export for use in development
export { blockchainMonitor }
