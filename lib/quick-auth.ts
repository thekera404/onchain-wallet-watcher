import type { NextRequest } from 'next/server'

export interface AuthenticatedUser {
  fid: number
}

export async function verifyQuickAuth(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }
    const token = authHeader.split(' ')[1] as string

    // Dynamic import to avoid hard dependency if not installed/hoisted
    const mod = await import('@farcaster/quick-auth')
    const client = mod.createClient()

    // Determine domain (aud). Prefer NEXT_PUBLIC_APP_URL hostname, else request Host
    const configured = process.env.NEXT_PUBLIC_APP_URL
    const domain = configured ? new URL(configured).hostname : (request.headers.get('host') || '')

    const payload = await client.verifyJwt({ token, domain })
    return { fid: payload.sub }
  } catch (e) {
    // Treat as unauthenticated on failure
    return null
  }
}


