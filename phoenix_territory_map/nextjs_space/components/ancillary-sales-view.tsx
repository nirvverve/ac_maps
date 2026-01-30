'use client';

import { useState, useEffect, useMemo } from 'react';
import { GoogleMap, PolygonF, InfoWindowF } from '@react-google-maps/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, DollarSign, TrendingUp, Users, ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface AncillarySalesView1Data {
  zip: string;
  year: number;
  city: string;
  branch: string;
  ots: number;
  repair: number;
  remodel: number;
  total: number;
  latitude: number | null;
  longitude: number | null;
}

interface AncillarySalesView2Data {
  zip: string;
  city: string;
  branch: string;
  activeCustomers: number;
  ots: number;
  repair: number;
  remodel: number;
  total: number;
  avgOts: number;
  avgRepair: number;
  avgRemodel: number;
  avgTotal: number;
  latitude: number | null;
  longitude: number | null;
}

interface AncillarySalesData {
  view1: AncillarySalesView1Data[];
  view2: AncillarySalesView2Data[];
  metadata: {
    generatedAt: string;
    view1Records: number;
    view2Records: number;
    totalZips: number;
    years: number[];
  };
}

interface BoundaryGeometry {
  type: string;
  coordinates: number[][][];
}

interface ZipBoundary {
  geometry: BoundaryGeometry;
  properties: Record<string, any>;
}

const mapContainerStyle = {
  width: '100%',
  height: '600px',
};

const center = { lat: 33.4484, lng: -112.0740 };

const mapOptions = {
  mapTypeControl: false,
  fullscreenControl: true,
  streetViewControl: false,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
  ],
  zoomControl: true,
};

export function AncillarySalesView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salesData, setSalesData] = useState<AncillarySalesData | null>(null);
  const [boundaries, setBoundaries] = useState<Record<string, ZipBoundary>>({});
  
  const [viewMode, setViewMode] = useState<'view1' | 'view2'>('view2'); // Default to View 2
  const [selectedYear, setSelectedYear] = useState<number>(2025); // For View 1
  const [selectedZip, setSelectedZip] = useState<string | null>(null);
  const [infoPosition, setInfoPosition] = useState<{ lat: number; lng: number } | null>(null);
  
  // Sale type filters
  const [showOTS, setShowOTS] = useState(true);
  const [showRepair, setShowRepair] = useState(true);
  const [showRemodel, setShowRemodel] = useState(true);
  
  // Branch location filters
  const [showGlendale, setShowGlendale] = useState(true);
  const [showScottsdale, setShowScottsdale] = useState(true);
  const [showChandler, setShowChandler] = useState(true);
  const [showTucson, setShowTucson] = useState(true);
  
  // Table sorting
  const [sortColumn, setSortColumn] = useState<string>('total');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Load ancillary sales data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const [salesResponse, boundariesResponse] = await Promise.all([
          fetch('/ancillary-sales-data.json'),
          fetch('/az-zip-boundaries.json'),
        ]);

        if (!salesResponse.ok || !boundariesResponse.ok) {
          throw new Error('Failed to load data');
        }

        const sales = await salesResponse.json();
        const boundariesData = await boundariesResponse.json();

        setSalesData(sales);

        // Convert boundaries from FeatureCollection to keyed object
        const boundariesMap: Record<string, ZipBoundary> = {};
        if (boundariesData.features) {
          boundariesData.features.forEach((feature: any) => {
            const zip = feature.properties?.ZCTA5CE10 || feature.properties?.ZIP || feature.properties?.zip;
            if (zip) {
              boundariesMap[zip] = {
                geometry: feature.geometry,
                properties: feature.properties,
              };
            }
          });
        }
        setBoundaries(boundariesMap);

        // Set initial selected year to the latest year
        if (sales.metadata.years.length > 0) {
          setSelectedYear(Math.max(...sales.metadata.years));
        }
      } catch (err) {
        console.error('Error loading ancillary sales data:', err);
        setError('Failed to load ancillary sales data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Filter data based on view mode, selected year, sale type filters, and branch filters
  const displayData = useMemo(() => {
    if (!salesData) return [];

    let data: any[] = viewMode === 'view1' 
      ? salesData.view1.filter(d => d.year === selectedYear)
      : salesData.view2;

    // Apply branch filters first
    data = data.filter((d: any) => {
      const branch = d.branch || 'Unassigned';
      if (branch === 'Glendale' && !showGlendale) return false;
      if (branch === 'Scottsdale' && !showScottsdale) return false;
      if (branch === 'Chandler' && !showChandler) return false;
      if (branch === 'Tucson' && !showTucson) return false;
      return true;
    });

    // Apply sale type filters by recalculating totals
    return data.map((d: any) => {
      const filteredOts = showOTS ? d.ots : 0;
      const filteredRepair = showRepair ? d.repair : 0;
      const filteredRemodel = showRemodel ? d.remodel : 0;
      const filteredTotal = filteredOts + filteredRepair + filteredRemodel;

      if (viewMode === 'view2') {
        const avgOts = d.activeCustomers > 0 ? filteredOts / d.activeCustomers : 0;
        const avgRepair = d.activeCustomers > 0 ? filteredRepair / d.activeCustomers : 0;
        const avgRemodel = d.activeCustomers > 0 ? filteredRemodel / d.activeCustomers : 0;
        const avgTotal = d.activeCustomers > 0 ? filteredTotal / d.activeCustomers : 0;

        return {
          ...d,
          ots: filteredOts,
          repair: filteredRepair,
          remodel: filteredRemodel,
          total: filteredTotal,
          avgOts,
          avgRepair,
          avgRemodel,
          avgTotal,
        };
      }

      return {
        ...d,
        ots: filteredOts,
        repair: filteredRepair,
        remodel: filteredRemodel,
        total: filteredTotal,
      };
    }).filter((d: any) => d.total > 0); // Only show ZIPs with sales in selected categories
  }, [salesData, viewMode, selectedYear, showOTS, showRepair, showRemodel, showGlendale, showScottsdale, showChandler, showTucson]);

  // Calculate color intensity with more dramatic scaling
  const getColor = (total: number, maxTotal: number) => {
    if (total === 0) return 'rgba(200, 200, 200, 0.3)';
    
    // Use square root to compress high values and expand low values
    // This makes the $500-$1500 range more visually distinct
    const normalized = Math.sqrt(total / maxTotal);
    
    // Apply power curve for more dramatic color differences
    const intensity = Math.pow(normalized, 0.6);
    
    // Color gradient: Green -> Yellow -> Orange -> Red
    let red, green, blue;
    
    if (intensity < 0.33) {
      // Green to Yellow (low values)
      const localIntensity = intensity / 0.33;
      red = Math.round(255 * localIntensity);
      green = 200;
      blue = 0;
    } else if (intensity < 0.67) {
      // Yellow to Orange (medium values)
      const localIntensity = (intensity - 0.33) / 0.34;
      red = 255;
      green = Math.round(200 - (100 * localIntensity));
      blue = 0;
    } else {
      // Orange to Red (high values)
      const localIntensity = (intensity - 0.67) / 0.33;
      red = 255;
      green = Math.round(100 * (1 - localIntensity));
      blue = 0;
    }
    
    return `rgba(${red}, ${green}, ${blue}, 0.7)`;
  };

  const maxTotal = useMemo(() => {
    if (displayData.length === 0) return 1;
    return Math.max(...displayData.map((d: any) => d.total));
  }, [displayData]);

  // Sorted data for table display
  const sortedData = useMemo(() => {
    const sorted = [...displayData];
    sorted.sort((a: any, b: any) => {
      const aVal = a[sortColumn] || 0;
      const bVal = b[sortColumn] || 0;
      return sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
    });
    return sorted;
  }, [displayData, sortColumn, sortDirection]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Export to CSV function
  const handleExport = () => {
    if (sortedData.length === 0) return;

    // Define CSV headers based on view mode
    const headers = viewMode === 'view1'
      ? ['ZIP Code', 'Branch', 'City', 'Year', 'OTS', 'Repair', 'Remodel', 'Total']
      : ['ZIP Code', 'Branch', 'City', 'Active Customers', 'OTS', 'Repair', 'Remodel', 'Total', 'Avg per Customer'];

    // Build CSV rows
    const rows = sortedData.map((d: any) => {
      if (viewMode === 'view1') {
        return [
          d.zip,
          d.branch || '',
          d.city || '',
          d.year,
          d.ots.toFixed(2),
          d.repair.toFixed(2),
          d.remodel.toFixed(2),
          d.total.toFixed(2)
        ];
      } else {
        return [
          d.zip,
          d.branch || '',
          d.city || '',
          d.activeCustomers,
          d.ots.toFixed(2),
          d.repair.toFixed(2),
          d.remodel.toFixed(2),
          d.total.toFixed(2),
          d.avgTotal.toFixed(2)
        ];
      }
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const filename = viewMode === 'view1'
      ? `ancillary-sales-${selectedYear}.csv`
      : `ancillary-sales-2025-analysis.csv`;
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const handlePolygonClick = (zip: string, lat: number, lng: number) => {
    setSelectedZip(zip);
    setInfoPosition({ lat, lng });
  };

  const handleCloseInfo = () => {
    setSelectedZip(null);
    setInfoPosition(null);
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading ancillary sales data...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-8">
          <div className="text-red-600">{error}</div>
        </CardContent>
      </Card>
    );
  }

  const selectedData = selectedZip ? displayData.find((d: any) => d.zip === selectedZip) : null;

  return (
    <div className="space-y-6">
      {/* View Mode Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            Ancillary Sales Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'view1' ? 'default' : 'outline'}
                onClick={() => setViewMode('view1')}
              >
                By Year
              </Button>
              <Button
                variant={viewMode === 'view2' ? 'default' : 'outline'}
                onClick={() => setViewMode('view2')}
              >
                2025 Analysis
              </Button>
            </div>

            {viewMode === 'view1' && salesData && (
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {salesData.metadata.years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            {viewMode === 'view1' ? (
              <p>
                Showing total ancillary sales by ZIP code for year {selectedYear}.
                <br />
                <strong>OTS</strong> = Other Than Service (minor tasks), <strong>Repair</strong> = Major repairs, <strong>Remodel</strong> = Major renovations.
              </p>
            ) : (
              <p>
                Showing 2025 totals and averages per active customer by ZIP code.
                <br />
                Averages help identify high-value territories for marketing allocation.
              </p>
            )}
          </div>

          {/* Sale Type Filters */}
          <div className="mt-6 pt-4 border-t">
            <div className="text-sm font-semibold mb-3">Filter by Sale Type:</div>
            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="filter-ots"
                  checked={showOTS}
                  onCheckedChange={(checked) => setShowOTS(!!checked)}
                />
                <label
                  htmlFor="filter-ots"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  OTS (Other Than Service)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="filter-repair"
                  checked={showRepair}
                  onCheckedChange={(checked) => setShowRepair(!!checked)}
                />
                <label
                  htmlFor="filter-repair"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Repair
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="filter-remodel"
                  checked={showRemodel}
                  onCheckedChange={(checked) => setShowRemodel(!!checked)}
                />
                <label
                  htmlFor="filter-remodel"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Remodel
                </label>
              </div>
            </div>
          </div>

          {/* Branch Location Filters */}
          <div className="mt-6 pt-4 border-t">
            <div className="text-sm font-semibold mb-3">Filter by Branch Location:</div>
            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="filter-glendale"
                  checked={showGlendale}
                  onCheckedChange={(checked) => setShowGlendale(!!checked)}
                />
                <label
                  htmlFor="filter-glendale"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Glendale
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="filter-scottsdale"
                  checked={showScottsdale}
                  onCheckedChange={(checked) => setShowScottsdale(!!checked)}
                />
                <label
                  htmlFor="filter-scottsdale"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Scottsdale
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="filter-chandler"
                  checked={showChandler}
                  onCheckedChange={(checked) => setShowChandler(!!checked)}
                />
                <label
                  htmlFor="filter-chandler"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Chandler
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="filter-tucson"
                  checked={showTucson}
                  onCheckedChange={(checked) => setShowTucson(!!checked)}
                />
                <label
                  htmlFor="filter-tucson"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Tucson
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {formatCurrency(displayData.reduce((sum: number, d: any) => sum + d.total, 0))}
            </div>
            <div className="text-sm text-muted-foreground">Total Sales</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {formatCurrency(displayData.reduce((sum: number, d: any) => sum + d.ots, 0))}
            </div>
            <div className="text-sm text-muted-foreground">OTS Sales</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {formatCurrency(displayData.reduce((sum: number, d: any) => sum + d.repair, 0))}
            </div>
            <div className="text-sm text-muted-foreground">Repair Sales</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {formatCurrency(displayData.reduce((sum: number, d: any) => sum + d.remodel, 0))}
            </div>
            <div className="text-sm text-muted-foreground">Remodel Sales</div>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <Card>
        <CardHeader>
          <CardTitle>
            {viewMode === 'view1' ? `Sales by ZIP Code - ${selectedYear}` : '2025 Sales by ZIP Code'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg overflow-hidden border">
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={center}
              zoom={8}
              options={mapOptions}
            >
              {displayData.map((data: any) => {
                const boundary = boundaries[data.zip];
                if (!boundary || !boundary.geometry) return null;

                const paths = boundary.geometry.coordinates[0].map((coord: number[]) => ({
                  lat: coord[1],
                  lng: coord[0],
                }));

                return (
                  <PolygonF
                    key={data.zip}
                    paths={paths}
                    options={{
                      fillColor: getColor(data.total, maxTotal),
                      fillOpacity: 0.6,
                      strokeColor: '#333',
                      strokeWeight: 1,
                      clickable: true,
                    }}
                    onClick={() => {
                      if (data.latitude && data.longitude) {
                        handlePolygonClick(data.zip, data.latitude, data.longitude);
                      }
                    }}
                  />
                );
              })}

              {selectedData && infoPosition && (
                <InfoWindowF
                  position={infoPosition}
                  onCloseClick={handleCloseInfo}
                >
                  <div className="p-2">
                    <h3 className="font-bold text-lg">ZIP {selectedData.zip}</h3>
                    {viewMode === 'view1' ? (
                      <div className="space-y-1 mt-2">
                        <div className="text-sm">
                          <strong>Year:</strong> {(selectedData as AncillarySalesView1Data).year}
                        </div>
                        <div className="text-sm">
                          <strong>Total:</strong> {formatCurrency(selectedData.total)}
                        </div>
                        <div className="text-sm">
                          <strong>OTS:</strong> {formatCurrency(selectedData.ots)}
                        </div>
                        <div className="text-sm">
                          <strong>Repair:</strong> {formatCurrency(selectedData.repair)}
                        </div>
                        <div className="text-sm">
                          <strong>Remodel:</strong> {formatCurrency(selectedData.remodel)}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1 mt-2">
                        <div className="text-sm">
                          <strong>Active Customers:</strong> {(selectedData as AncillarySalesView2Data).activeCustomers}
                        </div>
                        <div className="text-sm">
                          <strong>Total 2025:</strong> {formatCurrency(selectedData.total)}
                        </div>
                        <div className="text-sm">
                          <strong>Avg per Customer:</strong> {formatCurrency((selectedData as AncillarySalesView2Data).avgTotal)}
                        </div>
                        <div className="text-sm text-muted-foreground mt-2">
                          OTS Avg: {formatCurrency((selectedData as AncillarySalesView2Data).avgOts)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Repair Avg: {formatCurrency((selectedData as AncillarySalesView2Data).avgRepair)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Remodel Avg: {formatCurrency((selectedData as AncillarySalesView2Data).avgRemodel)}
                        </div>
                      </div>
                    )}
                  </div>
                </InfoWindowF>
              )}
            </GoogleMap>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {viewMode === 'view1' ? `All ZIP Codes - ${selectedYear}` : 'All ZIP Codes - 2025'} ({sortedData.length} total)
            </CardTitle>
            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border max-h-[600px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('zip')}
                  >
                    <div className="flex items-center gap-1">
                      ZIP Code
                      {sortColumn === 'zip' && (
                        sortDirection === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />
                      )}
                      {sortColumn !== 'zip' && <ArrowUpDown className="h-4 w-4 opacity-30" />}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('branch')}
                  >
                    <div className="flex items-center gap-1">
                      Branch
                      {sortColumn === 'branch' && (
                        sortDirection === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />
                      )}
                      {sortColumn !== 'branch' && <ArrowUpDown className="h-4 w-4 opacity-30" />}
                    </div>
                  </TableHead>
                  {viewMode === 'view2' && (
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('activeCustomers')}
                    >
                      <div className="flex items-center gap-1">
                        Active Customers
                        {sortColumn === 'activeCustomers' && (
                          sortDirection === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />
                        )}
                        {sortColumn !== 'activeCustomers' && <ArrowUpDown className="h-4 w-4 opacity-30" />}
                      </div>
                    </TableHead>
                  )}
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('ots')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      OTS
                      {sortColumn === 'ots' && (
                        sortDirection === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />
                      )}
                      {sortColumn !== 'ots' && <ArrowUpDown className="h-4 w-4 opacity-30" />}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('repair')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Repair
                      {sortColumn === 'repair' && (
                        sortDirection === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />
                      )}
                      {sortColumn !== 'repair' && <ArrowUpDown className="h-4 w-4 opacity-30" />}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('remodel')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Remodel
                      {sortColumn === 'remodel' && (
                        sortDirection === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />
                      )}
                      {sortColumn !== 'remodel' && <ArrowUpDown className="h-4 w-4 opacity-30" />}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('total')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Total
                      {sortColumn === 'total' && (
                        sortDirection === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />
                      )}
                      {sortColumn !== 'total' && <ArrowUpDown className="h-4 w-4 opacity-30" />}
                    </div>
                  </TableHead>
                  {viewMode === 'view2' && (
                    <TableHead 
                      className="text-right cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('avgTotal')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Avg per Customer
                        {sortColumn === 'avgTotal' && (
                          sortDirection === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />
                        )}
                        {sortColumn !== 'avgTotal' && <ArrowUpDown className="h-4 w-4 opacity-30" />}
                      </div>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((data: any) => (
                  <TableRow key={data.zip}>
                    <TableCell className="font-medium">{data.zip}</TableCell>
                    <TableCell>{data.branch || 'Unassigned'}</TableCell>
                    {viewMode === 'view2' && (
                      <TableCell>{data.activeCustomers}</TableCell>
                    )}
                    <TableCell className="text-right">
                      {formatCurrency(data.ots)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(data.repair)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(data.remodel)}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(data.total)}
                    </TableCell>
                    {viewMode === 'view2' && (
                      <TableCell className="text-right">
                        {formatCurrency(data.avgTotal)}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
