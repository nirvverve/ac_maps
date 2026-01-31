/**
 * Local filesystem DataStore implementation
 *
 * Development and testing storage backend using the local filesystem.
 * Provides the same interface as production backends but stores data
 * in local directories for development convenience.
 *
 * bd-q97
 */

import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import {
  type DataStore,
  type WriteResult,
  type DeleteResult,
  type StorageObject,
  type ObjectMetadata,
  type StorageMetadata,
  DataStoreError,
  DataStoreNotFoundError
} from './types'

export interface LocalConfig {
  baseDir: string
}

export class LocalDataStore implements DataStore {
  private config: LocalConfig

  constructor(config: LocalConfig) {
    this.config = config
  }

  /**
   * Get full filesystem path for a storage key
   */
  private getFilePath(key: string): string {
    return join(this.config.baseDir, key)
  }

  /**
   * Ensure directory exists for a file path
   */
  private async ensureDirectory(filePath: string): Promise<void> {
    const dir = dirname(filePath)
    try {
      await fs.mkdir(dir, { recursive: true })
    } catch (error) {
      throw new DataStoreError(
        `Failed to create directory: ${dir}`,
        'DIRECTORY_CREATION_FAILED',
        dir,
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Write metadata file alongside data file
   */
  private async writeMetadata(filePath: string, metadata: {
    size: number
    contentType: string
    uploadedAt: string
  } & StorageMetadata): Promise<void> {
    const metadataPath = filePath + '.meta'
    try {
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2))
    } catch (error) {
      // Metadata write failure is not critical, just log it
      console.warn(`Failed to write metadata file: ${metadataPath}`, error)
    }
  }

  /**
   * Read metadata file
   */
  private async readMetadata(filePath: string): Promise<any> {
    const metadataPath = filePath + '.meta'
    try {
      const content = await fs.readFile(metadataPath, 'utf8')
      return JSON.parse(content)
    } catch (error) {
      return {}
    }
  }

  async write(key: string, data: unknown, metadata?: StorageMetadata): Promise<WriteResult> {
    try {
      const filePath = this.getFilePath(key)
      await this.ensureDirectory(filePath)

      const jsonData = JSON.stringify(data, null, 2)
      const contentType = metadata?.contentType || 'application/json'
      const uploadedAt = new Date()

      // Write the main data file
      await fs.writeFile(filePath, jsonData, 'utf8')

      // Write metadata file
      await this.writeMetadata(filePath, {
        ...metadata,
        size: Buffer.byteLength(jsonData, 'utf8'),
        contentType,
        uploadedAt: uploadedAt.toISOString()
      })

      return {
        success: true,
        key,
        size: Buffer.byteLength(jsonData, 'utf8'),
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
    try {
      const filePath = this.getFilePath(key)
      const content = await fs.readFile(filePath, 'utf8')
      return JSON.parse(content) as T
    } catch (error) {
      if ((error as any)?.code === 'ENOENT') {
        return null
      }
      if (error instanceof SyntaxError) {
        throw new DataStoreError(
          `Invalid JSON in stored data: ${key}`,
          'INVALID_JSON',
          key,
          error
        )
      }
      throw new DataStoreError(
        `Failed to read data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'READ_FAILED',
        key,
        error instanceof Error ? error : undefined
      )
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(key)
      await fs.access(filePath)
      return true
    } catch (error) {
      return false
    }
  }

  async delete(key: string): Promise<DeleteResult> {
    try {
      const filePath = this.getFilePath(key)
      await fs.unlink(filePath)

      // Also delete metadata file if it exists
      try {
        await fs.unlink(filePath + '.meta')
      } catch (error) {
        // Metadata deletion failure is not critical
      }

      return {
        success: true,
        key,
        deletedAt: new Date()
      }
    } catch (error) {
      return {
        success: false,
        key,
        deletedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error during deletion'
      }
    }
  }

  async list(prefix?: string, limit?: number): Promise<StorageObject[]> {
    try {
      const basePath = prefix ? this.getFilePath(prefix) : this.config.baseDir
      const objects: StorageObject[] = []

      async function scanDirectory(dirPath: string, currentPrefix: string): Promise<void> {
        try {
          const entries = await fs.readdir(dirPath, { withFileTypes: true })

          for (const entry of entries) {
            if (objects.length >= (limit || 1000)) break

            const fullPath = join(dirPath, entry.name)
            const relativePath = currentPrefix + entry.name

            if (entry.isDirectory()) {
              await scanDirectory(fullPath, relativePath + '/')
            } else if (entry.isFile() && !entry.name.endsWith('.meta')) {
              const stats = await fs.stat(fullPath)
              const metadata = await new LocalDataStore({ baseDir: '' }).readMetadata(fullPath)

              objects.push({
                key: relativePath,
                size: stats.size,
                lastModified: stats.mtime,
                contentType: metadata.contentType || 'application/json',
                metadata: metadata || {}
              })
            }
          }
        } catch (error) {
          // Directory doesn't exist or can't be read, that's ok
        }
      }

      await scanDirectory(basePath, prefix || '')

      return objects.slice(0, limit || 1000)
    } catch (error) {
      throw new DataStoreError(
        `Failed to list objects: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'LIST_FAILED',
        prefix,
        error instanceof Error ? error : undefined
      )
    }
  }

  async getMetadata(key: string): Promise<ObjectMetadata | null> {
    try {
      const filePath = this.getFilePath(key)
      const stats = await fs.stat(filePath)
      const metadata = await this.readMetadata(filePath)

      return {
        key,
        size: stats.size,
        contentType: metadata.contentType || 'application/json',
        lastModified: stats.mtime,
        metadata: metadata || {}
      }
    } catch (error) {
      return null
    }
  }
}