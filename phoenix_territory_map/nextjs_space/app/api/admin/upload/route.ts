/**
 * POST /api/admin/upload - Admin data upload endpoint
 *
 * Secure endpoint for administrators to upload CSV/XLSX files containing
 * territory mapping data. Provides validation, parsing, and storage with
 * automatic backup of existing data.
 *
 * bd-2kc
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getDataStore, createDataBackup, storeLocationData } from '@/lib/datastore'
import {
  safeValidateData,
  type DataType,
  type UploadMetadata,
  uploadMetadataSchema
} from '@/lib/validation-schemas'
import { rateLimitGuard, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit'
import { geocodeRecords, needsGeocoding } from '@/lib/geocoding'
import { randomUUID } from 'crypto'
import { parse } from 'papaparse'
import * as XLSX from 'xlsx'

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024

// Supported MIME types
const SUPPORTED_MIME_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
] as const

interface ParsedUpload {
  data: unknown[]
  metadata: {
    fileName: string
    fileSize: number
    mimeType: string
    recordCount: number
  }
}

/**
 * Parse CSV file content
 */
function parseCSV(content: string, fileName: string): ParsedUpload {
  const results = parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
    transform: (value) => value.trim(),
  })

  if (results.errors.length > 0) {
    const errorMsg = results.errors.map(err => `Line ${err.row}: ${err.message}`).join('; ')
    throw new Error(`CSV parsing errors: ${errorMsg}`)
  }

  return {
    data: results.data,
    metadata: {
      fileName,
      fileSize: Buffer.byteLength(content, 'utf8'),
      mimeType: 'text/csv',
      recordCount: results.data.length
    }
  }
}

/**
 * Parse XLSX file content
 */
function parseXLSX(buffer: ArrayBuffer, fileName: string): ParsedUpload {
  try {
    const workbook = XLSX.read(buffer, { type: 'array' })

    // Use first worksheet
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      throw new Error('No worksheets found in XLSX file')
    }

    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: false
    })

    if (data.length === 0) {
      throw new Error('No data found in worksheet')
    }

    // Convert to objects using first row as headers
    const headers = data[0] as string[]
    const rows = data.slice(1) as any[][]

    const jsonData = rows.map(row => {
      const obj: any = {}
      headers.forEach((header, index) => {
        obj[header?.toString().trim() || `column_${index}`] = row[index]?.toString().trim() || ''
      })
      return obj
    })

    return {
      data: jsonData,
      metadata: {
        fileName,
        fileSize: buffer.byteLength,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        recordCount: jsonData.length
      }
    }
  } catch (error) {
    throw new Error(`XLSX parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Validate upload metadata
 */
function validateUploadMetadata(
  parsedData: ParsedUpload,
  location: string,
  dataType: string,
  uploadedBy: string
): UploadMetadata {
  const metadata = {
    fileName: parsedData.metadata.fileName,
    fileSize: parsedData.metadata.fileSize,
    mimeType: parsedData.metadata.mimeType,
    uploadedBy,
    uploadedAt: new Date().toISOString(),
    location,
    dataType,
    recordCount: parsedData.metadata.recordCount
  }

  return uploadMetadataSchema.parse(metadata)
}

export async function POST(request: NextRequest) {
  // Rate limit check (before auth to block brute-force attempts)
  const rateLimited = rateLimitGuard('admin-upload', request, RATE_LIMIT_CONFIGS.adminUpload)
  if (rateLimited) return rateLimited

  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions)
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    // 2. Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const location = formData.get('location') as string
    const dataType = formData.get('dataType') as string
    const createBackup = formData.get('createBackup') === 'true'
    const enableGeocoding = formData.get('geocode') === 'true'

    // 3. Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!location || !dataType) {
      return NextResponse.json(
        { error: 'Location and dataType are required' },
        { status: 400 }
      )
    }

    // 4. Validate file constraints
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      )
    }

    if (!SUPPORTED_MIME_TYPES.includes(file.type as any)) {
      return NextResponse.json(
        { error: `Unsupported file type. Supported types: ${SUPPORTED_MIME_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // 5. Parse file content
    let parsedData: ParsedUpload

    const fileNameLower = file.name.toLowerCase()
    const isCsv = fileNameLower.endsWith('.csv') || file.type === 'text/csv'
    const isXlsx = fileNameLower.endsWith('.xlsx') || fileNameLower.endsWith('.xls')

    if (isCsv && !isXlsx) {
      const content = await file.text()
      parsedData = parseCSV(content, file.name)
    } else {
      const buffer = await file.arrayBuffer()
      parsedData = parseXLSX(buffer, file.name)
    }

    if (parsedData.data.length === 0) {
      return NextResponse.json(
        { error: 'No valid data rows found in file' },
        { status: 400 }
      )
    }

    // 6. Validate upload metadata
    const uploadMetadata = validateUploadMetadata(
      parsedData,
      location,
      dataType as DataType,
      session.user?.email || 'unknown'
    )

    // 7. Validate data against schema
    const validationResult = safeValidateData(dataType as DataType, parsedData.data)

    if (!validationResult.success) {
      const errorDetails = validationResult.error.errors.map(err =>
        `${err.path.join('.')}: ${err.message}`
      ).slice(0, 10) // Limit to first 10 errors

      return NextResponse.json(
        {
          error: 'Data validation failed',
          validationErrors: errorDetails,
          totalErrors: validationResult.error.errors.length
        },
        { status: 400 }
      )
    }

    // 8. Optional geocoding for records missing lat/lng (bd-1ok)
    let geocodeStats = null
    let dataToStore = validationResult.data
    if (enableGeocoding) {
      const assessment = needsGeocoding(parsedData.data as Record<string, unknown>[])
      if (assessment.needsGeocoding > 0) {
        const geocodeResult = await geocodeRecords(parsedData.data as Record<string, unknown>[])
        geocodeStats = {
          geocoded: geocodeResult.geocodedCount,
          failed: geocodeResult.failedCount,
          skipped: geocodeResult.skippedCount,
        }
        // Re-validate geocoded data
        const revalidated = safeValidateData(dataType as DataType, geocodeResult.records)
        if (revalidated.success) {
          dataToStore = revalidated.data
        }
      }
    }

    // 9. Get DataStore instance
    const dataStore = await getDataStore()

    // 10. Create backup if requested and data exists
    let backupKey: string | null = null
    if (createBackup) {
      try {
        backupKey = await createDataBackup(location, dataType as DataType)
      } catch (error) {
        // Backup failure shouldn't block upload if no existing data
        console.warn('Backup creation failed:', error)
      }
    }

    // 11. Store the validated (and optionally geocoded) data
    const storeSuccess = await storeLocationData(
      location,
      dataType as DataType,
      dataToStore,
      {
        uploadedBy: uploadMetadata.uploadedBy,
        version: uploadMetadata.uploadedAt
      }
    )

    if (!storeSuccess) {
      return NextResponse.json(
        { error: 'Failed to store data. Please try again.' },
        { status: 500 }
      )
    }

    // 12. Store upload metadata for tracking
    const uploadId = `upload-${randomUUID()}`
    await dataStore.write(`uploads/${uploadId}`, uploadMetadata, {
      dataType: 'upload-metadata',
      uploadedBy: uploadMetadata.uploadedBy
    })

    // 13. Write audit log to database (bd-2to)
    try {
      await prisma.uploadLog.create({
        data: {
          userId: session.user.id,
          location,
          dataType,
          fileName: uploadMetadata.fileName,
          fileSize: uploadMetadata.fileSize,
          recordCount: uploadMetadata.recordCount,
          backupKey,
          geocoded: geocodeStats?.geocoded ?? 0,
        },
      })
    } catch (auditErr) {
      // Audit failure must not block a successful upload
      console.warn('Upload audit log write failed:', auditErr)
    }

    // 14. Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'Data uploaded successfully',
        metadata: {
          location,
          dataType,
          recordCount: uploadMetadata.recordCount,
          fileName: uploadMetadata.fileName,
          uploadId,
          ...(backupKey && { backupKey }),
          ...(geocodeStats && { geocoding: geocodeStats })
        }
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Upload endpoint error:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error during upload' },
      { status: 500 }
    )
  }
}
