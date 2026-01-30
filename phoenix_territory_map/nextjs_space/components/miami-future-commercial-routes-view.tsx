"use client";

import { GoogleMap, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Building2, MapPin, ChevronDown, ChevronUp, Calendar, Users, Filter, ArrowRight, CheckCircle2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface FutureCommercialAccount {
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
  reassigned: boolean;
  originalRoute: string;
  originalTech: string;
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

// Route colors for the 4 techs
const ROUTE_COLORS: Record<string, string> = {
  '15 AFP Route Kymani P': '#22c55e',    // green
  '22 AFP Route Ramon R': '#8b5cf6',     // purple
  '23 AFP Route Juan C': '#ec4899',      // pink
  '25 AFP Route Carlos S': '#06b6d4',    // cyan
};

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

export function MiamiFutureCommercialRoutesView() {
  const [accounts, setAccounts] = useState<FutureCommercialAccount[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [selectedRoutes, setSelectedRoutes] = useState<Set<string>>(new Set());
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [showReassignedOnly, setShowReassignedOnly] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary', 'filters', 'accounts']));
  const mapRef = useRef<google.maps.Map | null>(null);

  const center = { lat: 25.82, lng: -80.20 };

  useEffect(() => {
    fetch('/miami-future-commercial-routes.json')
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
    return [...new Set(accounts.map(a => a.route))].sort();
  }, [accounts]);

  const uniqueDays = useMemo(() => {
    const days = new Set<string>();
    accounts.forEach(a => a.days.forEach(d => days.add(d)));
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Unknown'];
    return dayOrder.filter(d => days.has(d));
  }, [accounts]);

  // Toggle functions
  const toggleRoute = (route: string) => {
    setSelectedRoutes(prev => {
      const next = new Set(prev);
      if (next.has(route)) next.delete(route);
      else next.add(route);
      return next;
    });
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const selectAllRoutes = () => setSelectedRoutes(new Set(uniqueRoutes));
  const clearFilters = () => {
    setSelectedRoutes(new Set());
    setSelectedDays(new Set());
    setShowReassignedOnly(false);
    setSelectedMarker(null);
  };

  // Filter accounts
  const filteredAccounts = useMemo(() => {
    let result = accounts;
    
    if (selectedRoutes.size > 0) {
      result = result.filter(a => selectedRoutes.has(a.route));
    }
    if (selectedDays.size > 0) {
      result = result.filter(a => a.days.some(d => selectedDays.has(d)));
    }
    if (showReassignedOnly) {
      result = result.filter(a => a.reassigned);
    }
    
    return result;
  }, [accounts, selectedRoutes, selectedDays, showReassignedOnly]);

  // Summary stats
  const stats = useMemo(() => {
    const routeCounts: Record<string, { total: number; kept: number; added: number }> = {};
    let totalRevenue = 0;
    let totalReassigned = 0;
    
    accounts.forEach(a => {
      if (!routeCounts[a.route]) {
        routeCounts[a.route] = { total: 0, kept: 0, added: 0 };
      }
      routeCounts[a.route].total++;
      if (a.reassigned) {
        routeCounts[a.route].added++;
        totalReassigned++;
      } else {
        routeCounts[a.route].kept++;
      }
      totalRevenue += a.monthlyPrice || 0;
    });
    
    return { routeCounts, totalRevenue, totalReassigned };
  }, [accounts]);

  const exportCSV = (dataArray: FutureCommercialAccount[], filename: string) => {
    if (dataArray.length === 0) return;
    const headers = ['customerNumber', 'accountName', 'address', 'city', 'state', 'zip', 'route', 'routeTech', 'daysOfServiceRaw', 'monthlyPrice', 'reassigned', 'originalRoute', 'originalTech'];
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
          <p>Loading future commercial routes...</p>
        </CardContent>
      </Card>
    );
  }

  const hasFilters = selectedRoutes.size > 0 || selectedDays.size > 0 || showReassignedOnly;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <CardContent className="p-4">
          <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-amber-600" />
            FUTURE COMMERCIAL ROUTES
          </h2>
          <p className="text-sm text-slate-600">
            Consolidated routes for {accounts.length} commercial pools across 4 technicians.
            All pools reassigned from other techs while maintaining geographic efficiency.
          </p>
        </CardContent>
      </Card>

      {/* Tech Summary Cards */}
      <Card>
        <CardContent className="p-4">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('summary')}
          >
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Technician Summary
            </h3>
            {expandedSections.has('summary') ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>

          {expandedSections.has('summary') && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {uniqueRoutes.map(route => {
                const data = stats.routeCounts[route];
                const techName = route.replace(/^\d+\s+AFP\s+Route\s+/, '');
                return (
                  <Card 
                    key={route} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    style={{ borderColor: getRouteColor(route), borderWidth: 2 }}
                    onClick={() => {
                      setSelectedRoutes(new Set([route]));
                      setShowReassignedOnly(false);
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: getRouteColor(route) }}
                        />
                        <span className="font-semibold text-sm">{techName}</span>
                      </div>
                      <p className="text-2xl font-bold" style={{ color: getRouteColor(route) }}>
                        {data?.total || 0}
                      </p>
                      <div className="text-xs text-muted-foreground mt-1">
                        <span className="text-green-600">{data?.kept || 0} kept</span>
                        {' · '}
                        <span className="text-amber-600">+{data?.added || 0} added</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{accounts.length}</p>
            <p className="text-sm text-muted-foreground">Total Pools</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-slate-50" onClick={() => setShowReassignedOnly(!showReassignedOnly)}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{stats.totalReassigned}</p>
            <p className="text-sm text-muted-foreground">Reassigned</p>
            {showReassignedOnly && <Badge className="mt-1 bg-orange-100 text-orange-700">Filtered</Badge>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              ${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-muted-foreground">Monthly Revenue</p>
          </CardContent>
        </Card>
      </div>

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
                <Badge variant="secondary" className="ml-2">Active</Badge>
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
                    <Users className="h-4 w-4" /> Filter by Technician
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
                    const techName = route.replace(/^\d+\s+AFP\s+Route\s+/, '');
                    const count = stats.routeCounts[route]?.total || 0;
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
                        {techName} ({count})
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Day Filter */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Filter by Day
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
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Map */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold mb-3">Pool Locations</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Showing {filteredAccounts.length} pools
            {showReassignedOnly && ' (reassigned only)'}
          </p>

          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={10}
            options={mapOptions}
            onLoad={onMapLoad}
          >
            {filteredAccounts.map((account) => (
              <MarkerF
                key={account.customerNumber}
                position={{ lat: account.latitude, lng: account.longitude }}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: account.reassigned ? 10 : 8,
                  fillColor: getRouteColor(account.route),
                  fillOpacity: 0.9,
                  strokeColor: account.reassigned ? '#f59e0b' : '#fff',
                  strokeWeight: account.reassigned ? 3 : 2,
                }}
                onClick={() => setSelectedMarker(account.customerNumber)}
              />
            ))}

            {selectedMarker && (() => {
              const account = accounts.find(a => a.customerNumber === selectedMarker);
              if (!account) return null;
              return (
                <InfoWindowF
                  position={{ lat: account.latitude, lng: account.longitude }}
                  onCloseClick={() => setSelectedMarker(null)}
                >
                  <div className="p-2 min-w-[240px]">
                    <p className="font-bold text-sm">{account.accountName}</p>
                    <p className="text-xs text-gray-500">{account.customerNumber}</p>
                    <p className="text-sm mt-1">{account.address}</p>
                    <p className="text-sm">{account.city}, {account.state} {account.zip}</p>
                    <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                      <p className="text-sm">
                        <span className="font-medium">Tech:</span>{' '}
                        <span style={{ color: getRouteColor(account.route) }}>{account.routeTech}</span>
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Days:</span> {account.days.join(', ')}
                      </p>
                      {account.monthlyPrice > 0 && (
                        <p className="text-sm">
                          <span className="font-medium">Monthly:</span>{' '}
                          ${account.monthlyPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      )}
                      {account.reassigned && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <Badge className="bg-amber-100 text-amber-700">Reassigned</Badge>
                          <p className="text-xs mt-1 text-gray-600">
                            From: {account.originalTech}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </InfoWindowF>
              );
            })()}
          </GoogleMap>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs">
            <span className="font-medium">Technicians:</span>
            {uniqueRoutes.map(route => (
              <div key={route} className="flex items-center gap-1">
                <span 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: getRouteColor(route) }}
                />
                {route.replace(/^\d+\s+AFP\s+Route\s+/, '')}
              </div>
            ))}
            <span className="text-muted-foreground">|</span>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full border-2 border-amber-500 bg-gray-300" />
              Reassigned (amber border)
            </div>
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
                      <TableHead className="text-center">Tech</TableHead>
                      <TableHead className="text-center">Days</TableHead>
                      <TableHead className="text-center">Status</TableHead>
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
                            {account.days.slice(0, 3).map(day => (
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
                            {account.days.length > 3 && (
                              <span className="text-xs text-muted-foreground">+{account.days.length - 3}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {account.reassigned ? (
                            <div className="text-xs">
                              <Badge className="bg-amber-100 text-amber-700 text-[10px]">
                                <ArrowRight className="h-3 w-3 mr-1" />
                                From {account.originalTech}
                              </Badge>
                            </div>
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                          )}
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
              onClick={() => exportCSV(filteredAccounts, 'miami-future-commercial-filtered.csv')}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Filtered ({filteredAccounts.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCSV(accounts.filter(a => a.reassigned), 'miami-future-commercial-reassigned.csv')}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Reassigned ({stats.totalReassigned})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCSV(accounts, 'miami-future-commercial-all.csv')}
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
