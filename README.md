# Onchain Wallet Watcher

A Farcaster mini app that tracks specific Base wallets (builders, DAOs, or friends) and sends notifications when they mint or move tokens.

## Features

- 🔍 **Wallet Tracking**: Add and monitor specific Base network wallets
- 📱 **Mobile-First Design**: Optimized for mobile devices and responsive across all screens
- 🔔 **Real-time Notifications**: Get notified via Farcaster when tracked wallets have activity
- ⛓️ **Base Network Integration**: Monitors token mints, transfers, and other onchain activity
- 🎯 **Activity Feed**: View recent transactions and activities from tracked wallets
- ⚙️ **Notification Settings**: Customize what types of activities trigger notifications

## Getting Started

### Prerequisites

- Node.js 18+ 
- A Vercel account for deployment
- Farcaster developer account

### Installation

1. Clone or download this project
2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Set up environment variables in your `.env.local`:
   \`\`\`env
   NEXT_PUBLIC_FARCASTER_APP_ID=your_farcaster_app_id
   BASE_RPC_URL=https://mainnet.base.org
   WEBHOOK_SECRET=your_webhook_secret
   \`\`\`

4. Run the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

### Deployment

1. **Deploy to Vercel**: 
   - Click the "Deploy" button in v0 or push to GitHub and connect to Vercel
   - Add your environment variables in Vercel project settings

2. **Register with Farcaster**:
   - Submit your app at https://warpcast.com/~/developers
   - Wait for approval as a Farcaster mini app

3. **Test the Integration**:
   - Share your deployed URL in a Farcaster cast
   - The app should embed properly as a mini app

## Usage

1. **Connect Wallet**: Use Farcaster authentication to connect your account
2. **Add Wallets**: Enter Base wallet addresses you want to track
3. **Configure Notifications**: Choose which activities trigger notifications
4. **Monitor Activity**: View real-time updates in the activity feed
5. **Receive Alerts**: Get notified in Farcaster when tracked wallets are active

## Technical Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS with shadcn/ui components
- **Blockchain**: Base network integration
- **Authentication**: Farcaster Frame SDK
- **Deployment**: Vercel

## Farcaster Mini App Configuration

The app includes the required `/.well-known/farcaster.json` manifest file and proper meta tags for Farcaster integration. Once deployed and approved, it will work seamlessly within the Farcaster ecosystem.

## Contributing

This is a Farcaster mini app built for tracking onchain wallet activity. Feel free to extend functionality or customize for your specific use case.

## License

MIT License - feel free to use and modify as needed.
