"use client";

import { GoogleMap, PolygonF, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, ArrowRight, RefreshCw, Users, MapPin, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ZipChange {
  zip: string;
  city: string;
  originalTerritory: string;
  newTerritory: string;
  customerCount: number;
}

interface ScenarioData {
  scenario: string;
  zipChanges: ZipChange[];
  summary: {
    tolerance: string;
    totalConflicts: number;
    autoReassigned: number;
    manualRequired: number;
    cleanRoutesAfter: number;
    totalRoutes: number;
  };
  routeChanges: RouteChange[];
  autoReassignments: AutoReassignment[];
  manualReassignments: ManualReassignment[];
  territoryStats: {
    North: number;
    Central: number;
    South: number;
  };
}

interface RouteChange {
  route: string;
  technician: string;
  primaryTerritory: string;
  before: number;
  after: number;
  change: number;
  percentChange: number;
  minAllowed: number;
  maxAllowed: number;
  incomingCount: number;
  outgoingCount: number;
}

interface AutoReassignment {
  customerNumber: string;
  accountName: string;
  address: string;
  city: string;
  zip: string;
  territory: string;
  oldRoute: string;
  oldTechnician?: string;
  newRoute: string;
  newTechnician?: string;
  latitude: number | null;
  longitude: number | null;
}

interface ManualReassignment {
  customerNumber: string;
  accountName: string;
  address: string;
  city: string;
  zip: string;
  currentRoute: string;
  currentTerritory: string;
  routePrimaryTerritory: string;
  latitude: number | null;
  longitude: number | null;
  reason: string;
}

interface ZipAssignment {
  zip: string;
  territory: string;
  accountCount: number;
  city: string;
  latitude: number;
  longitude: number;
}

interface MiamiZipOptimizedViewProps {
  areaFilter: {
    North: boolean;
    Central: boolean;
    South: boolean;
  };
}

const mapContainerStyle = {
  width: '100%',
  height: '550px',
};

const mapOptions = {
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
  ],
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
};

function getTerritoryColor(territory: string, opacity: number = 0.5): string {
  const colors: Record<string, string> = {
    North: `rgba(59, 130, 246, ${opacity})`,
    Central: `rgba(16, 185, 129, ${opacity})`,
    South: `rgba(245, 158, 11, ${opacity})`,
  };
  return colors[territory] || `rgba(107, 114, 128, ${opacity})`;
}

function getTerritoryBorderColor(territory: string): string {
  const colors: Record<string, string> = {
    North: '#2563eb',
    Central: '#059669',
    South: '#d97706',
  };
  return colors[territory] || '#6b7280';
}

type SortColumn = 'technician' | 'primaryTerritory' | 'before' | 'after' | 'change' | 'percentChange' | 'incomingCount' | 'outgoingCount';
type SortDirection = 'asc' | 'desc';

export function MiamiZipOptimizedView({ areaFilter }: MiamiZipOptimizedViewProps) {
  const [scenarioData, setScenarioData] = useState<ScenarioData | null>(null);
  const [zipAssignments, setZipAssignments] = useState<ZipAssignment[]>([]);
  const [boundaries, setBoundaries] = useState<{ [key: string]: any }>({});
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['comparison']));
  const [sortColumn, setSortColumn] = useState<SortColumn>('change');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const mapRef = useRef<google.maps.Map | null>(null);

  const center = { lat: 25.85, lng: -80.19 };

  useEffect(() => {
    Promise.all([
      fetch('/miami-zip-optimized-scenario.json').then(r => r.json()),
      fetch('/miami-zip-optimized-assignments.json').then(r => r.json()),
      fetch('/miami-zip-boundaries.json').then(r => r.json()),
    ]).then(([scenario, zipData, boundaryData]) => {
      setScenarioData(scenario);
      setZipAssignments(zipData);
      setBoundaries(boundaryData);
    });
  }, []);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const getSortedRouteChanges = () => {
    if (!scenarioData) return [];
    return [...scenarioData.routeChanges].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      
      switch (sortColumn) {
        case 'technician':
          aVal = a.technician.toLowerCase();
          bVal = b.technician.toLowerCase();
          break;
        case 'primaryTerritory':
          aVal = a.primaryTerritory;
          bVal = b.primaryTerritory;
          break;
        case 'before':
          aVal = a.before;
          bVal = b.before;
          break;
        case 'after':
          aVal = a.after;
          bVal = b.after;
          break;
        case 'change':
          aVal = a.change;
          bVal = b.change;
          break;
        case 'percentChange':
          aVal = a.percentChange;
          bVal = b.percentChange;
          break;
        case 'incomingCount':
          aVal = a.incomingCount;
          bVal = b.incomingCount;
          break;
        case 'outgoingCount':
          aVal = a.outgoingCount;
          bVal = b.outgoingCount;
          break;
        default:
          aVal = a.change;
          bVal = b.change;
      }
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      return sortDirection === 'asc' 
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const exportCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const val = row[h];
        if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val ?? '';
      }).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  if (!scenarioData) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p>Loading ZIP-optimized scenario...</p>
        </CardContent>
      </Card>
    );
  }

  const filteredZips = zipAssignments.filter(z => areaFilter[z.territory as keyof typeof areaFilter]);
  const changedZips = new Set(scenarioData.zipChanges.map(z => z.zip));

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-200">
        <CardContent className="p-4">
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            ZIP-OPTIMIZED SCENARIO
          </h2>
          <p className="text-sm text-slate-600">
            This scenario reassigns 4 ZIP codes to better match existing route patterns, dramatically reducing conflicts.
          </p>
        </CardContent>
      </Card>

      {/* Comparison Card */}
      <Card className="border-2 border-teal-300">
        <CardContent className="p-4">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('comparison')}
          >
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-teal-600" />
              Scenario Comparison
            </h3>
            {expandedSections.has('comparison') ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
          
          {expandedSections.has('comparison') && (
            <div className="mt-4">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Original 10%</p>
                  <p className="text-2xl font-bold text-slate-700">42</p>
                  <p className="text-xs text-muted-foreground">Manual Decisions</p>
                </div>
                <div className="text-center p-4 bg-teal-50 rounded-lg border-2 border-teal-300">
                  <p className="text-sm text-teal-600 font-medium">ZIP-Optimized</p>
                  <p className="text-2xl font-bold text-teal-700">{scenarioData.summary.manualRequired}</p>
                  <p className="text-xs text-muted-foreground">Manual Decisions</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Improvement</p>
                  <p className="text-2xl font-bold text-green-700">-{42 - scenarioData.summary.manualRequired}</p>
                  <p className="text-xs text-muted-foreground">Fewer Decisions</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium">Original Scenario</p>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    <li>• Auto-reassigned: 91</li>
                    <li>• Manual decisions: 42</li>
                    <li>• Clean routes: 12 of 17</li>
                  </ul>
                </div>
                <div className="p-3 bg-teal-50 rounded-lg border border-teal-200">
                  <p className="text-sm font-medium text-teal-700">ZIP-Optimized</p>
                  <ul className="text-sm text-teal-600 mt-2 space-y-1">
                    <li>• Auto-reassigned: {scenarioData.summary.autoReassigned}</li>
                    <li>• Manual decisions: {scenarioData.summary.manualRequired}</li>
                    <li>• Clean routes: {scenarioData.summary.cleanRoutesAfter} of {scenarioData.summary.totalRoutes}</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ZIP Changes Card */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-teal-600" />
            ZIP Code Reassignments ({scenarioData.zipChanges.length} changes)
          </h3>
          <div className="space-y-3">
            {scenarioData.zipChanges.map(z => (
              <div key={z.zip} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium">{z.zip} - {z.city}</p>
                  <p className="text-sm text-muted-foreground">{z.customerCount} customers</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline"
                    style={{
                      backgroundColor: getTerritoryColor(z.originalTerritory, 0.2),
                      borderColor: getTerritoryBorderColor(z.originalTerritory),
                      color: getTerritoryBorderColor(z.originalTerritory),
                    }}
                  >
                    {z.originalTerritory}
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Badge 
                    variant="outline"
                    style={{
                      backgroundColor: getTerritoryColor(z.newTerritory, 0.2),
                      borderColor: getTerritoryBorderColor(z.newTerritory),
                      color: getTerritoryBorderColor(z.newTerritory),
                    }}
                  >
                    {z.newTerritory}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            These ZIPs are already primarily served by routes from the suggested territory.
          </p>
        </CardContent>
      </Card>

      {/* New Territory Distribution */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold mb-3">New Territory Distribution</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg" style={{ backgroundColor: getTerritoryColor('North', 0.15) }}>
              <p className="text-sm font-medium" style={{ color: getTerritoryBorderColor('North') }}>North</p>
              <p className="text-2xl font-bold">{scenarioData.territoryStats.North}</p>
              <p className="text-xs text-muted-foreground">customers</p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: getTerritoryColor('Central', 0.15) }}>
              <p className="text-sm font-medium" style={{ color: getTerritoryBorderColor('Central') }}>Central</p>
              <p className="text-2xl font-bold">{scenarioData.territoryStats.Central}</p>
              <p className="text-xs text-muted-foreground">customers</p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: getTerritoryColor('South', 0.15) }}>
              <p className="text-sm font-medium" style={{ color: getTerritoryBorderColor('South') }}>South</p>
              <p className="text-2xl font-bold">{scenarioData.territoryStats.South}</p>
              <p className="text-xs text-muted-foreground">customers</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold mb-3">ZIP-Optimized Territory Map</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Changed ZIPs are highlighted with dashed borders
          </p>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={10}
            options={mapOptions}
            onLoad={onMapLoad}
          >
            {filteredZips.map((zip) => {
              const boundary = boundaries[zip.zip];
              if (!boundary?.geometry?.coordinates) return null;
              
              const isChanged = changedZips.has(zip.zip);
              const paths = boundary.geometry.coordinates[0].map((coord: number[]) => ({
                lat: coord[1],
                lng: coord[0],
              }));
              
              return (
                <PolygonF
                  key={zip.zip}
                  paths={paths}
                  options={{
                    fillColor: getTerritoryColor(zip.territory, 0.4),
                    fillOpacity: isChanged ? 0.6 : 0.4,
                    strokeColor: isChanged ? '#0f766e' : getTerritoryBorderColor(zip.territory),
                    strokeOpacity: 1,
                    strokeWeight: isChanged ? 3 : 1,
                  }}
                  onClick={() => setSelectedMarker(zip.zip)}
                />
              );
            })}
            
            {/* Changed ZIP markers */}
            {scenarioData.zipChanges.map(z => {
              const zipData = zipAssignments.find(za => za.zip === z.zip);
              if (!zipData) return null;
              
              return (
                <MarkerF
                  key={`marker-${z.zip}`}
                  position={{ lat: zipData.latitude, lng: zipData.longitude }}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 12,
                    fillColor: '#0d9488',
                    fillOpacity: 1,
                    strokeColor: '#fff',
                    strokeWeight: 3,
                  }}
                  onClick={() => setSelectedMarker(z.zip)}
                />
              );
            })}
            
            {selectedMarker && (
              <InfoWindowF
                position={(() => {
                  const zip = zipAssignments.find(z => z.zip === selectedMarker);
                  return zip ? { lat: zip.latitude, lng: zip.longitude } : center;
                })()}
                onCloseClick={() => setSelectedMarker(null)}
              >
                <div className="p-2">
                  {(() => {
                    const zip = zipAssignments.find(z => z.zip === selectedMarker);
                    const change = scenarioData.zipChanges.find(c => c.zip === selectedMarker);
                    if (!zip) return null;
                    return (
                      <>
                        <p className="font-bold">{zip.zip}</p>
                        <p className="text-sm">{zip.city}</p>
                        <p className="text-sm">Territory: {zip.territory}</p>
                        <p className="text-sm">{zip.accountCount} customers</p>
                        {change && (
                          <p className="text-sm text-teal-600 font-medium mt-1">
                            ★ Changed from {change.originalTerritory}
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
              </InfoWindowF>
            )}
          </GoogleMap>
        </CardContent>
      </Card>

      {/* Technician Pool Count Changes */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Technician Pool Count Changes
          </h3>
          <p className="text-xs text-muted-foreground mb-3">Click column headers to sort</p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-slate-100 select-none"
                    onClick={() => handleSort('technician')}
                  >
                    <div className="flex items-center">
                      Route / Technician
                      <SortIcon column="technician" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center cursor-pointer hover:bg-slate-100 select-none"
                    onClick={() => handleSort('primaryTerritory')}
                  >
                    <div className="flex items-center justify-center">
                      Primary
                      <SortIcon column="primaryTerritory" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-slate-100 select-none"
                    onClick={() => handleSort('before')}
                  >
                    <div className="flex items-center justify-end">
                      Before
                      <SortIcon column="before" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-slate-100 select-none"
                    onClick={() => handleSort('after')}
                  >
                    <div className="flex items-center justify-end">
                      After
                      <SortIcon column="after" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-slate-100 select-none"
                    onClick={() => handleSort('change')}
                  >
                    <div className="flex items-center justify-end">
                      Change
                      <SortIcon column="change" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-slate-100 select-none"
                    onClick={() => handleSort('percentChange')}
                  >
                    <div className="flex items-center justify-end">
                      % Change
                      <SortIcon column="percentChange" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center cursor-pointer hover:bg-slate-100 select-none"
                    onClick={() => handleSort('incomingCount')}
                  >
                    <div className="flex items-center justify-center">
                      Incoming
                      <SortIcon column="incomingCount" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center cursor-pointer hover:bg-slate-100 select-none"
                    onClick={() => handleSort('outgoingCount')}
                  >
                    <div className="flex items-center justify-center">
                      Outgoing
                      <SortIcon column="outgoingCount" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getSortedRouteChanges().map((rc) => (
                  <TableRow key={rc.route} className={rc.change !== 0 ? 'bg-yellow-50/50' : ''}>
                    <TableCell className="font-medium">
                      <div>
                        <p className="text-sm">{rc.technician}</p>
                        <p className="text-xs text-muted-foreground">{rc.route}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant="outline"
                        style={{
                          backgroundColor: getTerritoryColor(rc.primaryTerritory, 0.2),
                          borderColor: getTerritoryBorderColor(rc.primaryTerritory),
                          color: getTerritoryBorderColor(rc.primaryTerritory),
                        }}
                      >
                        {rc.primaryTerritory}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{rc.before}</TableCell>
                    <TableCell className="text-right font-semibold">{rc.after}</TableCell>
                    <TableCell className="text-right">
                      <span className={`font-semibold ${
                        rc.change > 0 ? 'text-green-600' : 
                        rc.change < 0 ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {rc.change > 0 ? '+' : ''}{rc.change}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`${
                        Math.abs(rc.percentChange) > 10 ? 'text-amber-600 font-semibold' : 'text-gray-500'
                      }`}>
                        {rc.percentChange > 0 ? '+' : ''}{rc.percentChange}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {rc.incomingCount > 0 && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                          +{rc.incomingCount}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {rc.outgoingCount > 0 && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                          -{rc.outgoingCount}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Manual Reassignments */}
      {scenarioData.summary.manualRequired > 0 && (
        <Card>
          <CardContent className="p-4">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => toggleSection('manual')}
            >
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Remaining Manual Decisions ({scenarioData.summary.manualRequired})
              </h3>
              {expandedSections.has('manual') ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              These customers still need manual review even with ZIP optimization.
            </p>
            
            {expandedSections.has('manual') && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportCSV(scenarioData.manualReassignments, 'zip-optimized-manual-decisions.csv')}
                  className="mb-3"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Manual Decisions
                </Button>
                <div className="max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Current Route</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scenarioData.manualReassignments.map((mr) => (
                        <TableRow key={mr.customerNumber}>
                          <TableCell>
                            <p className="font-medium text-sm">{mr.accountName}</p>
                            <p className="text-xs text-muted-foreground">{mr.customerNumber}</p>
                          </TableCell>
                          <TableCell className="text-sm">
                            {mr.address}, {mr.city} {mr.zip}
                          </TableCell>
                          <TableCell className="text-sm">{mr.currentRoute}</TableCell>
                          <TableCell className="text-sm text-amber-600">{mr.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Auto-Reassignments Detail */}
      <Card>
        <CardContent className="p-4">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('autoDetail')}
          >
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Auto-Reassignment Details ({scenarioData.summary.autoReassigned} customers)
            </h3>
            {expandedSections.has('autoDetail') ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Full list of customers being moved from one technician to another.
          </p>
          
          {expandedSections.has('autoDetail') && (
            <div className="mt-4">
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Territory</TableHead>
                      <TableHead>From Technician</TableHead>
                      <TableHead>To Technician</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scenarioData.autoReassignments.map((ar) => (
                      <TableRow key={ar.customerNumber}>
                        <TableCell>
                          <p className="font-medium text-sm">{ar.accountName}</p>
                          <p className="text-xs text-muted-foreground">{ar.customerNumber}</p>
                        </TableCell>
                        <TableCell className="text-sm">
                          {ar.address}, {ar.city} {ar.zip}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            style={{
                              backgroundColor: getTerritoryColor(ar.territory, 0.2),
                              borderColor: getTerritoryBorderColor(ar.territory),
                              color: getTerritoryBorderColor(ar.territory),
                            }}
                          >
                            {ar.territory}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="text-red-600">{ar.oldTechnician || ar.oldRoute}</span>
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="text-green-600 font-medium">{ar.newTechnician || ar.newRoute}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold mb-3">Export Data</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCSV(scenarioData.autoReassignments, 'zip-optimized-auto-reassignments.csv')}
            >
              <Download className="h-4 w-4 mr-2" />
              Auto-Reassignments ({scenarioData.summary.autoReassigned})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCSV(scenarioData.zipChanges, 'zip-changes.csv')}
            >
              <Download className="h-4 w-4 mr-2" />
              ZIP Changes ({scenarioData.zipChanges.length})
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
