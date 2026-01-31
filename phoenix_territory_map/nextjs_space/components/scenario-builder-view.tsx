'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { GoogleMap, PolygonF } from '@react-google-maps/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MapPin, RefreshCw } from 'lucide-react'
import { getLocationConfig } from '@/config/locations.config'
import { MAP_CONTAINER_STYLE, MAP_OPTIONS_MINIMAL, type LocationKey } from '@/lib/map-config'
import type { TerritoryData } from '@/lib/types'

interface ScenarioSummary {
  id: string
  name: string
  description?: string
  location: string
  status: 'draft' | 'published' | 'archived'
  createdAt: string
  createdBy: string
  reassignmentCount: number
  totalRevenueImpact: number
}

interface ScenarioReassignment {
  zipCode: string
  fromTerritory: string
  toTerritory: string
  accountCount: number
  revenueImpact: number
}

interface ScenarioDetails extends ScenarioSummary {
  baselineDataVersion: string
  reassignments: ScenarioReassignment[]
  metadata?: {
    reassignmentCount?: number
    totalRevenueImpact?: number
    totalAccountsAffected?: number
  }
}

interface ScenarioBuilderViewProps {
  location: LocationKey
  territoryData: TerritoryData[]
  userRole?: string
}

interface BaselineZipAssignment {
  zip: string
  territory: string
  accountCount: number
}

interface BoundaryGeometry {
  type: 'Polygon' | 'MultiPolygon'
  coordinates: number[][][] | number[][][][]
}

const BOUNDARY_FILES: Record<LocationKey, string> = {
  arizona: '/az-zip-boundaries.json',
  miami: '/miami-zip-boundaries.json',
  dallas: '/dallas-zip-boundaries.json',
  orlando: '/orlando-zip-boundaries.json',
  jacksonville: '/jacksonville-zip-boundaries.json',
  portCharlotte: '/portcharlotte-zip-boundaries.json',
}

const BASELINE_FALLBACK_FILES: Partial<Record<LocationKey, string>> = {
  miami: '/miami-map-data.json',
}

function normalizeBoundary(boundary: BoundaryGeometry): google.maps.LatLngLiteral[][] {
  if (!boundary?.coordinates) return []

  if (boundary.type === 'Polygon') {
    const coords = boundary.coordinates as number[][][]
    return [
      coords[0].map(([lng, lat]) => ({ lat, lng }))
    ]
  }

  const multipolygon = boundary.coordinates as number[][][][]
  return multipolygon.map(poly =>
    poly[0].map(([lng, lat]) => ({ lat, lng }))
  )
}

function formatCurrency(value: number) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export default function ScenarioBuilderView({ location, territoryData, userRole }: ScenarioBuilderViewProps) {
  const config = getLocationConfig(location)
  const territoryKeys = config.territories.map(territory => territory.key)
  const territoryColorMap = Object.fromEntries(
    config.territories.map(territory => [territory.key, territory.color])
  )

  const [baselineFallback, setBaselineFallback] = useState<BaselineZipAssignment[]>([])
  const [scenarioList, setScenarioList] = useState<ScenarioSummary[]>([])
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('new')
  const [scenarioDetails, setScenarioDetails] = useState<ScenarioDetails | null>(null)
  const [selectedZip, setSelectedZip] = useState<string | null>(null)
  const [boundaryPaths, setBoundaryPaths] = useState<Record<string, google.maps.LatLngLiteral[][]>>({})
  const [scenarioOverrides, setScenarioOverrides] = useState<Record<string, string>>({})
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(false)
  const [isLoadingBoundaries, setIsLoadingBoundaries] = useState(false)

  const canEdit = userRole === 'ADMIN'

  useEffect(() => {
    const fallbackFile = BASELINE_FALLBACK_FILES[location]
    if (!fallbackFile) {
      setBaselineFallback([])
      return
    }

    let isMounted = true
    fetch(fallbackFile)
      .then(res => res.json())
      .then((data: any[]) => {
        if (!isMounted) return
        const normalized = data.map(item => ({
          zip: String(item.zip ?? item.zipCode),
          territory: item.territory ?? item.area,
          accountCount: Number(item.accountCount ?? item.accounts ?? 0),
        }))
        setBaselineFallback(normalized)
      })
      .catch(() => {
        if (isMounted) setBaselineFallback([])
      })

    return () => {
      isMounted = false
    }
  }, [location])

  const baselineAssignments: BaselineZipAssignment[] = useMemo(() => {
    if (territoryData?.length) {
      return territoryData.map(item => ({
        zip: String(item.zip),
        territory: item.area,
        accountCount: item.accounts,
      }))
    }
    return baselineFallback
  }, [territoryData, baselineFallback])

  useEffect(() => {
    let isMounted = true
    setIsLoadingScenarios(true)
    fetch(`/api/scenarios?location=${location}`)
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return
        const scenarios = data?.scenarios ?? []
        setScenarioList(scenarios)
      })
      .catch(() => {
        if (isMounted) setScenarioList([])
      })
      .finally(() => {
        if (isMounted) setIsLoadingScenarios(false)
      })

    return () => {
      isMounted = false
    }
  }, [location])

  useEffect(() => {
    if (!scenarioList.length) {
      setSelectedScenarioId('new')
      return
    }

    if (selectedScenarioId !== 'new' && scenarioList.some(s => s.id === selectedScenarioId)) {
      return
    }

    const preferred = scenarioList.find(s => s.status === 'published') ?? scenarioList[0]
    setSelectedScenarioId(preferred?.id ?? 'new')
  }, [scenarioList, selectedScenarioId])

  useEffect(() => {
    if (!selectedScenarioId || selectedScenarioId === 'new') {
      setScenarioDetails(null)
      setScenarioOverrides({})
      return
    }

    let isMounted = true
    fetch(`/api/scenarios/${selectedScenarioId}`)
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return
        setScenarioDetails(data)
        setScenarioOverrides({})
      })
      .catch(() => {
        if (isMounted) setScenarioDetails(null)
      })

    return () => {
      isMounted = false
    }
  }, [selectedScenarioId])

  const loadBoundaries = useCallback(async () => {
    if (!baselineAssignments.length) return

    setIsLoadingBoundaries(true)
    const boundaryFile = BOUNDARY_FILES[location]

    try {
      if (location === 'arizona') {
        const response = await fetch('/api/zip-boundaries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            zipCodes: baselineAssignments.map(item => ({
              zip: Number(item.zip),
              area: item.territory,
            })),
          }),
        })

        const data = await response.json()
        const normalized: Record<string, google.maps.LatLngLiteral[][]> = {}
        ;(data?.boundaries ?? []).forEach((boundary: any) => {
          normalized[String(boundary.zipCode)] = [boundary.paths]
        })
        setBoundaryPaths(normalized)
      } else if (boundaryFile) {
        const response = await fetch(boundaryFile)
        const data = await response.json()
        const normalized: Record<string, google.maps.LatLngLiteral[][]> = {}
        Object.entries(data as Record<string, BoundaryGeometry>).forEach(([zip, boundary]) => {
          normalized[zip] = normalizeBoundary(boundary)
        })
        setBoundaryPaths(normalized)
      }
    } catch (error) {
      console.error('Failed to load boundary data:', error)
      setBoundaryPaths({})
    } finally {
      setIsLoadingBoundaries(false)
    }
  }, [baselineAssignments, location])

  useEffect(() => {
    loadBoundaries()
  }, [loadBoundaries])

  const baselineByZip = useMemo(() => {
    const map: Record<string, BaselineZipAssignment> = {}
    baselineAssignments.forEach(item => {
      map[item.zip] = item
    })
    return map
  }, [baselineAssignments])

  const effectiveReassignments = useMemo(() => {
    const map = new Map<string, ScenarioReassignment>()
    ;(scenarioDetails?.reassignments ?? []).forEach(item => {
      map.set(item.zipCode, { ...item })
    })

    Object.entries(scenarioOverrides).forEach(([zip, toTerritory]) => {
      const baseline = baselineByZip[zip]
      const existing = map.get(zip)
      const fromTerritory = baseline?.territory ?? existing?.fromTerritory ?? 'Unassigned'
      const accountCount = existing?.accountCount ?? baseline?.accountCount ?? 0
      const revenueImpact = existing?.revenueImpact ?? 0

      map.set(zip, {
        zipCode: zip,
        fromTerritory,
        toTerritory,
        accountCount,
        revenueImpact,
      })
    })

    return Array.from(map.values())
  }, [scenarioDetails, scenarioOverrides, baselineByZip])

  const assignmentByZip = useMemo(() => {
    const map: Record<string, string> = {}
    baselineAssignments.forEach(item => {
      map[item.zip] = item.territory
    })
    effectiveReassignments.forEach(item => {
      map[item.zipCode] = item.toTerritory
    })
    return map
  }, [baselineAssignments, effectiveReassignments])

  const revenueByZip = useMemo(() => {
    const map: Record<string, number> = {}
    effectiveReassignments.forEach(item => {
      map[item.zipCode] = item.revenueImpact
    })
    return map
  }, [effectiveReassignments])

  const totals = useMemo(() => {
    const baseline: Record<string, { accounts: number; revenue: number; zips: number }> = {}
    const scenario: Record<string, { accounts: number; revenue: number; zips: number }> = {}

    baselineAssignments.forEach(item => {
      const territory = item.territory
      if (!baseline[territory]) baseline[territory] = { accounts: 0, revenue: 0, zips: 0 }
      baseline[territory].accounts += item.accountCount
      baseline[territory].revenue += revenueByZip[item.zip] ?? 0
      baseline[territory].zips += 1

      const scenarioTerritory = assignmentByZip[item.zip] ?? territory
      if (!scenario[scenarioTerritory]) scenario[scenarioTerritory] = { accounts: 0, revenue: 0, zips: 0 }
      scenario[scenarioTerritory].accounts += item.accountCount
      scenario[scenarioTerritory].revenue += revenueByZip[item.zip] ?? 0
      scenario[scenarioTerritory].zips += 1
    })

    const delta: Record<string, { accounts: number; revenue: number; zips: number }> = {}
    territoryKeys.forEach(key => {
      const base = baseline[key] ?? { accounts: 0, revenue: 0, zips: 0 }
      const scen = scenario[key] ?? { accounts: 0, revenue: 0, zips: 0 }
      delta[key] = {
        accounts: scen.accounts - base.accounts,
        revenue: scen.revenue - base.revenue,
        zips: scen.zips - base.zips,
      }
    })

    return { baseline, scenario, delta }
  }, [baselineAssignments, assignmentByZip, revenueByZip, territoryKeys])

  const selectedZipDetails = selectedZip ? baselineByZip[selectedZip] : null
  const selectedZipAssignment = selectedZip ? assignmentByZip[selectedZip] : null
  const selectedReassignment = selectedZip
    ? effectiveReassignments.find(item => item.zipCode === selectedZip)
    : null

  const totalAccountsImpacted = effectiveReassignments.reduce((sum, item) => sum + item.accountCount, 0)
  const totalRevenueImpact = effectiveReassignments.reduce((sum, item) => sum + item.revenueImpact, 0)

  const handleTerritorySelect = (zip: string, territory: string) => {
    const baselineTerritory = baselineByZip[zip]?.territory
    if (baselineTerritory === territory) {
      setScenarioOverrides(prev => {
        const next = { ...prev }
        delete next[zip]
        return next
      })
      return
    }

    setScenarioOverrides(prev => ({
      ...prev,
      [zip]: territory,
    }))
  }

  const resetOverrides = () => {
    setScenarioOverrides({})
  }

  return (
    <div className="space-y-4">
      <Card className="bg-white/90 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Scenario Builder</h2>
              <p className="text-sm text-muted-foreground">
                Build reassignment scenarios and inspect territory impact.
              </p>
            </div>
            <Badge variant="secondary" className="self-start md:self-auto">
              {config.label}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
            <Select value={selectedScenarioId} onValueChange={setSelectedScenarioId} disabled={isLoadingScenarios}>
              <SelectTrigger>
                <SelectValue placeholder="Select a scenario" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New Scenario (Draft)</SelectItem>
                {scenarioList.map(scenario => (
                  <SelectItem key={scenario.id} value={scenario.id}>
                    {scenario.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              {scenarioDetails?.status && (
                <Badge variant={scenarioDetails.status === 'published' ? 'default' : 'secondary'}>
                  {scenarioDetails.status}
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={resetOverrides} disabled={!canEdit || !Object.keys(scenarioOverrides).length}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset Changes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
        <Card className="bg-white">
          <CardContent className="p-2">
            {isLoadingBoundaries ? (
              <div className="flex items-center justify-center h-[600px] text-sm text-muted-foreground">
                Loading ZIP boundaries...
              </div>
            ) : (
              <GoogleMap
                mapContainerStyle={MAP_CONTAINER_STYLE}
                center={config.center}
                zoom={config.zoom}
                options={MAP_OPTIONS_MINIMAL}
              >
                {baselineAssignments.map(item => {
                  const paths = boundaryPaths[item.zip]
                  if (!paths?.length) return null
                  const territory = assignmentByZip[item.zip] ?? item.territory
                  const fillColor = territoryColorMap[territory] ?? '#94a3b8'
                  const isSelected = selectedZip === item.zip

                  return (
                    <PolygonF
                      key={item.zip}
                      paths={paths}
                      options={{
                        fillColor,
                        fillOpacity: isSelected ? 0.7 : 0.45,
                        strokeColor: isSelected ? '#0f172a' : fillColor,
                        strokeOpacity: 0.9,
                        strokeWeight: isSelected ? 3 : 1.5,
                      }}
                      onClick={() => setSelectedZip(item.zip)}
                    />
                  )
                })}

              </GoogleMap>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {!baselineAssignments.length && (
            <Alert>
              <MapPin className="h-4 w-4" />
              <AlertDescription>
                Baseline territory data is missing for this location. Upload territory data to enable scenario editing.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Impact Summary</h3>
                <Badge variant="secondary">
                  {effectiveReassignments.length} reassignments
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-muted-foreground">Accounts Impacted</p>
                  <p className="text-lg font-semibold">{totalAccountsImpacted.toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-muted-foreground">Revenue Impact</p>
                  <p className="text-lg font-semibold">{formatCurrency(totalRevenueImpact)}</p>
                </div>
              </div>

              <div className="space-y-2">
                {territoryKeys.map(key => {
                  const baseline = totals.baseline[key] ?? { accounts: 0, revenue: 0 }
                  const scenario = totals.scenario[key] ?? { accounts: 0, revenue: 0 }
                  const delta = totals.delta[key] ?? { accounts: 0, revenue: 0 }

                  return (
                    <div key={key} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: territoryColorMap[key] ?? '#94a3b8' }}
                          />
                          <span className="text-sm font-medium">{key}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {delta.accounts >= 0 ? '+' : ''}{delta.accounts} accounts
                        </Badge>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Baseline: {baseline.accounts} → Scenario: {scenario.accounts}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-semibold">Selected ZIP</h3>
              {selectedZipDetails ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium">ZIP {selectedZipDetails.zip}</div>
                  <div className="text-xs text-muted-foreground">
                    Baseline territory: {selectedZipDetails.territory}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Current assignment: {selectedZipAssignment ?? 'Unassigned'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Accounts: {selectedZipDetails.accountCount}
                  </div>
                  {selectedReassignment?.revenueImpact ? (
                    <div className="text-xs text-muted-foreground">
                      Revenue impact: {formatCurrency(selectedReassignment.revenueImpact)}
                    </div>
                  ) : null}

                  <Select
                    value={selectedZipAssignment ?? selectedZipDetails.territory}
                    onValueChange={(value) => handleTerritorySelect(selectedZipDetails.zip, value)}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Assign territory" />
                    </SelectTrigger>
                    <SelectContent>
                      {territoryKeys.map(key => (
                        <SelectItem key={key} value={key}>
                          {key}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {!canEdit && (
                    <p className="text-xs text-muted-foreground">
                      Admin access required to modify assignments.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Select a ZIP polygon to view or edit assignment.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
