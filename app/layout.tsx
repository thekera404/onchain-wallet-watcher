import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

export const metadata: Metadata = {
  title: "Onchain Wallet Watcher",
  description:
    "Track your favorite Base wallets and get notified when they mint, swap, or transfer tokens.",
  openGraph: {
    title: "Onchain Wallet Watcher",
    description: "Track your favorite Base wallets in real-time. Get notifications for mints, transfers, and swaps.",
    images: ["https://onchain-wallet-watcher.vercel.app/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Onchain Wallet Watcher",
    description: "Track Base wallets in real-time",
    images: ["https://onchain-wallet-watcher.vercel.app/og-image.png"],
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
          content='{"version":"1","imageUrl":"https://onchain-wallet-watcher.vercel.app/splash.png","splashBackgroundColor":"#0a0b2b"}}}'
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
