# EtherDROPS Wallet Watcher - Onchain Transaction Monitor

A fully functional Farcaster mini app that tracks onchain transactions on Base network and sends real-time notifications when wallets mint, transfer, or swap tokens.

## Features

- 🔍 **Real-time Blockchain Monitoring**: Tracks transactions on Base network using WebSocket connections
- 🎯 **Smart Transaction Detection**: Identifies mints, transfers, swaps, and contract interactions
- 🔔 **Farcaster Notifications**: Sends real-time notifications to Farcaster users
- 📊 **Transaction Analysis**: Analyzes transaction types, token information, and USD values
- 🛡️ **Wallet Validation**: Validates wallet addresses on Base network before monitoring
- 📱 **Mobile-First UI**: Beautiful, responsive interface optimized for mobile devices

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Blockchain**: Ethers.js 6, Web3.js
- **Network**: Base (Ethereum L2)
- **Notifications**: Farcaster Mini App API
- **Real-time**: WebSocket connections for live transaction monitoring

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 2. Environment Variables

Create a `.env.local` file with the following variables:

```env
# Base Network Configuration
BASE_RPC_URL=https://mainnet.base.org
BASE_WS_URL=wss://base-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY

# BaseScan API (optional, for enhanced transaction data)
BASESCAN_API_KEY=your_basescan_api_key_here

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-app-domain.vercel.app

# Farcaster Configuration
FARCASTER_APP_KEY=your_farcaster_app_key_here
NEYNAR_API_KEY=your_neynar_api_key_here
```

### 3. Get API Keys

#### Alchemy (for WebSocket connection)
1. Go to [Alchemy](https://www.alchemy.com/)
2. Create a new app for Base network
3. Copy the WebSocket URL to `BASE_WS_URL`

#### BaseScan (optional)
1. Go to [BaseScan](https://basescan.org/)
2. Create an account and get an API key
3. Add to `BASESCAN_API_KEY`

**Important**: The app now uses the official [Etherscan V2 API](https://docs.etherscan.io/etherscan-v2) which unifies EVM data across 50+ chains with a single API key. This eliminates the need for multiple API keys and provides future-proof access to Base and other supported chains.

#### Farcaster
1. Register your mini app with Farcaster
2. Get your app key and Neynar API key
3. Add to environment variables

### 4. Run the Application

```bash
npm run dev
# or
pnpm dev
```

The app will be available at `http://localhost:3000`

## How It Works

### Etherscan V2 API Integration

The app leverages the [Etherscan V2 API](https://docs.etherscan.io/etherscan-v2) which provides:

- **Single API Key**: Access to 50+ chains with one key
- **Unified Interface**: Consistent API across all supported chains
- **Future-Proof**: No need to manage multiple API endpoints
- **Chain ID Support**: Use `chainid` parameter to specify target chain

**Supported Chains Include:**
- Base (8453) - Primary focus
- Arbitrum (42161)
- Optimism (10)
- Polygon (137)
- BSC (56)
- And 45+ more chains

### Blockchain Monitoring

The app uses a sophisticated monitoring system that:

1. **Connects to Base Network**: Establishes both HTTP and WebSocket connections
2. **Tracks Transactions**: Monitors pending transactions and new blocks in real-time
3. **Analyzes Transactions**: Determines transaction types (mint, transfer, swap, contract interaction)
4. **Extracts Token Data**: Gets token symbols, amounts, and calculates USD values
5. **Filters Significant Activity**: Only notifies for transactions > $100 or mints
6. **API Rate Limiting**: Respects Etherscan V2 API rate limits (5 calls/second for free tier)
7. **Multichain Support**: Single API key supports 50+ chains including Base, Arbitrum, Optimism, Polygon, and more

### Transaction Types Detected

- **Mints**: New token minting events (ERC20, ERC721)
- **Transfers**: Token and ETH transfers
- **Swaps**: DEX trading activity
- **Contract Interactions**: Smart contract calls

### Notification System

1. **Farcaster Integration**: Uses Farcaster Mini App API for notifications
2. **Real-time Delivery**: Sends notifications immediately when transactions are detected
3. **Rich Content**: Includes transaction details, USD values, and direct links to BaseScan

## API Endpoints

### `/api/monitor-wallets`
- `POST`: Add/remove wallets from monitoring
- Parameters: `action`, `address`, `userId`, `fid`

### `/api/validate-wallet`
- `POST`: Validate wallet address on Base network
- Parameters: `address`

### `/api/send-notification`
- `POST`: Send notification to Farcaster user
- Parameters: `fid`, `title`, `body`, `targetUrl`

### `/api/webhook`
- `POST`: Handle Farcaster webhook events
- Events: `miniapp_added`, `notifications_enabled`, `notifications_disabled`

### `/api/v2-multichain`
- `GET`: Query single chain using Etherscan V2 API
- `POST`: Query multiple chains with single API key
- Parameters: `address`, `chainid`, `action`

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production

Make sure to set all environment variables in your production environment:

```env
BASE_RPC_URL=https://mainnet.base.org
BASE_WS_URL=wss://base-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
BASESCAN_API_KEY=your_basescan_api_key_here
NEXT_PUBLIC_APP_URL=https://your-app-domain.vercel.app
FARCASTER_APP_KEY=your_farcaster_app_key_here
NEYNAR_API_KEY=your_neynar_api_key_here
```

## Usage

1. **Add the Mini App**: Users add the mini app to their Farcaster client
2. **Add Wallets**: Users can add wallet addresses to monitor
3. **Real-time Monitoring**: The app monitors transactions 24/7
4. **Get Notifications**: Users receive notifications for significant activity
5. **View Activity**: Users can view transaction history and activity feed

## Popular Wallets to Track

The app includes quick-add options for popular Base wallets:

- Base Team: `0x4200000000000000000000000000000000000006`
- Coinbase: `0x71660c4005BA85c37ccec55d0C4493E66Fe775d3`
- Base Bridge: `0x3154Cf16ccdb4C6d922629664174b904d80F2C35`
- DEGEN Token: `0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed`
- HIGHER Token: `0x0578d8A44db98B23BF096A382e016e29a5Ce0ffe`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support, please open an issue on GitHub or contact the development team.

---

**Note**: This app is designed for educational and demonstration purposes. Always test thoroughly before using in production environments.
