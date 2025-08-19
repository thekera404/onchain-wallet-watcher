import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

export const metadata: Metadata = {
  title: "Onchain Wallet Watcher | Track Base Wallets",
  description:
    "Monitor specific Base wallets and get notified when they mint or move tokens. Track builders, DAOs, and friends onchain activity.",
  generator: "v0.app",
  openGraph: {
    title: "Onchain Wallet Watcher",
    description: "Track Base wallets in real-time. Get notifications for mints, transfers, and swaps.",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Onchain Wallet Watcher",
    description: "Track Base wallets in real-time",
    images: ["/og-image.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        {/* Farcaster Mini App Meta Tags */}
        <meta
          name="fc:frame"
          content='{"version":"1","imageUrl":"https://wallet-watcher.vercel.app/og-image.png","button":{"title":"👁️ Start Watching","action":{"type":"launch_frame","url":"https://wallet-watcher.vercel.app","name":"Onchain Wallet Watcher","splashImageUrl":"https://wallet-watcher.vercel.app/splash.png","splashBackgroundColor":"#3B82F6"}}}'
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
