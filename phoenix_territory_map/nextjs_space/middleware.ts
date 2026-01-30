export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (authentication endpoints)
     * - login, register (auth pages)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static assets (images, CSS, JS needed for login page)
     *
     * NOTE: .json files are intentionally NOT excluded — customer data
     * in /public/*.json must require authentication. (bd-3b6)
     */
    '/((?!api/auth|login|register|_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.webp|.*\\.css|.*\\.js).*)',
  ],
}
