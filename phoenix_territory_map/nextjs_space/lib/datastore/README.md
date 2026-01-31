# DataStore Abstraction System

Unified data storage interface for the territory mapping application, supporting multiple backends for different deployment environments.

## Overview

The DataStore abstraction provides a consistent interface for data storage operations across development, staging, and production environments. It supports automatic backend switching based on configuration and environment variables.

## Supported Backends

### 1. Vercel Blob Storage (Production)
**Best for:** Production deployments on Vercel
- ✅ High availability and performance
- ✅ Automatic CDN distribution
- ✅ Seamless Vercel integration
- ✅ Public URL generation

**Configuration:**
```typescript
{
  backend: 'vercel-blob',
  vercelBlob: {
    token: process.env.BLOB_READ_WRITE_TOKEN,
    folder: 'territory-data'  // Optional prefix
  }
}
```

**Environment Variables:**
```bash
DATASTORE_BACKEND=vercel-blob
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx
BLOB_FOLDER=territory-data  # Optional
```

### 2. Local Filesystem (Development)
**Best for:** Local development and testing
- ✅ No external dependencies
- ✅ Fast read/write operations
- ✅ Easy debugging and inspection
- ✅ Metadata tracking with .meta files

**Configuration:**
```typescript
{
  backend: 'local',
  local: {
    baseDir: './data'
  }
}
```

**Environment Variables:**
```bash
DATASTORE_BACKEND=local
LOCAL_STORAGE_DIR=./data  # Optional, defaults to ./data
```

### 3. Memory Storage (Testing)
**Best for:** Unit tests and ephemeral storage
- ✅ Ultra-fast operations
- ✅ No persistence (automatic cleanup)
- ✅ Size limits for testing
- ✅ Statistics and monitoring

**Configuration:**
```typescript
{
  backend: 'memory',
  memory: {
    maxSize: 100000000  // 100MB limit
  }
}
```

### 4. Amazon S3 (Future)
**Status:** Interface ready, implementation planned
**Best for:** Enterprise deployments with existing S3 infrastructure

## Core Interface

All DataStore implementations provide the same interface:

```typescript
interface DataStore {
  write(key: string, data: unknown, metadata?: StorageMetadata): Promise<WriteResult>
  read<T>(key: string): Promise<T | null>
  exists(key: string): Promise<boolean>
  delete(key: string): Promise<DeleteResult>
  list(prefix?: string, limit?: number): Promise<StorageObject[]>
  getMetadata(key: string): Promise<ObjectMetadata | null>
}
```

## Usage Examples

### Basic Operations

```typescript
import { getDataStore } from '@/lib/datastore'

// Get configured DataStore instance
const store = await getDataStore()

// Write data
const result = await store.write('arizona/territory-data.json', territoriesData, {
  location: 'arizona',
  dataType: 'territory',
  uploadedBy: 'admin@company.com'
})

// Read data
const data = await store.read('arizona/territory-data.json')

// Check existence
const exists = await store.exists('arizona/territory-data.json')

// List files
const objects = await store.list('arizona/', 10)

// Delete data
await store.delete('arizona/territory-data.json')
```

### High-Level Helpers

```typescript
import {
  storeLocationData,
  loadLocationData,
  locationDataExists,
  createDataBackup
} from '@/lib/datastore'

// Store territory data for Arizona
await storeLocationData('arizona', 'territory', territoryData, {
  uploadedBy: 'admin@company.com',
  version: '2.1'
})

// Load customer data for Miami
const customers = await loadLocationData('miami', 'customer')

// Check if revenue data exists for Dallas
const hasRevenue = await locationDataExists('dallas', 'revenue')

// Backup existing data before upload
const backupKey = await createDataBackup('arizona', 'territory')
```

### Integration with Validation

```typescript
import { validateData } from '@/lib/validation-schemas'
import { storeLocationData } from '@/lib/datastore'

// Validate and store data in one operation
try {
  const validatedData = validateData('customer', csvData)
  const success = await storeLocationData('arizona', 'customer', validatedData, {
    uploadedBy: session.user.email
  })

  if (success) {
    console.log('Data stored successfully')
  }
} catch (error) {
  console.error('Validation or storage failed:', error)
}
```

### Scenario Management

```typescript
import {
  storeScenarioData,
  loadScenarioData,
  listScenarios
} from '@/lib/datastore'

// Store a new scenario
await storeScenarioData('miami', 'scenario-v1', scenarioData, {
  createdBy: 'planner@company.com',
  description: 'Territory optimization v1'
})

// Load specific scenario
const scenario = await loadScenarioData('miami', 'scenario-v1')

// List all scenarios for a location
const scenarios = await listScenarios('miami')
```

## Data Organization

### Standard Data Paths
```
{location}/
├── territory-data.json       # ZIP → territory assignments
├── density-data.json         # Account density by ZIP
├── customer-data.json        # Customer account details
├── revenue-data.json         # Revenue analysis data
├── routes-data.json          # Technician routes
├── employee-data.json        # Employee locations
├── commercial-data.json      # Commercial accounts
├── ancillary-sales-data.json # Service sales data
├── market-size-data.json     # Market analysis
└── scenarios/
    ├── scenario-1.json       # Territory scenario 1
    ├── scenario-2.json       # Territory scenario 2
    └── ...

uploads/
├── upload-123.json           # Raw upload data
└── upload-456.json

backups/
├── {location}/
│   ├── territory-2026-01-31T12-00-00-000Z.json
│   └── customer-2026-01-31T12-00-00-000Z.json
```

### Metadata Storage

Each stored object includes metadata:
```typescript
{
  contentType: 'application/json',
  location: 'arizona',
  dataType: 'territory',
  uploadedBy: 'admin@company.com',
  version: '1.0',
  uploadedAt: '2026-01-31T12:00:00.000Z'
}
```

## Configuration

### Environment-based Configuration

The DataStore automatically configures based on environment variables:

**Production (Vercel):**
```bash
DATASTORE_BACKEND=vercel-blob
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx
```

**Development:**
```bash
DATASTORE_BACKEND=local
LOCAL_STORAGE_DIR=./dev-data
```

**Testing:**
```bash
DATASTORE_BACKEND=memory
MEMORY_STORAGE_MAX_SIZE=50000000
```

### Manual Configuration

```typescript
import { createDataStore } from '@/lib/datastore'

const store = await createDataStore({
  backend: 'vercel-blob',
  vercelBlob: {
    token: 'your-token-here',
    folder: 'custom-folder'
  }
})
```

## Error Handling

The DataStore provides structured error handling:

```typescript
import {
  DataStoreError,
  DataStoreNotFoundError,
  DataStorePermissionError,
  DataStoreConnectionError
} from '@/lib/datastore'

try {
  const data = await store.read('nonexistent.json')
} catch (error) {
  if (error instanceof DataStoreNotFoundError) {
    console.log('File not found')
  } else if (error instanceof DataStorePermissionError) {
    console.log('Permission denied')
  } else if (error instanceof DataStoreConnectionError) {
    console.log('Connection failed')
  }
}
```

## Testing

Run the comprehensive test suite:

```typescript
import { runAllDataStoreTests } from '@/lib/datastore/test'

// Run all tests
await runAllDataStoreTests()

// Run specific tests
import { dataStoreTests } from '@/lib/datastore/test'
await dataStoreTests.testMemoryDataStore()
await dataStoreTests.testValidationIntegration()
```

## Migration Between Backends

The DataStore abstraction makes it easy to migrate between storage backends:

1. **Export from current backend:**
   ```typescript
   const data = await store.read('arizona/territory-data.json')
   ```

2. **Switch backend configuration:**
   ```typescript
   const newStore = await createDataStore(newConfig)
   ```

3. **Import to new backend:**
   ```typescript
   await newStore.write('arizona/territory-data.json', data)
   ```

4. **Update environment variables and restart**

## Performance Considerations

### Vercel Blob
- ✅ Excellent for read-heavy workloads
- ✅ Global CDN distribution
- ⚠️ Write operations have size limits
- ⚠️ API rate limits apply

### Local Storage
- ✅ Fastest for development
- ✅ No external dependencies
- ⚠️ Not suitable for production
- ⚠️ No built-in backup/replication

### Memory Storage
- ✅ Ultra-fast operations
- ✅ Perfect for testing
- ❌ Data lost on restart
- ⚠️ Memory usage grows with data

## Security

### Access Control
- Vercel Blob: Uses token-based authentication
- Local: Relies on filesystem permissions
- Memory: No persistence, minimal attack surface

### Data Validation
All data is validated before storage using Zod schemas:
```typescript
const validatedData = validateData('territory', rawData)
await store.write(key, validatedData)
```

### Backup and Recovery
Automatic backup creation before data updates:
```typescript
const backupKey = await createDataBackup('arizona', 'territory')
await storeLocationData('arizona', 'territory', newData)
```

## Integration Points

The DataStore integrates with:
- **bd-2kc** - POST /api/admin/upload endpoint
- **bd-3jq** - GET /api/data/[location]/[dataType] serving
- **bd-2ga** - Scenario storage CRUD operations
- **Validation System** - Type-safe data storage

This abstraction provides the foundation for Phase 4's secure data upload system and enables seamless scaling across different deployment environments.