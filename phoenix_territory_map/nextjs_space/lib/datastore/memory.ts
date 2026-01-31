/**
 * In-memory DataStore implementation
 *
 * Testing and development storage backend using in-memory storage.
 * Provides fast, ephemeral storage for unit tests and development
 * scenarios where persistence is not required.
 *
 * bd-q97
 */

import {
  type DataStore,
  type WriteResult,
  type DeleteResult,
  type StorageObject,
  type ObjectMetadata,
  type StorageMetadata,
  DataStoreError
} from './types'

export interface MemoryConfig {
  maxSize?: number    // Maximum total size in bytes
}

interface MemoryObject {
  key: string
  data: unknown
  metadata: {
    size: number
    contentType: string
    uploadedAt: Date
  } & StorageMetadata
}

export class MemoryDataStore implements DataStore {
  private storage: Map<string, MemoryObject> = new Map()
  private config: MemoryConfig

  constructor(config: MemoryConfig = {}) {
    this.config = config
  }

  /**
   * Calculate total storage size
   */
  private getTotalSize(): number {
    let total = 0
    for (const obj of this.storage.values()) {
      total += obj.metadata.size
    }
    return total
  }

  /**
   * Check if adding data would exceed size limit
   */
  private wouldExceedLimit(additionalSize: number): boolean {
    if (!this.config.maxSize) return false
    return this.getTotalSize() + additionalSize > this.config.maxSize
  }

  async write(key: string, data: unknown, metadata?: StorageMetadata): Promise<WriteResult> {
    try {
      const jsonData = JSON.stringify(data)
      const size = Buffer.byteLength(jsonData, 'utf8')
      const contentType = metadata?.contentType || 'application/json'
      const uploadedAt = new Date()

      // Check size limit
      if (this.wouldExceedLimit(size)) {
        return {
          success: false,
          key,
          size: 0,
          contentType,
          uploadedAt,
          error: `Would exceed maximum storage size of ${this.config.maxSize} bytes`
        }
      }

      // Store the object
      this.storage.set(key, {
        key,
        data,
        metadata: {
          ...metadata,
          size,
          contentType,
          uploadedAt
        }
      })

      return {
        success: true,
        key,
        size,
        contentType,
        uploadedAt
      }
    } catch (error) {
      return {
        success: false,
        key,
        size: 0,
        contentType: metadata?.contentType || 'application/json',
        uploadedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error during write'
      }
    }
  }

  async read<T = unknown>(key: string): Promise<T | null> {
    const obj = this.storage.get(key)
    return obj ? (obj.data as T) : null
  }

  async exists(key: string): Promise<boolean> {
    return this.storage.has(key)
  }

  async delete(key: string): Promise<DeleteResult> {
    const existed = this.storage.delete(key)

    return {
      success: true, // Always succeeds, even if key didn't exist
      key,
      deletedAt: new Date()
    }
  }

  async list(prefix?: string, limit?: number): Promise<StorageObject[]> {
    const objects: StorageObject[] = []
    const maxResults = limit || 1000

    for (const obj of this.storage.values()) {
      if (objects.length >= maxResults) break

      if (!prefix || obj.key.startsWith(prefix)) {
        objects.push({
          key: obj.key,
          size: obj.metadata.size,
          lastModified: obj.metadata.uploadedAt,
          contentType: obj.metadata.contentType,
          metadata: {
            location: obj.metadata.location || '',
            dataType: obj.metadata.dataType || '',
            uploadedBy: obj.metadata.uploadedBy || ''
          }
        })
      }
    }

    // Sort by key for consistent ordering
    objects.sort((a, b) => a.key.localeCompare(b.key))

    return objects
  }

  async getMetadata(key: string): Promise<ObjectMetadata | null> {
    const obj = this.storage.get(key)
    if (!obj) return null

    return {
      key: obj.key,
      size: obj.metadata.size,
      contentType: obj.metadata.contentType,
      lastModified: obj.metadata.uploadedAt,
      metadata: {
        location: obj.metadata.location || '',
        dataType: obj.metadata.dataType || '',
        uploadedBy: obj.metadata.uploadedBy || ''
      }
    }
  }

  /**
   * Clear all stored data (useful for testing)
   */
  clear(): void {
    this.storage.clear()
  }

  /**
   * Get current storage statistics
   */
  getStats(): {
    objectCount: number
    totalSize: number
    maxSize?: number
    utilizationPercent?: number
  } {
    const totalSize = this.getTotalSize()
    const stats = {
      objectCount: this.storage.size,
      totalSize,
      maxSize: this.config.maxSize,
      utilizationPercent: undefined as number | undefined
    }

    if (this.config.maxSize) {
      stats.utilizationPercent = (totalSize / this.config.maxSize) * 100
    }

    return stats
  }
}