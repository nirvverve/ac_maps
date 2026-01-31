/**
 * Vercel Blob Storage DataStore implementation
 *
 * Production-ready storage backend using Vercel Blob Storage.
 * Provides automatic CDN distribution, high availability, and
 * seamless integration with Vercel deployment infrastructure.
 *
 * bd-q97
 */

import { put, del, list, head, type PutBlobResult } from '@vercel/blob'
import {
  type DataStore,
  type WriteResult,
  type DeleteResult,
  type StorageObject,
  type ObjectMetadata,
  type StorageMetadata,
  DataStoreError,
  DataStoreNotFoundError,
  DataStoreConnectionError
} from './types'

export interface VercelBlobConfig {
  token: string
  folder?: string     // Optional folder prefix for all operations
}

export class VercelBlobDataStore implements DataStore {
  private config: VercelBlobConfig

  constructor(config: VercelBlobConfig) {
    this.config = config
    if (!config.token) {
      throw new DataStoreConnectionError('vercel-blob', new Error('Vercel Blob token is required'))
    }
  }

  /**
   * Generate storage key with optional folder prefix
   */
  private getStorageKey(key: string): string {
    if (this.config.folder) {
      return `${this.config.folder}/${key}`
    }
    return key
  }

  /**
   * Remove folder prefix from storage key for external use
   */
  private cleanStorageKey(key: string): string {
    if (this.config.folder && key.startsWith(`${this.config.folder}/`)) {
      return key.substring(this.config.folder.length + 1)
    }
    return key
  }

  async write(key: string, data: unknown, metadata?: StorageMetadata): Promise<WriteResult> {
    try {
      const storageKey = this.getStorageKey(key)
      const jsonData = JSON.stringify(data, null, 2)
      const contentType = metadata?.contentType || 'application/json'

      // Prepare blob metadata
      const blobMetadata: Record<string, string> = {}
      if (metadata) {
        Object.entries(metadata).forEach(([k, v]) => {
          if (v !== undefined) {
            blobMetadata[k] = v
          }
        })
      }

      const result: PutBlobResult = await put(storageKey, jsonData, {
        access: 'public',
        contentType,
        addRandomSuffix: false,
        ...(Object.keys(blobMetadata).length > 0 && { metadata: blobMetadata })
      })

      return {
        success: true,
        key,
        url: result.url,
        size: new Blob([jsonData]).size,
        contentType,
        etag: undefined, // Vercel Blob doesn't expose ETags directly
        uploadedAt: new Date()
      }
    } catch (error) {
      return {
        success: false,
        key,
        url: undefined,
        size: 0,
        contentType: metadata?.contentType || 'application/json',
        uploadedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error during upload'
      }
    }
  }

  async read<T = unknown>(key: string): Promise<T | null> {
    try {
      const storageKey = this.getStorageKey(key)

      // Check if blob exists first
      try {
        await head(storageKey, { token: this.config.token })
      } catch (error) {
        // If head() throws, the blob doesn't exist
        return null
      }

      // Fetch the blob content
      const response = await fetch(`https://blob.vercel-storage.com/${storageKey}`, {
        headers: {
          'Authorization': `Bearer ${this.config.token}`
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new DataStoreError(
          `Failed to read blob: ${response.statusText}`,
          'READ_FAILED',
          key,
          new Error(`HTTP ${response.status}`)
        )
      }

      const text = await response.text()
      return JSON.parse(text) as T
    } catch (error) {
      if (error instanceof DataStoreError) {
        throw error
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
      const storageKey = this.getStorageKey(key)
      await head(storageKey, { token: this.config.token })
      return true
    } catch (error) {
      return false
    }
  }

  async delete(key: string): Promise<DeleteResult> {
    try {
      const storageKey = this.getStorageKey(key)
      await del(storageKey, { token: this.config.token })

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
      const searchPrefix = prefix ? this.getStorageKey(prefix) : this.config.folder

      const { blobs } = await list({
        prefix: searchPrefix,
        limit: limit || 1000,
        token: this.config.token
      })

      return blobs.map(blob => ({
        key: this.cleanStorageKey(blob.pathname),
        size: blob.size,
        lastModified: new Date(blob.uploadedAt),
        contentType: 'application/json', // Most of our data is JSON
        metadata: {}
      }))
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
      const storageKey = this.getStorageKey(key)
      const blob = await head(storageKey, { token: this.config.token })

      return {
        key,
        size: blob.size,
        contentType: blob.contentType || 'application/json',
        lastModified: new Date(blob.uploadedAt),
        metadata: {},
        url: blob.url
      }
    } catch (error) {
      return null
    }
  }
}