'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import TerritoryMap from '@/components/territory-map'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LocationSelector } from '@/components/location-selector'
import { LogOut, UserCog, User, Shield, Map as MapIcon2 } from 'lucide-react'

type Location = 'arizona' | 'miami' | 'dallas' | 'orlando' | 'jacksonville' | 'portCharlotte'

export default function HomePage() {
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role
  const userEmail = session?.user?.email
  const [location, setLocation] = useState<Location>('arizona')

  const getRoleBadge = () => {
    if (userRole === 'ADMIN') return { label: 'Administrator', color: 'bg-red-100 text-red-800', icon: Shield }
    if (userRole === 'LEVEL2') return { label: 'Level 2', color: 'bg-[#27add6]/20 text-[#1e759d]', icon: UserCog }
    return { label: 'Level 1', color: 'bg-[#53bc53]/20 text-[#53bc53]', icon: User }
  }

  const badge = getRoleBadge()
  const BadgeIcon = badge.icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-[#27add6]/10">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* User Info Bar */}
        <Card className="mb-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <BadgeIcon className="h-5 w-5 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">{userEmail}</span>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
                {badge.label}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {userRole === 'ADMIN' && (
                <Link href="/admin">
                  <Button variant="outline" size="sm" className="gap-2 border-[#1e759d] text-[#1e759d] hover:bg-[#1e759d]/10">
                    <UserCog className="h-4 w-4" />
                    Manage Users
                  </Button>
                </Link>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        <header className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image 
              src="/aps-logo-horizontal.png" 
              alt="Amenity Pool Services" 
              width={350} 
              height={100}
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-[#1e759d] mb-3">
            Data Visualization Tools
          </h1>
          <p className="text-lg text-slate-600 mb-2">
            Marketing, Routing, Account and Personnel Assignment Tools
          </p>
          <p className="text-sm text-[#e54e4e] font-medium">
            v0.71 | Questions ? contact <a href="mailto:sjohnson@amenitypool.com" className="hover:underline">sjohnson@amenitypool.com</a>
          </p>
        </header>

        {/* Centralized Location Selector */}
        <Card className="mb-6 bg-gradient-to-r from-[#27add6]/10 to-[#1e759d]/10 border-[#27add6]/30 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-[#1e759d] rounded-lg">
                <MapIcon2 className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#1e759d] mb-3">
                  Select Location for Analysis
                </h3>
                <div className="flex items-center gap-3">
                  <LocationSelector 
                    selectedLocation={location} 
                    onLocationChange={(loc) => setLocation(loc as Location)} 
                  />
                  <p className="text-sm text-slate-600">
                    Choose a location to view available data analysis tools below
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <TerritoryMap location={location} onLocationChange={(loc) => setLocation(loc as Location)} />
      </div>
      
      {/* Footer */}
      <footer className="bg-[#1e759d] text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Image 
                src="/aps-logo-stacked.png" 
                alt="Amenity Pool Services" 
                width={100} 
                height={100}
                className="bg-white rounded-lg p-2"
              />
              <div>
                <p className="text-[#ffdb43] font-semibold">Amenity Pool Services</p>
                <p className="text-sm text-white/80">Data Visualization Tools</p>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-sm text-white/80">
                © {new Date().getFullYear()} Amenity Pool Services. All rights reserved.
              </p>
              <p className="text-xs text-white/60 mt-1">
                Internal use only
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
