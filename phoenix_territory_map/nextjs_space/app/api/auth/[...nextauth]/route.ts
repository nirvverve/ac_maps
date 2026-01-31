import NextAuth from 'next-auth'
import { NextRequest } from 'next/server'
import { authOptions } from '@/lib/auth'
import { rateLimitGuard, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit'

const handler = NextAuth(authOptions)

// GET: render sign-in page (no rate limit needed)
export { handler as GET }

// POST: sign-in attempts — rate limited to prevent brute force (bd-4gs)
export async function POST(request: NextRequest, context: any) {
  const rateLimited = rateLimitGuard('auth', request, RATE_LIMIT_CONFIGS.auth)
  if (rateLimited) return rateLimited

  return handler(request, context)
}
