'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleMap, MarkerF, InfoWindowF, PolygonF } from '@react-google-maps/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { AlertCircle, Building2, MapPin, DollarSign, Users, Calendar, TrendingUp, ArrowUpDown } from 'lucide-react';

// Location configuration
const LOCATION_CONFIG = {
  dallas: {
    name: 'Dallas',
    center: { lat: 32.7767, lng: -96.7970 },
    zoom: 10,
  },
  orlando: {
    name: 'Orlando',
    center: { lat: 28.5383, lng: -81.3792 },
    zoom: 10,
  },
  portCharlotte: {
    name: 'Port Charlotte',
    center: { lat: 26.9762, lng: -82.0909 },
    zoom: 11,
  },
  miami: {
    name: 'Miami',
    center: { lat: 25.7617, lng: -80.1918 },
    zoom: 10,
  },
  jacksonville: {
    name: 'Jacksonville',
    center: { lat: 30.3322, lng: -81.6557 },
    zoom: 10,
  },
};

const mapContainerStyle = {
  width: '100%',
  height: '600px',
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

interface CommercialAccount {
  customerNumber: string;
  accountName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
  monthlyPrice: number;
  yearlyPrice: number;
  routeTech: string;
  territory: string;
  dayOfService: string;
  accountType: string;
}

interface RouteAssignment extends CommercialAccount {}

// Generic Commercial Accounts View
export function LocationCommercialView({ location }: { location: string }) {
  const [accounts, setAccounts] = useState<CommercialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<CommercialAccount | null>(null);
  const [hoveredAccount, setHoveredAccount] = useState<string | null>(null);

  const config = LOCATION_CONFIG[location as keyof typeof LOCATION_CONFIG];

  useEffect(() => {
    fetch(`/${location}-commercial-accounts.json`)
      .then(res => res.json())
      .then(data => {
        setAccounts(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading commercial accounts:', err);
        setError(`Failed to load ${config.name} commercial accounts`);
        setLoading(false);
      });
  }, [location, config.name]);

  const handleMarkerClick = useCallback((account: CommercialAccount) => {
    setSelectedAccount(account);
  }, []);

  const totalRevenue = accounts.reduce((sum, acc) => sum + acc.monthlyPrice, 0);
  const totalYearlyRevenue = totalRevenue * 12;

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="ml-3">Loading {config.name} commercial accounts...</span>
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
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Building2 className="w-4 h-4" />
            <span className="text-sm">Total Accounts</span>
          </div>
          <div className="text-2xl font-bold">{accounts.length}</div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">Monthly Revenue</span>
          </div>
          <div className="text-2xl font-bold text-green-600">
            ${totalRevenue.toLocaleString()}
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">Yearly Revenue</span>
          </div>
          <div className="text-2xl font-bold text-green-600">
            ${totalYearlyRevenue.toLocaleString()}
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">Unique ZIPs</span>
          </div>
          <div className="text-2xl font-bold">
            {[...new Set(accounts.map(a => a.zip))].length}
          </div>
        </Card>
      </div>

      {/* Map */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Commercial Accounts Map
        </h3>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={config.center}
          zoom={config.zoom}
          options={mapOptions}
        >
          {accounts.map(account => (
            <MarkerF
              key={account.customerNumber}
              position={{
                lat: account.latitude,
                lng: account.longitude,
              }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: hoveredAccount === account.customerNumber ? 12 : 8,
                fillColor: '#8b5cf6',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              }}
              onClick={() => handleMarkerClick(account)}
              onMouseOver={() => setHoveredAccount(account.customerNumber)}
              onMouseOut={() => setHoveredAccount(null)}
            />
          ))}

          {selectedAccount && (
            <InfoWindowF
              position={{
                lat: selectedAccount.latitude,
                lng: selectedAccount.longitude,
              }}
              onCloseClick={() => setSelectedAccount(null)}
            >
              <div className="p-2">
                <h4 className="font-semibold text-lg">{selectedAccount.accountName}</h4>
                <p className="text-sm text-gray-600 mb-2">{selectedAccount.customerNumber}</p>
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="font-medium">Address:</span> {selectedAccount.address}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">City:</span> {selectedAccount.city}, {selectedAccount.state} {selectedAccount.zip}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Territory:</span> {selectedAccount.territory}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Technician:</span> {selectedAccount.routeTech}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Service Day:</span> {selectedAccount.dayOfService}
                  </p>
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-sm font-semibold text-green-600">
                      Monthly: ${selectedAccount.monthlyPrice.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      Yearly: ${selectedAccount.yearlyPrice.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </InfoWindowF>
          )}
        </GoogleMap>
      </Card>

      {/* Accounts Table */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          All Commercial Accounts ({accounts.length})
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
                <TableHead>Territory</TableHead>
                <TableHead>Technician</TableHead>
                <TableHead>Service Day</TableHead>
                <TableHead className="text-right">Monthly Price</TableHead>
                <TableHead className="text-right">Yearly Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map(account => (
                <TableRow 
                  key={account.customerNumber}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleMarkerClick(account)}
                >
                  <TableCell className="font-medium">{account.customerNumber}</TableCell>
                  <TableCell>{account.accountName}</TableCell>
                  <TableCell>{account.address}</TableCell>
                  <TableCell>{account.city}</TableCell>
                  <TableCell>{account.zip}</TableCell>
                  <TableCell>
                    <Badge variant="default" className="bg-violet-500">
                      {account.territory}
                    </Badge>
                  </TableCell>
                  <TableCell>{account.routeTech}</TableCell>
                  <TableCell>{account.dayOfService}</TableCell>
                  <TableCell className="text-right font-semibold text-green-600">
                    ${account.monthlyPrice.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    ${account.yearlyPrice.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Total Commercial Revenue:</span>
            <div className="flex gap-4">
              <span>
                <span className="text-sm text-gray-600">Monthly:</span>{' '}
                <span className="font-bold text-green-600">
                  ${totalRevenue.toLocaleString()}
                </span>
              </span>
              <span>
                <span className="text-sm text-gray-600">Yearly:</span>{' '}
                <span className="font-bold text-green-600">
                  ${totalYearlyRevenue.toLocaleString()}
                </span>
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Generic Routes View
export function LocationRoutesView({ location }: { location: string }) {
  const [routes, setRoutes] = useState<RouteAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTechnician, setSelectedTechnician] = useState<string>('all');
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<RouteAssignment | null>(null);
  const [hoveredCustomer, setHoveredCustomer] = useState<string | null>(null);

  const config = LOCATION_CONFIG[location as keyof typeof LOCATION_CONFIG];

  useEffect(() => {
    fetch(`/${location}-route-assignments.json`)
      .then(res => res.json())
      .then(data => {
        setRoutes(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading routes:', err);
        setError(`Failed to load ${config.name} routes`);
        setLoading(false);
      });
  }, [location, config.name]);

  const technicians = useMemo(() => {
    const techs = [...new Set(routes.map(r => r.routeTech).filter(Boolean))].sort();
    return techs;
  }, [routes]);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const filteredRoutes = useMemo(() => {
    return routes.filter(route => {
      if (selectedTechnician !== 'all' && route.routeTech !== selectedTechnician) return false;
      if (selectedDay !== 'all' && route.dayOfService !== selectedDay) return false;
      return true;
    });
  }, [routes, selectedTechnician, selectedDay]);

  const handleMarkerClick = useCallback((customer: RouteAssignment) => {
    setSelectedCustomer(customer);
  }, []);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="ml-3">Loading {config.name} routes...</span>
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
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Select Technician</label>
            <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
              <SelectTrigger>
                <SelectValue placeholder="Select a technician" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Technicians</SelectItem>
                {technicians.map(tech => (
                  <SelectItem key={tech} value={tech}>
                    {tech} ({routes.filter(r => r.routeTech === tech).length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Filter by Service Day</label>
            <Select value={selectedDay} onValueChange={setSelectedDay}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Days</SelectItem>
                {days.map(day => (
                  <SelectItem key={day} value={day}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="mt-4 flex gap-2 items-center">
          <Users className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium">
            Showing {filteredRoutes.length} of {routes.length} accounts
          </span>
        </div>
        
        {selectedTechnician === 'all' && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span><strong>Tip:</strong> Select a specific technician above to view the route map.</span>
            </p>
          </div>
        )}
      </Card>

      {/* Map */}
      {selectedTechnician !== 'all' && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Route Map - {selectedTechnician}
          </h3>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={config.center}
            zoom={config.zoom}
            options={mapOptions}
          >
            {filteredRoutes.map((route, index) => (
              <MarkerF
                key={route.customerNumber}
                position={{
                  lat: route.latitude,
                  lng: route.longitude,
                }}
                label={{
                  text: String(index + 1),
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: hoveredCustomer === route.customerNumber ? 16 : 12,
                  fillColor: '#3b82f6',
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 2,
                }}
                onClick={() => handleMarkerClick(route)}
                onMouseOver={() => setHoveredCustomer(route.customerNumber)}
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
                  <h4 className="font-semibold text-lg">{selectedCustomer.accountName}</h4>
                  <p className="text-sm text-gray-600 mb-2">{selectedCustomer.customerNumber}</p>
                  <div className="space-y-1">
                    <p className="text-sm">
                      <span className="font-medium">Address:</span> {selectedCustomer.address}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">City:</span> {selectedCustomer.city}, {selectedCustomer.state}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Service Day:</span> {selectedCustomer.dayOfService}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Territory:</span> {selectedCustomer.territory}
                    </p>
                    {selectedCustomer.monthlyPrice > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-sm font-semibold text-green-600">
                          ${selectedCustomer.monthlyPrice.toFixed(2)}/month
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </InfoWindowF>
            )}
          </GoogleMap>
        </Card>
      )}

      {/* Routes Table */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Route Assignments ({filteredRoutes.length})
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
                <TableHead>Technician</TableHead>
                <TableHead>Service Day</TableHead>
                <TableHead>Territory</TableHead>
                <TableHead className="text-right">Monthly Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoutes.map(route => (
                <TableRow 
                  key={route.customerNumber}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleMarkerClick(route)}
                >
                  <TableCell className="font-medium">{route.customerNumber}</TableCell>
                  <TableCell>{route.accountName}</TableCell>
                  <TableCell>{route.address}</TableCell>
                  <TableCell>{route.city}</TableCell>
                  <TableCell>{route.zip}</TableCell>
                  <TableCell>{route.routeTech}</TableCell>
                  <TableCell>
                    <Badge variant="default">
                      {route.dayOfService}
                    </Badge>
                  </TableCell>
                  <TableCell>{route.territory}</TableCell>
                  <TableCell className="text-right font-semibold text-green-600">
                    {route.monthlyPrice > 0 ? `$${route.monthlyPrice.toFixed(2)}` : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
