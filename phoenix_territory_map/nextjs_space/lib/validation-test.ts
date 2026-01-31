/**
 * Test file for validation schemas
 *
 * Quick validation test to ensure schemas work correctly
 * bd-3jf
 */

import {
  territoryDataSchema,
  densityDataSchema,
  customerDataSchema,
  validateData,
  safeValidateData
} from './validation-schemas'

// Test data samples
const validTerritoryData = {
  zip: "85021",
  area: "West",
  accounts: 150,
  city: "Phoenix"
}

const validDensityData = {
  zip: "85021",
  accountCount: 2,
  latitude: 33.5594209,
  longitude: -112.0928747,
  city: "Phoenix",
  territory: "Commercial"
}

const validCustomerData = {
  accountNumber: "A-000008",
  customerName: "Judy and Robert Gross",
  address: "20276 E Cloud Rd",
  zipCode: "85142",
  city: "San Tan Valley",
  territory: "East",
  latitude: 33.2274488,
  longitude: -111.6459969,
  status: "Active" as const
}

// Test individual schemas
export function testSchemas() {
  console.log('Testing validation schemas...')

  // Test territory data
  try {
    const result = territoryDataSchema.parse(validTerritoryData)
    console.log('✅ Territory schema test passed')
  } catch (error) {
    console.error('❌ Territory schema test failed:', error)
  }

  // Test density data
  try {
    const result = densityDataSchema.parse(validDensityData)
    console.log('✅ Density schema test passed')
  } catch (error) {
    console.error('❌ Density schema test failed:', error)
  }

  // Test customer data
  try {
    const result = customerDataSchema.parse(validCustomerData)
    console.log('✅ Customer schema test passed')
  } catch (error) {
    console.error('❌ Customer schema test failed:', error)
  }

  // Test invalid data
  try {
    const invalidData = {
      zip: "invalid",
      area: "",
      accounts: -5
    }
    territoryDataSchema.parse(invalidData)
    console.error('❌ Invalid data test failed - should have thrown error')
  } catch (error) {
    console.log('✅ Invalid data correctly rejected')
  }

  console.log('Schema tests completed')
}

// Test array validation
export function testArrayValidation() {
  console.log('Testing array validation...')

  const territoryArray = [validTerritoryData, validTerritoryData]

  try {
    const result = safeValidateData('territory', territoryArray)
    if (result.success) {
      console.log('✅ Array validation test passed')
    } else {
      console.error('❌ Array validation test failed:', result.error)
    }
  } catch (error) {
    console.error('❌ Array validation test error:', error)
  }

  console.log('Array validation tests completed')
}

// Export test functions for use in development
export const testValidation = {
  testSchemas,
  testArrayValidation
}