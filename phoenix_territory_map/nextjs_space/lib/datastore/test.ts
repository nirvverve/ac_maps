/**
 * DataStore testing utilities and integration tests
 *
 * Test functions to verify DataStore implementations work correctly
 * with the validation system and provide expected functionality.
 *
 * bd-q97
 */

import { createDataStore, type DataStoreConfig } from './index'
import { MemoryDataStore } from './memory'
import { LocalDataStore } from './local'
import { validateData } from '../validation-schemas'

// Test data samples
const testTerritoryData = [
  { zip: "85021", area: "West", accounts: 150 },
  { zip: "85034", area: "Central", accounts: 200 },
  { zip: "85142", area: "East", accounts: 175 }
]

const testCustomerData = [
  {
    accountNumber: "A-000008",
    customerName: "John Smith",
    address: "123 Test St",
    zipCode: "85021",
    city: "Phoenix",
    territory: "West",
    latitude: 33.5,
    longitude: -112.1,
    status: "Active" as const
  }
]

// ---------------------------------------------------------------------------
// Individual backend tests
// ---------------------------------------------------------------------------

/**
 * Test memory DataStore implementation
 */
export async function testMemoryDataStore() {
  console.log('Testing MemoryDataStore...')

  const store = new MemoryDataStore({ maxSize: 1000000 })

  // Test write
  const writeResult = await store.write('test/data.json', testTerritoryData, {
    contentType: 'application/json',
    location: 'arizona',
    dataType: 'territory'
  })

  if (!writeResult.success) {
    throw new Error(`Write failed: ${writeResult.error}`)
  }
  console.log('✅ Memory write test passed')

  // Test read
  const readData = await store.read('test/data.json')
  if (!readData || JSON.stringify(readData) !== JSON.stringify(testTerritoryData)) {
    throw new Error('Read data does not match written data')
  }
  console.log('✅ Memory read test passed')

  // Test exists
  const exists = await store.exists('test/data.json')
  if (!exists) {
    throw new Error('Exists check failed for written data')
  }
  console.log('✅ Memory exists test passed')

  // Test list
  const objects = await store.list('test/')
  if (objects.length !== 1 || objects[0].key !== 'test/data.json') {
    throw new Error('List operation failed')
  }
  console.log('✅ Memory list test passed')

  // Test metadata
  const metadata = await store.getMetadata('test/data.json')
  if (!metadata || metadata.key !== 'test/data.json') {
    throw new Error('Metadata retrieval failed')
  }
  console.log('✅ Memory metadata test passed')

  // Test delete
  const deleteResult = await store.delete('test/data.json')
  if (!deleteResult.success) {
    throw new Error(`Delete failed: ${deleteResult.error}`)
  }
  console.log('✅ Memory delete test passed')

  console.log('✅ MemoryDataStore tests completed successfully')
}

/**
 * Test local DataStore implementation
 */
export async function testLocalDataStore() {
  console.log('Testing LocalDataStore...')

  const store = new LocalDataStore({ baseDir: './test-data' })

  // Test write
  const writeResult = await store.write('test/data.json', testTerritoryData, {
    contentType: 'application/json',
    location: 'arizona',
    dataType: 'territory'
  })

  if (!writeResult.success) {
    throw new Error(`Write failed: ${writeResult.error}`)
  }
  console.log('✅ Local write test passed')

  // Test read
  const readData = await store.read('test/data.json')
  if (!readData || JSON.stringify(readData) !== JSON.stringify(testTerritoryData)) {
    throw new Error('Read data does not match written data')
  }
  console.log('✅ Local read test passed')

  // Test exists
  const exists = await store.exists('test/data.json')
  if (!exists) {
    throw new Error('Exists check failed for written data')
  }
  console.log('✅ Local exists test passed')

  // Cleanup
  await store.delete('test/data.json')
  console.log('✅ LocalDataStore tests completed successfully')
}

// ---------------------------------------------------------------------------
// Factory and configuration tests
// ---------------------------------------------------------------------------

/**
 * Test DataStore factory with different configurations
 */
export async function testDataStoreFactory() {
  console.log('Testing DataStore factory...')

  // Test memory backend creation
  const memoryConfig: DataStoreConfig = {
    backend: 'memory',
    memory: { maxSize: 1000000 }
  }

  const memoryStore = await createDataStore(memoryConfig)
  const memoryWriteResult = await memoryStore.write('factory-test.json', { test: 'data' })

  if (!memoryWriteResult.success) {
    throw new Error('Factory-created memory store failed')
  }
  console.log('✅ Memory backend factory test passed')

  // Test local backend creation
  const localConfig: DataStoreConfig = {
    backend: 'local',
    local: { baseDir: './test-data' }
  }

  const localStore = await createDataStore(localConfig)
  const localWriteResult = await localStore.write('factory-test.json', { test: 'data' })

  if (!localWriteResult.success) {
    throw new Error('Factory-created local store failed')
  }
  console.log('✅ Local backend factory test passed')

  // Cleanup
  await localStore.delete('factory-test.json')

  console.log('✅ DataStore factory tests completed successfully')
}

// ---------------------------------------------------------------------------
// Integration with validation system
// ---------------------------------------------------------------------------

/**
 * Test DataStore integration with validation schemas
 */
export async function testValidationIntegration() {
  console.log('Testing DataStore + Validation integration...')

  const store = new MemoryDataStore()

  // Test storing validated data
  try {
    // Validate the data first
    const validatedData = validateData('territory', testTerritoryData)

    // Store the validated data
    const writeResult = await store.write('arizona/territory-data.json', validatedData, {
      contentType: 'application/json',
      location: 'arizona',
      dataType: 'territory',
      uploadedBy: 'test-user'
    })

    if (!writeResult.success) {
      throw new Error(`Failed to store validated data: ${writeResult.error}`)
    }

    // Read it back and verify
    const storedData = await store.read('arizona/territory-data.json')
    if (!storedData) {
      throw new Error('Failed to read back stored data')
    }

    // Validate the stored data
    const revalidatedData = validateData('territory', storedData)
    console.log('✅ Validation integration test passed')

    // Test with customer data
    const validatedCustomerData = validateData('customer', testCustomerData)
    const customerWriteResult = await store.write('arizona/customer-data.json', validatedCustomerData, {
      contentType: 'application/json',
      location: 'arizona',
      dataType: 'customer'
    })

    if (!customerWriteResult.success) {
      throw new Error('Failed to store validated customer data')
    }
    console.log('✅ Customer data validation integration test passed')

  } catch (error) {
    throw new Error(`Validation integration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  console.log('✅ DataStore + Validation integration tests completed successfully')
}

// ---------------------------------------------------------------------------
// Performance and stress tests
// ---------------------------------------------------------------------------

/**
 * Test DataStore performance with larger datasets
 */
export async function testDataStorePerformance() {
  console.log('Testing DataStore performance...')

  const store = new MemoryDataStore()

  // Generate larger test dataset
  const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
    zip: `85${String(i).padStart(3, '0')}`,
    area: i % 3 === 0 ? 'West' : i % 3 === 1 ? 'Central' : 'East',
    accounts: Math.floor(Math.random() * 500) + 50
  }))

  const startTime = Date.now()

  // Test batch write
  const writeResult = await store.write('performance/large-dataset.json', largeDataset)
  if (!writeResult.success) {
    throw new Error('Performance test write failed')
  }

  // Test batch read
  const readData = await store.read('performance/large-dataset.json')
  if (!readData) {
    throw new Error('Performance test read failed')
  }

  const endTime = Date.now()
  const duration = endTime - startTime

  console.log(`✅ Performance test completed in ${duration}ms for ${largeDataset.length} records`)

  if (duration > 1000) {
    console.warn('⚠️  Performance test took longer than expected')
  }

  console.log('✅ DataStore performance tests completed')
}

// ---------------------------------------------------------------------------
// Run all tests
// ---------------------------------------------------------------------------

/**
 * Run comprehensive test suite
 */
export async function runAllDataStoreTests() {
  console.log('🧪 Starting comprehensive DataStore test suite...\n')

  try {
    await testMemoryDataStore()
    console.log()

    await testLocalDataStore()
    console.log()

    await testDataStoreFactory()
    console.log()

    await testValidationIntegration()
    console.log()

    await testDataStorePerformance()
    console.log()

    console.log('🎉 All DataStore tests passed successfully!')

  } catch (error) {
    console.error('❌ DataStore test failed:', error)
    throw error
  }
}

// Export test utilities
export const dataStoreTests = {
  testMemoryDataStore,
  testLocalDataStore,
  testDataStoreFactory,
  testValidationIntegration,
  testDataStorePerformance,
  runAllDataStoreTests
}