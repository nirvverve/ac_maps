/**
 * GET /api/scenarios/[id] - Get specific scenario by ID
 * PUT /api/scenarios/[id] - Update scenario (admin only)
 * DELETE /api/scenarios/[id] - Delete scenario (admin only)
 *
 * Dynamic route for scenario-specific operations with proper authentication
 * and authorization. GET is public (authenticated), PUT/DELETE require admin.
 *
 * bd-2ga
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDataStore } from '@/lib/datastore'
import { scenarioSchema, type Scenario } from '@/lib/validation-schemas'
import { z } from 'zod'

interface RouteParams {
  id: string
}

// Cache duration for individual scenarios (10 minutes)
const CACHE_DURATION = 600

/**
 * Load a specific scenario by ID from DataStore or static files
 */
async function loadScenarioById(scenarioId: string): Promise<Scenario | null> {
  try {
    const store = await getDataStore()
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

      try {
        const content = await fs.readFile(filePath, 'utf8')
        scenarioData = JSON.parse(content)
      } catch (fileError) {
        console.warn(`Scenario file not found: ${filePath}`)
        return null
      }
    }

    if (scenarioData) {
      // Validate and return scenario
      return scenarioSchema.parse(scenarioData)
    }

    return null
  } catch (error) {
    console.error(`Failed to load scenario ${scenarioId}:`, error)
    return null
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

    console.log(`Scenario saved: ${scenario.id}`)
  } catch (error) {
    console.error(`Failed to save scenario ${scenario.id}:`, error)
    throw error
  }
}

/**
 * Delete scenario from both DataStore and static files
 */
async function deleteScenario(scenarioId: string): Promise<void> {
  try {
    const store = await getDataStore()
    const key = `scenarios/${scenarioId}.json`

    // Delete from DataStore
    try {
      await store.delete(key)
    } catch (error) {
      console.warn(`DataStore delete failed for ${scenarioId}:`, error)
    }

    // Delete static file
    try {
      const fs = require('fs').promises
      const path = require('path')
      const filePath = path.join(process.cwd(), 'public', key)
      await fs.unlink(filePath)
    } catch (error) {
      console.warn(`Static file delete failed for ${scenarioId}:`, error)
    }

    console.log(`Scenario deleted: ${scenarioId}`)
  } catch (error) {
    console.error(`Failed to delete scenario ${scenarioId}:`, error)
    throw error
  }
}

/**
 * GET /api/scenarios/[id] - Retrieve specific scenario
 */
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // 2. Validate scenario ID
    const { id } = params
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Valid scenario ID is required' },
        { status: 400 }
      )
    }

    // 3. Load scenario
    const scenario = await loadScenarioById(id)
    if (!scenario) {
      return NextResponse.json(
        {
          error: 'Scenario not found',
          scenarioId: id,
          hint: 'Check if the scenario ID is correct'
        },
        { status: 404 }
      )
    }

    // 4. Calculate additional metrics
    const enhancedScenario = {
      ...scenario,
      metadata: {
        reassignmentCount: scenario.reassignments.length,
        totalRevenueImpact: scenario.reassignments.reduce((sum, r) => sum + r.revenueImpact, 0),
        totalAccountsAffected: scenario.reassignments.reduce((sum, r) => sum + r.accountCount, 0),
        uniqueZipCodes: new Set(scenario.reassignments.map(r => r.zipCode)).size,
        territoriesInvolved: {
          from: [...new Set(scenario.reassignments.map(r => r.fromTerritory))],
          to: [...new Set(scenario.reassignments.map(r => r.toTerritory))]
        }
      }
    }

    // 5. Return with cache headers
    return NextResponse.json(enhancedScenario, {
      status: 200,
      headers: {
        'Cache-Control': `public, max-age=${CACHE_DURATION}, stale-while-revalidate=${CACHE_DURATION}`,
        'Content-Type': 'application/json',
        'X-Scenario-ID': id,
        'X-Reassignment-Count': scenario.reassignments.length.toString()
      }
    })

  } catch (error) {
    console.error('Scenario GET API error:', error)

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
 * PUT /api/scenarios/[id] - Update existing scenario (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    // 1. Authentication and admin check
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if ((session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required for scenario updates' },
        { status: 403 }
      )
    }

    // 2. Validate scenario ID
    const { id } = params
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Valid scenario ID is required' },
        { status: 400 }
      )
    }

    // 3. Check if scenario exists
    const existingScenario = await loadScenarioById(id)
    if (!existingScenario) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      )
    }

    // 4. Parse and validate request body
    const requestBody = await request.json()

    // Ensure ID consistency
    if (requestBody.id && requestBody.id !== id) {
      return NextResponse.json(
        { error: 'Scenario ID in URL and body must match' },
        { status: 400 }
      )
    }

    // Merge with existing data and validate
    const updatedScenario = scenarioSchema.parse({
      ...existingScenario,
      ...requestBody,
      id, // Ensure ID consistency
      updatedAt: new Date().toISOString() // Add update timestamp
    })

    // 5. Save updated scenario
    await saveScenario(updatedScenario)

    return NextResponse.json(
      {
        message: 'Scenario updated successfully',
        scenarioId: id,
        updatedFields: Object.keys(requestBody)
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Scenario PUT API error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors
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

/**
 * DELETE /api/scenarios/[id] - Delete scenario (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    // 1. Authentication and admin check
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if ((session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required for scenario deletion' },
        { status: 403 }
      )
    }

    // 2. Validate scenario ID
    const { id } = params
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Valid scenario ID is required' },
        { status: 400 }
      )
    }

    // 3. Check if scenario exists
    const existingScenario = await loadScenarioById(id)
    if (!existingScenario) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      )
    }

    // 4. Delete scenario
    await deleteScenario(id)

    return NextResponse.json(
      {
        message: 'Scenario deleted successfully',
        scenarioId: id,
        deletedScenario: {
          name: existingScenario.name,
          location: existingScenario.location,
          reassignmentCount: existingScenario.reassignments.length
        }
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Scenario DELETE API error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
