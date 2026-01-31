'use client';

import { useState, useEffect, useMemo } from 'react';
import { GoogleMap, MarkerF, InfoWindowF, PolygonF } from '@react-google-maps/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle } from 'lucide-react';
import { MAP_CONTAINER_STYLE as mapContainerStyle } from '@/lib/map-config';

interface RouteAssignment {
  customerNumber: string;
  customerName: string;
  latitude: number;
  longitude: number;
  zipCode: string;
  city?: string; // Added city field
  territory: string;
  technician: string;
  route: string;
  daysOfService: string[];
  region: string;
  address: string;
  monthlyPrice?: number; // Added pricing fields
  yearlyPrice?: number;
  newTerritory?: string;
}

interface Office {
  zipCode: string;
  area: string;
  fullName: string;
  category: string;
  label: string;
  lat: number;
  lng: number;
}

interface RoutesMapViewProps {
  areaFilter: string;
  onAreaChange: (area: string) => void;
}

const center = {
  lat: 33.4484,
  lng: -112.0740,
};

const getAreaColor = (area: string): string => {
  const colors: Record<string, string> = {
    West: '#3b82f6',
    Central: '#10b981',
    East: '#f97316',
    Tucson: '#ec4899',
    Commercial: '#8b5cf6',
  };
  return colors[area] || '#6b7280';
};

export function RoutesMapView({ areaFilter, onAreaChange }: RoutesMapViewProps) {
  const [routes, setRoutes] = useState<RouteAssignment[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [boundaries, setBoundaries] = useState<any>(null);
  const [selectedTechnician, setSelectedTechnician] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<RouteAssignment | null>(null);
  const [technicians, setTechnicians] = useState<string[]>([]);
  const [mapCenter, setMapCenter] = useState(center);
  const [mapZoom, setMapZoom] = useState(10);

  useEffect(() => {
    // Load route assignments
    fetch('/route-assignments.json')
      .then((res) => res.json())
      .then((data) => {
        setRoutes(data);

        // Extract unique technicians and sort
        const uniqueTechs = Array.from(new Set(data.map((r: RouteAssignment) => r.technician))) as string[];
        uniqueTechs.sort();
        setTechnicians(uniqueTechs);
      })
      .catch((error) => {
        console.error('❌ Error loading routes:', error);
      });

    // Load office locations
    fetch('/office-locations.json')
      .then((res) => res.json())
      .then((data) => setOffices(data))
      .catch((error) => console.error('❌ Error loading offices:', error));

    // Load territory boundaries
    fetch('/az-zip-boundaries.json')
      .then((res) => res.json())
      .then((data) => setBoundaries(data))
      .catch((error) => console.error('❌ Error loading boundaries:', error));
  }, []);

  // Memoize technician stop counts to prevent recalculation on every render
  const technicianStopCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    routes.forEach((route) => {
      counts[route.technician] = (counts[route.technician] || 0) + 1;
    });
    return counts;
  }, [routes]);

  // Memoize territory breakdown per technician
  const technicianTerritoryBreakdown = useMemo(() => {
    const breakdown: Record<string, Record<string, number>> = {};
    routes.forEach((route) => {
      if (!breakdown[route.technician]) {
        breakdown[route.technician] = {};
      }
      const territory = route.territory || 'Unknown';
      breakdown[route.technician][territory] = (breakdown[route.technician][territory] || 0) + 1;
    });
    return breakdown;
  }, [routes]);

  // Memoize filtered routes to prevent infinite loops in useEffect
  const filteredRoutes = useMemo(() => {
    return routes.filter((route) => {
      // MUST select a technician first
      if (!selectedTechnician) {
        return false;
      }

      // Filter by technician
      if (route.technician !== selectedTechnician) {
        return false;
      }

      // Filter by territory
      if (areaFilter !== 'all' && route.territory !== areaFilter) {
        return false;
      }

      // Filter by day
      if (selectedDay !== 'all') {
        // Safety check: ensure daysOfService is an array
        if (!Array.isArray(route.daysOfService)) {
          console.warn('Invalid daysOfService for route:', route.customerNumber);
          return false;
        }
        return route.daysOfService.includes(selectedDay);
      }

      return true;
    });
  }, [routes, selectedTechnician, areaFilter, selectedDay]);

  // Get available territories for the selected technician
  const availableTerritories = useMemo(() => {
    if (!selectedTechnician) return ['all'];
    const territories = technicianTerritoryBreakdown[selectedTechnician] || {};
    return ['all', ...Object.keys(territories).sort()];
  }, [selectedTechnician, technicianTerritoryBreakdown]);

  // Auto-adjust area filter when technician changes
  useEffect(() => {
    if (selectedTechnician) {
      const territories = technicianTerritoryBreakdown[selectedTechnician] || {};
      const territoryList = Object.keys(territories);
      
      // If current filter is not in technician's territories, reset to 'all'
      if (areaFilter !== 'all' && !territoryList.includes(areaFilter)) {
        onAreaChange('all');
        return; // Exit early to prevent double updates
      }
      
      // If technician only has one territory, auto-select it (only if not already selected)
      if (territoryList.length === 1 && areaFilter === 'all') {
        const singleTerritory = territoryList[0];
        onAreaChange(singleTerritory);
      }
    }
  }, [selectedTechnician, technicianTerritoryBreakdown, areaFilter]);

  // Update map center when technician is selected
  useEffect(() => {
    if (selectedTechnician && filteredRoutes.length > 0) {
      // Calculate center of technician's route
      const avgLat = filteredRoutes.reduce((sum, r) => sum + r.latitude, 0) / filteredRoutes.length;
      const avgLng = filteredRoutes.reduce((sum, r) => sum + r.longitude, 0) / filteredRoutes.length;
      setMapCenter({ lat: avgLat, lng: avgLng });
      setMapZoom(13); // Increased from 12 to 13 for better address-level visibility
    } else {
      setMapCenter(center);
      setMapZoom(10);
    }
  }, [selectedTechnician, filteredRoutes]);

  // Helper function to convert geometry to paths
  const convertGeometryToPaths = (geometry: any) => {
    try {
      if (!geometry || !geometry.type || !geometry.coordinates) {
        return [];
      }

      if (geometry.type === 'Polygon') {
        return geometry.coordinates.map((ring: number[][]) =>
          ring.map((coord: number[]) => ({ lat: coord[1], lng: coord[0] }))
        );
      } else if (geometry.type === 'MultiPolygon') {
        return geometry.coordinates.flatMap((polygon: number[][][]) =>
          polygon.map((ring: number[][]) =>
            ring.map((coord: number[]) => ({ lat: coord[1], lng: coord[0] }))
          )
        );
      }
    } catch (error) {
      console.error('Error converting geometry:', error);
    }
    return [];
  };

  // Memoize territory polygons to prevent recalculation on every render
  const territoryPolygons = useMemo(() => {
    if (!boundaries || !boundaries.features) {
      console.warn('⚠️ No boundary data available');
      return [];
    }
    if (!selectedTechnician) return [];

    try {
      // Only get ZIPs for the selected technician's routes to reduce polygon count
      const technicianZips = new Set(
        filteredRoutes.map((route) => route.zipCode)
      );

      const polygons: any[] = [];
      const processedZips = new Set<string>();

      technicianZips.forEach((zip) => {
        // Avoid duplicate ZIPs
        if (processedZips.has(zip)) return;
        processedZips.add(zip);

        try {
          const feature = boundaries.features.find(
            (f: any) => f.properties?.ZCTA5CE10 === zip
          );

          if (feature?.geometry) {
            const paths = convertGeometryToPaths(feature.geometry);
            if (paths && paths.length > 0) {
              // Find the territory for this ZIP
              const route = filteredRoutes.find((r) => r.zipCode === zip);
              const territory = route?.territory || 'Unknown';

              paths.forEach((path: any, idx: number) => {
                if (path && path.length > 0) {
                  polygons.push({
                    key: `${territory}-${zip}-${idx}`,
                    paths: path,
                    territory,
                    zip,
                  });
                }
              });
            }
          }
        } catch (error) {
          console.error(`❌ Error processing ZIP ${zip}:`, error);
        }
      });

      return polygons;
    } catch (error) {
      console.error('❌ Error in getTerritoryPolygons:', error);
      return [];
    }
  }, [boundaries, selectedTechnician, filteredRoutes]);

  // Memoize stats calculation
  const stats = useMemo(() => ({
    totalAccounts: filteredRoutes.length,
    territories: Array.from(new Set(filteredRoutes.map((r) => r.territory))),
    zips: Array.from(new Set(filteredRoutes.map((r) => r.zipCode))),
  }), [filteredRoutes]);

  // Check if Google Maps is loaded
  const isGoogleLoaded = typeof google !== 'undefined' && google.maps;

  if (!isGoogleLoaded) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading Google Maps...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Territory (Optional)
              {selectedTechnician && availableTerritories.length > 1 && (
                <span className="text-xs text-muted-foreground ml-2">
                  ({availableTerritories.length - 1} available)
                </span>
              )}
            </label>
            <Select value={areaFilter} onValueChange={onAreaChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Territories</SelectItem>
                {availableTerritories
                  .filter(t => t !== 'all')
                  .map(territory => {
                    const stopCount = selectedTechnician 
                      ? (technicianTerritoryBreakdown[selectedTechnician]?.[territory] || 0)
                      : 0;
                    const labels: Record<string, string> = {
                      'West': 'APS of Glendale (West)',
                      'Central': 'APS of Scottsdale (Central)',
                      'East': 'APS of Chandler (East)',
                      'Tucson': 'APS of Tucson'
                    };
                    return (
                      <SelectItem key={territory} value={territory}>
                        {labels[territory] || territory}
                        {selectedTechnician && stopCount > 0 && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({stopCount} stops)
                          </span>
                        )}
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Select Technician <span className="text-red-500">*</span> ({technicians.length})
            </label>
            <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
              <SelectTrigger className={!selectedTechnician ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select a technician..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {technicians.map((tech) => {
                  const totalStops = technicianStopCounts[tech] || 0;
                  const territories = technicianTerritoryBreakdown[tech] || {};
                  const territoryDisplay = Object.entries(territories)
                    .sort(([, a], [, b]) => b - a) // Sort by count descending
                    .map(([territory, count]) => `${territory}: ${count}`)
                    .join(', ');
                  
                  return (
                    <SelectItem key={tech} value={tech}>
                      <div className="flex flex-col">
                        <span className="font-medium">{tech} ({totalStops} stops)</span>
                        {territoryDisplay && (
                          <span className="text-xs text-muted-foreground mt-0.5">
                            {territoryDisplay}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Day of Service (Optional)</label>
            <Select value={selectedDay} onValueChange={setSelectedDay}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Days</SelectItem>
                <SelectItem value="Monday">Monday</SelectItem>
                <SelectItem value="Tuesday">Tuesday</SelectItem>
                <SelectItem value="Wednesday">Wednesday</SelectItem>
                <SelectItem value="Thursday">Thursday</SelectItem>
                <SelectItem value="Friday">Friday</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {!selectedTechnician && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Select a technician to view their route</strong> - This shows how an individual&apos;s route 
              crosses different territories and ZIP codes. The map will zoom to their service area.
            </div>
          </div>
        )}

        {/* Stats */}
        {selectedTechnician && (
          <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Service Stops:</span>{' '}
              <span className="font-semibold">{stats.totalAccounts}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Territories Covered:</span>{' '}
              <span className="font-semibold">{stats.territories.length}</span>
              {stats.territories.length > 0 && (
                <span className="text-xs text-muted-foreground ml-1">
                  ({stats.territories.join(', ')})
                </span>
              )}
            </div>
            <div>
              <span className="text-muted-foreground">ZIP Codes:</span>{' '}
              <span className="font-semibold">{stats.zips.length}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Map */}
      <Card className="p-4">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={mapCenter}
          zoom={mapZoom}
          options={{
            mapTypeId: 'roadmap',
            streetViewControl: false,
            mapTypeControl: true,
          }}
        >
            {/* Territory boundaries */}
            {territoryPolygons.map((polygon) => (
              <PolygonF
                key={polygon.key}
                paths={polygon.paths}
                options={{
                  fillColor: getAreaColor(polygon.territory),
                  fillOpacity: 0.1,
                  strokeColor: getAreaColor(polygon.territory),
                  strokeOpacity: 0.4,
                  strokeWeight: 1,
                }}
              />
            ))}

            {/* Office markers */}
            {offices
              .filter((office) => areaFilter === 'all' || office.area === areaFilter)
              .map((office) => {
                const color = office.category === 'NEXT YEAR' ? '#ef4444' : '#f97316';
                return (
                  <MarkerF
                    key={office.zipCode}
                    position={{ lat: office.lat, lng: office.lng }}
                    icon={{
                      path: 'M 0,-24 6,-7 24,-7 10,4 15,22 0,11 -15,22 -10,4 -24,-7 -6,-7 Z',
                      fillColor: color,
                      fillOpacity: 1,
                      strokeColor: '#ffffff',
                      strokeWeight: 2,
                      scale: 0.7,
                    }}
                  />
                );
              })}

            {/* Route account markers */}
            {filteredRoutes
              .filter((route) => {
                // Safety check: ensure valid coordinates
                const hasValidCoords = 
                  route.latitude && 
                  route.longitude && 
                  !isNaN(route.latitude) && 
                  !isNaN(route.longitude) &&
                  route.latitude >= -90 && 
                  route.latitude <= 90 &&
                  route.longitude >= -180 && 
                  route.longitude <= 180;
                
                if (!hasValidCoords) {
                  console.warn('⚠️ Invalid coordinates for:', route.customerNumber, route.latitude, route.longitude);
                }
                
                return hasValidCoords && route.customerNumber;
              })
              .map((route) => (
                <MarkerF
                  key={route.customerNumber}
                  position={{ lat: route.latitude, lng: route.longitude }}
                  onClick={() => setSelectedAccount(route)}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: getAreaColor(route.territory),
                    fillOpacity: 0.9,
                    strokeColor: '#ffffff',
                    strokeWeight: 1.5,
                    scale: 7, // Increased from 6 to 7 for better visibility
                  }}
                />
              ))}

            {/* Info window */}
            {selectedAccount && (
              <InfoWindowF
                position={{ lat: selectedAccount.latitude, lng: selectedAccount.longitude }}
                onCloseClick={() => setSelectedAccount(null)}
              >
                <div className="p-2">
                  <h3 className="font-semibold text-sm mb-1">{selectedAccount.customerName || 'Unknown'}</h3>
                  <div className="text-xs space-y-1">
                    <p><strong>Account:</strong> {selectedAccount.customerNumber || 'N/A'}</p>
                    <p><strong>Address:</strong> {selectedAccount.address || 'N/A'}</p>
                    <p><strong>Location:</strong> {
                      selectedAccount.city && selectedAccount.city !== 'null' 
                        ? `${selectedAccount.city}, AZ ${selectedAccount.zipCode || ''}`
                        : `AZ ${selectedAccount.zipCode || ''}`
                    }</p>
                    {selectedAccount.newTerritory && (
                      <p><strong>New Territory:</strong> {selectedAccount.newTerritory}</p>
                    )}
                    <p><strong>Technician:</strong> {selectedAccount.technician || 'N/A'}</p>
                    <p><strong>Days:</strong> {Array.isArray(selectedAccount.daysOfService) 
                      ? selectedAccount.daysOfService.join(', ') 
                      : 'N/A'}</p>
                    {(selectedAccount.monthlyPrice || selectedAccount.yearlyPrice) && (
                      <div className="border-t pt-1 mt-1">
                        {selectedAccount.monthlyPrice && selectedAccount.monthlyPrice > 0 && (
                          <p><strong>Monthly Price:</strong> ${selectedAccount.monthlyPrice.toFixed(2)}</p>
                        )}
                        {selectedAccount.yearlyPrice && selectedAccount.yearlyPrice > 0 && (
                          <p><strong>Yearly Price:</strong> ${selectedAccount.yearlyPrice.toFixed(2)}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </InfoWindowF>
            )}
        </GoogleMap>
      </Card>

      {/* Account Listing Table */}
      {selectedTechnician && filteredRoutes.length > 0 && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">
            Account Listing ({filteredRoutes.length} {filteredRoutes.length === 1 ? 'account' : 'accounts'})
          </h3>
          <div className="rounded-md border overflow-auto max-h-[600px]">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[120px]">Account #</TableHead>
                  <TableHead className="min-w-[200px]">Customer Name</TableHead>
                  <TableHead className="min-w-[250px]">Street Address</TableHead>
                  <TableHead className="w-[140px]">City</TableHead>
                  <TableHead className="w-[80px]">State</TableHead>
                  <TableHead className="w-[90px]">ZIP Code</TableHead>
                  <TableHead className="min-w-[150px]">Days of Service</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoutes
                  .sort((a, b) => a.customerNumber.localeCompare(b.customerNumber))
                  .map((route) => (
                    <TableRow key={route.customerNumber} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{route.customerNumber}</TableCell>
                      <TableCell>{route.customerName || 'Unknown'}</TableCell>
                      <TableCell>{route.address || 'N/A'}</TableCell>
                      <TableCell>{route.city || 'N/A'}</TableCell>
                      <TableCell>AZ</TableCell>
                      <TableCell>{route.zipCode || 'N/A'}</TableCell>
                      <TableCell>
                        {Array.isArray(route.daysOfService) 
                          ? route.daysOfService.join(', ') 
                          : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
