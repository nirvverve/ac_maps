"use client";

import { GoogleMap, PolygonF, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Download, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Users } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CustomerData {
  customerNumber: string;
  accountName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  route: string;
  serviceDays: string;
  latitude: number | null;
  longitude: number | null;
  monthlyPrice: number;
  yearlyPrice: number;
  oldTerritory: string;
  newTerritory: string;
}

interface ZipAssignment {
  zip: string;
  territory: string;
  accountCount: number;
  city: string;
  latitude: number;
  longitude: number;
}

interface RouteConflict {
  route: string;
  totalCustomers: number;
  territories: Record<string, number>;
  hasConflict: boolean;
  primaryTerritory: string;
}

interface MiamiFinalTerritoryViewProps {
  areaFilter: {
    North: boolean;
    Central: boolean;
    South: boolean;
  };
}

const mapContainerStyle = {
  width: '100%',
  height: '650px',
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

export function MiamiFinalTerritoryView({ areaFilter }: MiamiFinalTerritoryViewProps) {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [zipAssignments, setZipAssignments] = useState<ZipAssignment[]>([]);
  const [routeConflicts, setRouteConflicts] = useState<RouteConflict[]>([]);
  const [boundaries, setBoundaries] = useState<{ [key: string]: any }>({});
  const [selectedZip, setSelectedZip] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showConflictsOnly, setShowConflictsOnly] = useState(false);
  const [expandedRoutes, setExpandedRoutes] = useState<Set<string>>(new Set());
  const mapRef = useRef<google.maps.Map | null>(null);

  const center = { lat: 25.85, lng: -80.19 };

  // Load data
  useEffect(() => {
    Promise.all([
      fetch('/miami-final-territory-data.json').then(r => r.json()),
      fetch('/miami-final-territory-assignments.json').then(r => r.json()),
      fetch('/miami-route-conflicts.json').then(r => r.json()),
      fetch('/miami-zip-boundaries.json').then(r => r.json()),
    ]).then(([customerData, zipData, conflictData, boundaryData]) => {
      setCustomers(customerData);
      setZipAssignments(zipData);
      setRouteConflicts(conflictData);
      setBoundaries(boundaryData);
    }).catch(err => console.error('Error loading data:', err));
  }, []);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // Get unique routes for filter
  const uniqueRoutes = [...new Set(customers.map(c => c.route).filter(Boolean))].sort();

  // Filter customers
  const filteredCustomers = customers.filter(c => {
    if (!areaFilter[c.newTerritory as keyof typeof areaFilter]) return false;
    if (selectedRoute !== 'all' && c.route !== selectedRoute) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        c.customerNumber.toLowerCase().includes(term) ||
        c.accountName.toLowerCase().includes(term) ||
        c.address.toLowerCase().includes(term) ||
        c.zip.includes(term)
      );
    }
    return true;
  });

  // Filter ZIP assignments
  const filteredZips = zipAssignments.filter(z => 
    areaFilter[z.territory as keyof typeof areaFilter]
  );

  // Get route conflict info
  const getRouteConflictInfo = (route: string) => {
    return routeConflicts.find(r => r.route === route);
  };

  // Toggle expanded route
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

  // Get customers for a specific route
  const getRouteCustomers = (route: string, primaryTerritory: string) => {
    const routeCustomers = customers.filter(c => c.route === route);
    const needsReassignment = routeCustomers.filter(c => c.newTerritory !== primaryTerritory);
    const noReassignment = routeCustomers.filter(c => c.newTerritory === primaryTerritory);
    return { needsReassignment, noReassignment };
  };

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

  // Export customers by territory
  const exportCustomers = (territory: string | 'all') => {
    const toExport = territory === 'all' 
      ? filteredCustomers 
      : filteredCustomers.filter(c => c.newTerritory === territory);
    
    // Sort by ZIP code
    toExport.sort((a, b) => a.zip.localeCompare(b.zip));
    
    const headers = [
      'Customer Number',
      'Account Name',
      'Address',
      'City',
      'State',
      'ZIP',
      'Route',
      'Service Days',
      'New Territory',
      'Monthly Price',
      'Yearly Price'
    ];
    
    const csvContent = [
      headers.join(','),
      ...toExport.map(c => [
        c.customerNumber,
        `"${c.accountName || ''}"`,
        `"${c.address || ''}"`,
        `"${c.city || ''}"`,
        c.state,
        c.zip,
        `"${c.route || ''}"`,
        `"${c.serviceDays || ''}"`,
        c.newTerritory,
        c.monthlyPrice,
        c.yearlyPrice
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `miami-${territory === 'all' ? 'all-territories' : territory.toLowerCase()}-customers-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Territory statistics
  const stats = {
    North: {
      customers: customers.filter(c => c.newTerritory === 'North').length,
      zips: zipAssignments.filter(z => z.territory === 'North').length,
    },
    Central: {
      customers: customers.filter(c => c.newTerritory === 'Central').length,
      zips: zipAssignments.filter(z => z.territory === 'Central').length,
    },
    South: {
      customers: customers.filter(c => c.newTerritory === 'South').length,
      zips: zipAssignments.filter(z => z.territory === 'South').length,
    },
  };

  // Conflicting routes
  const conflictingRoutes = routeConflicts.filter(r => r.hasConflict);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-green-50">
        <CardContent className="p-4">
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            FINAL MIAMI TERRITORY MAP
          </h2>
          <p className="text-sm text-slate-600">
            Finalized territory assignments with route conflict analysis. 
            ZIP codes are assigned to North, Central, or South territories.
          </p>
        </CardContent>
      </Card>

      {/* Filters and Export */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search customer, address, or ZIP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <Select value={selectedRoute} onValueChange={setSelectedRoute}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Filter by route" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Routes</SelectItem>
                {uniqueRoutes.map(route => {
                  const conflict = getRouteConflictInfo(route);
                  return (
                    <SelectItem key={route} value={route}>
                      <span className="flex items-center gap-2">
                        {conflict?.hasConflict && (
                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                        )}
                        {route}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportCustomers('all')}
                className="gap-1"
              >
                <Download className="h-4 w-4" />
                Export All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportCustomers('North')}
                className="gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <Download className="h-4 w-4" />
                North
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportCustomers('Central')}
                className="gap-1 border-green-300 text-green-700 hover:bg-green-50"
              >
                <Download className="h-4 w-4" />
                Central
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportCustomers('South')}
                className="gap-1 border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <Download className="h-4 w-4" />
                South
              </Button>
            </div>
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
                    fillColor: getTerritoryColor(zip.territory, 0.4),
                    fillOpacity: 0.4,
                    strokeColor: getTerritoryBorderColor(zip.territory),
                    strokeOpacity: 0.8,
                    strokeWeight: selectedZip === zip.zip ? 3 : 1,
                  }}
                  onClick={() => setSelectedZip(zip.zip)}
                />
              );
            })}

            {/* Customer markers */}
            {filteredCustomers
              .filter(c => c.latitude && c.longitude)
              .map((customer) => {
                const conflictInfo = getRouteConflictInfo(customer.route);
                const isConflictRoute = conflictInfo?.hasConflict;
                
                return (
                  <MarkerF
                    key={customer.customerNumber}
                    position={{ lat: customer.latitude!, lng: customer.longitude! }}
                    icon={{
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 6,
                      fillColor: isConflictRoute ? '#ef4444' : getTerritoryBorderColor(customer.newTerritory),
                      fillOpacity: 0.9,
                      strokeColor: '#ffffff',
                      strokeWeight: 1,
                    }}
                    onClick={() => setSelectedZip(customer.customerNumber)}
                  />
                );
              })}

            {/* Info window for selected customer */}
            {selectedZip && customers.find(c => c.customerNumber === selectedZip) && (() => {
              const customer = customers.find(c => c.customerNumber === selectedZip)!;
              const conflictInfo = getRouteConflictInfo(customer.route);
              
              return (
                <InfoWindowF
                  position={{ lat: customer.latitude!, lng: customer.longitude! }}
                  onCloseClick={() => setSelectedZip(null)}
                >
                  <div className="p-2 min-w-[250px]">
                    <h3 className="font-bold text-sm">{customer.accountName}</h3>
                    <p className="text-xs text-gray-600">{customer.customerNumber}</p>
                    <div className="mt-2 space-y-1 text-xs">
                      <p><strong>Address:</strong> {customer.address}</p>
                      <p><strong>City:</strong> {customer.city}, {customer.state} {customer.zip}</p>
                      <p><strong>Route:</strong> {customer.route}</p>
                      <p><strong>Service:</strong> {customer.serviceDays}</p>
                      <p>
                        <strong>Territory:</strong>{' '}
                        <span 
                          className="font-semibold px-1.5 py-0.5 rounded"
                          style={{ 
                            backgroundColor: getTerritoryColor(customer.newTerritory, 0.2),
                            color: getTerritoryBorderColor(customer.newTerritory)
                          }}
                        >
                          APS Miami - {customer.newTerritory}
                        </span>
                      </p>
                      {conflictInfo?.hasConflict && (
                        <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-200">
                          <p className="font-semibold text-amber-800 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Route Conflict
                          </p>
                          <p className="text-amber-700">
                            This route spans {Object.keys(conflictInfo.territories).length} territories:
                          </p>
                          <ul className="mt-1">
                            {Object.entries(conflictInfo.territories).map(([t, count]) => (
                              <li key={t} className="text-amber-600">
                                {t}: {count} customers
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </InfoWindowF>
              );
            })()}

            {/* Info window for selected ZIP */}
            {selectedZip && zipAssignments.find(z => z.zip === selectedZip) && (
              <InfoWindowF
                position={{
                  lat: zipAssignments.find(z => z.zip === selectedZip)!.latitude,
                  lng: zipAssignments.find(z => z.zip === selectedZip)!.longitude,
                }}
                onCloseClick={() => setSelectedZip(null)}
              >
                <div className="p-2">
                  <h3 className="font-bold">ZIP: {selectedZip}</h3>
                  <p className="text-sm">
                    {zipAssignments.find(z => z.zip === selectedZip)?.city}
                  </p>
                  <p className="text-sm mt-1">
                    <strong>Territory:</strong>{' '}
                    APS Miami - {zipAssignments.find(z => z.zip === selectedZip)?.territory}
                  </p>
                  <p className="text-sm">
                    <strong>Accounts:</strong>{' '}
                    {zipAssignments.find(z => z.zip === selectedZip)?.accountCount}
                  </p>
                </div>
              </InfoWindowF>
            )}
          </GoogleMap>
        </CardContent>
      </Card>

      {/* Territory Statistics */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold mb-4">Final Territory Distribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(['North', 'Central', 'South'] as const).map((territory) => (
              <div key={territory} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: getTerritoryBorderColor(territory) }}
                  />
                  <h4 className="font-medium">APS Miami - {territory}</h4>
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customers:</span>
                    <span className="font-semibold">{stats[territory].customers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ZIP Codes:</span>
                    <span className="font-semibold">{stats[territory].zips}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Total:</span>
              <span>{customers.length} customers in {zipAssignments.length} ZIP codes</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Route Conflicts */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Route Conflicts ({conflictingRoutes.length} of {routeConflicts.length} routes)
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Click on a route card to see which customers need reassignment. Customers in territories 
            other than the route&apos;s primary assignment are shown first in red.
          </p>
          
          <div className="space-y-3">
            {conflictingRoutes.map((conflict) => {
              const isExpanded = expandedRoutes.has(conflict.route);
              const { needsReassignment, noReassignment } = getRouteCustomers(conflict.route, conflict.primaryTerritory);
              
              return (
                <div 
                  key={conflict.route}
                  className="bg-amber-50 border border-amber-200 rounded-lg overflow-hidden"
                >
                  {/* Clickable Header */}
                  <div 
                    className="p-3 cursor-pointer hover:bg-amber-100 transition-colors"
                    onClick={() => toggleRouteExpand(conflict.route)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-amber-600" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-amber-600" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{conflict.route}</p>
                          <p className="text-xs text-muted-foreground">
                            {conflict.totalCustomers} total customers • 
                            <span className="text-red-600 font-medium"> {needsReassignment.length} need reassignment</span>
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                        {Object.keys(conflict.territories).length} territories
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1 ml-6">
                      {Object.entries(conflict.territories)
                        .sort((a, b) => b[1] - a[1])
                        .map(([territory, count]) => (
                          <Badge 
                            key={territory}
                            variant="secondary"
                            style={{
                              backgroundColor: getTerritoryColor(territory, 0.2),
                              color: getTerritoryBorderColor(territory),
                              borderColor: getTerritoryBorderColor(territory),
                            }}
                            className="text-xs border"
                          >
                            {territory}: {count}
                          </Badge>
                        ))}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground ml-6">
                      Primary Assignment: <strong className="text-green-700">{conflict.primaryTerritory}</strong>
                    </p>
                  </div>

                  {/* Expanded Customer List */}
                  {isExpanded && (
                    <div className="border-t border-amber-200 bg-white">
                      {/* Customers Needing Reassignment */}
                      {needsReassignment.length > 0 && (
                        <div className="p-3 bg-red-50">
                          <h5 className="text-xs font-semibold text-red-800 mb-2 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            NEEDS REASSIGNMENT ({needsReassignment.length})
                          </h5>
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {needsReassignment
                              .sort((a, b) => a.newTerritory.localeCompare(b.newTerritory))
                              .map((customer) => (
                                <div 
                                  key={customer.customerNumber}
                                  className="flex items-center justify-between text-xs p-2 rounded border"
                                  style={{
                                    backgroundColor: getTerritoryColor(customer.newTerritory, 0.15),
                                    borderColor: getTerritoryBorderColor(customer.newTerritory),
                                  }}
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{customer.accountName}</p>
                                    <p className="text-muted-foreground truncate">
                                      {customer.address}, {customer.city} {customer.zip}
                                    </p>
                                  </div>
                                  <Badge 
                                    variant="outline"
                                    className="ml-2 shrink-0 text-xs"
                                    style={{
                                      backgroundColor: getTerritoryColor(customer.newTerritory, 0.3),
                                      borderColor: getTerritoryBorderColor(customer.newTerritory),
                                      color: getTerritoryBorderColor(customer.newTerritory),
                                    }}
                                  >
                                    {customer.newTerritory}
                                  </Badge>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Customers Not Needing Reassignment */}
                      <div className="p-3 bg-green-50">
                        <h5 className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          NO REASSIGNMENT NEEDED ({noReassignment.length})
                        </h5>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {noReassignment
                            .sort((a, b) => a.zip.localeCompare(b.zip))
                            .map((customer) => (
                              <div 
                                key={customer.customerNumber}
                                className="flex items-center justify-between text-xs p-2 rounded bg-green-100/50 border border-green-200"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{customer.accountName}</p>
                                  <p className="text-muted-foreground truncate">
                                    {customer.address}, {customer.city} {customer.zip}
                                  </p>
                                </div>
                                <Badge 
                                  variant="outline"
                                  className="ml-2 shrink-0 text-xs bg-green-100 border-green-400 text-green-700"
                                >
                                  {customer.newTerritory}
                                </Badge>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Non-conflicting routes */}
          <div className="mt-6 pt-4 border-t">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Clean Routes ({routeConflicts.length - conflictingRoutes.length} routes)
            </h4>
            <div className="flex flex-wrap gap-2">
              {routeConflicts
                .filter(r => !r.hasConflict)
                .map((route) => (
                  <Badge 
                    key={route.route}
                    variant="outline"
                    style={{
                      backgroundColor: getTerritoryColor(route.primaryTerritory, 0.1),
                      borderColor: getTerritoryBorderColor(route.primaryTerritory),
                    }}
                  >
                    {route.route} ({route.totalCustomers})
                  </Badge>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
