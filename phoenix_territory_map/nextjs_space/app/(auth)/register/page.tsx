'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle2, Mail, ShieldCheck } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'verify' | 'password'>('email')
  const [email, setEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase() }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to send verification code')
      } else {
        setStep('verify')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase(), code: verificationCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Invalid verification code')
      } else {
        setStep('password')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    // Validate password match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate password requirements
    const hasUpperCase = /[A-Z]/.test(password)
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    const hasMinLength = password.length >= 9

    if (!hasMinLength) {
      setError('Password must be at least 9 characters long')
      return
    }

    if (!hasUpperCase) {
      setError('Password must contain at least 1 uppercase letter')
      return
    }

    if (!hasSpecialChar) {
      setError('Password must contain at least 1 special character')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase(), password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Registration failed')
      } else {
        setSuccess(true)
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase() }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to resend verification code')
      } else {
        setError('')
        // Show success message briefly
        const successMsg = 'New verification code sent!'
        setError(successMsg)
        setTimeout(() => setError(''), 3000)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const passwordStrength = {
    length: password.length >= 9,
    uppercase: /[A-Z]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#27add6]/10 via-white to-[#1e759d]/10 p-4">
      <Card className="w-full max-w-md shadow-xl border-[#27add6]/20">
        <CardHeader className="space-y-4 pb-2">
          <div className="flex justify-center">
            <Image 
              src="/aps-logo-horizontal.png" 
              alt="Amenity Pool Services" 
              width={220} 
              height={60}
              priority
            />
          </div>
          <div className="flex items-center justify-center">
            {step === 'email' && <Mail className="h-8 w-8 text-[#1e759d]" />}
            {step === 'verify' && <ShieldCheck className="h-8 w-8 text-[#1e759d]" />}
            {step === 'password' && <CheckCircle2 className="h-8 w-8 text-[#53bc53]" />}
          </div>
          <CardTitle className="text-2xl font-bold text-center text-[#1e759d]">
            {step === 'email' && 'Register'}
            {step === 'verify' && 'Verify Email'}
            {step === 'password' && 'Set Password'}
          </CardTitle>
          <CardDescription className="text-center text-base text-slate-600">
            {step === 'email' && 'Enter your email to get started'}
            {step === 'verify' && 'Enter the 6-digit code sent to your email'}
            {step === 'password' && 'Create a secure password for your account'}
          </CardDescription>
        </CardHeader>

        {/* Step 1: Email Entry */}
        {step === 'email' && (
          <form onSubmit={handleSendCode}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@amenitypool.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  We'll send a verification code to this email
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full bg-[#1e759d] hover:bg-[#1e759d]/90" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Code...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Verification Code
                  </>
                )}
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                Already registered?{' '}
                <Link href="/login" className="text-[#1e759d] hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        )}

        {/* Step 2: Code Verification */}
        {step === 'verify' && (
          <form onSubmit={handleVerifyCode}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant={error.includes('sent!') ? 'default' : 'destructive'}>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  disabled={loading}
                  autoFocus
                  maxLength={6}
                  className="text-center text-2xl tracking-widest font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Code sent to <strong>{email}</strong>
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3">
              <Button type="submit" className="w-full bg-[#1e759d] hover:bg-[#1e759d]/90" disabled={loading || verificationCode.length !== 6}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Verify Code
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={handleResendCode}
                disabled={loading}
              >
                Resend Code
              </Button>
              <Button
                type="button"
                variant="link"
                className="w-full text-sm"
                onClick={() => {
                  setStep('email')
                  setError('')
                  setVerificationCode('')
                }}
              >
                Change Email
              </Button>
            </CardFooter>
          </form>
        )}

        {/* Step 3: Password Setup */}
        {step === 'password' && (
          <form onSubmit={handleSetPassword}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert className="bg-green-50 text-green-900 border-green-200">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Registration successful! Redirecting to login...
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="•••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading || success}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="•••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading || success}
                />
              </div>
              {password && (
                <div className="space-y-2 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Password Requirements:</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          passwordStrength.length ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                      <span className={passwordStrength.length ? 'text-green-700' : 'text-muted-foreground'}>
                        At least 9 characters
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          passwordStrength.uppercase ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                      <span className={passwordStrength.uppercase ? 'text-green-700' : 'text-muted-foreground'}>
                        At least 1 uppercase letter
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          passwordStrength.special ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                      <span className={passwordStrength.special ? 'text-green-700' : 'text-muted-foreground'}>
                        At least 1 special character
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full bg-[#1e759d] hover:bg-[#1e759d]/90" disabled={loading || success}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : success ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Account Created!
                  </>
                ) : (
                  'Complete Registration'
                )}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  )
}
