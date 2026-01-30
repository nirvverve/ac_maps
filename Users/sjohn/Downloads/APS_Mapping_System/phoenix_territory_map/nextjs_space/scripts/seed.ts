import { PrismaClient, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

const users = [
  // Admin
  { email: 'sjohnson@amenitypool.com', role: 'ADMIN' as UserRole },
  
  // Level 2 Users (Donnie, Todd, Chris, Troy)
  { email: 'doneal@amenitypool.com', role: 'LEVEL2' as UserRole },
  { email: 'tjohnston@amenitypool.com', role: 'LEVEL2' as UserRole },
  { email: 'jbentley@amenitypool.com', role: 'LEVEL2' as UserRole },
  { email: 'tlindbeck@amenitypool.com', role: 'LEVEL2' as UserRole },
  
  // Level 1 Users
  { email: 'larry@amenitypool.com', role: 'LEVEL1' as UserRole },
  { email: 'npearo@amenitypool.com', role: 'LEVEL1' as UserRole },
  { email: 'swesterman@amenitypool.com', role: 'LEVEL1' as UserRole },
  { email: 'ttheobold@amenitypool.com', role: 'LEVEL1' as UserRole },
  { email: 'scotte@amenitypool.com', role: 'LEVEL1' as UserRole },
  { email: 'jtritsch@amenitypool.com', role: 'LEVEL1' as UserRole },
  { email: 'mflener@amenitypool.com', role: 'LEVEL1' as UserRole },
  { email: 'nelly@amenitypool.com', role: 'LEVEL1' as UserRole },
  { email: 'dlawler@amenitycollective.com', role: 'LEVEL1' as UserRole },
  { email: 'bbergeski@amenitycollective.com', role: 'LEVEL1' as UserRole },
  { email: 'sfickus@amenitycollective.com', role: 'LEVEL1' as UserRole },
  { email: 'ERowell@amenitycollective.com', role: 'LEVEL1' as UserRole },
]

async function main() {
  console.log('🌱 Starting database seed...')
  
  for (const user of users) {
    const existing = await prisma.user.findUnique({
      where: { email: user.email },
    })
    
    if (existing) {
      console.log(`⏭️  User ${user.email} already exists, skipping...`)
      continue
    }
    
    await prisma.user.create({
      data: {
        email: user.email,
        role: user.role,
        hasRegistered: false,
        password: null, // Users will set their own passwords
      },
    })
    
    console.log(`✅ Created user: ${user.email} (${user.role})`)
  }
  
  console.log('\n✨ Seeding complete!')
  console.log(`Total users: ${users.length}`)
  console.log('- 1 Admin (sjohnson@amenitypool.com)')
  console.log('- 4 Level 2 Users (Donnie, Todd, Chris, Troy)')
  console.log('- 11 Level 1 Users')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
