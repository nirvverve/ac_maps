"use client";

import { GoogleMap, PolygonF, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, ArrowRight, RefreshCw, Users, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface OptimizationData {
  summary: {
    tolerance: string;
    totalConflicts: number;
    autoReassigned: number;
    manualRequired: number;
    cleanRoutesAfter: number;
  };
  routeChanges: RouteChange[];
  autoReassignments: AutoReassignment[];
  manualReassignments: ManualReassignment[];
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

interface Miami10PctReassignmentViewProps {
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
    North: `rgba(59, 130, 246, ${opacity})`, // Blue
    Central: `rgba(16, 185, 129, ${opacity})`, // Green
    South: `rgba(245, 158, 11, ${opacity})`, // Orange
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

export function Miami10PctReassignmentView({ areaFilter }: Miami10PctReassignmentViewProps) {
  const [optimizationData, setOptimizationData] = useState<OptimizationData | null>(null);
  const [zipAssignments, setZipAssignments] = useState<ZipAssignment[]>([]);
  const [boundaries, setBoundaries] = useState<{ [key: string]: any }>({});
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['auto']));
  const [expandedRoutes, setExpandedRoutes] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<SortColumn>('change');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const mapRef = useRef<google.maps.Map | null>(null);

  const center = { lat: 25.85, lng: -80.19 };

  // Load data
  useEffect(() => {
    Promise.all([
      fetch('/miami-10pct-optimization.json').then(r => r.json()),
      fetch('/miami-final-territory-assignments.json').then(r => r.json()),
      fetch('/miami-zip-boundaries.json').then(r => r.json()),
    ]).then(([optData, zipData, boundaryData]) => {
      setOptimizationData(optData);
      setZipAssignments(zipData);
      setBoundaries(boundaryData);
    }).catch(err => console.error('Error loading data:', err));
  }, []);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // Toggle section expand
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // Toggle route expand
  const toggleRouteExpand = (route: string) => {
    setExpandedRoutes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(route)) {
        newSet.delete(route);
      } else {
        newSet.add(route);
      }
      return newSet;
    });
  };

  // Filter ZIP assignments
  const filteredZips = zipAssignments.filter(z => 
    areaFilter[z.territory as keyof typeof areaFilter]
  );

  // Convert GeoJSON to Google Maps paths
  const getPolygonPaths = (zipCode: string) => {
    const boundary = boundaries[zipCode];
    if (!boundary) return [];

    try {
      if (boundary.type === 'Polygon') {
        return boundary.coordinates[0].map((coord: number[]) => ({
          lat: coord[1],
          lng: coord[0],
        }));
      } else if (boundary.type === 'MultiPolygon') {
        return boundary.coordinates[0][0].map((coord: number[]) => ({
          lat: coord[1],
          lng: coord[0],
        }));
      }
    } catch (e) {
      return [];
    }
    return [];
  };

  // Export auto-reassignments
  const exportAutoReassignments = () => {
    if (!optimizationData) return;
    
    const headers = [
      'Customer Number',
      'Account Name',
      'Address',
      'City',
      'ZIP',
      'Territory',
      'Current Route',
      'New Route'
    ];
    
    const csvContent = [
      headers.join(','),
      ...optimizationData.autoReassignments.map(r => [
        r.customerNumber,
        `"${r.accountName || ''}"`,
        `"${r.address || ''}"`,
        `"${r.city || ''}"`,
        r.zip,
        r.territory,
        `"${r.oldRoute || ''}"`,
        `"${r.newRoute || ''}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `miami-auto-reassignments-10pct-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export manual decisions required
  const exportManualDecisions = () => {
    if (!optimizationData) return;
    
    const headers = [
      'Customer Number',
      'Account Name',
      'Address',
      'City',
      'ZIP',
      'Current Route',
      'Route Primary Territory',
      'Customer Territory',
      'Reason'
    ];
    
    const csvContent = [
      headers.join(','),
      ...optimizationData.manualReassignments.map(r => [
        r.customerNumber,
        `"${r.accountName || ''}"`,
        `"${r.address || ''}"`,
        `"${r.city || ''}"`,
        r.zip,
        `"${r.currentRoute || ''}"`,
        r.routePrimaryTerritory,
        r.currentTerritory,
        `"${r.reason || ''}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `miami-manual-decisions-10pct-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export route changes
  const exportRouteChanges = () => {
    if (!optimizationData) return;
    
    const headers = [
      'Route',
      'Technician',
      'Primary Territory',
      'Before',
      'After',
      'Change',
      'Percent Change',
      'Incoming',
      'Outgoing'
    ];
    
    const csvContent = [
      headers.join(','),
      ...optimizationData.routeChanges.map(r => [
        `"${r.route}"`,
        `"${r.technician}"`,
        r.primaryTerritory,
        r.before,
        r.after,
        r.change,
        r.percentChange,
        r.incomingCount,
        r.outgoingCount
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `miami-route-changes-10pct-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Group auto-reassignments by old route
  const getReassignmentsByOldRoute = () => {
    if (!optimizationData) return {};
    const grouped: Record<string, AutoReassignment[]> = {};
    for (const r of optimizationData.autoReassignments) {
      if (!grouped[r.oldRoute]) grouped[r.oldRoute] = [];
      grouped[r.oldRoute].push(r);
    }
    return grouped;
  };

  // Group manual reassignments by route
  const getManualByRoute = () => {
    if (!optimizationData) return {};
    const grouped: Record<string, ManualReassignment[]> = {};
    for (const r of optimizationData.manualReassignments) {
      if (!grouped[r.currentRoute]) grouped[r.currentRoute] = [];
      grouped[r.currentRoute].push(r);
    }
    return grouped;
  };

  // Handle column sort
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Sort route changes
  const getSortedRouteChanges = () => {
    if (!optimizationData) return [];
    return [...optimizationData.routeChanges].sort((a, b) => {
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

  // Render sort icon
  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  if (!optimizationData) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p>Loading optimization data...</p>
        </CardContent>
      </Card>
    );
  }

  const reassignmentsByOldRoute = getReassignmentsByOldRoute();
  const manualByRoute = getManualByRoute();

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardContent className="p-4">
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            10% REASSIGNMENT OPTIMIZATION
          </h2>
          <p className="text-sm text-slate-600">
            Automated route reassignment analysis with ±10% (or ±8 pools) tolerance per technician.
            This view shows which customers can be automatically moved vs. those requiring manual decisions.
          </p>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{optimizationData.summary.totalConflicts}</p>
            <p className="text-xs text-muted-foreground">Total Conflicts</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-700">{optimizationData.summary.autoReassigned}</p>
            <p className="text-xs text-green-600">Auto-Reassigned (61%)</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-700">{optimizationData.summary.manualRequired}</p>
            <p className="text-xs text-amber-600">Manual Decisions (39%)</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">13 / 18</p>
            <p className="text-xs text-blue-600">Clean Routes After</p>
          </CardContent>
        </Card>
      </div>

      {/* Export Buttons */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <Button
              variant="default"
              size="sm"
              onClick={exportAutoReassignments}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <Download className="h-4 w-4" />
              Export Auto-Reassignments ({optimizationData.summary.autoReassigned})
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={exportManualDecisions}
              className="gap-2 bg-amber-600 hover:bg-amber-700"
            >
              <Download className="h-4 w-4" />
              Export Manual Decisions ({optimizationData.summary.manualRequired})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportRouteChanges}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export Route Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <Card>
        <CardContent className="p-2">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={10}
            options={mapOptions}
            onLoad={onLoad}
          >
            {/* Territory polygons */}
            {filteredZips.map((zip) => {
              const paths = getPolygonPaths(zip.zip);
              if (paths.length === 0) return null;

              return (
                <PolygonF
                  key={zip.zip}
                  paths={paths}
                  options={{
                    fillColor: getTerritoryColor(zip.territory, 0.35),
                    fillOpacity: 0.35,
                    strokeColor: getTerritoryBorderColor(zip.territory),
                    strokeOpacity: 0.7,
                    strokeWeight: 1,
                  }}
                />
              );
            })}

            {/* Auto-reassignment markers (green) */}
            {optimizationData.autoReassignments
              .filter(r => r.latitude && r.longitude && areaFilter[r.territory as keyof typeof areaFilter])
              .map((r) => (
                <MarkerF
                  key={`auto-${r.customerNumber}`}
                  position={{ lat: r.latitude!, lng: r.longitude! }}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 5,
                    fillColor: '#22c55e',
                    fillOpacity: 0.9,
                    strokeColor: '#ffffff',
                    strokeWeight: 1,
                  }}
                  onClick={() => setSelectedMarker(`auto-${r.customerNumber}`)}
                />
              ))}

            {/* Manual decision markers (red) */}
            {optimizationData.manualReassignments
              .filter(r => r.latitude && r.longitude && areaFilter[r.currentTerritory as keyof typeof areaFilter])
              .map((r) => (
                <MarkerF
                  key={`manual-${r.customerNumber}`}
                  position={{ lat: r.latitude!, lng: r.longitude! }}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 6,
                    fillColor: '#ef4444',
                    fillOpacity: 0.9,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                  }}
                  onClick={() => setSelectedMarker(`manual-${r.customerNumber}`)}
                />
              ))}

            {/* Info windows */}
            {selectedMarker && selectedMarker.startsWith('auto-') && (() => {
              const r = optimizationData.autoReassignments.find(
                a => `auto-${a.customerNumber}` === selectedMarker
              );
              if (!r || !r.latitude || !r.longitude) return null;
              return (
                <InfoWindowF
                  position={{ lat: r.latitude, lng: r.longitude }}
                  onCloseClick={() => setSelectedMarker(null)}
                >
                  <div className="p-2 min-w-[280px]">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-xs font-medium text-green-700">AUTO-REASSIGNED</span>
                    </div>
                    <h3 className="font-bold text-sm">{r.accountName}</h3>
                    <p className="text-xs text-gray-500 font-mono">{r.customerNumber}</p>
                    <div className="mt-2 space-y-1 text-xs">
                      <p><strong>Address:</strong> {r.address}, {r.city} {r.zip}</p>
                      <p><strong>Territory:</strong> {r.territory}</p>
                      <div className="flex items-center gap-2 mt-2 p-2 bg-green-50 rounded">
                        <span className="text-red-600 line-through">{r.oldRoute}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="text-green-700 font-semibold">{r.newRoute}</span>
                      </div>
                    </div>
                  </div>
                </InfoWindowF>
              );
            })()}

            {selectedMarker && selectedMarker.startsWith('manual-') && (() => {
              const r = optimizationData.manualReassignments.find(
                m => `manual-${m.customerNumber}` === selectedMarker
              );
              if (!r || !r.latitude || !r.longitude) return null;
              return (
                <InfoWindowF
                  position={{ lat: r.latitude, lng: r.longitude }}
                  onCloseClick={() => setSelectedMarker(null)}
                >
                  <div className="p-2 min-w-[280px]">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span className="text-xs font-medium text-amber-700">MANUAL DECISION REQUIRED</span>
                    </div>
                    <h3 className="font-bold text-sm">{r.accountName}</h3>
                    <p className="text-xs text-gray-500 font-mono">{r.customerNumber}</p>
                    <div className="mt-2 space-y-1 text-xs">
                      <p><strong>Address:</strong> {r.address}, {r.city} {r.zip}</p>
                      <p><strong>Current Route:</strong> {r.currentRoute}</p>
                      <p><strong>Customer Territory:</strong> 
                        <Badge variant="outline" className="ml-1" style={{
                          backgroundColor: getTerritoryColor(r.currentTerritory, 0.2),
                          borderColor: getTerritoryBorderColor(r.currentTerritory),
                          color: getTerritoryBorderColor(r.currentTerritory),
                        }}>
                          {r.currentTerritory}
                        </Badge>
                      </p>
                      <p><strong>Route Primary:</strong> {r.routePrimaryTerritory}</p>
                      <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-200">
                        <p className="text-amber-800">{r.reason}</p>
                      </div>
                    </div>
                  </div>
                </InfoWindowF>
              );
            })()}
          </GoogleMap>
          <div className="flex justify-center gap-6 mt-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Auto-Reassigned ({optimizationData.summary.autoReassigned})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>Manual Decision ({optimizationData.summary.manualRequired})</span>
            </div>
          </div>
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

      {/* Auto-Reassignments Section */}
      <Card>
        <CardContent className="p-4">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('auto')}
          >
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Auto-Reassignments ({optimizationData.summary.autoReassigned} customers)
            </h3>
            {expandedSections.has('auto') ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            These customers can be automatically moved to new routes. Export this list to update your system.
          </p>

          {expandedSections.has('auto') && (
            <div className="mt-4 space-y-3">
              {Object.entries(reassignmentsByOldRoute)
                .sort((a, b) => b[1].length - a[1].length)
                .map(([oldRoute, customers]) => {
                  const isExpanded = expandedRoutes.has(`auto-${oldRoute}`);
                  // Group by new route
                  const byNewRoute: Record<string, AutoReassignment[]> = {};
                  for (const c of customers) {
                    if (!byNewRoute[c.newRoute]) byNewRoute[c.newRoute] = [];
                    byNewRoute[c.newRoute].push(c);
                  }
                  
                  return (
                    <div key={oldRoute} className="bg-green-50 border border-green-200 rounded-lg overflow-hidden">
                      <div 
                        className="p-3 cursor-pointer hover:bg-green-100 transition-colors"
                        onClick={() => toggleRouteExpand(`auto-${oldRoute}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-green-600" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-green-600" />
                            )}
                            <div>
                              <p className="font-medium text-sm">FROM: {oldRoute}</p>
                              <p className="text-xs text-muted-foreground">
                                {customers.length} customers moving out
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(byNewRoute).map(([newRoute, custs]) => (
                              <Badge key={newRoute} variant="outline" className="bg-green-100 text-green-800 border-green-300 text-xs">
                                → {newRoute.replace('AFP Route ', '').replace('AFP ', '')}: {custs.length}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-green-200 bg-white p-3">
                          {Object.entries(byNewRoute).map(([newRoute, custs]) => (
                            <div key={newRoute} className="mb-3 last:mb-0">
                              <h5 className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1">
                                <ArrowRight className="h-3 w-3" />
                                TO: {newRoute} ({custs.length})
                              </h5>
                              <div className="space-y-1 max-h-48 overflow-y-auto">
                                {custs
                                  .sort((a, b) => a.zip.localeCompare(b.zip))
                                  .map((customer) => (
                                    <div 
                                      key={customer.customerNumber}
                                      className="flex items-center justify-between text-xs p-2 rounded bg-green-50 border border-green-200"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium">
                                          <span className="text-green-700 font-mono mr-2">{customer.customerNumber}</span>
                                          {customer.accountName}
                                        </p>
                                        <p className="text-muted-foreground truncate">
                                          {customer.address}, {customer.city} {customer.zip}
                                        </p>
                                      </div>
                                      <Badge 
                                        variant="outline"
                                        className="ml-2 shrink-0 text-xs"
                                        style={{
                                          backgroundColor: getTerritoryColor(customer.territory, 0.2),
                                          borderColor: getTerritoryBorderColor(customer.territory),
                                          color: getTerritoryBorderColor(customer.territory),
                                        }}
                                      >
                                        {customer.territory}
                                      </Badge>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Decisions Section */}
      <Card>
        <CardContent className="p-4">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('manual')}
          >
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Manual Decisions Required ({optimizationData.summary.manualRequired} customers)
            </h3>
            {expandedSections.has('manual') ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            These customers cannot be auto-reassigned due to route capacity limits. 
            Management needs to decide which technician should absorb these pools.
          </p>

          {expandedSections.has('manual') && (
            <div className="mt-4 space-y-3">
              {Object.entries(manualByRoute)
                .sort((a, b) => b[1].length - a[1].length)
                .map(([route, customers]) => {
                  const isExpanded = expandedRoutes.has(`manual-${route}`);
                  // Group by target territory
                  const byTerritory: Record<string, ManualReassignment[]> = {};
                  for (const c of customers) {
                    if (!byTerritory[c.currentTerritory]) byTerritory[c.currentTerritory] = [];
                    byTerritory[c.currentTerritory].push(c);
                  }
                  const primaryTerritory = customers[0]?.routePrimaryTerritory || 'Unknown';
                  
                  return (
                    <div key={route} className="bg-amber-50 border border-amber-200 rounded-lg overflow-hidden">
                      <div 
                        className="p-3 cursor-pointer hover:bg-amber-100 transition-colors"
                        onClick={() => toggleRouteExpand(`manual-${route}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-amber-600" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-amber-600" />
                            )}
                            <div>
                              <p className="font-medium text-sm">{route}</p>
                              <p className="text-xs text-muted-foreground">
                                Primary: <span className="font-semibold">{primaryTerritory}</span> • 
                                {customers.length} stuck customers (route at minimum capacity)
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(byTerritory).map(([territory, custs]) => (
                              <Badge 
                                key={territory} 
                                variant="outline" 
                                className="text-xs"
                                style={{
                                  backgroundColor: getTerritoryColor(territory, 0.2),
                                  borderColor: getTerritoryBorderColor(territory),
                                  color: getTerritoryBorderColor(territory),
                                }}
                              >
                                Need {territory}: {custs.length}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-amber-200 bg-white p-3">
                          {Object.entries(byTerritory).map(([territory, custs]) => (
                            <div key={territory} className="mb-3 last:mb-0">
                              <h5 
                                className="text-xs font-semibold mb-2 flex items-center gap-1"
                                style={{ color: getTerritoryBorderColor(territory) }}
                              >
                                NEEDS {territory.toUpperCase()} ROUTE ({custs.length})
                              </h5>
                              <div className="space-y-1 max-h-48 overflow-y-auto">
                                {custs
                                  .sort((a, b) => a.zip.localeCompare(b.zip))
                                  .map((customer) => (
                                    <div 
                                      key={customer.customerNumber}
                                      className="flex items-center justify-between text-xs p-2 rounded border"
                                      style={{
                                        backgroundColor: getTerritoryColor(customer.currentTerritory, 0.1),
                                        borderColor: getTerritoryBorderColor(customer.currentTerritory),
                                      }}
                                    >
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium">
                                          <span className="text-amber-700 font-mono mr-2">{customer.customerNumber}</span>
                                          {customer.accountName}
                                        </p>
                                        <p className="text-muted-foreground truncate">
                                          {customer.address}, {customer.city} {customer.zip}
                                        </p>
                                      </div>
                                      <Badge 
                                        variant="outline"
                                        className="ml-2 shrink-0 text-xs"
                                        style={{
                                          backgroundColor: getTerritoryColor(customer.currentTerritory, 0.3),
                                          borderColor: getTerritoryBorderColor(customer.currentTerritory),
                                          color: getTerritoryBorderColor(customer.currentTerritory),
                                        }}
                                      >
                                        {customer.currentTerritory}
                                      </Badge>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
