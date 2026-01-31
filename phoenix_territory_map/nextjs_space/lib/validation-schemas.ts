/**
 * Zod validation schemas for data upload system
 *
 * Comprehensive validation for all data types used in the territory mapping system.
 * These schemas ensure data integrity for CSV/XLSX uploads and API endpoints.
 *
 * bd-3jf
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Common validation utilities
// ---------------------------------------------------------------------------

// US ZIP code validation (5 or 9 digit format)
const zipCodeSchema = z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format')

// Latitude validation (-90 to 90)
const latitudeSchema = z.number().min(-90).max(90)

// Longitude validation (-180 to 180)
const longitudeSchema = z.number().min(-180).max(180)

// Account number validation (flexible format)
const accountNumberSchema = z.string().min(1).max(50)

// Currency validation (positive numbers with up to 2 decimal places)
const currencySchema = z.number().min(0).multipleOf(0.01)

// Year validation (reasonable range for business data)
const yearSchema = z.number().int().min(2000).max(2030)

// Status validation
const accountStatusSchema = z.enum(['Active', 'Terminated', 'Suspended', 'Pending'])

// Territory validation (flexible to support all locations)
const territorySchema = z.string().min(1).max(50)

// ---------------------------------------------------------------------------
// Core data type schemas
// ---------------------------------------------------------------------------

/**
 * Territory assignment data - basic ZIP to territory mapping
 */
export const territoryDataSchema = z.object({
  zip: zipCodeSchema,
  area: territorySchema,
  accounts: z.number().int().min(0),
  city: z.string().optional(), // Some data includes city
  state: z.string().length(2).optional(), // Some data includes state
})

/**
 * Density data with geographic coordinates
 */
export const densityDataSchema = z.object({
  zip: zipCodeSchema,
  accountCount: z.number().int().min(0),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  city: z.string().min(1).max(100),
  territory: territorySchema,
  accountType: z.enum(['residential', 'commercial']).optional(),
  status: accountStatusSchema.optional(),
})

/**
 * Customer lookup data with full account information
 */
export const customerDataSchema = z.object({
  accountNumber: accountNumberSchema,
  customerName: z.string().min(1).max(200),
  address: z.string().min(1).max(300),
  zipCode: zipCodeSchema,
  city: z.string().min(1).max(100),
  territory: territorySchema,
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  status: accountStatusSchema,
  accountType: z.enum(['residential', 'commercial']).default('residential'),
  monthlyRevenue: currencySchema.optional(),
  installDate: z.string().optional(), // ISO date string
  lastServiceDate: z.string().optional(), // ISO date string
})

/**
 * Revenue analysis data by territory/ZIP
 */
export const revenueDataSchema = z.object({
  zip: zipCodeSchema,
  territory: territorySchema,
  city: z.string().min(1).max(100),
  year: yearSchema,
  month: z.number().int().min(1).max(12).optional(),
  totalRevenue: currencySchema,
  activeAccounts: z.number().int().min(0),
  averageRevenue: currencySchema,
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  accountType: z.enum(['residential', 'commercial']).optional(),
})

/**
 * Routes data with technician assignments
 */
export const routesDataSchema = z.object({
  routeId: z.string().min(1).max(50),
  technicianId: z.string().min(1).max(50),
  technicianName: z.string().min(1).max(200),
  territory: territorySchema,
  zip: zipCodeSchema,
  accountCount: z.number().int().min(0),
  estimatedDriveTime: z.number().min(0).optional(), // minutes
  serviceDay: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']).optional(),
  isActive: z.boolean().default(true),
})

/**
 * Employee location data
 */
export const employeeDataSchema = z.object({
  employeeId: z.string().min(1).max(50),
  employeeName: z.string().min(1).max(200),
  role: z.string().min(1).max(100),
  homeAddress: z.string().min(1).max(300),
  zipCode: zipCodeSchema,
  city: z.string().min(1).max(100),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  assignedTerritory: territorySchema.optional(),
  branch: z.string().min(1).max(100),
  isActive: z.boolean().default(true),
  hireDate: z.string().optional(), // ISO date string
})

/**
 * Commercial accounts with business-specific data
 */
export const commercialDataSchema = z.object({
  accountNumber: accountNumberSchema,
  businessName: z.string().min(1).max(300),
  contactName: z.string().min(1).max(200).optional(),
  address: z.string().min(1).max(300),
  zipCode: zipCodeSchema,
  city: z.string().min(1).max(100),
  territory: territorySchema,
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  status: accountStatusSchema,
  monthlyRevenue: currencySchema,
  poolCount: z.number().int().min(1).optional(),
  propertyType: z.enum(['Hotel', 'Apartment', 'HOA', 'Country Club', 'Fitness Center', 'Other']).optional(),
  contractType: z.enum(['Full Service', 'Chemical Only', 'Maintenance Only']).optional(),
  installDate: z.string().optional(), // ISO date string
})

/**
 * Ancillary sales data with service breakdown
 */
export const ancillarySalesDataSchema = z.object({
  zip: zipCodeSchema,
  year: yearSchema,
  city: z.string().max(100).optional(),
  branch: z.string().min(1).max(100),
  ots: currencySchema, // One-time services
  repair: currencySchema,
  remodel: currencySchema,
  total: currencySchema,
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  accountCount: z.number().int().min(0).optional(),
  territory: territorySchema.optional(),
})

/**
 * Market size data for territory analysis
 */
export const marketSizeDataSchema = z.object({
  zip: zipCodeSchema,
  city: z.string().min(1).max(100),
  territory: territorySchema,
  totalHouseholds: z.number().int().min(0),
  estimatedPools: z.number().int().min(0),
  marketPenetration: z.number().min(0).max(100), // percentage
  competitorCount: z.number().int().min(0).optional(),
  averageIncome: currencySchema.optional(),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
})

// ---------------------------------------------------------------------------
// Array schemas for bulk data validation
// ---------------------------------------------------------------------------

export const territoryDataArraySchema = z.array(territoryDataSchema)
export const densityDataArraySchema = z.array(densityDataSchema)
export const customerDataArraySchema = z.array(customerDataSchema)
export const revenueDataArraySchema = z.array(revenueDataSchema)
export const routesDataArraySchema = z.array(routesDataSchema)
export const employeeDataArraySchema = z.array(employeeDataSchema)
export const commercialDataArraySchema = z.array(commercialDataSchema)
export const ancillarySalesDataArraySchema = z.array(ancillarySalesDataSchema)
export const marketSizeDataArraySchema = z.array(marketSizeDataSchema)

// ---------------------------------------------------------------------------
// Scenario data schemas
// ---------------------------------------------------------------------------

/**
 * Scenario reassignment - ZIP code territory change with impact metrics
 */
export const scenarioReassignmentSchema = z.object({
  zipCode: zipCodeSchema,
  fromTerritory: territorySchema,
  toTerritory: territorySchema,
  accountCount: z.number().int().min(0),
  revenueImpact: z.number().min(0)
})

/**
 * Complete scenario object for territory planning and analysis
 */
export const scenarioSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  location: z.enum(['arizona', 'miami', 'dallas', 'jacksonville', 'orlando', 'portcharlotte']),
  createdBy: z.string().min(1).max(100),
  createdAt: z.string().datetime(),
  baselineDataVersion: z.string().min(1).max(50),
  status: z.enum(['draft', 'published', 'archived']),
  reassignments: z.array(scenarioReassignmentSchema)
})

export const scenarioArraySchema = z.array(scenarioSchema)

// ---------------------------------------------------------------------------
// Upload file metadata schema
// ---------------------------------------------------------------------------

export const uploadMetadataSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().min(1),
  mimeType: z.enum(['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  uploadedBy: z.string().min(1).max(200),
  uploadedAt: z.string(), // ISO date string
  location: z.enum(['arizona', 'miami', 'dallas', 'orlando', 'jacksonville', 'portCharlotte']),
  dataType: z.enum(['territory', 'density', 'customer', 'revenue', 'routes', 'employee', 'commercial', 'ancillarySales', 'marketSize']),
  recordCount: z.number().int().min(0),
})

// ---------------------------------------------------------------------------
// Export type definitions from schemas
// ---------------------------------------------------------------------------

export type TerritoryData = z.infer<typeof territoryDataSchema>
export type DensityData = z.infer<typeof densityDataSchema>
export type CustomerData = z.infer<typeof customerDataSchema>
export type RevenueData = z.infer<typeof revenueDataSchema>
export type RoutesData = z.infer<typeof routesDataSchema>
export type EmployeeData = z.infer<typeof employeeDataSchema>
export type CommercialData = z.infer<typeof commercialDataSchema>
export type AncillarySalesData = z.infer<typeof ancillarySalesDataSchema>
export type MarketSizeData = z.infer<typeof marketSizeDataSchema>
export type UploadMetadata = z.infer<typeof uploadMetadataSchema>
export type ScenarioReassignment = z.infer<typeof scenarioReassignmentSchema>
export type Scenario = z.infer<typeof scenarioSchema>

// ---------------------------------------------------------------------------
// Schema registry for dynamic validation
// ---------------------------------------------------------------------------

export const schemaRegistry = {
  territory: territoryDataArraySchema,
  density: densityDataArraySchema,
  customer: customerDataArraySchema,
  revenue: revenueDataArraySchema,
  routes: routesDataArraySchema,
  employee: employeeDataArraySchema,
  commercial: commercialDataArraySchema,
  ancillarySales: ancillarySalesDataArraySchema,
  marketSize: marketSizeDataArraySchema,
} as const

export type DataType = keyof typeof schemaRegistry

/**
 * Get validation schema for a specific data type
 */
export function getValidationSchema(dataType: DataType) {
  return schemaRegistry[dataType]
}

/**
 * Validate data against its corresponding schema
 */
export function validateData(dataType: DataType, data: unknown) {
  const schema = getValidationSchema(dataType)
  return schema.parse(data)
}

/**
 * Safe validation that returns errors instead of throwing
 */
export function safeValidateData(dataType: DataType, data: unknown) {
  const schema = getValidationSchema(dataType)
  return schema.safeParse(data)
}