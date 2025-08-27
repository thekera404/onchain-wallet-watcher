import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

// Frame metadata (used for Farcaster frames)
const frameMetadata = {
  version: "1",
  imageUrl: "https://onchain-wallet-watcher.vercel.app/splash.svg",
  splashBackgroundColor: "#0a0b2b",
  button: {
    title: "Start Watching",
    action: {
      type: "launch_frame",
      name: "Onchain Wallet Watcher",
      url: "https://onchain-wallet-watcher.vercel.app/",
      splashImageUrl: "https://onchain-wallet-watcher.vercel.app/splash.svg", // wide splash image
      splashBackgroundColor: "#0a0b2b",
    },
  },
}

export const metadata: Metadata = {
  title: "Onchain Wallet Watcher",
  description:
    "Track your favorite Base wallets and get notified when they mint, swap, or transfer tokens.",
  openGraph: {
    title: "Onchain Wallet Watcher",
    description:
      "Track your favorite Base wallets in real-time. Get notifications for mints, transfers, and swaps.",
    images: [
      {
        url: "https://onchain-wallet-watcher.vercel.app/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Onchain Wallet Watcher Preview",
      },
    ],
  },
  other: {
    "fc:frame": JSON.stringify(frameMetadata),
    "fc:miniapp": JSON.stringify(frameMetadata),
    "og:image": "https://onchain-wallet-watcher.vercel.app/og-image.svg",
    "og:title": "Onchain Wallet Watcher",
    "og:description":
      "Track your favorite Base wallets in real-time. Get notifications for mints, transfers, and swaps.",
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
        <link rel="preconnect" href="https://auth.farcaster.xyz" />
        <style>{`
          html {
            font-family: ${GeistSans.style.fontFamily};
            --font-sans: ${GeistSans.variable};
            --font-mono: ${GeistMono.variable};
          }
        `}</style>
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
