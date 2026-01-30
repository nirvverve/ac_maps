"use client";

import { GoogleMap, PolygonF, MarkerF, InfoWindowF, PolylineF } from '@react-google-maps/api';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Users, MapPin, ChevronDown, ChevronUp, Eye, EyeOff, CheckCircle2, AlertTriangle, UserPlus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Customer {
  customerNumber: string;
  accountName: string;
  address: string;
  city: string;
  state?: string;
  zip: string;
  latitude: number;
  longitude: number;
  monthlyPrice?: number;
  yearlyPrice?: number;
  route: string;
  originalTerritory: string;
  assignedRoute: string;
  assignedTech: string;
  assignedTerritory: string;
  status: 'kept' | 'reassigned' | 'new-hire' | 'floater';
}

interface RouteSummary {
  route: number;
  routeKey: string;
  technician: string;
  territory: string;
  isFloater: boolean;
  isNewHire: boolean;
  poolCount: number;
  min: number | null;
  max: number | null;
  keptFromOriginal: number;
  addedNew: number;
  meetsTarget: boolean;
}

interface RadicalRerouteData {
  scenario: string;
  generatedAt: string;
  summary: {
    totalCustomers: number;
    totalAssigned: number;
    floaterPool: number;
    territories: Record<string, number>;
    territorySummary: Record<string, { assigned: number; target: number }>;
  };
  routeSummary: RouteSummary[];
  floaterTechs: { route: number; name: string; territory: string }[];
  customers: Customer[];
  floaterPool: Customer[];
}

interface MiamiRadicalRerouteViewProps {
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
  styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }],
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
};

// Technician colors for multi-select visualization
const TECH_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#a855f7', // violet
  '#eab308', // yellow
];

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

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    kept: '#22c55e',
    reassigned: '#f59e0b',
    'new-hire': '#8b5cf6',
    floater: '#ef4444',
  };
  return colors[status] || '#6b7280';
}

export function MiamiRadicalRerouteView({ areaFilter }: MiamiRadicalRerouteViewProps) {
  const [data, setData] = useState<RadicalRerouteData | null>(null);
  const [boundaries, setBoundaries] = useState<Record<string, any>>({});
  const [kmlBoundaries, setKmlBoundaries] = useState<{north?: {lat: number, lng: number}[], south?: {lat: number, lng: number}[]}>({});
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [selectedTechs, setSelectedTechs] = useState<Set<string>>(new Set());
  const [showTerritoryOutlines, setShowTerritoryOutlines] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary', 'routes']));
  const mapRef = useRef<google.maps.Map | null>(null);

  const center = { lat: 25.85, lng: -80.19 };

  useEffect(() => {
    Promise.all([
      fetch('/miami-radical-reroute.json').then(r => r.json()),
      fetch('/miami-zip-boundaries.json').then(r => r.json()),
      fetch('/miami-kml-boundaries.json').then(r => r.json()).catch(() => []),
    ]).then(([rerouteData, boundaryData, kmlData]) => {
      setData(rerouteData);
      setBoundaries(boundaryData);
      setKmlBoundaries(kmlData || []);
    });
  }, []);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const toggleTechSelection = (routeKey: string) => {
    setSelectedTechs(prev => {
      const next = new Set(prev);
      if (next.has(routeKey)) {
        next.delete(routeKey);
      } else {
        next.add(routeKey);
      }
      return next;
    });
  };

  const clearAllSelections = () => {
    setSelectedTechs(new Set());
    setSelectedMarker(null);
  };

  // Map routeKey to color index for consistent coloring
  const techColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    const selectedArray = Array.from(selectedTechs);
    selectedArray.forEach((routeKey, idx) => {
      map[routeKey] = TECH_COLORS[idx % TECH_COLORS.length];
    });
    return map;
  }, [selectedTechs]);

  // Get unique ZIPs with their territories
  const zipTerritories = useMemo(() => {
    if (!data) return [];
    const zipMap: Record<string, string> = {};
    data.customers.forEach(c => {
      if (c.zip && c.assignedTerritory) {
        zipMap[c.zip] = c.assignedTerritory;
      }
    });
    return Object.entries(zipMap).map(([zip, territory]) => ({ zip, territory }));
  }, [data]);

  // Filter customers for all selected technicians
  const techCustomers = useMemo(() => {
    if (!data || selectedTechs.size === 0) return [];
    return data.customers.filter(c => selectedTechs.has(c.assignedRoute));
  }, [data, selectedTechs]);

  // Get selected tech names for display
  const selectedTechNames = useMemo(() => {
    if (!data || selectedTechs.size === 0) return [];
    return data.routeSummary
      .filter(r => selectedTechs.has(r.routeKey))
      .map(r => r.technician);
  }, [data, selectedTechs]);

  const exportCSV = (dataArray: any[], filename: string) => {
    if (dataArray.length === 0) return;
    const headers = Object.keys(dataArray[0]);
    const csv = [
      headers.join(','),
      ...dataArray.map(row => headers.map(h => {
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

  if (!data) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p>Loading radical reroute scenario...</p>
        </CardContent>
      </Card>
    );
  }

  const filteredZips = zipTerritories.filter(z => areaFilter[z.territory as keyof typeof areaFilter]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
        <CardContent className="p-4">
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            RADICAL REROUTE SCENARIO
          </h2>
          <p className="text-sm text-slate-600">
            Optimized technician assignments targeting Min/Max pool counts while maximizing retained accounts.
            Two new hire positions assigned to fill gaps in Central and South territories.
          </p>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card>
        <CardContent className="p-4">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('summary')}
          >
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Assignment Summary
            </h3>
            {expandedSections.has('summary') ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>

          {expandedSections.has('summary') && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(data.summary.territorySummary).map(([territory, stats]) => (
                  <div 
                    key={territory}
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: getTerritoryColor(territory, 0.15) }}
                  >
                    <p className="text-sm font-medium" style={{ color: getTerritoryBorderColor(territory) }}>
                      {territory}
                    </p>
                    <p className="text-2xl font-bold">{stats.assigned}</p>
                    <p className="text-xs text-muted-foreground">
                      of {stats.target} capacity ({Math.round(stats.assigned / stats.target * 100)}%)
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-2 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-600">Kept</p>
                  <p className="text-lg font-bold text-green-700">
                    {data.routeSummary.reduce((sum, r) => sum + r.keptFromOriginal, 0)}
                  </p>
                </div>
                <div className="p-2 bg-amber-50 rounded-lg">
                  <p className="text-xs text-amber-600">Reassigned</p>
                  <p className="text-lg font-bold text-amber-700">
                    {data.routeSummary.filter(r => !r.isNewHire).reduce((sum, r) => sum + r.addedNew, 0)}
                  </p>
                </div>
                <div className="p-2 bg-purple-50 rounded-lg">
                  <p className="text-xs text-purple-600">New Hire</p>
                  <p className="text-lg font-bold text-purple-700">
                    {data.routeSummary.filter(r => r.isNewHire).reduce((sum, r) => sum + r.poolCount, 0)}
                  </p>
                </div>
                <div className="p-2 bg-red-50 rounded-lg">
                  <p className="text-xs text-red-600">Floater Pool</p>
                  <p className="text-lg font-bold text-red-700">{data.floaterPool.length}</p>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p><strong>Floater Technicians:</strong> {data.floaterTechs.map(t => t.name).join(', ')}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Map */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold mb-3">Radical Reroute Territory Map</h3>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex-1">
              {selectedTechs.size > 0 ? (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">{techCustomers.length} stops</span> for {selectedTechs.size} technician{selectedTechs.size > 1 ? 's' : ''}:
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedTechNames.map((name, idx) => (
                      <Badge 
                        key={name} 
                        variant="outline" 
                        className="text-xs"
                        style={{ 
                          borderColor: TECH_COLORS[idx % TECH_COLORS.length],
                          color: TECH_COLORS[idx % TECH_COLORS.length],
                        }}
                      >
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Click technician rows to view their routes (multi-select supported)</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="showOutlines" 
                  checked={showTerritoryOutlines}
                  onCheckedChange={(checked) => setShowTerritoryOutlines(checked === true)}
                />
                <label htmlFor="showOutlines" className="text-sm cursor-pointer">Territory Outlines</label>
              </div>
              {selectedTechs.size > 0 && (
                <Button variant="outline" size="sm" onClick={clearAllSelections}>
                  <EyeOff className="h-4 w-4 mr-1" /> Clear All
                </Button>
              )}
            </div>
          </div>

          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={10}
            options={mapOptions}
            onLoad={onMapLoad}
          >
            {/* Territory ZIP polygons (light fill) */}
            {filteredZips.map(({ zip, territory }) => {
              const boundary = boundaries[zip];
              if (!boundary?.geometry?.coordinates) return null;
              
              const paths = boundary.geometry.coordinates[0].map((coord: number[]) => ({
                lat: coord[1],
                lng: coord[0],
              }));
              
              return (
                <PolygonF
                  key={zip}
                  paths={paths}
                  options={{
                    fillColor: getTerritoryColor(territory, 0.25),
                    fillOpacity: 0.25,
                    strokeColor: getTerritoryBorderColor(territory),
                    strokeOpacity: 0.5,
                    strokeWeight: 1,
                  }}
                />
              );
            })}

            {/* Territory boundary lines from KML */}
            {showTerritoryOutlines && kmlBoundaries.north && (areaFilter.North || areaFilter.Central) && (
              <PolylineF
                key="outline-north"
                path={kmlBoundaries.north.map((coord: {lat: number, lng: number}) => ({
                  lat: coord.lat,
                  lng: coord.lng,
                }))}
                options={{
                  strokeColor: '#1e40af', // dark blue for North/Central border
                  strokeOpacity: 1,
                  strokeWeight: 4,
                }}
              />
            )}
            {showTerritoryOutlines && kmlBoundaries.south && (areaFilter.Central || areaFilter.South) && (
              <PolylineF
                key="outline-south"
                path={kmlBoundaries.south.map((coord: {lat: number, lng: number}) => ({
                  lat: coord.lat,
                  lng: coord.lng,
                }))}
                options={{
                  strokeColor: '#92400e', // dark amber for Central/South border
                  strokeOpacity: 1,
                  strokeWeight: 4,
                }}
              />
            )}

            {/* Customer markers for selected technicians */}
            {techCustomers.map((customer) => {
              const techColor = techColorMap[customer.assignedRoute] || '#6b7280';
              return (
                <MarkerF
                  key={customer.customerNumber}
                  position={{ lat: customer.latitude, lng: customer.longitude }}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 7,
                    fillColor: techColor,
                    fillOpacity: 0.9,
                    strokeColor: '#fff',
                    strokeWeight: 2,
                  }}
                  onClick={() => setSelectedMarker(customer.customerNumber)}
                />
              );
            })}

            {/* Info Window */}
            {selectedMarker && (() => {
              const customer = data.customers.find(c => c.customerNumber === selectedMarker);
              if (!customer) return null;
              return (
                <InfoWindowF
                  position={{ lat: customer.latitude, lng: customer.longitude }}
                  onCloseClick={() => setSelectedMarker(null)}
                >
                  <div className="p-2 min-w-[200px]">
                    <p className="font-bold">{customer.accountName}</p>
                    <p className="text-xs text-gray-500">{customer.customerNumber}</p>
                    <p className="text-sm mt-1">{customer.address}</p>
                    <p className="text-sm">{customer.city} {customer.zip}</p>
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-sm"><span className="font-medium">Original:</span> {customer.route}</p>
                      <p className="text-sm"><span className="font-medium">Assigned:</span> {customer.assignedTech}</p>
                      <p className="text-sm">
                        <span className="font-medium">Status:</span>{' '}
                        <span style={{ color: getStatusColor(customer.status) }}>{customer.status}</span>
                      </p>
                    </div>
                  </div>
                </InfoWindowF>
              );
            })()}
          </GoogleMap>

          {/* Legend */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-4 text-xs">
              <span className="font-medium">Status:</span>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-green-500" /> Kept
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-amber-500" /> Reassigned
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-purple-500" /> New Hire
              </div>
            </div>
            {selectedTechs.size > 1 && (
              <div className="text-xs text-muted-foreground">
                Markers colored by technician
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Route Summary Table */}
      <Card>
        <CardContent className="p-4">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('routes')}
          >
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Technician Assignments ({data.routeSummary.length} routes)
              {selectedTechs.size > 0 && (
                <Badge variant="secondary" className="ml-2">{selectedTechs.size} selected</Badge>
              )}
            </h3>
            {expandedSections.has('routes') ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>

          {expandedSections.has('routes') && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-3">Click rows to toggle selection (multi-select enabled)</p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Technician</TableHead>
                      <TableHead className="text-center">Territory</TableHead>
                      <TableHead className="text-center">Target</TableHead>
                      <TableHead className="text-center">Assigned</TableHead>
                      <TableHead className="text-center">Kept</TableHead>
                      <TableHead className="text-center">New</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.routeSummary
                      .sort((a, b) => {
                        const order = ['North', 'Central', 'South'];
                        return order.indexOf(a.territory) - order.indexOf(b.territory);
                      })
                      .map((route) => {
                        const isSelected = selectedTechs.has(route.routeKey);
                        const techColor = isSelected ? techColorMap[route.routeKey] : undefined;
                        return (
                          <TableRow 
                            key={route.routeKey}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-blue-50' : 
                              route.isNewHire ? 'bg-purple-50/50' : 'hover:bg-slate-50'
                            }`}
                            onClick={() => toggleTechSelection(route.routeKey)}
                          >
                            <TableCell className="w-8">
                              {isSelected && (
                                <div 
                                  className="w-4 h-4 rounded-full border-2 border-white shadow"
                                  style={{ backgroundColor: techColor }}
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {isSelected && <Eye className="h-4 w-4 text-blue-600" />}
                                {route.isNewHire && <UserPlus className="h-4 w-4 text-purple-600" />}
                                <div>
                                  <p className="font-medium text-sm">{route.technician}</p>
                                  <p className="text-xs text-muted-foreground">Route {route.route}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge 
                                variant="outline"
                                style={{
                                  backgroundColor: getTerritoryColor(route.territory, 0.2),
                                  borderColor: getTerritoryBorderColor(route.territory),
                                  color: getTerritoryBorderColor(route.territory),
                                }}
                              >
                                {route.territory}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              {route.min && route.max ? `${route.min}-${route.max}` : '-'}
                            </TableCell>
                            <TableCell className="text-center font-semibold">{route.poolCount}</TableCell>
                            <TableCell className="text-center">
                              <span className="text-green-600">{route.keptFromOriginal}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={route.isNewHire ? 'text-purple-600' : 'text-amber-600'}>
                                {route.addedNew}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              {route.meetsTarget ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-amber-600 mx-auto" />
                              )}
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

      {/* Export */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold mb-3">Export Data</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCSV(data.customers, 'radical-reroute-all-assignments.csv')}
            >
              <Download className="h-4 w-4 mr-2" />
              All Assignments ({data.customers.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCSV(
                data.customers.filter(c => c.status === 'reassigned' || c.status === 'new-hire'),
                'radical-reroute-changes.csv'
              )}
            >
              <Download className="h-4 w-4 mr-2" />
              Changes Only
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCSV(data.routeSummary, 'radical-reroute-summary.csv')}
            >
              <Download className="h-4 w-4 mr-2" />
              Route Summary
            </Button>
            {selectedTechs.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportCSV(techCustomers, 'radical-reroute-selected-techs.csv')}
              >
                <Download className="h-4 w-4 mr-2" />
                Selected Techs ({techCustomers.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
