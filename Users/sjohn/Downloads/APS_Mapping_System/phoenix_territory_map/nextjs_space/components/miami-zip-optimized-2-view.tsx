"use client";

import { GoogleMap, PolygonF, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, ArrowRight, RefreshCw, Users, MapPin, ArrowUpDown, ArrowUp, ArrowDown, Eye, EyeOff, UserPlus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

interface MiamiCustomer {
  customerNumber: string;
  accountName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
  routeTech: string;
  territory: string;
  dayOfService: string;
}

interface MiamiZipOptimized2ViewProps {
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

// Get distinct colors for each route
function getRouteColor(routeIndex: number): string {
  const colors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
    '#d946ef', '#ec4899', '#f43f5e', '#78716c', '#0ea5e9',
    '#84cc16', '#10b981'
  ];
  return colors[routeIndex % colors.length];
}

type SortColumn = 'technician' | 'primaryTerritory' | 'before' | 'after' | 'change' | 'percentChange' | 'incomingCount' | 'outgoingCount';
type SortDirection = 'asc' | 'desc';

export function MiamiZipOptimized2View({ areaFilter }: MiamiZipOptimized2ViewProps) {
  const [scenarioData, setScenarioData] = useState<ScenarioData | null>(null);
  const [zipAssignments, setZipAssignments] = useState<ZipAssignment[]>([]);
  const [boundaries, setBoundaries] = useState<{ [key: string]: any }>({});
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['comparison', 'manual']));
  const [sortColumn, setSortColumn] = useState<SortColumn>('change');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const mapRef = useRef<google.maps.Map | null>(null);
  
  // New state for interactive features
  const [miamiCustomers, setMiamiCustomers] = useState<MiamiCustomer[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState<string | null>(null);
  const [selectedPool, setSelectedPool] = useState<ManualReassignment | null>(null);
  const [showTerritoryStops, setShowTerritoryStops] = useState(false);
  const [manualAssignments, setManualAssignments] = useState<Record<string, string>>({}); // customerNumber -> route

  const center = { lat: 25.85, lng: -80.19 };

  useEffect(() => {
    Promise.all([
      fetch('/miami-zip-optimized-2-scenario.json').then(r => r.json()),
      fetch('/miami-zip-optimized-2-assignments.json').then(r => r.json()),
      fetch('/miami-zip-boundaries.json').then(r => r.json()),
      fetch('/miami-route-assignments.json').then(r => r.json()),
    ]).then(([scenario, zipData, boundaryData, customerData]) => {
      setScenarioData(scenario);
      setZipAssignments(zipData);
      setBoundaries(boundaryData);
      setMiamiCustomers(customerData);
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

  // Calculate route changes with manual assignments applied
  const adjustedRouteChanges = useMemo(() => {
    if (!scenarioData) return [];
    
    // Count manual assignments per route
    const manualCounts: Record<string, number> = {};
    Object.values(manualAssignments).forEach(route => {
      manualCounts[route] = (manualCounts[route] || 0) + 1;
    });
    
    return scenarioData.routeChanges.map(rc => ({
      ...rc,
      manualIncoming: manualCounts[rc.route] || 0,
      adjustedAfter: rc.after + (manualCounts[rc.route] || 0),
    }));
  }, [scenarioData, manualAssignments]);

  const getSortedRouteChanges = () => {
    if (!adjustedRouteChanges.length) return [];
    return [...adjustedRouteChanges].sort((a, b) => {
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
          aVal = a.adjustedAfter;
          bVal = b.adjustedAfter;
          break;
        case 'change':
          aVal = a.adjustedAfter - a.before;
          bVal = b.adjustedAfter - b.before;
          break;
        case 'percentChange':
          aVal = a.percentChange;
          bVal = b.percentChange;
          break;
        case 'incomingCount':
          aVal = a.incomingCount + a.manualIncoming;
          bVal = b.incomingCount + b.manualIncoming;
          break;
        case 'outgoingCount':
          aVal = a.outgoingCount;
          bVal = b.outgoingCount;
          break;
        default:
          aVal = a.adjustedAfter - a.before;
          bVal = b.adjustedAfter - b.before;
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

  // Get customers for selected technician's route
  const technicianStops = useMemo(() => {
    if (!selectedTechnician || !miamiCustomers.length) return [];
    return miamiCustomers.filter(c => c.routeTech === selectedTechnician);
  }, [selectedTechnician, miamiCustomers]);

  // Get territory stops for selected pool's territory
  const territoryStops = useMemo(() => {
    if (!selectedPool || !showTerritoryStops || !miamiCustomers.length || !scenarioData) return [];
    
    // Find routes in the same territory as the selected pool
    const poolTerritory = selectedPool.currentTerritory;
    const routesInTerritory = scenarioData.routeChanges
      .filter(rc => rc.primaryTerritory === poolTerritory)
      .map(rc => rc.route);
    
    return miamiCustomers.filter(c => routesInTerritory.includes(c.routeTech));
  }, [selectedPool, showTerritoryStops, miamiCustomers, scenarioData]);

  // Get remaining manual decisions (excluding already assigned ones)
  const remainingManualDecisions = useMemo(() => {
    if (!scenarioData) return [];
    return scenarioData.manualReassignments.filter(
      mr => !manualAssignments[mr.customerNumber]
    );
  }, [scenarioData, manualAssignments]);

  // Handle reassignment of a pool
  const handleReassignment = (customerNumber: string, route: string) => {
    if (route === 'undecided') {
      setManualAssignments(prev => {
        const next = { ...prev };
        delete next[customerNumber];
        return next;
      });
    } else {
      setManualAssignments(prev => ({
        ...prev,
        [customerNumber]: route
      }));
    }
  };

  // Handle technician click
  const handleTechnicianClick = (route: string) => {
    if (selectedTechnician === route) {
      setSelectedTechnician(null);
    } else {
      setSelectedTechnician(route);
      setSelectedPool(null);
      setShowTerritoryStops(false);
    }
  };

  // Handle pool click
  const handlePoolClick = (pool: ManualReassignment) => {
    if (selectedPool?.customerNumber === pool.customerNumber) {
      setSelectedPool(null);
      setShowTerritoryStops(false);
    } else {
      setSelectedPool(pool);
      setSelectedTechnician(null);
      // Center map on pool
      if (mapRef.current && pool.latitude && pool.longitude) {
        mapRef.current.panTo({ lat: pool.latitude, lng: pool.longitude });
        mapRef.current.setZoom(13);
      }
    }
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
  const assignedCount = Object.keys(manualAssignments).length;
  const remainingCount = remainingManualDecisions.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-gradient-to-r from-teal-50 to-cyan-50 border-cyan-200">
        <CardContent className="p-4">
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            ZIP-OPTIMIZED #2 SCENARIO
          </h2>
          <p className="text-sm text-slate-600">
            This scenario reassigns only 1 ZIP code (33137) to better match existing route patterns, dramatically reducing conflicts.
          </p>
        </CardContent>
      </Card>

      {/* Comparison Card */}
      <Card className="border-2 border-cyan-300">
        <CardContent className="p-4">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('comparison')}
          >
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-cyan-600" />
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
                <div className="text-center p-4 bg-cyan-50 rounded-lg border-2 border-cyan-300">
                  <p className="text-sm text-cyan-600 font-medium">ZIP-Optimized</p>
                  <p className="text-2xl font-bold text-cyan-700">{scenarioData.summary.manualRequired}</p>
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
                <div className="p-3 bg-cyan-50 rounded-lg border border-cyan-200">
                  <p className="text-sm font-medium text-cyan-700">ZIP-Optimized</p>
                  <ul className="text-sm text-cyan-600 mt-2 space-y-1">
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
            <MapPin className="h-5 w-5 text-cyan-600" />
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
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">
              {selectedTechnician 
                ? `Showing ${technicianStops.length} stops for ${selectedTechnician.split(' Route ')[1] || selectedTechnician}`
                : selectedPool 
                ? `Viewing pool: ${selectedPool.accountName}`
                : 'Changed ZIPs are highlighted with dashed borders. Click technician rows to view routes.'}
            </p>
            {(selectedTechnician || selectedPool) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedTechnician(null);
                  setSelectedPool(null);
                  setShowTerritoryStops(false);
                }}
              >
                <EyeOff className="h-4 w-4 mr-1" />
                Clear Selection
              </Button>
            )}
          </div>
          {selectedPool && (
            <div className="flex items-center gap-2 mb-3">
              <Button
                variant={showTerritoryStops ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowTerritoryStops(!showTerritoryStops)}
              >
                {showTerritoryStops ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                {showTerritoryStops ? 'Hide' : 'Show'} {selectedPool.currentTerritory} Territory Stops ({territoryStops.length})
              </Button>
            </div>
          )}
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={10}
            options={mapOptions}
            onLoad={onMapLoad}
          >
            {/* Territory polygons */}
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
            


            {/* Technician route stops */}
            {selectedTechnician && technicianStops.map((stop, idx) => (
              <MarkerF
                key={`tech-stop-${stop.customerNumber}`}
                position={{ lat: stop.latitude, lng: stop.longitude }}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: '#3b82f6',
                  fillOpacity: 0.9,
                  strokeColor: '#1e40af',
                  strokeWeight: 2,
                }}
                label={{
                  text: String(idx + 1),
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 'bold',
                }}
                onClick={() => setSelectedMarker(stop.customerNumber)}
              />
            ))}

            {/* Selected pool marker - large and prominent */}
            {selectedPool && selectedPool.latitude && selectedPool.longitude && (
              <MarkerF
                key={`pool-${selectedPool.customerNumber}`}
                position={{ lat: selectedPool.latitude, lng: selectedPool.longitude }}
                icon={{
                  path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                  scale: 8,
                  fillColor: '#dc2626',
                  fillOpacity: 1,
                  strokeColor: '#fff',
                  strokeWeight: 3,
                }}
                onClick={() => setSelectedMarker(selectedPool.customerNumber)}
              />
            )}

            {/* Territory stops when viewing a pool */}
            {showTerritoryStops && territoryStops.map((stop) => (
              <MarkerF
                key={`territory-stop-${stop.customerNumber}`}
                position={{ lat: stop.latitude, lng: stop.longitude }}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 6,
                  fillColor: getTerritoryBorderColor(selectedPool?.currentTerritory || 'North'),
                  fillOpacity: 0.8,
                  strokeColor: '#fff',
                  strokeWeight: 1.5,
                }}
                onClick={() => setSelectedMarker(stop.customerNumber)}
              />
            ))}
            
            {/* Info window for markers */}
            {selectedMarker && (
              <InfoWindowF
                position={(() => {
                  // Check if it's a ZIP code
                  const zip = zipAssignments.find(z => z.zip === selectedMarker);
                  if (zip) return { lat: zip.latitude, lng: zip.longitude };
                  
                  // Check if it's a customer (from technician stops)
                  const techStop = technicianStops.find(s => s.customerNumber === selectedMarker);
                  if (techStop) return { lat: techStop.latitude, lng: techStop.longitude };
                  
                  // Check if it's the selected pool
                  if (selectedPool && selectedPool.customerNumber === selectedMarker && selectedPool.latitude && selectedPool.longitude) {
                    return { lat: selectedPool.latitude, lng: selectedPool.longitude };
                  }
                  
                  // Check if it's a territory stop
                  const territoryStop = territoryStops.find(s => s.customerNumber === selectedMarker);
                  if (territoryStop) return { lat: territoryStop.latitude, lng: territoryStop.longitude };
                  
                  return center;
                })()}
                onCloseClick={() => setSelectedMarker(null)}
              >
                <div className="p-2 min-w-[200px]">
                  {(() => {
                    // ZIP info
                    const zip = zipAssignments.find(z => z.zip === selectedMarker);
                    if (zip) {
                      const change = scenarioData.zipChanges.find(c => c.zip === selectedMarker);
                      return (
                        <>
                          <p className="font-bold">{zip.zip}</p>
                          <p className="text-sm">{zip.city}</p>
                          <p className="text-sm">Territory: {zip.territory}</p>
                          <p className="text-sm">{zip.accountCount} customers</p>
                          {change && (
                            <p className="text-sm text-cyan-600 font-medium mt-1">
                              ★ Changed from {change.originalTerritory}
                            </p>
                          )}
                        </>
                      );
                    }
                    
                    // Technician stop info
                    const techStop = technicianStops.find(s => s.customerNumber === selectedMarker);
                    if (techStop) {
                      return (
                        <>
                          <p className="font-bold">{techStop.accountName}</p>
                          <p className="text-xs text-gray-500">{techStop.customerNumber}</p>
                          <p className="text-sm mt-1">{techStop.address}</p>
                          <p className="text-sm">{techStop.city}, {techStop.state} {techStop.zip}</p>
                          <p className="text-sm mt-1">Route: {techStop.routeTech}</p>
                          <p className="text-sm">Day: {techStop.dayOfService}</p>
                        </>
                      );
                    }
                    
                    // Selected pool info
                    if (selectedPool && selectedPool.customerNumber === selectedMarker) {
                      return (
                        <>
                          <p className="font-bold text-red-600">{selectedPool.accountName}</p>
                          <p className="text-xs text-gray-500">{selectedPool.customerNumber}</p>
                          <p className="text-sm mt-1">{selectedPool.address}</p>
                          <p className="text-sm">{selectedPool.city} {selectedPool.zip}</p>
                          <p className="text-sm mt-1">Current: {selectedPool.currentRoute}</p>
                          <p className="text-sm text-amber-600">Territory: {selectedPool.currentTerritory}</p>
                        </>
                      );
                    }
                    
                    // Territory stop info (other stops in the same territory)
                    const territoryStop = territoryStops.find(s => s.customerNumber === selectedMarker);
                    if (territoryStop) {
                      return (
                        <>
                          <p className="font-bold" style={{ color: getTerritoryBorderColor(selectedPool?.currentTerritory || 'North') }}>
                            {territoryStop.accountName}
                          </p>
                          <p className="text-xs text-gray-500">{territoryStop.customerNumber}</p>
                          <p className="text-sm mt-1">{territoryStop.address}</p>
                          <p className="text-sm">{territoryStop.city}, {territoryStop.state} {territoryStop.zip}</p>
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-sm"><span className="font-medium">Route:</span> {territoryStop.routeTech}</p>
                            <p className="text-sm"><span className="font-medium">Day:</span> {territoryStop.dayOfService}</p>
                          </div>
                        </>
                      );
                    }
                    
                    return null;
                  })()}
                </div>
              </InfoWindowF>
            )}
          </GoogleMap>
        </CardContent>
      </Card>

      {/* Manual Reassignments - MOVED ABOVE Technician Pool Count Changes */}
      {scenarioData.summary.manualRequired > 0 && (
        <Card className="border-2 border-amber-200">
          <CardContent className="p-4">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => toggleSection('manual')}
            >
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Remaining Manual Decisions ({remainingCount})
                {assignedCount > 0 && (
                  <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-300">
                    {assignedCount} assigned
                  </Badge>
                )}
              </h3>
              {expandedSections.has('manual') ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Click a pool to view on map. Use the dropdown to reassign to a route.
            </p>
            
            {expandedSections.has('manual') && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportCSV(remainingManualDecisions, 'zip-optimized-manual-decisions.csv')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Remaining ({remainingCount})
                  </Button>
                  {assignedCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const assignedData = scenarioData.manualReassignments
                          .filter(mr => manualAssignments[mr.customerNumber])
                          .map(mr => ({
                            ...mr,
                            assignedRoute: manualAssignments[mr.customerNumber]
                          }));
                        exportCSV(assignedData, 'manual-assignments.csv');
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Assigned ({assignedCount})
                    </Button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Current Route</TableHead>
                        <TableHead>Territory</TableHead>
                        <TableHead className="w-48">Assign To</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scenarioData.manualReassignments.map((mr) => {
                        const isAssigned = !!manualAssignments[mr.customerNumber];
                        const isSelected = selectedPool?.customerNumber === mr.customerNumber;
                        return (
                          <TableRow 
                            key={mr.customerNumber}
                            className={`cursor-pointer transition-colors ${
                              isAssigned ? 'bg-green-50/50' : 
                              isSelected ? 'bg-amber-100' : 'hover:bg-slate-50'
                            }`}
                          >
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handlePoolClick(mr)}
                              >
                                {isSelected ? (
                                  <EyeOff className="h-4 w-4 text-amber-600" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell onClick={() => handlePoolClick(mr)}>
                              <p className="font-medium text-sm">{mr.accountName}</p>
                              <p className="text-xs text-muted-foreground">{mr.customerNumber}</p>
                            </TableCell>
                            <TableCell className="text-sm" onClick={() => handlePoolClick(mr)}>
                              {mr.address}, {mr.city} {mr.zip}
                            </TableCell>
                            <TableCell className="text-sm" onClick={() => handlePoolClick(mr)}>{mr.currentRoute}</TableCell>
                            <TableCell onClick={() => handlePoolClick(mr)}>
                              <Badge 
                                variant="outline"
                                style={{
                                  backgroundColor: getTerritoryColor(mr.currentTerritory, 0.2),
                                  borderColor: getTerritoryBorderColor(mr.currentTerritory),
                                  color: getTerritoryBorderColor(mr.currentTerritory),
                                }}
                              >
                                {mr.currentTerritory}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={manualAssignments[mr.customerNumber] || 'undecided'}
                                onValueChange={(value) => handleReassignment(mr.customerNumber, value)}
                              >
                                <SelectTrigger className={`w-full ${isAssigned ? 'border-green-500' : ''}`}>
                                  <SelectValue placeholder="Undecided" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="undecided">
                                    <span className="text-amber-600">Undecided</span>
                                  </SelectItem>
                                  {scenarioData.routeChanges.map((rc) => (
                                    <SelectItem key={rc.route} value={rc.route}>
                                      <span className="flex items-center gap-2">
                                        <span 
                                          className="w-2 h-2 rounded-full"
                                          style={{ backgroundColor: getTerritoryBorderColor(rc.primaryTerritory) }}
                                        />
                                        {rc.technician}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Technician Pool Count Changes */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Technician Pool Count Changes
            {assignedCount > 0 && (
              <Badge variant="outline" className="ml-2 bg-cyan-50 text-cyan-700 border-cyan-300">
                +{assignedCount} manual
              </Badge>
            )}
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Click a technician row to view their current route on the map. Click column headers to sort.
          </p>
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
                {getSortedRouteChanges().map((rc) => {
                  const totalChange = rc.adjustedAfter - rc.before;
                  const isSelected = selectedTechnician === rc.route;
                  return (
                    <TableRow 
                      key={rc.route} 
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-100' : 
                        totalChange !== 0 ? 'bg-yellow-50/50 hover:bg-yellow-100/50' : 'hover:bg-slate-50'
                      }`}
                      onClick={() => handleTechnicianClick(rc.route)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {isSelected && <Eye className="h-4 w-4 text-blue-600" />}
                          <div>
                            <p className="text-sm">{rc.technician}</p>
                            <p className="text-xs text-muted-foreground">{rc.route}</p>
                          </div>
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
                      <TableCell className="text-right font-semibold">
                        {rc.adjustedAfter}
                        {rc.manualIncoming > 0 && (
                          <span className="text-xs text-cyan-600 ml-1">(+{rc.manualIncoming})</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-semibold ${
                          totalChange > 0 ? 'text-green-600' : 
                          totalChange < 0 ? 'text-red-600' : 'text-gray-500'
                        }`}>
                          {totalChange > 0 ? '+' : ''}{totalChange}
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
                        <div className="flex items-center justify-center gap-1">
                          {rc.incomingCount > 0 && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                              +{rc.incomingCount}
                            </Badge>
                          )}
                          {rc.manualIncoming > 0 && (
                            <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-300">
                              +{rc.manualIncoming}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {rc.outgoingCount > 0 && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                            -{rc.outgoingCount}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
              onClick={() => exportCSV(scenarioData.autoReassignments, 'zip-optimized-2-auto-reassignments.csv')}
            >
              <Download className="h-4 w-4 mr-2" />
              Auto-Reassignments ({scenarioData.summary.autoReassigned})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCSV(scenarioData.zipChanges, 'zip-changes-2.csv')}
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
