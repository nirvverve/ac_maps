'use client'

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email: email.toLowerCase(),
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
      } else if (result?.ok) {
        router.push('/')
        router.refresh()
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#27add6]/10 via-white to-[#1e759d]/10 p-4">
      <Card className="w-full max-w-md shadow-xl border-[#27add6]/20">
        <CardHeader className="space-y-4 pb-2">
          <div className="flex justify-center">
            <Image 
              src="/aps-logo-horizontal.png" 
              alt="Amenity Pool Services" 
              width={280} 
              height={80}
              priority
            />
          </div>
          <CardDescription className="text-center text-base text-slate-600">
            Data Visualization Tools
          </CardDescription>
          <p className="text-xs text-center text-[#e54e4e] font-medium">v0.71</p>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#1e759d]">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@amenitypool.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="border-[#27add6]/30 focus:border-[#1e759d] focus:ring-[#1e759d]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#1e759d]">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="•••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="border-[#27add6]/30 focus:border-[#1e759d] focus:ring-[#1e759d]"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full bg-[#1e759d] hover:bg-[#1e759d]/90 text-white" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              First time here?{' '}
              <Link href="/register" className="text-[#1e759d] hover:underline font-medium">
                Register your password
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
