"use client";

import { GoogleMap, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Building2, MapPin, ChevronDown, ChevronUp, Eye, EyeOff, Calendar, Users, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MAP_CONTAINER_STYLE as mapContainerStyle } from '@/lib/map-config';

interface CommercialAccount {
  customerNumber: string;
  accountName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  route: string;
  routeTech: string;
  daysOfServiceRaw: string;
  days: string[];
  monthlyPrice: number;
  oldTerritory: string;
  latitude: number;
  longitude: number;
}

const mapOptions = {
  styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }],
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
};

// Route colors
const ROUTE_COLORS: Record<string, string> = {
  '11 AFP Route Honatann B': '#3b82f6', // blue
  '14 AFP Route Jorge A': '#ef4444',     // red
  '15 AFP Route Kymani P': '#22c55e',    // green
  '2 AFP Route William A': '#f59e0b',    // amber
  '22 AFP Route Ramon R': '#8b5cf6',     // purple
  '23 AFP Route Juan C': '#ec4899',      // pink
  '25 AFP Route Carlos S': '#06b6d4',    // cyan
  '28 AFP Route Jean D': '#84cc16',      // lime
  '8 AFP Route Spartacus P': '#f97316',  // orange
  'Unassigned': '#6b7280',               // gray
};

// Day colors for the legend
const DAY_COLORS: Record<string, string> = {
  'Monday': '#3b82f6',
  'Tuesday': '#22c55e',
  'Wednesday': '#f59e0b',
  'Thursday': '#8b5cf6',
  'Friday': '#ef4444',
  'Saturday': '#06b6d4',
  'Sunday': '#ec4899',
  'Unknown': '#6b7280',
};

function getRouteColor(route: string): string {
  return ROUTE_COLORS[route] || '#6b7280';
}

export function MiamiCommercialRoutesView() {
  const [accounts, setAccounts] = useState<CommercialAccount[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [selectedRoutes, setSelectedRoutes] = useState<Set<string>>(new Set());
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['filters', 'accounts']));
  const mapRef = useRef<google.maps.Map | null>(null);

  const center = { lat: 25.82, lng: -80.20 };

  useEffect(() => {
    fetch('/miami-commercial-routes.json')
      .then(r => r.json())
      .then(data => setAccounts(data));
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

  // Get unique routes and days
  const uniqueRoutes = useMemo(() => {
    const routes = [...new Set(accounts.map(a => a.route))];
    return routes.sort((a, b) => {
      if (a === 'Unassigned') return 1;
      if (b === 'Unassigned') return -1;
      return a.localeCompare(b);
    });
  }, [accounts]);

  const uniqueDays = useMemo(() => {
    const days = new Set<string>();
    accounts.forEach(a => a.days.forEach(d => days.add(d)));
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Unknown'];
    return dayOrder.filter(d => days.has(d));
  }, [accounts]);

  // Toggle route selection
  const toggleRoute = (route: string) => {
    setSelectedRoutes(prev => {
      const next = new Set(prev);
      if (next.has(route)) next.delete(route);
      else next.add(route);
      return next;
    });
  };

  // Toggle day selection
  const toggleDay = (day: string) => {
    setSelectedDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  // Select all routes
  const selectAllRoutes = () => {
    setSelectedRoutes(new Set(uniqueRoutes));
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedRoutes(new Set());
    setSelectedDays(new Set());
    setSelectedMarker(null);
  };

  // Filter accounts based on selections
  const filteredAccounts = useMemo(() => {
    let result = accounts;
    
    // Filter by route
    if (selectedRoutes.size > 0) {
      result = result.filter(a => selectedRoutes.has(a.route));
    }
    
    // Filter by day (account must have at least one selected day)
    if (selectedDays.size > 0) {
      result = result.filter(a => a.days.some(d => selectedDays.has(d)));
    }
    
    return result;
  }, [accounts, selectedRoutes, selectedDays]);

  // Summary stats
  const stats = useMemo(() => {
    const routeCounts: Record<string, number> = {};
    const dayCounts: Record<string, number> = {};
    let totalRevenue = 0;
    
    filteredAccounts.forEach(a => {
      routeCounts[a.route] = (routeCounts[a.route] || 0) + 1;
      a.days.forEach(d => {
        dayCounts[d] = (dayCounts[d] || 0) + 1;
      });
      totalRevenue += a.monthlyPrice || 0;
    });
    
    return { routeCounts, dayCounts, totalRevenue };
  }, [filteredAccounts]);

  const exportCSV = (dataArray: CommercialAccount[], filename: string) => {
    if (dataArray.length === 0) return;
    const headers = ['customerNumber', 'accountName', 'address', 'city', 'state', 'zip', 'route', 'routeTech', 'daysOfServiceRaw', 'monthlyPrice', 'oldTerritory'];
    const csv = [
      headers.join(','),
      ...dataArray.map(row => headers.map(h => {
        const val = (row as any)[h];
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

  if (accounts.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p>Loading commercial routes...</p>
        </CardContent>
      </Card>
    );
  }

  const hasFilters = selectedRoutes.size > 0 || selectedDays.size > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
        <CardContent className="p-4">
          <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-emerald-600" />
            MIAMI COMMERCIAL ROUTES
          </h2>
          <p className="text-sm text-slate-600">
            {accounts.length} commercial pools across {uniqueRoutes.length} routes.
            Filter by route and/or day of service to view specific assignments.
          </p>
        </CardContent>
      </Card>

      {/* Filters Card */}
      <Card>
        <CardContent className="p-4">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('filters')}
          >
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Filter className="h-5 w-5 text-slate-600" />
              Filters
              {hasFilters && (
                <Badge variant="secondary" className="ml-2">
                  {selectedRoutes.size > 0 && `${selectedRoutes.size} routes`}
                  {selectedRoutes.size > 0 && selectedDays.size > 0 && ', '}
                  {selectedDays.size > 0 && `${selectedDays.size} days`}
                </Badge>
              )}
            </h3>
            {expandedSections.has('filters') ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>

          {expandedSections.has('filters') && (
            <div className="mt-4 space-y-4">
              {/* Route Filter */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" /> Filter by Route
                  </label>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={selectAllRoutes} className="text-xs h-7">
                      Select All
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedRoutes(new Set())} className="text-xs h-7">
                      Clear
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {uniqueRoutes.map(route => {
                    const isSelected = selectedRoutes.has(route);
                    const count = accounts.filter(a => a.route === route).length;
                    return (
                      <Badge
                        key={route}
                        variant={isSelected ? "default" : "outline"}
                        className="cursor-pointer transition-all px-3 py-1"
                        style={{
                          backgroundColor: isSelected ? getRouteColor(route) : 'transparent',
                          borderColor: getRouteColor(route),
                          color: isSelected ? 'white' : getRouteColor(route),
                        }}
                        onClick={() => toggleRoute(route)}
                      >
                        {route === 'Unassigned' ? 'Unassigned' : route.replace(/^\d+\s+AFP\s+Route\s+/, '')} ({count})
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Day Filter */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Filter by Day of Service
                  </label>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedDays(new Set())} className="text-xs h-7">
                    Clear
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {uniqueDays.map(day => {
                    const isSelected = selectedDays.has(day);
                    const count = accounts.filter(a => a.days.includes(day)).length;
                    return (
                      <Badge
                        key={day}
                        variant={isSelected ? "default" : "outline"}
                        className="cursor-pointer transition-all px-3 py-1"
                        style={{
                          backgroundColor: isSelected ? DAY_COLORS[day] : 'transparent',
                          borderColor: DAY_COLORS[day],
                          color: isSelected ? 'white' : DAY_COLORS[day],
                        }}
                        onClick={() => toggleDay(day)}
                      >
                        {day} ({count})
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Clear All */}
              {hasFilters && (
                <div className="pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    <EyeOff className="h-4 w-4 mr-2" /> Clear All Filters
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{filteredAccounts.length}</p>
            <p className="text-sm text-muted-foreground">Pools Shown</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">
              ${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-muted-foreground">Monthly Revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">
              {Object.keys(stats.routeCounts).length}
            </p>
            <p className="text-sm text-muted-foreground">Routes</p>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold mb-3">Commercial Pool Locations</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {hasFilters 
              ? `Showing ${filteredAccounts.length} pools matching filters`
              : 'Select routes and/or days above to filter the map'}
          </p>

          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={10}
            options={mapOptions}
            onLoad={onMapLoad}
          >
            {/* Account markers */}
            {filteredAccounts.map((account) => (
              <MarkerF
                key={account.customerNumber}
                position={{ lat: account.latitude, lng: account.longitude }}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: getRouteColor(account.route),
                  fillOpacity: 0.9,
                  strokeColor: '#fff',
                  strokeWeight: 2,
                }}
                onClick={() => setSelectedMarker(account.customerNumber)}
              />
            ))}

            {/* Info Window */}
            {selectedMarker && (() => {
              const account = accounts.find(a => a.customerNumber === selectedMarker);
              if (!account) return null;
              return (
                <InfoWindowF
                  position={{ lat: account.latitude, lng: account.longitude }}
                  onCloseClick={() => setSelectedMarker(null)}
                >
                  <div className="p-2 min-w-[220px]">
                    <p className="font-bold text-sm">{account.accountName}</p>
                    <p className="text-xs text-gray-500">{account.customerNumber}</p>
                    <p className="text-sm mt-1">{account.address}</p>
                    <p className="text-sm">{account.city}, {account.state} {account.zip}</p>
                    <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                      <p className="text-sm">
                        <span className="font-medium">Route:</span>{' '}
                        <span style={{ color: getRouteColor(account.route) }}>{account.routeTech}</span>
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Days:</span>{' '}
                        {account.days.join(', ')}
                      </p>
                      {account.monthlyPrice > 0 && (
                        <p className="text-sm">
                          <span className="font-medium">Monthly:</span>{' '}
                          ${account.monthlyPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                  </div>
                </InfoWindowF>
              );
            })()}
          </GoogleMap>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
            <span className="font-medium">Routes:</span>
            {uniqueRoutes.filter(r => r !== 'Unassigned').slice(0, 6).map(route => (
              <div key={route} className="flex items-center gap-1">
                <span 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: getRouteColor(route) }}
                />
                {route.replace(/^\d+\s+AFP\s+Route\s+/, '')}
              </div>
            ))}
            {uniqueRoutes.length > 6 && (
              <span className="text-muted-foreground">+{uniqueRoutes.length - 6} more</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Accounts Table */}
      <Card>
        <CardContent className="p-4">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('accounts')}
          >
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Account List ({filteredAccounts.length})
            </h3>
            {expandedSections.has('accounts') ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>

          {expandedSections.has('accounts') && (
            <div className="mt-4">
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10">
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead className="text-center">Route</TableHead>
                      <TableHead className="text-center">Days</TableHead>
                      <TableHead className="text-right">Monthly</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAccounts.map((account) => (
                      <TableRow 
                        key={account.customerNumber}
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => {
                          setSelectedMarker(account.customerNumber);
                          if (mapRef.current) {
                            mapRef.current.panTo({ lat: account.latitude, lng: account.longitude });
                            mapRef.current.setZoom(14);
                          }
                        }}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{account.accountName}</p>
                            <p className="text-xs text-muted-foreground">{account.customerNumber}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {account.address}, {account.city}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className="text-xs"
                            style={{
                              borderColor: getRouteColor(account.route),
                              color: getRouteColor(account.route),
                            }}
                          >
                            {account.routeTech}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-wrap gap-1 justify-center">
                            {account.days.map(day => (
                              <span 
                                key={day} 
                                className="text-xs px-1.5 py-0.5 rounded"
                                style={{
                                  backgroundColor: DAY_COLORS[day] + '20',
                                  color: DAY_COLORS[day],
                                }}
                              >
                                {day.substring(0, 3)}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {account.monthlyPrice > 0 
                            ? `$${account.monthlyPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                            : '-'
                          }
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
              onClick={() => exportCSV(filteredAccounts, 'miami-commercial-filtered.csv')}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Filtered ({filteredAccounts.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCSV(accounts, 'miami-commercial-all.csv')}
            >
              <Download className="h-4 w-4 mr-2" />
              Export All ({accounts.length})
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
