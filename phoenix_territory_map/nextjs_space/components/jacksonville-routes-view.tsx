'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleMap, MarkerF, InfoWindowF, PolygonF } from '@react-google-maps/api';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { AlertCircle, Users, MapPin, Calendar } from 'lucide-react';

interface RouteAssignment {
  customerNumber: string;
  customerName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
  monthlyPrice: number;
  yearlyPrice: number;
  technician: string;
  territory: string;
  dayOfWeek: string;
  accountType: string;
  status: string;
}

const mapContainerStyle = {
  width: '100%',
  height: '600px',
};

const jacksonvilleCenter = {
  lat: 30.3322,
  lng: -81.6557,
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
  ],
};

const getTerritoryColor = (territory: string): string => {
  const colors: Record<string, string> = {
    'JAX - Maint Ponte Vedra': '#06b6d4',
    'JAX - Maint Jacksonville': '#2563eb',
    'JAX - Maint St. Augustine': '#14b8a6',
    'JAX - Maint St. Johns': '#10b981',
    'JAX - Maint Nocatee': '#84cc16',
    'JAX - Maint Beaches': '#0ea5e9',
    'JAX - Maint Outskirts': '#6366f1',
    'JAX - Comm Maint': '#8b5cf6',
  };
  return colors[territory] || '#6b7280';
};

const getDayColor = (day: string): string => {
  const colors: Record<string, string> = {
    Monday: '#3b82f6',
    Tuesday: '#10b981',
    Wednesday: '#f59e0b',
    Thursday: '#ec4899',
    Friday: '#8b5cf6',
    Saturday: '#06b6d4',
    Sunday: '#ef4444',
  };
  return colors[day] || '#6b7280';
};

export function JacksonvilleRoutesView() {
  const [routes, setRoutes] = useState<RouteAssignment[]>([]);
  const [boundaries, setBoundaries] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTechnician, setSelectedTechnician] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<RouteAssignment | null>(null);
  const [hoveredCustomer, setHoveredCustomer] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/jacksonville-route-assignments.json').then(res => res.json()),
      fetch('/jacksonville-zip-boundaries.json').then(res => res.json())
    ])
      .then(([routeData, boundaryData]) => {
        setRoutes(routeData);
        setBoundaries(boundaryData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading routes:', err);
        setError('Failed to load Jacksonville route data');
        setLoading(false);
      });
  }, []);

  const technicians = useMemo(() => {
    const techMap: Record<string, { count: number; territories: Set<string> }> = {};
    
    routes.forEach(route => {
      if (!techMap[route.technician]) {
        techMap[route.technician] = { count: 0, territories: new Set() };
      }
      techMap[route.technician].count++;
      techMap[route.technician].territories.add(route.territory);
    });
    
    return Object.entries(techMap)
      .map(([name, data]) => ({
        name,
        count: data.count,
        territories: Array.from(data.territories),
      }))
      .sort((a, b) => b.count - a.count);
  }, [routes]);

  const daysOfWeek = useMemo(() => {
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Sunday'];
    const uniqueDays = Array.from(new Set(routes.map(r => r.dayOfWeek))).filter(Boolean);
    const sortedDays = uniqueDays.sort((a, b) => {
      const indexA = dayOrder.indexOf(a);
      const indexB = dayOrder.indexOf(b);
      return indexA - indexB;
    });
    return ['all', ...sortedDays];
  }, [routes]);

  const filteredRoutes = useMemo(() => {
    let filtered = routes;
    
    if (selectedTechnician) {
      filtered = filtered.filter(r => r.technician === selectedTechnician);
    }
    
    if (selectedDay && selectedDay !== 'all') {
      filtered = filtered.filter(r => r.dayOfWeek === selectedDay);
    }
    
    return filtered;
  }, [routes, selectedTechnician, selectedDay]);

  const uniqueZips = useMemo(() => {
    return [...new Set(filteredRoutes.map(r => r.zip))];
  }, [filteredRoutes]);

  const routeStats = useMemo(() => {
    const dayStats: Record<string, number> = {};
    const territoryStats: Record<string, number> = {};
    
    filteredRoutes.forEach(route => {
      dayStats[route.dayOfWeek] = (dayStats[route.dayOfWeek] || 0) + 1;
      territoryStats[route.territory] = (territoryStats[route.territory] || 0) + 1;
    });
    
    return { dayStats, territoryStats };
  }, [filteredRoutes]);

  const handleMarkerClick = useCallback((customer: RouteAssignment) => {
    setSelectedCustomer(customer);
  }, []);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="ml-3">Loading Jacksonville routes...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center text-red-600">
          <AlertCircle className="mr-2" />
          <span>{error}</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Route Filters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Select Technician</label>
            <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
              <SelectTrigger>
                <SelectValue placeholder="Select technician..." />
              </SelectTrigger>
              <SelectContent>
                {technicians.map(tech => (
                  <SelectItem key={tech.name} value={tech.name}>
                    {tech.name} ({tech.count} stops) → {tech.territories.join(', ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Service Day</label>
            <Select value={selectedDay} onValueChange={setSelectedDay}>
              <SelectTrigger>
                <SelectValue placeholder="Select day..." />
              </SelectTrigger>
              <SelectContent>
                {daysOfWeek.map(day => (
                  <SelectItem key={day} value={day}>
                    {day === 'all' ? 'All Days' : day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {selectedTechnician && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm">
              <span className="font-semibold">Showing:</span> {filteredRoutes.length} stops
              {selectedDay !== 'all' && ` on ${selectedDay}`}
            </p>
          </div>
        )}
      </Card>

      {selectedTechnician && (
        <>
          {/* Route Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-sm text-gray-600 mb-1">Total Stops</div>
              <div className="text-2xl font-bold">{filteredRoutes.length}</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-gray-600 mb-1">Unique ZIPs</div>
              <div className="text-2xl font-bold">{uniqueZips.length}</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-gray-600 mb-1">Territories</div>
              <div className="text-2xl font-bold">{Object.keys(routeStats.territoryStats).length}</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-gray-600 mb-1">Service Days</div>
              <div className="text-2xl font-bold">{Object.keys(routeStats.dayStats).length}</div>
            </Card>
          </div>

          {/* Map */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Route Map - {selectedTechnician}
            </h3>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={jacksonvilleCenter}
              zoom={10}
              options={mapOptions}
            >
              {/* ZIP Boundaries */}
              {uniqueZips.map(zip => {
                const boundary = boundaries[zip];
                if (!boundary || !boundary.coordinates) return null;

                const polygons = boundary.type === 'MultiPolygon' 
                  ? boundary.coordinates 
                  : [boundary.coordinates];

                const zipRoutes = filteredRoutes.filter(r => r.zip === zip);
                const territory = zipRoutes[0]?.territory;

                return polygons.map((coords: any, idx: number) => {
                  const paths = (boundary.type === 'MultiPolygon' ? coords[0] : coords[0]).map((coord: number[]) => ({
                    lat: coord[1],
                    lng: coord[0],
                  }));

                  return (
                    <PolygonF
                      key={`${zip}-${idx}`}
                      paths={paths}
                      options={{
                        fillColor: getTerritoryColor(territory),
                        fillOpacity: 0.2,
                        strokeColor: getTerritoryColor(territory),
                        strokeOpacity: 0.6,
                        strokeWeight: 2,
                        clickable: false,
                      }}
                    />
                  );
                });
              })}

              {/* Customer Markers */}
              {filteredRoutes.map(customer => (
                <MarkerF
                  key={customer.customerNumber}
                  position={{
                    lat: customer.latitude,
                    lng: customer.longitude,
                  }}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: hoveredCustomer === customer.customerNumber ? 10 : 7,
                    fillColor: customer.accountType === 'Commercial' ? '#8b5cf6' : getDayColor(customer.dayOfWeek),
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                  }}
                  onClick={() => handleMarkerClick(customer)}
                  onMouseOver={() => setHoveredCustomer(customer.customerNumber)}
                  onMouseOut={() => setHoveredCustomer(null)}
                />
              ))}

              {selectedCustomer && (
                <InfoWindowF
                  position={{
                    lat: selectedCustomer.latitude,
                    lng: selectedCustomer.longitude,
                  }}
                  onCloseClick={() => setSelectedCustomer(null)}
                >
                  <div className="p-2">
                    <h4 className="font-semibold text-lg">{selectedCustomer.customerName}</h4>
                    <p className="text-sm text-gray-600 mb-2">{selectedCustomer.customerNumber}</p>
                    <div className="space-y-1">
                      <p className="text-sm">
                        <span className="font-medium">Address:</span> {selectedCustomer.address}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">City:</span> {selectedCustomer.city}, {selectedCustomer.zip}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Type:</span>{' '}
                        <Badge variant={selectedCustomer.accountType === 'Commercial' ? 'default' : 'secondary'}>
                          {selectedCustomer.accountType}
                        </Badge>
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Territory:</span> {selectedCustomer.territory}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Service Day:</span> {selectedCustomer.dayOfWeek}
                      </p>
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-sm font-semibold text-green-600">
                          Monthly: ${selectedCustomer.monthlyPrice.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </InfoWindowF>
              )}
            </GoogleMap>

            {/* Map Legend */}
            <div className="mt-4 flex items-center justify-center gap-4 flex-wrap">
              <span className="text-sm font-medium">Service Days:</span>
              {Object.entries(routeStats.dayStats).map(([day, count]) => (
                <div key={day} className="flex items-center gap-1">
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white"
                    style={{ backgroundColor: getDayColor(day) }}
                  />
                  <span className="text-xs">{day} ({count})</span>
                </div>
              ))}
              <div className="flex items-center gap-1">
                <div
                  className="w-4 h-4 rounded-full border-2 border-white"
                  style={{ backgroundColor: '#8b5cf6' }}
                />
                <span className="text-xs">Commercial</span>
              </div>
            </div>
          </Card>

          {/* Routes Table */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Route Details ({filteredRoutes.length} stops)
            </h3>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer #</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>ZIP</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Territory</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead className="text-right">Monthly Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoutes.map(customer => (
                    <TableRow 
                      key={customer.customerNumber}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleMarkerClick(customer)}
                    >
                      <TableCell className="font-medium">{customer.customerNumber}</TableCell>
                      <TableCell>{customer.customerName}</TableCell>
                      <TableCell>{customer.address}</TableCell>
                      <TableCell>{customer.city}</TableCell>
                      <TableCell>{customer.zip}</TableCell>
                      <TableCell>
                        <Badge variant={customer.accountType === 'Commercial' ? 'default' : 'secondary'}>
                          {customer.accountType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div
                          className="inline-block px-2 py-1 rounded text-xs text-white"
                          style={{ backgroundColor: getTerritoryColor(customer.territory) }}
                        >
                          {customer.territory}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div
                          className="inline-block px-2 py-1 rounded text-xs text-white"
                          style={{ backgroundColor: getDayColor(customer.dayOfWeek) }}
                        >
                          {customer.dayOfWeek}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        ${customer.monthlyPrice.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </>
      )}

      {!selectedTechnician && (
        <Card className="p-6">
          <div className="text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Please select a technician to view their routes</p>
          </div>
        </Card>
      )}
    </div>
  );
}
