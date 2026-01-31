/**
 * DataStore factory and main exports
 *
 * Central entry point for the DataStore abstraction system.
 * Provides factory methods to create storage backends and utilities
 * for common data operations.
 *
 * bd-q97
 */

import {
  type DataStore,
  type DataStoreConfig,
  type StorageBackend,
  DataStoreConnectionError
} from './types'
import { VercelBlobDataStore } from './vercel-blob'
import { LocalDataStore } from './local'
import { MemoryDataStore } from './memory'

// ---------------------------------------------------------------------------
// DataStore factory
// ---------------------------------------------------------------------------

/**
 * Create a DataStore instance based on configuration
 */
export async function createDataStore(config: DataStoreConfig): Promise<DataStore> {
  switch (config.backend) {
    case 'vercel-blob':
      if (!config.vercelBlob?.token) {
        throw new DataStoreConnectionError('vercel-blob', new Error('Vercel Blob token not provided'))
      }
      return new VercelBlobDataStore(config.vercelBlob)

    case 's3':
      // S3 implementation will be added later
      throw new DataStoreConnectionError('s3', new Error('S3 backend not yet implemented'))

    case 'local':
      if (!config.local?.baseDir) {
        throw new DataStoreConnectionError('local', new Error('Local storage base directory not provided'))
      }
      return new LocalDataStore(config.local)

    case 'memory':
      return new MemoryDataStore(config.memory || {})

    default:
      throw new DataStoreConnectionError('unknown', new Error(`Unknown storage backend: ${config.backend}`))
  }
}

/**
 * Create DataStore from environment variables
 */
export async function createDataStoreFromEnv(): Promise<DataStore> {
  const config = getDataStoreConfigFromEnv()
  return createDataStore(config)
}

/**
 * Get DataStore configuration from environment variables
 */
export function getDataStoreConfigFromEnv(): DataStoreConfig {
  const backend = (process.env.DATASTORE_BACKEND as StorageBackend) || 'local'

  switch (backend) {
    case 'vercel-blob':
      return {
        backend: 'vercel-blob',
        vercelBlob: {
          token: process.env.BLOB_READ_WRITE_TOKEN || '',
          folder: process.env.BLOB_FOLDER || 'territory-data'
        }
      }

    case 's3':
      return {
        backend: 's3',
        s3: {
          region: process.env.AWS_REGION || 'us-east-1',
          bucket: process.env.S3_BUCKET || '',
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          endpoint: process.env.S3_ENDPOINT,
          prefix: process.env.S3_PREFIX || 'territory-data'
        }
      }

    case 'local':
      return {
        backend: 'local',
        local: {
          baseDir: process.env.LOCAL_STORAGE_DIR || './data'
        }
      }

    case 'memory':
      return {
        backend: 'memory',
        memory: {
          maxSize: parseInt(process.env.MEMORY_STORAGE_MAX_SIZE || '100000000') // 100MB default
        }
      }

    default:
      return {
        backend: 'local',
        local: {
          baseDir: './data'
        }
      }
  }
}

// ---------------------------------------------------------------------------
// Singleton DataStore instance
// ---------------------------------------------------------------------------

let dataStoreInstance: DataStore | null = null

/**
 * Get the global DataStore instance (singleton)
 */
export async function getDataStore(): Promise<DataStore> {
  if (!dataStoreInstance) {
    dataStoreInstance = await createDataStoreFromEnv()
  }
  return dataStoreInstance
}

/**
 * Reset the global DataStore instance (useful for testing)
 */
export function resetDataStore(): void {
  dataStoreInstance = null
}

// ---------------------------------------------------------------------------
// High-level data operations
// ---------------------------------------------------------------------------

/**
 * Store location data with automatic path generation
 */
export async function storeLocationData(
  location: string,
  dataType: string,
  data: unknown,
  metadata?: { uploadedBy?: string; version?: string }
): Promise<boolean> {
  const store = await getDataStore()
  const key = `${location}/${dataType}-data.json`

  const result = await store.write(key, data, {
    contentType: 'application/json',
    location,
    dataType,
    ...metadata
  })

  return result.success
}

/**
 * Load location data with automatic path generation
 */
export async function loadLocationData<T = unknown>(
  location: string,
  dataType: string
): Promise<T | null> {
  const store = await getDataStore()
  const key = `${location}/${dataType}-data.json`
  return store.read<T>(key)
}

/**
 * Check if location data exists
 */
export async function locationDataExists(
  location: string,
  dataType: string
): Promise<boolean> {
  const store = await getDataStore()
  const key = `${location}/${dataType}-data.json`
  return store.exists(key)
}

/**
 * Store scenario data
 */
export async function storeScenarioData(
  location: string,
  scenarioId: string,
  data: unknown,
  metadata?: { createdBy?: string; description?: string }
): Promise<boolean> {
  const store = await getDataStore()
  const key = `${location}/scenarios/${scenarioId}.json`

  const result = await store.write(key, data, {
    contentType: 'application/json',
    location,
    dataType: 'scenario',
    ...metadata
  })

  return result.success
}

/**
 * Load scenario data
 */
export async function loadScenarioData<T = unknown>(
  location: string,
  scenarioId: string
): Promise<T | null> {
  const store = await getDataStore()
  const key = `${location}/scenarios/${scenarioId}.json`
  return store.read<T>(key)
}

/**
 * List scenarios for a location
 */
export async function listScenarios(location: string): Promise<string[]> {
  const store = await getDataStore()
  const prefix = `${location}/scenarios/`
  const objects = await store.list(prefix)

  return objects
    .map(obj => obj.key.replace(prefix, '').replace('.json', ''))
    .filter(id => id.length > 0)
}

/**
 * Create backup of current data before upload
 */
export async function createDataBackup(
  location: string,
  dataType: string
): Promise<string | null> {
  const store = await getDataStore()
  const sourceKey = `${location}/${dataType}-data.json`
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupKey = `backups/${location}/${dataType}-${timestamp}.json`

  try {
    const data = await store.read(sourceKey)
    if (data === null) {
      return null // No existing data to backup
    }

    const result = await store.write(backupKey, data, {
      contentType: 'application/json',
      location,
      dataType: 'backup',
      originalKey: sourceKey,
      backupTimestamp: new Date().toISOString()
    })

    return result.success ? backupKey : null
  } catch (error) {
    console.error('Failed to create backup:', error)
    return null
  }
}

// ---------------------------------------------------------------------------
// Export all types and implementations
// ---------------------------------------------------------------------------

export * from './types'
export { VercelBlobDataStore } from './vercel-blob'
export { LocalDataStore } from './local'
export { MemoryDataStore } from './memory'