import { prisma } from '../lib/db'

type SeedUserRole = 'ADMIN' | 'LEVEL2' | 'LEVEL1'

const users: Array<{ email: string; role: SeedUserRole }> = [
  // Admin
  { email: 'sjohnson@amenitypool.com', role: 'ADMIN' },
  
  // Level 2 Users (Donnie, Todd, Chris, Troy)
  { email: 'doneal@amenitypool.com', role: 'LEVEL2' },
  { email: 'tjohnston@amenitypool.com', role: 'LEVEL2' },
  { email: 'jbentley@amenitypool.com', role: 'LEVEL2' },
  { email: 'tlindbeck@amenitypool.com', role: 'LEVEL2' },
  
  // Level 1 Users
  { email: 'larry@amenitypool.com', role: 'LEVEL1' },
  { email: 'npearo@amenitypool.com', role: 'LEVEL1' },
  { email: 'swesterman@amenitypool.com', role: 'LEVEL1' },
  { email: 'ttheobold@amenitypool.com', role: 'LEVEL1' },
  { email: 'scotte@amenitypool.com', role: 'LEVEL1' },
  { email: 'jtritsch@amenitypool.com', role: 'LEVEL1' },
  { email: 'mflener@amenitypool.com', role: 'LEVEL1' },
  { email: 'nelly@amenitypool.com', role: 'LEVEL1' },
  { email: 'dlawler@amenitycollective.com', role: 'LEVEL1' },
  { email: 'bbergeski@amenitycollective.com', role: 'LEVEL1' },
  { email: 'sfickus@amenitycollective.com', role: 'LEVEL1' },
  { email: 'ERowell@amenitycollective.com', role: 'LEVEL1' },
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
