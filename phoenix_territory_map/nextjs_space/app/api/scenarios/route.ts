/**
 * GET /api/scenarios - List all scenarios with filtering and pagination
 *
 * Public endpoint (requires authentication but not admin access) for retrieving
 * scenario metadata and basic information. Supports filtering by location, status,
 * and pagination for efficient data loading.
 *
 * bd-2ga
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDataStore } from '@/lib/datastore'
import { scenarioSchema, type Scenario } from '@/lib/validation-schemas'
import { z } from 'zod'

// Cache duration for scenario lists (5 minutes)
const CACHE_DURATION = 300

interface ScenarioSummary {
  id: string
  name: string
  description: string
  location: string
  status: string
  createdBy: string
  createdAt: string
  baselineDataVersion: string
  reassignmentCount: number
  totalRevenueImpact: number
}

/**
 * Convert full scenario to summary object for list view
 */
function createScenarioSummary(scenario: Scenario): ScenarioSummary {
  return {
    id: scenario.id,
    name: scenario.name,
    description: scenario.description,
    location: scenario.location,
    status: scenario.status,
    createdBy: scenario.createdBy,
    createdAt: scenario.createdAt,
    baselineDataVersion: scenario.baselineDataVersion,
    reassignmentCount: scenario.reassignments.length,
    totalRevenueImpact: scenario.reassignments.reduce((sum, r) => sum + r.revenueImpact, 0)
  }
}

/**
 * Save scenario to DataStore and static file
 */
async function saveScenario(scenario: Scenario): Promise<void> {
  try {
    const store = await getDataStore()
    const key = `scenarios/${scenario.id}.json`

    // Save to DataStore
    await store.write(key, scenario, {
      contentType: 'application/json',
      location: scenario.location,
      dataType: 'scenario',
      version: new Date().toISOString()
    })

    // Also save to static file for backward compatibility
    const fs = require('fs').promises
    const path = require('path')
    const filePath = path.join(process.cwd(), 'public', key)

    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true })

    // Write file
    await fs.writeFile(filePath, JSON.stringify(scenario, null, 2))

  } catch (error) {
    console.error(`Failed to save scenario ${scenario.id}:`, error)
    throw error
  }
}

/**
 * Check if scenario ID already exists
 */
async function scenarioExists(scenarioId: string): Promise<boolean> {
  try {
    const store = await getDataStore()
    const key = `scenarios/${scenarioId}.json`

    // Check DataStore first
    try {
      await store.read(key)
      return true
    } catch (error) {
      // Check static file
      const fs = require('fs').promises
      const path = require('path')
      const filePath = path.join(process.cwd(), 'public', key)

      try {
        await fs.access(filePath)
        return true
      } catch (fileError) {
        return false
      }
    }
  } catch (error) {
    console.warn(`Error checking scenario existence for ${scenarioId}:`, error)
    return false
  }
}

/**
 * Read scenarios from DataStore with static file fallback
 */
async function loadScenarios(): Promise<Scenario[]> {
  const scenarios: Scenario[] = []

  try {
    // Try DataStore first (future implementation)
    const store = await getDataStore()

    // For now, we'll implement static file reading as fallback
    // This will be updated when scenarios are migrated to DataStore
    const scenarioIds = [
      'miami-10pct-optimization',
      'miami-final-territory',
      'miami-kml-scenario',
      'miami-radical-reroute',
      'miami-zip-optimized',
      'miami-zip-optimized-2',
      'miami-commercial-routes',
      'miami-future-commercial',
      'miami-zip-scenario'
    ]

    for (const scenarioId of scenarioIds) {
      try {
        const key = `scenarios/${scenarioId}.json`
        let scenarioData: any = null

        // Try DataStore first
        try {
          scenarioData = await store.read(key)
        } catch (error) {
          // Fallback to direct file system read
          const fs = require('fs').promises
          const path = require('path')
          const filePath = path.join(process.cwd(), 'public', key)
          const content = await fs.readFile(filePath, 'utf8')
          scenarioData = JSON.parse(content)
        }

        if (scenarioData) {
          // Validate scenario data
          const validatedScenario = scenarioSchema.parse(scenarioData)
          scenarios.push(validatedScenario)
        }
      } catch (error) {
        console.warn(`Failed to load scenario ${scenarioId}:`, error)
        // Continue loading other scenarios
      }
    }
  } catch (error) {
    console.error('Failed to load scenarios:', error)
  }

  return scenarios
}

export async function GET(request: NextRequest) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url)
    const location = searchParams.get('location')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Validate parameters
    if (limit > 100) {
      return NextResponse.json(
        { error: 'Limit cannot exceed 100' },
        { status: 400 }
      )
    }

    // 3. Load all scenarios
    const allScenarios = await loadScenarios()

    // 4. Apply filters
    let filteredScenarios = allScenarios

    if (location) {
      filteredScenarios = filteredScenarios.filter(s => s.location === location)
    }

    if (status) {
      filteredScenarios = filteredScenarios.filter(s => s.status === status)
    }

    // 5. Apply pagination
    const totalCount = filteredScenarios.length
    const paginatedScenarios = filteredScenarios.slice(offset, offset + limit)

    // 6. Convert to summary objects
    const scenarioSummaries = paginatedScenarios.map(createScenarioSummary)

    // 7. Build response
    const response = {
      scenarios: scenarioSummaries,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasNext: offset + limit < totalCount,
        hasPrevious: offset > 0
      },
      filters: {
        location: location || null,
        status: status || null
      },
      stats: {
        totalScenarios: totalCount,
        totalReassignments: scenarioSummaries.reduce((sum, s) => sum + s.reassignmentCount, 0),
        totalRevenueImpact: scenarioSummaries.reduce((sum, s) => sum + s.totalRevenueImpact, 0)
      }
    }

    // 8. Return with cache headers
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': `public, max-age=${CACHE_DURATION}, stale-while-revalidate=${CACHE_DURATION}`,
        'Content-Type': 'application/json',
        'X-Total-Count': totalCount.toString()
      }
    })

  } catch (error) {
    console.error('Scenarios list API error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/scenarios - Create new scenario (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication and admin check
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (session.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required for scenario creation' },
        { status: 403 }
      )
    }

    // 2. Parse and validate request body
    const requestBody = await request.json()

    // Ensure required fields are present
    if (!requestBody.id) {
      return NextResponse.json(
        { error: 'Scenario ID is required' },
        { status: 400 }
      )
    }

    // 3. Check if scenario already exists
    const exists = await scenarioExists(requestBody.id)
    if (exists) {
      return NextResponse.json(
        {
          error: 'Scenario already exists',
          scenarioId: requestBody.id,
          hint: 'Use PUT to update existing scenarios'
        },
        { status: 409 }
      )
    }

    // 4. Add creation metadata
    const newScenario = {
      ...requestBody,
      createdBy: session.user?.email || session.user?.name || 'unknown',
      createdAt: new Date().toISOString(),
      status: requestBody.status || 'draft'
    }

    // 5. Validate the complete scenario
    const validatedScenario = scenarioSchema.parse(newScenario)

    // 6. Save the new scenario
    await saveScenario(validatedScenario)

    // 7. Return success response with scenario metadata
    return NextResponse.json(
      {
        message: 'Scenario created successfully',
        scenario: {
          id: validatedScenario.id,
          name: validatedScenario.name,
          location: validatedScenario.location,
          status: validatedScenario.status,
          reassignmentCount: validatedScenario.reassignments.length,
          totalRevenueImpact: validatedScenario.reassignments.reduce((sum, r) => sum + r.revenueImpact, 0),
          createdBy: validatedScenario.createdBy,
          createdAt: validatedScenario.createdAt
        }
      },
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'X-Scenario-ID': validatedScenario.id,
          'Location': `/api/scenarios/${validatedScenario.id}`
        }
      }
    )

  } catch (error) {
    console.error('Scenario POST API error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
