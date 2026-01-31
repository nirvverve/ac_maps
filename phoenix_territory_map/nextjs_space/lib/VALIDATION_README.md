# Data Validation System

Comprehensive Zod-based validation schemas for the territory mapping data upload system.

## Overview

This validation system provides type-safe data validation for CSV/XLSX uploads and API endpoints. It ensures data integrity across all supported data types and provides user-friendly error messages for administrators.

## Files

- `validation-schemas.ts` - Core Zod schemas for all data types
- `validation-utils.ts` - Utility functions for validation, error formatting, and reporting
- `validation-test.ts` - Test functions for development and debugging

## Supported Data Types

### 1. Territory Data
Maps ZIP codes to territory assignments.
```typescript
{
  zip: string,        // 5-digit ZIP code
  area: string,       // Territory name (e.g., "West", "Central")
  accounts: number,   // Number of accounts in this ZIP
  city?: string,      // Optional city name
  state?: string      // Optional 2-letter state code
}
```

### 2. Density Data
Geographic density information with coordinates.
```typescript
{
  zip: string,
  accountCount: number,
  latitude: number,     // -90 to 90
  longitude: number,    // -180 to 180
  city: string,
  territory: string,
  accountType?: 'residential' | 'commercial',
  status?: 'Active' | 'Terminated' | 'Suspended' | 'Pending'
}
```

### 3. Customer Data
Complete customer account information.
```typescript
{
  accountNumber: string,
  customerName: string,
  address: string,
  zipCode: string,
  city: string,
  territory: string,
  latitude: number,
  longitude: number,
  status: 'Active' | 'Terminated' | 'Suspended' | 'Pending',
  accountType?: 'residential' | 'commercial',
  monthlyRevenue?: number,
  installDate?: string,    // ISO date string
  lastServiceDate?: string // ISO date string
}
```

### 4. Revenue Data
Financial analysis data by territory/ZIP.
```typescript
{
  zip: string,
  territory: string,
  city: string,
  year: number,        // 2000-2030
  month?: number,      // 1-12
  totalRevenue: number,
  activeAccounts: number,
  averageRevenue: number,
  latitude?: number,
  longitude?: number,
  accountType?: 'residential' | 'commercial'
}
```

### 5. Routes Data
Technician route assignments.
```typescript
{
  routeId: string,
  technicianId: string,
  technicianName: string,
  territory: string,
  zip: string,
  accountCount: number,
  estimatedDriveTime?: number, // minutes
  serviceDay?: 'Monday' | 'Tuesday' | ...,
  isActive?: boolean
}
```

### 6. Employee Data
Employee location and assignment information.
```typescript
{
  employeeId: string,
  employeeName: string,
  role: string,
  homeAddress: string,
  zipCode: string,
  city: string,
  latitude: number,
  longitude: number,
  assignedTerritory?: string,
  branch: string,
  isActive?: boolean,
  hireDate?: string // ISO date string
}
```

### 7. Commercial Data
Business account specific information.
```typescript
{
  accountNumber: string,
  businessName: string,
  contactName?: string,
  address: string,
  zipCode: string,
  city: string,
  territory: string,
  latitude: number,
  longitude: number,
  status: 'Active' | 'Terminated' | 'Suspended' | 'Pending',
  monthlyRevenue: number,
  poolCount?: number,
  propertyType?: 'Hotel' | 'Apartment' | 'HOA' | 'Country Club' | 'Fitness Center' | 'Other',
  contractType?: 'Full Service' | 'Chemical Only' | 'Maintenance Only',
  installDate?: string
}
```

### 8. Ancillary Sales Data
Service revenue breakdown by location.
```typescript
{
  zip: string,
  year: number,
  city?: string,
  branch: string,
  ots: number,      // One-time services
  repair: number,
  remodel: number,
  total: number,
  latitude: number,
  longitude: number,
  accountCount?: number,
  territory?: string
}
```

### 9. Market Size Data
Market analysis and penetration data.
```typescript
{
  zip: string,
  city: string,
  territory: string,
  totalHouseholds: number,
  estimatedPools: number,
  marketPenetration: number, // 0-100 percentage
  competitorCount?: number,
  averageIncome?: number,
  latitude: number,
  longitude: number
}
```

## Usage

### Basic Validation

```typescript
import { validateData, safeValidateData } from '@/lib/validation-schemas'

// Throws on validation error
const validData = validateData('territory', rawData)

// Returns result object with success/error info
const result = safeValidateData('territory', rawData)
if (result.success) {
  console.log('Valid data:', result.data)
} else {
  console.log('Validation errors:', result.error)
}
```

### Array Validation

```typescript
import { validateDataArray } from '@/lib/validation-utils'

const result = validateDataArray('customer', csvData, {
  stopOnFirstError: false,
  maxErrors: 50
})

console.log(`${result.summary.validRows}/${result.summary.totalRows} rows valid`)
if (result.errors) {
  console.log('Validation errors:', result.errors)
}
```

### Data Type Auto-Detection

```typescript
import { suggestDataType } from '@/lib/validation-utils'

const suggestion = suggestDataType(unknownData)
console.log(`Suggested type: ${suggestion.suggestion} (${suggestion.confidence}% confidence)`)
console.log('Reasons:', suggestion.reasons)
```

### Validation Reports

```typescript
import { generateValidationReport } from '@/lib/validation-utils'

const result = validateDataArray('revenue', uploadData)
const report = generateValidationReport(result, {
  fileName: 'revenue-q4-2024.csv',
  dataType: 'revenue',
  location: 'arizona',
  uploadedBy: 'admin@company.com'
})

console.log(report) // Markdown-formatted validation report
```

## Validation Rules

### Common Validations
- **ZIP Codes**: Must be 5-digit format (e.g., "85021") or 9-digit format (e.g., "85021-1234")
- **Latitude**: Must be between -90 and 90
- **Longitude**: Must be between -180 and 180
- **Currency**: Non-negative numbers with up to 2 decimal places
- **Years**: Must be between 2000 and 2030
- **Account Numbers**: 1-50 characters, flexible format
- **Status**: Must be one of: "Active", "Terminated", "Suspended", "Pending"

### String Validations
- Most name fields: 1-200 characters
- Address fields: 1-300 characters
- City names: 1-100 characters
- Territory names: 1-50 characters

### Enum Validations
- **Account Type**: "residential" | "commercial"
- **Property Type**: "Hotel" | "Apartment" | "HOA" | "Country Club" | "Fitness Center" | "Other"
- **Contract Type**: "Full Service" | "Chemical Only" | "Maintenance Only"
- **Service Days**: Standard weekday names

## Error Handling

The validation system provides detailed error messages:

```typescript
{
  row: 15,                    // Which row failed validation
  field: "latitude",          // Which field caused the error
  value: "invalid_lat",       // The actual invalid value
  message: "Expected number, but received string", // User-friendly message
  code: "invalid_type"        // Zod error code for programmatic handling
}
```

## Integration with Upload System

These schemas integrate with:
- `bd-2kc` - POST /api/admin/upload endpoint
- `bd-q97` - DataStore abstraction layer
- `bd-508` - Admin upload UI

The validation system provides the foundation for secure, type-safe data uploads that maintain data integrity across the entire application.

## Development and Testing

Use the test functions during development:

```typescript
import { testValidation } from '@/lib/validation-test'

// Test all schemas
testValidation.testSchemas()

// Test array validation
testValidation.testArrayValidation()
```

## Migration Path

Existing data can be validated retroactively:

1. Export current JSON files as arrays
2. Run through appropriate validation schemas
3. Fix any data quality issues
4. Import validated data back to the system

This ensures historical data maintains the same quality standards as new uploads.