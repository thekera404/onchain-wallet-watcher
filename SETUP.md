# Wallet Watcher Mini App - Setup Guide

## Overview
This is an enhanced Onchain Wallet Watcher Mini App for Farcaster that tracks blockchain transactions across multiple chains and sends real-time notifications.

## Features
- **Multi-chain Support**: Ethereum, Base, Polygon, Arbitrum
- **Real-time Monitoring**: WebSocket connections for live transaction updates
- **Smart Filtering**: Customizable notification preferences per wallet
- **Farcaster Integration**: Native Mini App with push notifications
- **Transaction Types**: Mints, swaps, DeFi activities, transfers
- **Wallet Management**: Add/remove wallets with labels and categories

## Prerequisites
- Node.js 22.11.0 or higher
- PostgreSQL database
- Farcaster account
- Neynar API key (for webhook verification)

## Environment Setup

Create a `.env.local` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/wallet_watcher"

# Blockchain RPC URLs
NEXT_PUBLIC_ETHEREUM_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY"
NEXT_PUBLIC_ETHEREUM_WS_URL="wss://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY"
NEXT_PUBLIC_BASE_RPC_URL="https://mainnet.base.org"
NEXT_PUBLIC_BASE_WS_URL="wss://base-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY"
NEXT_PUBLIC_POLYGON_RPC_URL="https://polygon-rpc.com"
NEXT_PUBLIC_POLYGON_WS_URL="wss://polygon-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY"
NEXT_PUBLIC_ARBITRUM_RPC_URL="https://arb1.arbitrum.io/rpc"
NEXT_PUBLIC_ARBITRUM_WS_URL="wss://arb-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY"

# Farcaster
NEYNAR_API_KEY="your_neynar_api_key_here"

# App Configuration
NEXT_PUBLIC_APP_URL="https://your-domain.com"

# Optional: Alchemy API Keys for enhanced features
NEXT_PUBLIC_ALCHEMY_KEY="your_alchemy_key_here"
NEXT_PUBLIC_INFURA_KEY="your_infura_key_here"
```

## Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables** (see above)

3. **Start development server**:
   ```bash
   npm run dev
   ```

## Farcaster Configuration

1. **Update the manifest file** (`public/.well-known/farcaster.json`):
   - Replace placeholder values with your actual domain
   - Update the `webhookUrl` to point to your deployed app
   - Generate proper account association using [Farcaster Developer Tools](https://farcaster.xyz/~/developers/mini-apps/manifest)

2. **Deploy the manifest**:
   - Host the `farcaster.json` file at `https://your-domain.com/.well-known/farcaster.json`
   - Ensure it's accessible via HTTPS

## Database Setup

The app uses a local state store (Zustand) for development. For production:

1. **Set up PostgreSQL database**
2. **Run database migrations** (when Prisma is added)
3. **Update DATABASE_URL** in environment variables

## Blockchain Monitoring

The enhanced monitor automatically:
- Connects to all configured chains
- Monitors watched wallet addresses
- Processes different transaction types
- Applies user-defined filters
- Sends Farcaster notifications

## Deployment

1. **Build the app**:
   ```bash
   npm run build
   ```

2. **Deploy to your hosting platform** (Vercel, Netlify, etc.)

3. **Update environment variables** in production

4. **Test the Mini App**:
   - Use Farcaster's preview tools
   - Test webhook endpoints
   - Verify notification delivery

## API Endpoints

- `/api/webhook` - Farcaster webhook handler
- `/api/monitor-wallets` - Wallet monitoring management
- `/api/send-notification` - Send notifications to users

## Customization

### Adding New Chains
1. Update `CHAINS` configuration in `lib/enhanced-monitor.ts`
2. Add RPC URLs to environment variables
3. Update chain icons and colors in components

### Transaction Types
1. Add new event signatures in `EVENT_SIGNATURES`
2. Implement detection logic in `determineTransactionType`
3. Update UI components to display new types

### Notification Templates
1. Customize notification content in `sendNotification`
2. Add new notification triggers
3. Implement batch notification logic

## Troubleshooting

### Common Issues

1. **WebSocket connections failing**:
   - Check RPC endpoint URLs
   - Verify API key limits
   - Check network connectivity

2. **Notifications not sending**:
   - Verify webhook URL is accessible
   - Check Neynar API key
   - Verify user has enabled notifications

3. **Transaction monitoring not working**:
   - Check blockchain RPC endpoints
   - Verify wallet addresses are valid
   - Check filter settings

### Debug Mode

Enable debug logging by setting:
```env
DEBUG=true
```

## Support

For issues and questions:
1. Check the Farcaster Mini App documentation
2. Review the webhook implementation
3. Check blockchain RPC endpoint status
4. Verify environment variable configuration

## License

This project is open source. See LICENSE file for details.
