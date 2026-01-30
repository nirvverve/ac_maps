"use client";

import { GoogleMap, PolygonF, InfoWindowF } from '@react-google-maps/api';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Download, RotateCcw, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ZipData {
  zip: string;
  territory: string;
  accountCount: number;
  city: string;
  latitude: number;
  longitude: number;
}

interface Boundary {
  type: string;
  coordinates: number[][][] | number[][][][]; // Polygon or MultiPolygon
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

function getTerritoryDisplayName(territory: string): string {
  return `APS Miami - ${territory}`;
}

export function MiamiTerritoryAssignmentTool() {
  const [zipData, setZipData] = useState<ZipData[]>([]);
  const [originalZipData, setOriginalZipData] = useState<ZipData[]>([]);
  const [boundaries, setBoundaries] = useState<Record<string, Boundary>>({});
  const [selectedZip, setSelectedZip] = useState<string | null>(null);
  const [selectedZipInfo, setSelectedZipInfo] = useState<ZipData | null>(null);
  const [hoveredZip, setHoveredZip] = useState<string | null>(null);
  const [searchZip, setSearchZip] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);

  const center = { lat: 25.87, lng: -80.19 };
  const zoom = 10;

  useEffect(() => {
    // Load Miami ZIP data
    fetch('/miami-map-data.json')
      .then((res) => res.json())
      .then((data) => {
        setZipData(data);
        setOriginalZipData(JSON.parse(JSON.stringify(data))); // Deep copy
      })
      .catch((err) => console.error('Error loading ZIP data:', err));

    // Load ZIP boundaries
    fetch('/miami-zip-boundaries.json')
      .then((res) => res.json())
      .then((data) => setBoundaries(data))
      .catch((err) => console.error('Error loading boundaries:', err));
  }, []);

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handlePolygonClick = (zip: string) => {
    const zipInfo = zipData.find((z) => z.zip === zip);
    if (zipInfo) {
      setSelectedZip(zip);
      setSelectedZipInfo(zipInfo);
    }
  };

  const handleTerritoryChange = (zip: string, newTerritory: string) => {
    const updatedData = zipData.map((z) =>
      z.zip === zip ? { ...z, territory: newTerritory } : z
    );
    setZipData(updatedData);
    setHasChanges(true);
    
    // Update selected zip info
    const updatedZipInfo = updatedData.find((z) => z.zip === zip);
    if (updatedZipInfo) {
      setSelectedZipInfo(updatedZipInfo);
    }
  };

  const handleZipSearch = () => {
    const search = searchZip.trim();
    if (!search) return;

    const foundZip = zipData.find((z) => z.zip === search);
    if (foundZip && mapRef.current) {
      mapRef.current.panTo({ lat: foundZip.latitude, lng: foundZip.longitude });
      mapRef.current.setZoom(12);
      setSelectedZip(foundZip.zip);
      setSelectedZipInfo(foundZip);
    }
  };

  const handleReset = () => {
    setZipData(JSON.parse(JSON.stringify(originalZipData)));
    setHasChanges(false);
    setSelectedZip(null);
    setSelectedZipInfo(null);
  };

  const handleExport = () => {
    const exportData = JSON.stringify(zipData, null, 2);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `miami-territory-assignments-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Calculate statistics
  const stats = {
    North: {
      zips: zipData.filter((z) => z.territory === 'North').length,
      accounts: zipData
        .filter((z) => z.territory === 'North')
        .reduce((sum, z) => sum + z.accountCount, 0),
    },
    Central: {
      zips: zipData.filter((z) => z.territory === 'Central').length,
      accounts: zipData
        .filter((z) => z.territory === 'Central')
        .reduce((sum, z) => sum + z.accountCount, 0),
    },
    South: {
      zips: zipData.filter((z) => z.territory === 'South').length,
      accounts: zipData
        .filter((z) => z.territory === 'South')
        .reduce((sum, z) => sum + z.accountCount, 0),
    },
  };

  // Calculate changes from original
  const changes = zipData.filter((z, idx) => {
    const original = originalZipData[idx];
    return original && z.territory !== original.territory;
  }).length;

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Instructions:</strong> Click any ZIP code polygon on the map to select it, then
          choose a new territory assignment. Changes are reflected immediately in the statistics
          below.
        </AlertDescription>
      </Alert>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1">
              <Input
                placeholder="Search ZIP code..."
                value={searchZip}
                onChange={(e) => setSearchZip(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleZipSearch()}
                className="max-w-xs"
              />
              <Button onClick={handleZipSearch} size="sm" variant="outline">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {hasChanges && (
                <Badge variant="destructive" className="px-3 py-1">
                  {changes} change{changes !== 1 ? 's' : ''}
                </Badge>
              )}
              <Button onClick={handleReset} size="sm" variant="outline" disabled={!hasChanges}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button onClick={handleExport} size="sm" variant="default">
                <Download className="h-4 w-4 mr-2" />
                Export
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
            zoom={zoom}
            options={mapOptions}
            onLoad={handleMapLoad}
          >
            {/* Render ZIP polygons */}
            {zipData.map((zip) => {
              const boundary = boundaries[zip.zip];
              if (!boundary || !boundary.coordinates) return null;

              const isSelected = selectedZip === zip.zip;
              const isHovered = hoveredZip === zip.zip;
              const opacity = isSelected ? 0.7 : isHovered ? 0.6 : 0.5;

              const polygonOptions = {
                fillColor: getTerritoryColor(zip.territory, 1),
                fillOpacity: opacity,
                strokeColor: isSelected ? '#000000' : '#FFFFFF',
                strokeOpacity: isSelected ? 1 : 0.8,
                strokeWeight: isSelected ? 3 : 1,
                clickable: true,
              };

              // Handle both Polygon and MultiPolygon types
              if (boundary.type === 'MultiPolygon') {
                // MultiPolygon: coordinates[i][0] contains the coordinate pairs
                return (boundary.coordinates as number[][][][]).map((polygonCoords: number[][][], idx: number) => {
                  const paths = polygonCoords[0].map((coord: number[]) => ({
                    lat: coord[1],
                    lng: coord[0],
                  }));

                  return (
                    <PolygonF
                      key={`${zip.zip}-${idx}`}
                      paths={paths}
                      options={polygonOptions}
                      onClick={() => handlePolygonClick(zip.zip)}
                      onMouseOver={() => setHoveredZip(zip.zip)}
                      onMouseOut={() => setHoveredZip(null)}
                    />
                  );
                });
              } else {
                // Regular Polygon: coordinates[0] contains the coordinate pairs
                const paths = (boundary.coordinates as number[][][])[0].map((coord: number[]) => ({
                  lat: coord[1],
                  lng: coord[0],
                }));

                return (
                  <PolygonF
                    key={zip.zip}
                    paths={paths}
                    options={polygonOptions}
                    onClick={() => handlePolygonClick(zip.zip)}
                    onMouseOver={() => setHoveredZip(zip.zip)}
                    onMouseOut={() => setHoveredZip(null)}
                  />
                );
              }
            })}

            {/* InfoWindow for selected ZIP */}
            {selectedZipInfo && selectedZip && (
              <InfoWindowF
                position={{
                  lat: selectedZipInfo.latitude,
                  lng: selectedZipInfo.longitude,
                }}
                onCloseClick={() => {
                  setSelectedZip(null);
                  setSelectedZipInfo(null);
                }}
              >
                <div className="p-3 min-w-[250px]">
                  <h3 className="font-semibold text-lg mb-3">ZIP Code {selectedZipInfo.zip}</h3>
                  <div className="space-y-2 text-sm mb-3">
                    <p>
                      <strong>City:</strong> {selectedZipInfo.city || 'N/A'}
                    </p>
                    <p>
                      <strong>Current Territory:</strong> {selectedZipInfo.territory}
                    </p>
                    <p>
                      <strong>Accounts:</strong> {selectedZipInfo.accountCount}
                    </p>
                  </div>

                  <div className="border-t pt-3">
                    <p className="text-xs font-semibold mb-2 text-muted-foreground">
                      REASSIGN TO:
                    </p>
                    <div className="flex gap-2">
                      {(['North', 'Central', 'South'] as const).map((territory) => (
                        <Button
                          key={territory}
                          onClick={() => handleTerritoryChange(selectedZip, territory)}
                          size="sm"
                          variant={selectedZipInfo.territory === territory ? 'default' : 'outline'}
                          className="flex-1"
                          style={{
                            backgroundColor:
                              selectedZipInfo.territory === territory
                                ? getTerritoryColor(territory, 1).replace(/[^,]+(?=\))/, '1')
                                : undefined,
                          }}
                        >
                          {territory}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </InfoWindowF>
            )}
          </GoogleMap>
        </CardContent>
      </Card>

      {/* Statistics */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Proposed Territory Distribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(['North', 'Central', 'South'] as const).map((territory) => {
              const stat = stats[territory];
              const original = originalZipData
                .filter((z) => z.territory === territory)
                .reduce((sum, z) => sum + z.accountCount, 0);
              const accountDiff = stat.accounts - original;
              const zipDiff =
                stat.zips -
                originalZipData.filter((z) => z.territory === territory).length;

              return (
                <div key={territory} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: getTerritoryColor(territory, 1) }}
                    />
                    <h4 className="font-medium">{getTerritoryDisplayName(territory)}</h4>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">ZIP Codes:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{stat.zips}</span>
                        {zipDiff !== 0 && (
                          <Badge
                            variant={zipDiff > 0 ? 'default' : 'destructive'}
                            className="text-xs px-1.5 py-0"
                          >
                            {zipDiff > 0 ? '+' : ''}
                            {zipDiff}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Accounts:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{stat.accounts}</span>
                        {accountDiff !== 0 && (
                          <Badge
                            variant={accountDiff > 0 ? 'default' : 'destructive'}
                            className="text-xs px-1.5 py-0"
                          >
                            {accountDiff > 0 ? '+' : ''}
                            {accountDiff}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t">
                      <span className="text-muted-foreground text-xs">Avg per ZIP:</span>
                      <span className="font-medium text-xs">
                        {stat.zips > 0 ? (stat.accounts / stat.zips).toFixed(1) : '0.0'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Total ZIPs</p>
                <p className="text-2xl font-bold">{zipData.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Accounts</p>
                <p className="text-2xl font-bold">
                  {zipData.reduce((sum, z) => sum + z.accountCount, 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Changes Made</p>
                <p className="text-2xl font-bold text-orange-600">{changes}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-sm font-semibold mt-1">
                  {hasChanges ? (
                    <Badge variant="destructive">Modified</Badge>
                  ) : (
                    <Badge variant="outline">Original</Badge>
                  )}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
