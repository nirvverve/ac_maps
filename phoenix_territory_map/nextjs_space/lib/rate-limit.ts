/**
 * In-memory sliding window rate limiter for Next.js API routes.
 *
 * Uses IP-based identification with configurable limits per route.
 * Automatically cleans up expired entries to prevent memory leaks.
 *
 * bd-4gs
 */

import { NextRequest, NextResponse } from 'next/server'

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number
  /** Window duration in seconds */
  windowSeconds: number
}

/** Default configs per route category */
export const RATE_LIMIT_CONFIGS = {
  /** Admin upload: strict limit */
  adminUpload: { limit: 5, windowSeconds: 60 } as RateLimitConfig,
  /** Zip boundaries: moderate limit */
  zipBoundaries: { limit: 30, windowSeconds: 60 } as RateLimitConfig,
  /** Auth routes: prevent brute force */
  auth: { limit: 10, windowSeconds: 900 } as RateLimitConfig,
} as const

const stores = new Map<string, Map<string, RateLimitEntry>>()

/** Cleanup interval: run every 60s */
const CLEANUP_INTERVAL_MS = 60_000
let cleanupTimer: ReturnType<typeof setInterval> | null = null

function ensureCleanup() {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [, store] of stores) {
      for (const [key, entry] of store) {
        if (entry.resetAt <= now) {
          store.delete(key)
        }
      }
    }
  }, CLEANUP_INTERVAL_MS)
  // Allow process to exit without waiting for timer
  if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref()
  }
}

function getStore(namespace: string): Map<string, RateLimitEntry> {
  let store = stores.get(namespace)
  if (!store) {
    store = new Map()
    stores.set(namespace, store)
    ensureCleanup()
  }
  return store
}

/**
 * Extract client IP from request headers.
 * Checks x-forwarded-for, x-real-ip, then falls back to a default.
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') || '127.0.0.1'
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
}

/**
 * Check rate limit for a given namespace and request.
 * Returns whether the request is allowed and rate limit metadata.
 */
export function checkRateLimit(
  namespace: string,
  request: NextRequest,
  config: RateLimitConfig
): RateLimitResult {
  const store = getStore(namespace)
  const ip = getClientIP(request)
  const now = Date.now()

  const existing = store.get(ip)

  if (!existing || existing.resetAt <= now) {
    // New window
    store.set(ip, { count: 1, resetAt: now + config.windowSeconds * 1000 })
    return {
      allowed: true,
      limit: config.limit,
      remaining: config.limit - 1,
      resetAt: now + config.windowSeconds * 1000,
    }
  }

  // Existing window
  existing.count++

  if (existing.count > config.limit) {
    return {
      allowed: false,
      limit: config.limit,
      remaining: 0,
      resetAt: existing.resetAt,
    }
  }

  return {
    allowed: true,
    limit: config.limit,
    remaining: config.limit - existing.count,
    resetAt: existing.resetAt,
  }
}

/**
 * Apply rate limit headers to a response.
 */
export function applyRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set('X-RateLimit-Limit', result.limit.toString())
  response.headers.set('X-RateLimit-Remaining', Math.max(0, result.remaining).toString())
  response.headers.set('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000).toString())
  return response
}

/**
 * Rate limit guard for use at the top of API route handlers.
 * Returns a 429 response if rate limit is exceeded, or null if allowed.
 */
export function rateLimitGuard(
  namespace: string,
  request: NextRequest,
  config: RateLimitConfig
): NextResponse | null {
  const result = checkRateLimit(namespace, request, config)

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000)
    const response = NextResponse.json(
      {
        error: 'Too many requests',
        retryAfter,
      },
      { status: 429 }
    )
    response.headers.set('Retry-After', retryAfter.toString())
    return applyRateLimitHeaders(response, result)
  }

  return null
}
