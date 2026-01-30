"use client";

import { GoogleMap, PolygonF, InfoWindowF } from '@react-google-maps/api';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, MapPin, Users, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ZipAssignment {
  zip: string;
  territory: string;
  accountCount: number;
  city: string;
  latitude: number;
  longitude: number;
}

interface Customer {
  customerNumber: string;
  accountName: string;
  address: string;
  city: string;
  zip: string;
  route: string;
  territory?: string;
  latitude?: number;
  longitude?: number;
}

interface MiamiZipScenarioViewProps {
  areaFilter: {
    North: boolean;
    Central: boolean;
    South: boolean;
  };
}

const mapContainerStyle = {
  width: '100%',
  height: '500px',
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

export function MiamiZipScenarioView({ areaFilter }: MiamiZipScenarioViewProps) {
  const [zipAssignments, setZipAssignments] = useState<ZipAssignment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [boundaries, setBoundaries] = useState<{ [key: string]: any }>({});
  const [selectedZip, setSelectedZip] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('summary');
  const mapRef = useRef<google.maps.Map | null>(null);

  const center = { lat: 25.85, lng: -80.19 };

  useEffect(() => {
    Promise.all([
      fetch('/miami-final-territory-assignments.json').then(r => r.json()),
      fetch('/miami-final-territory-data.json').then(r => r.json()),
      fetch('/miami-zip-boundaries.json').then(r => r.json()),
    ]).then(([zipData, customerData, boundaryData]) => {
      setZipAssignments(zipData);
      setCustomers(customerData);
      setBoundaries(boundaryData);
    });
  }, []);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const exportCSV = (territory: string | null) => {
    const zipToTerritory: Record<string, string> = {};
    zipAssignments.forEach(z => { zipToTerritory[z.zip] = z.territory; });
    
    let filtered = customers.map(c => ({
      ...c,
      territory: zipToTerritory[c.zip] || 'Unknown'
    }));
    
    if (territory) {
      filtered = filtered.filter(c => c.territory === territory);
    }
    
    filtered.sort((a, b) => a.zip.localeCompare(b.zip));
    
    const headers = ['Customer Number', 'Account Name', 'Address', 'City', 'ZIP', 'Territory', 'Route'];
    const rows = filtered.map(c => [
      c.customerNumber, c.accountName, c.address, c.city, c.zip, c.territory, c.route
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.map(v => 
      typeof v === 'string' && (v.includes(',') || v.includes('"')) ? `"${v.replace(/"/g, '""')}"` : v
    ).join(','))].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = territory ? `miami-${territory.toLowerCase()}-customers.csv` : 'miami-all-customers.csv';
    a.click();
  };

  const filteredZips = zipAssignments.filter(z => areaFilter[z.territory as keyof typeof areaFilter]);
  
  const stats = {
    North: { zips: 0, accounts: 0 },
    Central: { zips: 0, accounts: 0 },
    South: { zips: 0, accounts: 0 },
  };
  
  zipAssignments.forEach(z => {
    if (stats[z.territory as keyof typeof stats]) {
      stats[z.territory as keyof typeof stats].zips++;
      stats[z.territory as keyof typeof stats].accounts += z.accountCount;
    }
  });

  const totalAccounts = stats.North.accounts + stats.Central.accounts + stats.South.accounts;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-4">
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            MIAMI BREAKUP SCENARIO II - ZIP CODES
          </h2>
          <p className="text-sm text-slate-600">
            This scenario assigns entire ZIP codes to North/Central/South territories based on geographic location.
          </p>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <Card>
        <CardContent className="p-4">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('summary')}
          >
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Territory Distribution Summary
            </h3>
            {expandedSection === 'summary' ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
          
          {expandedSection === 'summary' && (
            <div className="mt-4">
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold text-slate-700">{totalAccounts}</p>
                  <p className="text-xs text-muted-foreground">Accounts</p>
                </div>
                {(['North', 'Central', 'South'] as const).map(territory => (
                  <div 
                    key={territory}
                    className="text-center p-4 rounded-lg"
                    style={{ backgroundColor: getTerritoryColor(territory, 0.15) }}
                  >
                    <p className="text-sm font-medium" style={{ color: getTerritoryBorderColor(territory) }}>{territory}</p>
                    <p className="text-2xl font-bold">{stats[territory].accounts}</p>
                    <p className="text-xs text-muted-foreground">{stats[territory].zips} ZIPs</p>
                  </div>
                ))}
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => exportCSV(null)}>
                  <Download className="h-4 w-4 mr-2" />
                  Export All ({totalAccounts})
                </Button>
                {(['North', 'Central', 'South'] as const).map(territory => (
                  <Button 
                    key={territory}
                    variant="outline" 
                    size="sm" 
                    onClick={() => exportCSV(territory)}
                    style={{ borderColor: getTerritoryBorderColor(territory), color: getTerritoryBorderColor(territory) }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {territory} ({stats[territory].accounts})
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Map */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold mb-3">Territory Map</h3>
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
                    fillOpacity: 0.4,
                    strokeColor: getTerritoryBorderColor(zip.territory),
                    strokeOpacity: 1,
                    strokeWeight: 1,
                  }}
                  onClick={() => setSelectedZip(zip.zip)}
                />
              );
            })}
            
            {selectedZip && (
              <InfoWindowF
                position={(() => {
                  const zip = zipAssignments.find(z => z.zip === selectedZip);
                  return zip ? { lat: zip.latitude, lng: zip.longitude } : center;
                })()}
                onCloseClick={() => setSelectedZip(null)}
              >
                <div className="p-2">
                  {(() => {
                    const zip = zipAssignments.find(z => z.zip === selectedZip);
                    if (!zip) return null;
                    return (
                      <>
                        <p className="font-bold">{zip.zip}</p>
                        <p className="text-sm">{zip.city}</p>
                        <p className="text-sm">Territory: {zip.territory}</p>
                        <p className="text-sm">{zip.accountCount} accounts</p>
                      </>
                    );
                  })()}
                </div>
              </InfoWindowF>
            )}
          </GoogleMap>
        </CardContent>
      </Card>

      {/* ZIP Code Table */}
      <Card>
        <CardContent className="p-4">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('zips')}
          >
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              ZIP Code Assignments ({zipAssignments.length} ZIPs)
            </h3>
            {expandedSection === 'zips' ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
          
          {expandedSection === 'zips' && (
            <div className="mt-4 max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ZIP</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Territory</TableHead>
                    <TableHead className="text-right">Accounts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zipAssignments
                    .filter(z => areaFilter[z.territory as keyof typeof areaFilter])
                    .sort((a, b) => a.zip.localeCompare(b.zip))
                    .map((zip) => (
                      <TableRow key={zip.zip}>
                        <TableCell className="font-medium">{zip.zip}</TableCell>
                        <TableCell>{zip.city}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            style={{
                              backgroundColor: getTerritoryColor(zip.territory, 0.2),
                              borderColor: getTerritoryBorderColor(zip.territory),
                              color: getTerritoryBorderColor(zip.territory),
                            }}
                          >
                            {zip.territory}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{zip.accountCount}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
