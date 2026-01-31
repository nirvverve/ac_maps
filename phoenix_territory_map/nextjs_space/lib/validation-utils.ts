/**
 * Validation utilities for data upload system
 *
 * Helper functions for validating uploaded CSV/XLSX data, formatting validation errors,
 * and providing user-friendly error messages for the admin upload interface.
 *
 * bd-3jf
 */

import { ZodError } from 'zod'
import {
  DataType,
  safeValidateData,
  getValidationSchema,
  type UploadMetadata
} from './validation-schemas'

// ---------------------------------------------------------------------------
// Validation result types
// ---------------------------------------------------------------------------

export interface ValidationResult {
  success: boolean
  data?: unknown[]
  errors?: ValidationError[]
  summary: ValidationSummary
}

export interface ValidationError {
  row: number
  field: string
  value: unknown
  message: string
  code: string
}

export interface ValidationSummary {
  totalRows: number
  validRows: number
  invalidRows: number
  errorCount: number
  warnings: string[]
}

// ---------------------------------------------------------------------------
// Core validation functions
// ---------------------------------------------------------------------------

/**
 * Validate an array of data objects against a schema
 */
export function validateDataArray(
  dataType: DataType,
  data: unknown[],
  options: {
    stopOnFirstError?: boolean
    maxErrors?: number
  } = {}
): ValidationResult {
  const { stopOnFirstError = false, maxErrors = 100 } = options

  const errors: ValidationError[] = []
  const validData: unknown[] = []
  const warnings: string[] = []

  let processedRows = 0

  for (let i = 0; i < data.length; i++) {
    const rowNumber = i + 1
    processedRows++

    try {
      const result = safeValidateData(dataType, data)

      if (result.success) {
        validData.push(...result.data)
      } else {
        const rowErrors = formatZodErrors(result.error, rowNumber)
        errors.push(...rowErrors)

        if (stopOnFirstError || errors.length >= maxErrors) {
          warnings.push(`Validation stopped after ${errors.length} errors`)
          break
        }
      }
    } catch (error) {
      errors.push({
        row: rowNumber,
        field: 'general',
        value: data[i],
        message: error instanceof Error ? error.message : 'Unexpected validation error',
        code: 'VALIDATION_FAILED'
      })

      if (stopOnFirstError || errors.length >= maxErrors) {
        warnings.push(`Validation stopped after ${errors.length} errors`)
        break
      }
    }
  }

  const summary: ValidationSummary = {
    totalRows: data.length,
    validRows: validData.length,
    invalidRows: Math.min(data.length - validData.length, processedRows),
    errorCount: errors.length,
    warnings
  }

  return {
    success: errors.length === 0,
    data: validData.length > 0 ? validData : undefined,
    errors: errors.length > 0 ? errors : undefined,
    summary
  }
}

/**
 * Format Zod validation errors into user-friendly messages
 */
function formatZodErrors(error: ZodError, rowNumber: number): ValidationError[] {
  return error.errors.map(err => ({
    row: rowNumber,
    field: err.path.join('.'),
    value: err.path.length > 0 ? getValueAtPath(error, err.path) : undefined,
    message: formatErrorMessage(err),
    code: err.code
  }))
}

/**
 * Extract value at a specific path from validation error context
 */
function getValueAtPath(input: unknown, path: (string | number)[]): unknown {
  let current = input
  for (const segment of path) {
    if (current && typeof current === 'object' && segment in current) {
      current = (current as any)[segment]
    } else {
      return undefined
    }
  }
  return current
}

/**
 * Format Zod error messages for user display
 */
function formatErrorMessage(error: any): string {
  switch (error.code) {
    case 'invalid_type':
      return `Expected ${error.expected}, but received ${error.received}`
    case 'invalid_string':
      return error.validation === 'regex'
        ? `Value does not match expected format`
        : `Invalid string value`
    case 'too_small':
      return error.type === 'string'
        ? `Must be at least ${error.minimum} characters long`
        : `Must be at least ${error.minimum}`
    case 'too_big':
      return error.type === 'string'
        ? `Must be at most ${error.maximum} characters long`
        : `Must be at most ${error.maximum}`
    case 'invalid_enum_value':
      return `Must be one of: ${error.options.join(', ')}`
    case 'custom':
      return error.message || 'Invalid value'
    default:
      return error.message || 'Validation error'
  }
}

// ---------------------------------------------------------------------------
// Data type inference and suggestions
// ---------------------------------------------------------------------------

/**
 * Analyze data structure and suggest the most appropriate data type
 */
export function suggestDataType(data: unknown[]): {
  suggestion: DataType | null
  confidence: number
  reasons: string[]
} {
  if (!Array.isArray(data) || data.length === 0) {
    return { suggestion: null, confidence: 0, reasons: ['No data provided'] }
  }

  const sampleSize = Math.min(10, data.length)
  const samples = data.slice(0, sampleSize)
  const scores: Record<DataType, { score: number; reasons: string[] }> = {
    territory: { score: 0, reasons: [] },
    density: { score: 0, reasons: [] },
    customer: { score: 0, reasons: [] },
    revenue: { score: 0, reasons: [] },
    routes: { score: 0, reasons: [] },
    employee: { score: 0, reasons: [] },
    commercial: { score: 0, reasons: [] },
    ancillarySales: { score: 0, reasons: [] },
    marketSize: { score: 0, reasons: [] }
  }

  for (const sample of samples) {
    if (!sample || typeof sample !== 'object') continue

    const obj = sample as Record<string, unknown>

    // Territory data indicators
    if ('zip' in obj && 'area' in obj && 'accounts' in obj) {
      scores.territory.score += 10
      scores.territory.reasons.push('Has zip, area, accounts fields')
    }

    // Density data indicators
    if ('accountCount' in obj && 'latitude' in obj && 'longitude' in obj) {
      scores.density.score += 10
      scores.density.reasons.push('Has accountCount, latitude, longitude fields')
    }

    // Customer data indicators
    if ('accountNumber' in obj && 'customerName' in obj && 'address' in obj) {
      scores.customer.score += 10
      scores.customer.reasons.push('Has accountNumber, customerName, address fields')
    }

    // Revenue data indicators
    if (('totalRevenue' in obj || 'revenue' in obj) && 'year' in obj) {
      scores.revenue.score += 10
      scores.revenue.reasons.push('Has revenue and year fields')
    }

    // Routes data indicators
    if ('routeId' in obj && 'technicianId' in obj) {
      scores.routes.score += 10
      scores.routes.reasons.push('Has routeId and technicianId fields')
    }

    // Employee data indicators
    if ('employeeId' in obj && 'employeeName' in obj && 'role' in obj) {
      scores.employee.score += 10
      scores.employee.reasons.push('Has employeeId, employeeName, role fields')
    }

    // Commercial data indicators
    if ('businessName' in obj || 'poolCount' in obj || 'propertyType' in obj) {
      scores.commercial.score += 8
      scores.commercial.reasons.push('Has business-specific fields')
    }

    // Ancillary sales indicators
    if ('ots' in obj && 'repair' in obj && 'remodel' in obj) {
      scores.ancillarySales.score += 10
      scores.ancillarySales.reasons.push('Has ots, repair, remodel fields')
    }

    // Market size indicators
    if ('totalHouseholds' in obj && 'estimatedPools' in obj) {
      scores.marketSize.score += 10
      scores.marketSize.reasons.push('Has totalHouseholds, estimatedPools fields')
    }
  }

  // Find the highest scoring data type
  let bestMatch: { type: DataType; score: number; reasons: string[] } | null = null

  for (const [dataType, result] of Object.entries(scores)) {
    if (result.score > (bestMatch?.score || 0)) {
      bestMatch = {
        type: dataType as DataType,
        score: result.score,
        reasons: result.reasons
      }
    }
  }

  if (!bestMatch || bestMatch.score === 0) {
    return { suggestion: null, confidence: 0, reasons: ['Unable to identify data type'] }
  }

  const confidence = Math.min(100, (bestMatch.score / samples.length) * 10)

  return {
    suggestion: bestMatch.type,
    confidence,
    reasons: bestMatch.reasons
  }
}

// ---------------------------------------------------------------------------
// Validation report generation
// ---------------------------------------------------------------------------

/**
 * Generate a detailed validation report for admin users
 */
export function generateValidationReport(
  result: ValidationResult,
  metadata: Partial<UploadMetadata>
): string {
  const { summary, errors } = result

  let report = `# Data Validation Report\n\n`
  report += `**File:** ${metadata.fileName || 'Unknown'}\n`
  report += `**Data Type:** ${metadata.dataType || 'Unknown'}\n`
  report += `**Location:** ${metadata.location || 'Unknown'}\n`
  report += `**Upload Time:** ${metadata.uploadedAt ? new Date(metadata.uploadedAt).toLocaleString() : 'Unknown'}\n\n`

  report += `## Summary\n`
  report += `- **Total Rows:** ${summary.totalRows}\n`
  report += `- **Valid Rows:** ${summary.validRows}\n`
  report += `- **Invalid Rows:** ${summary.invalidRows}\n`
  report += `- **Error Count:** ${summary.errorCount}\n`
  report += `- **Success Rate:** ${((summary.validRows / summary.totalRows) * 100).toFixed(1)}%\n\n`

  if (summary.warnings.length > 0) {
    report += `## Warnings\n`
    for (const warning of summary.warnings) {
      report += `- ${warning}\n`
    }
    report += `\n`
  }

  if (errors && errors.length > 0) {
    report += `## Errors\n`

    // Group errors by field for better readability
    const errorsByField: Record<string, ValidationError[]> = {}
    for (const error of errors) {
      if (!errorsByField[error.field]) {
        errorsByField[error.field] = []
      }
      errorsByField[error.field].push(error)
    }

    for (const [field, fieldErrors] of Object.entries(errorsByField)) {
      report += `### ${field}\n`
      for (const error of fieldErrors.slice(0, 10)) { // Limit to first 10 per field
        report += `- **Row ${error.row}:** ${error.message}\n`
        if (error.value !== undefined) {
          report += `  Value: \`${String(error.value)}\`\n`
        }
      }
      if (fieldErrors.length > 10) {
        report += `  ... and ${fieldErrors.length - 10} more errors\n`
      }
      report += `\n`
    }
  }

  if (result.success) {
    report += `## ✅ Validation Successful\nAll data rows passed validation and are ready for import.\n`
  } else {
    report += `## ❌ Validation Failed\nPlease fix the errors above and re-upload the file.\n`
  }

  return report
}

// ---------------------------------------------------------------------------
// Export utilities
// ---------------------------------------------------------------------------

export { type DataType } from './validation-schemas'