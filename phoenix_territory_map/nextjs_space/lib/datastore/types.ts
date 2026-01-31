/**
 * DataStore abstraction types and interfaces
 *
 * Provides a unified interface for data storage across different backends
 * (Vercel Blob, S3, local filesystem). Enables backend swapping without
 * code changes in the upload and data serving systems.
 *
 * bd-q97
 */

// ---------------------------------------------------------------------------
// Core DataStore interface
// ---------------------------------------------------------------------------

export interface DataStore {
  /**
   * Write data to storage
   * @param key - Storage key/path (e.g., "arizona/territory-data.json")
   * @param data - Data to store (will be JSON stringified)
   * @param metadata - Optional metadata for the stored object
   * @returns Promise with storage location info
   */
  write(key: string, data: unknown, metadata?: StorageMetadata): Promise<WriteResult>

  /**
   * Read data from storage
   * @param key - Storage key/path
   * @returns Promise with parsed data or null if not found
   */
  read<T = unknown>(key: string): Promise<T | null>

  /**
   * Check if data exists in storage
   * @param key - Storage key/path
   * @returns Promise with boolean indicating existence
   */
  exists(key: string): Promise<boolean>

  /**
   * Delete data from storage
   * @param key - Storage key/path
   * @returns Promise with deletion result
   */
  delete(key: string): Promise<DeleteResult>

  /**
   * List objects in storage with optional prefix filter
   * @param prefix - Optional prefix to filter results
   * @param limit - Optional limit on number of results
   * @returns Promise with list of storage objects
   */
  list(prefix?: string, limit?: number): Promise<StorageObject[]>

  /**
   * Get metadata about a stored object
   * @param key - Storage key/path
   * @returns Promise with object metadata or null if not found
   */
  getMetadata(key: string): Promise<ObjectMetadata | null>
}

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface WriteResult {
  success: boolean
  key: string
  url?: string          // Public URL if available
  size: number
  contentType: string
  etag?: string
  uploadedAt: Date
  error?: string
}

export interface DeleteResult {
  success: boolean
  key: string
  deletedAt: Date
  error?: string
}

export interface StorageObject {
  key: string
  size: number
  lastModified: Date
  contentType?: string
  etag?: string
  metadata?: Record<string, string>
}

export interface ObjectMetadata {
  key: string
  size: number
  contentType: string
  lastModified: Date
  etag?: string
  metadata: Record<string, string>
  url?: string          // Public URL if available
}

// ---------------------------------------------------------------------------
// Configuration types
// ---------------------------------------------------------------------------

export type StorageBackend = 'vercel-blob' | 's3' | 'local' | 'memory'

export interface StorageMetadata {
  contentType?: string
  location?: string     // Geographic location for the data
  dataType?: string     // Type of data being stored (territory, customer, etc.)
  uploadedBy?: string   // User who uploaded the data
  version?: string      // Data version for cache busting
  originalKey?: string  // For backup metadata
  backupTimestamp?: string // For backup metadata
  createdBy?: string    // Who created this data
  description?: string  // Optional description
}

export interface DataStoreConfig {
  backend: StorageBackend

  // Vercel Blob configuration
  vercelBlob?: {
    token: string
    folder?: string     // Optional folder prefix
  }

  // S3 configuration
  s3?: {
    region: string
    bucket: string
    accessKeyId?: string
    secretAccessKey?: string
    endpoint?: string   // For S3-compatible services
    prefix?: string     // Optional key prefix
  }

  // Local storage configuration
  local?: {
    baseDir: string
  }

  // Memory storage configuration (for testing)
  memory?: {
    maxSize?: number    // Max size in bytes
  }
}

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class DataStoreError extends Error {
  constructor(
    message: string,
    public code: string,
    public key?: string,
    public cause?: Error
  ) {
    super(message)
    this.name = 'DataStoreError'
  }
}

export class DataStoreNotFoundError extends DataStoreError {
  constructor(key: string, cause?: Error) {
    super(`Object not found: ${key}`, 'NOT_FOUND', key, cause)
    this.name = 'DataStoreNotFoundError'
  }
}

export class DataStorePermissionError extends DataStoreError {
  constructor(key: string, operation: string, cause?: Error) {
    super(`Permission denied for ${operation} on: ${key}`, 'PERMISSION_DENIED', key, cause)
    this.name = 'DataStorePermissionError'
  }
}

export class DataStoreConnectionError extends DataStoreError {
  constructor(backend: string, cause?: Error) {
    super(`Failed to connect to ${backend} storage backend`, 'CONNECTION_FAILED', undefined, cause)
    this.name = 'DataStoreConnectionError'
  }
}

// ---------------------------------------------------------------------------
// Utility types
// ---------------------------------------------------------------------------

/**
 * Standard data paths for different types of data
 */
export interface DataPaths {
  territory: (location: string) => string
  density: (location: string) => string
  customer: (location: string) => string
  revenue: (location: string) => string
  routes: (location: string) => string
  employee: (location: string) => string
  commercial: (location: string) => string
  ancillarySales: (location: string) => string
  marketSize: (location: string) => string
  scenarios: (location: string, scenarioId: string) => string
  uploads: (uploadId: string) => string
  backups: (location: string, dataType: string, timestamp: string) => string
}

/**
 * Default data path generators
 */
export const defaultDataPaths: DataPaths = {
  territory: (location) => `${location}/territory-data.json`,
  density: (location) => `${location}/density-data.json`,
  customer: (location) => `${location}/customer-data.json`,
  revenue: (location) => `${location}/revenue-data.json`,
  routes: (location) => `${location}/routes-data.json`,
  employee: (location) => `${location}/employee-data.json`,
  commercial: (location) => `${location}/commercial-data.json`,
  ancillarySales: (location) => `${location}/ancillary-sales-data.json`,
  marketSize: (location) => `${location}/market-size-data.json`,
  scenarios: (location, scenarioId) => `${location}/scenarios/${scenarioId}.json`,
  uploads: (uploadId) => `uploads/${uploadId}.json`,
  backups: (location, dataType, timestamp) => `backups/${location}/${dataType}-${timestamp}.json`
}

/**
 * Configuration for data expiration and caching
 */
export interface DataCacheConfig {
  defaultTtl: number        // Default TTL in seconds
  dataTtls: {               // TTL per data type
    territory: number
    density: number
    customer: number
    revenue: number
    routes: number
    employee: number
    commercial: number
    ancillarySales: number
    marketSize: number
    scenarios: number
  }
}