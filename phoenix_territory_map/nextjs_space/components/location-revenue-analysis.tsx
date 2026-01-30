'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleMap, Polygon, InfoWindow } from '@react-google-maps/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { AlertCircle, DollarSign, MapPin, TrendingUp, ArrowUpDown } from 'lucide-react';

interface ZipRevenueData {
  zip: string;
  city?: string;
  territory: string;
  accountCount: number;
  totalRevenue?: number; // Jacksonville format
  totalMonthlyRevenue?: number; // Dallas/Orlando/Miami/PortCharlotte format
  totalYearlyRevenue?: number;
  residentialCount?: number;
  commercialCount?: number;
  totalAccounts?: number;
  accounts?: AccountDetail[];
}

interface AccountDetail {
  customerNumber: string;
  customerName: string;
  address: string;
  monthlyPrice: number;
  yearlyPrice: number;
  territory: string;
  accountType: string;
  latitude?: number;
  longitude?: number;
}

interface TerritoryFilter {
  [key: string]: boolean;
}

type SortOrder = 'none' | 'asc' | 'desc';

const mapContainerStyle = {
  width: '100%',
  height: '600px',
};

// Location configuration
const LOCATION_CONFIG = {
  dallas: { name: 'Dallas', center: { lat: 32.7767, lng: -96.7970 }, zoom: 10 },
  orlando: { name: 'Orlando', center: { lat: 28.5383, lng: -81.3792 }, zoom: 10 },
  portCharlotte: { name: 'Port Charlotte', center: { lat: 26.9762, lng: -82.0909 }, zoom: 11 },
  miami: { name: 'Miami', center: { lat: 25.7617, lng: -80.1918 }, zoom: 10 },
  jacksonville: { name: 'Jacksonville', center: { lat: 30.3322, lng: -81.6557 }, zoom: 10 },
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

const getRevenueColor = (revenue: number): string => {
  if (revenue === 0) return '#f3f4f6';
  if (revenue < 1000) return '#fef3c7';
  if (revenue < 3000) return '#fde68a';
  if (revenue < 5000) return '#fcd34d';
  if (revenue < 8000) return '#fbbf24';
  if (revenue < 12000) return '#f59e0b';
  return '#d97706';
};

// Helper function to get monthly revenue regardless of data format
const getMonthlyRevenue = (zip: ZipRevenueData): number => {
  return zip.totalMonthlyRevenue ?? zip.totalRevenue ?? 0;
};

const getYearlyRevenue = (zip: ZipRevenueData): number => {
  return zip.totalYearlyRevenue ?? (zip.totalRevenue ? zip.totalRevenue * 12 : 0);
};

export function LocationRevenueAnalysis({ location }: { location: string }) {
  const config = LOCATION_CONFIG[location as keyof typeof LOCATION_CONFIG];
  const [zipRevenue, setZipRevenue] = useState<ZipRevenueData[]>([]);
  const [boundaries, setBoundaries] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedZip, setSelectedZip] = useState<string | null>(null);
  const [hoveredZip, setHoveredZip] = useState<string | null>(null);
  const [territoryFilter, setTerritoryFilter] = useState<TerritoryFilter>({});
  const [sortOrder, setSortOrder] = useState<SortOrder>('none');

  useEffect(() => {
    // Reset map state when location changes
    setLoading(true);
    setError(null);
    setSelectedZip(null);
    setHoveredZip(null);
    setSortOrder('none');
    
    Promise.all([
      fetch(`/${location}-zip-revenue-data.json`).then(res => res.json()),
      fetch(`/${location}-zip-boundaries.json`).then(res => res.json())
    ])
      .then(([revenueData, boundaryData]) => {
        setZipRevenue(revenueData);
        
        // Normalize boundary data format
        // Dallas/Orlando use array format: [{ zipCode, geometry }]
        // Miami/Jacksonville use object format: { "zipCode": { type, coordinates } }
        let normalizedBoundaries = boundaryData;
        if (Array.isArray(boundaryData)) {
          // Convert array format to object format
          normalizedBoundaries = {};
          boundaryData.forEach((item: any) => {
            if (item.zipCode && item.geometry) {
              normalizedBoundaries[item.zipCode] = item.geometry;
            }
          });
        }
        setBoundaries(normalizedBoundaries);
        
        // Initialize territory filter (all enabled)
        const territories = [...new Set(revenueData.map((z: ZipRevenueData) => z.territory))] as string[];
        const filter: TerritoryFilter = {};
        territories.forEach(t => filter[t] = true);
        setTerritoryFilter(filter);
        
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading data:', err);
        setError('Failed to load ' + config.name + ' revenue data');
        setLoading(false);
      });
  }, [location, config.name]);

  const toggleTerritory = useCallback((territory: string) => {
    setTerritoryFilter(prev => ({
      ...prev,
      [territory]: !prev[territory]
    }));
  }, []);

  const filteredZipRevenue = useMemo(() => {
    return zipRevenue.filter(zip => territoryFilter[zip.territory]);
  }, [zipRevenue, territoryFilter]);

  const selectedZipData = useMemo(() => {
    if (!selectedZip) return null;
    return zipRevenue.find(z => z.zip === selectedZip) || null;
  }, [selectedZip, zipRevenue]);

  const sortedAccounts = useMemo(() => {
    if (!selectedZipData || !selectedZipData.accounts) return [];
    
    const accounts = [...selectedZipData.accounts];
    
    if (sortOrder === 'asc') {
      return accounts.sort((a, b) => a.monthlyPrice - b.monthlyPrice);
    } else if (sortOrder === 'desc') {
      return accounts.sort((a, b) => b.monthlyPrice - a.monthlyPrice);
    }
    
    return accounts;
  }, [selectedZipData, sortOrder]);

  const territoryStats = useMemo(() => {
    const stats: Record<string, { count: number; avgResidentialPrice: number; residentialCount: number; totalResidentialRevenue: number }> = {};
    
    filteredZipRevenue.forEach(zip => {
      if (!stats[zip.territory]) {
        stats[zip.territory] = { count: 0, avgResidentialPrice: 0, residentialCount: 0, totalResidentialRevenue: 0 };
      }
      stats[zip.territory].count += zip.accountCount;
      
      // Handle two data formats: Jacksonville (with accounts array) and Dallas/Orlando/Miami (aggregated)
      if (zip.accounts && Array.isArray(zip.accounts)) {
        // Jacksonville format: iterate through accounts
        zip.accounts.forEach(account => {
          if (account.accountType === 'Residential') {
            stats[zip.territory].residentialCount += 1;
            stats[zip.territory].totalResidentialRevenue += account.monthlyPrice;
          }
        });
      } else if (zip.residentialCount !== undefined && zip.totalMonthlyRevenue !== undefined) {
        // Dallas/Orlando/Miami format: use aggregated data
        // Estimate residential revenue (assuming most revenue is from residential)
        const residentialRatio = zip.totalAccounts ? zip.residentialCount / zip.totalAccounts : 1;
        const estimatedResidentialRevenue = zip.totalMonthlyRevenue * residentialRatio;
        
        stats[zip.territory].residentialCount += zip.residentialCount;
        stats[zip.territory].totalResidentialRevenue += estimatedResidentialRevenue;
      }
    });
    
    // Calculate average residential price for each territory
    Object.keys(stats).forEach(territory => {
      if (stats[territory].residentialCount > 0) {
        stats[territory].avgResidentialPrice = stats[territory].totalResidentialRevenue / stats[territory].residentialCount;
      }
    });
    
    return stats;
  }, [filteredZipRevenue]);

  const handlePolygonClick = useCallback((zip: string) => {
    setSelectedZip(zip);
    setSortOrder('none'); // Reset sort when selecting new ZIP
  }, []);

  const toggleSort = useCallback(() => {
    setSortOrder(prev => {
      if (prev === 'none') return 'desc';
      if (prev === 'desc') return 'asc';
      return 'none';
    });
  }, []);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="ml-3">Loading {config.name} revenue data...</span>
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
      {/* Territory Filters */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-3">Territory Filters</h3>
        <div className="flex flex-wrap gap-2">
          {Object.keys(territoryFilter).map(territory => {
            const stats = territoryStats[territory] || { count: 0, avgResidentialPrice: 0, residentialCount: 0, totalResidentialRevenue: 0 };
            return (
              <Button
                key={territory}
                variant={territoryFilter[territory] ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleTerritory(territory)}
                style={{
                  backgroundColor: territoryFilter[territory] ? getTerritoryColor(territory) : undefined,
                  borderColor: getTerritoryColor(territory),
                  color: territoryFilter[territory] ? '#ffffff' : getTerritoryColor(territory),
                }}
                className="flex items-center gap-2"
              >
                <span>{territory}</span>
                <Badge variant="secondary" className="ml-1">
                  {stats.count} accounts
                </Badge>
                <Badge variant="secondary">
                  Avg: ${stats.avgResidentialPrice.toFixed(2)}
                </Badge>
              </Button>
            );
          })}
        </div>
      </Card>

      {/* Map */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Revenue by ZIP Code
        </h3>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={config.center}
          zoom={config.zoom}
          options={mapOptions}
        >
          {filteredZipRevenue.map(zipData => {
            const boundary = boundaries[zipData.zip];
            if (!boundary || !boundary.coordinates) return null;

            // Handle both Polygon and MultiPolygon
            const polygons = boundary.type === 'MultiPolygon' 
              ? boundary.coordinates 
              : [boundary.coordinates];

            return polygons.map((coords: any, idx: number) => {
              // Safety check for coordinates structure
              if (!coords || !Array.isArray(coords) || coords.length === 0) return null;
              
              const coordArray = boundary.type === 'MultiPolygon' ? coords[0] : coords[0];
              if (!coordArray || !Array.isArray(coordArray) || coordArray.length === 0) return null;
              
              const paths = coordArray.map((coord: number[]) => ({
                lat: coord[1],
                lng: coord[0],
              }));

              const isSelected = selectedZip === zipData.zip;
              const isHovered = hoveredZip === zipData.zip;

              return (
                <Polygon
                  key={`${zipData.zip}-${idx}`}
                  paths={paths}
                  options={{
                    fillColor: getRevenueColor(getMonthlyRevenue(zipData)),
                    fillOpacity: isSelected ? 0.8 : isHovered ? 0.6 : 0.5,
                    strokeColor: isSelected ? '#000000' : getTerritoryColor(zipData.territory),
                    strokeOpacity: 0.9,
                    strokeWeight: isSelected ? 3 : 2,
                    clickable: true,
                  }}
                  onClick={() => handlePolygonClick(zipData.zip)}
                  onMouseOver={() => setHoveredZip(zipData.zip)}
                  onMouseOut={() => setHoveredZip(null)}
                />
              );
            });
          })}

          {selectedZipData && (
            <InfoWindow
              position={{
                lat: zipRevenue.find(z => z.zip === selectedZip)?.accounts?.[0]?.['latitude'] || config.center.lat,
                lng: zipRevenue.find(z => z.zip === selectedZip)?.accounts?.[0]?.['longitude'] || config.center.lng,
              }}
              onCloseClick={() => setSelectedZip(null)}
            >
              <div className="p-2">
                <h4 className="font-semibold text-lg">ZIP {selectedZipData.zip}</h4>
                <p className="text-sm text-gray-600">{selectedZipData.city}</p>
                <div className="mt-2 space-y-1">
                  <p className="text-sm">
                    <span className="font-medium">Territory:</span> {selectedZipData.territory}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Accounts:</span> {selectedZipData.accountCount}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Monthly Revenue:</span> ${getMonthlyRevenue(selectedZipData).toLocaleString()}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Yearly Revenue:</span> ${getYearlyRevenue(selectedZipData).toLocaleString()}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Avg Price/Account:</span> ${selectedZipData.accountCount > 0 
                      ? (getMonthlyRevenue(selectedZipData) / selectedZipData.accountCount).toFixed(2) 
                      : '0.00'}
                  </p>
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>

        {/* Revenue Legend */}
        <div className="mt-4 flex items-center justify-center gap-4 flex-wrap">
          <span className="text-sm font-medium">Monthly Revenue:</span>
          {[
            { label: '$0', color: '#f3f4f6' },
            { label: '<$1k', color: '#fef3c7' },
            { label: '$1k-$3k', color: '#fde68a' },
            { label: '$3k-$5k', color: '#fcd34d' },
            { label: '$5k-$8k', color: '#fbbf24' },
            { label: '$8k-$12k', color: '#f59e0b' },
            { label: '>$12k', color: '#d97706' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1">
              <div
                className="w-4 h-4 border border-gray-300 rounded"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs">{item.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Accounts Table */}
      {selectedZipData && selectedZipData.accounts && selectedZipData.accounts.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Accounts in ZIP {selectedZipData.zip} ({sortedAccounts.length})
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSort}
              className="flex items-center gap-2"
            >
              <ArrowUpDown className="w-4 h-4" />
              Sort by Price
              {sortOrder === 'desc' && ' (High to Low)'}
              {sortOrder === 'asc' && ' (Low to High)'}
              {sortOrder === 'none' && ' (Default)'}
            </Button>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer #</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Territory</TableHead>
                  <TableHead className="text-right">Monthly Price</TableHead>
                  <TableHead className="text-right">Yearly Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAccounts.map(account => (
                  <TableRow key={account.customerNumber}>
                    <TableCell className="font-medium">{account.customerNumber}</TableCell>
                    <TableCell>{account.customerName}</TableCell>
                    <TableCell>{account.address}</TableCell>
                    <TableCell>
                      <Badge variant={account.accountType === 'Commercial' ? 'default' : 'secondary'}>
                        {account.accountType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div
                        className="inline-block px-2 py-1 rounded text-xs text-white"
                        style={{ backgroundColor: getTerritoryColor(account.territory) }}
                      >
                        {account.territory}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
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
              <span className="font-semibold">Total for ZIP {selectedZipData.zip}:</span>
              <div className="flex gap-4">
                <span>
                  <span className="text-sm text-gray-600">Monthly:</span>{' '}
                  <span className="font-bold text-green-600">
                    ${getMonthlyRevenue(selectedZipData).toLocaleString()}
                  </span>
                </span>
                <span>
                  <span className="text-sm text-gray-600">Yearly:</span>{' '}
                  <span className="font-bold text-green-600">
                    ${getYearlyRevenue(selectedZipData).toLocaleString()}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
