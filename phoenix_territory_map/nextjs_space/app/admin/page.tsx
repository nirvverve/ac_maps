'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2, UserPlus, ArrowLeft, Shield, UserCog, User, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

type User = {
  id: string
  email: string
  role: string
  hasRegistered: boolean
  createdAt: string
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Form state
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('LEVEL1')

  useEffect(() => {
    if (status === 'loading') return
    
    const userRole = (session?.user as any)?.role
    if (userRole !== 'ADMIN') {
      router.push('/')
      return
    }
    
    loadUsers()
  }, [session, status, router])

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (err) {
      console.error('Failed to load users:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase(), role }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to add user')
      } else {
        setSuccess(`User ${email} added successfully!`)
        setEmail('')
        setRole('LEVEL1')
        loadUsers()
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const getRoleBadge = (role: string) => {
    if (role === 'ADMIN') return { label: 'Administrator', color: 'bg-red-100 text-red-800', icon: Shield }
    if (role === 'LEVEL2') return { label: 'Level 2', color: 'bg-blue-100 text-blue-800', icon: UserCog }
    return { label: 'Level 1', color: 'bg-green-100 text-green-800', icon: User }
  }

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto py-8">
        <div className="mb-6">
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="grid gap-6">
          {/* Add User Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Add New User
              </CardTitle>
              <CardDescription>
                Pre-provision a new user account. They will need to register their password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {success && (
                  <Alert className="bg-green-50 text-green-900 border-green-200">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@amenitypool.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">User Role</Label>
                    <Select value={role} onValueChange={setRole} disabled={submitting}>
                      <SelectTrigger id="role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LEVEL1">Level 1 (Standard Access)</SelectItem>
                        <SelectItem value="LEVEL2">Level 2 (Employee Locations Access)</SelectItem>
                        <SelectItem value="ADMIN">Administrator (Full Access)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" disabled={submitting} className="w-full md:w-auto">
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding User...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add User
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Users List Card */}
          <Card>
            <CardHeader>
              <CardTitle>All Users ({users.length})</CardTitle>
              <CardDescription>
                List of all provisioned users and their registration status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => {
                      const badge = getRoleBadge(user.role)
                      const BadgeIcon = badge.icon
                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.email}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <BadgeIcon className="h-4 w-4" />
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
                                {badge.label}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.hasRegistered ? (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                Registered
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-amber-300 text-amber-800">
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
