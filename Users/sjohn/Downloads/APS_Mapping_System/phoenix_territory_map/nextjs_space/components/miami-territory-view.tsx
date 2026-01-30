"use client";

import { GoogleMap, PolygonF, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MiamiTerritoryViewProps {
  areaFilter: {
    North: boolean;
    Central: boolean;
    South: boolean;
  };
}

interface ZipData {
  zip: string;
  territory: 'North' | 'Central' | 'South';
  accountCount: number;
  city: string;
  latitude: number;
  longitude: number;
}

interface OfficeLocation {
  zipCode: string;
  territory: string;
  fullName: string;
  category: string;
  label: string;
  lat: number;
  lng: number;
}

const mapContainerStyle = {
  width: '100%',
  height: '700px',
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

function getTerritoryColor(territory: string): string {
  switch (territory) {
    case 'North':
      return '#3B82F6'; // Blue
    case 'Central':
      return '#10B981'; // Green  
    case 'South':
      return '#F59E0B'; // Orange
    default:
      return '#6B7280'; // Gray
  }
}

function getTerritoryDisplayName(territory: string): string {
  switch (territory) {
    case 'North':
      return 'APS Miami - North';
    case 'Central':
      return 'APS Miami - Central';
    case 'South':
      return 'APS Miami - South';
    default:
      return territory;
  }
}

export function MiamiTerritoryView({ areaFilter }: MiamiTerritoryViewProps) {
  const [zipData, setZipData] = useState<ZipData[]>([]);
  const [boundaries, setBoundaries] = useState<{ [key: string]: any }>({});
  const [officeLocation, setOfficeLocation] = useState<OfficeLocation | null>(null);
  const [selectedZip, setSelectedZip] = useState<string | null>(null);
  const [selectedOffice, setSelectedOffice] = useState<boolean>(false);
  const [searchZip, setSearchZip] = useState('');
  const [highlightedZip, setHighlightedZip] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const center = { lat: 25.87, lng: -80.19 }; // Miami center
  const zoom = 10;

  useEffect(() => {
    // Load Miami ZIP data
    fetch('/miami-map-data.json')
      .then((res) => res.json())
      .then((data) => setZipData(data))
      .catch((err) => console.error('Error loading Miami map data:', err));

    // Load ZIP boundaries
    fetch('/miami-zip-boundaries.json')
      .then((res) => res.json())
      .then((data) => setBoundaries(data))
      .catch((err) => console.error('Error loading Miami boundaries:', err));

    // Load office location
    fetch('/miami-office-location.json')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.length > 0) {
          setOfficeLocation(data[0]);
        }
      })
      .catch((err) => console.error('Error loading office location:', err));
  }, []);

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handleZipSearch = () => {
    const zip = searchZip.trim();
    if (!zip) return;

    const zipInfo = zipData.find((z) => z.zip === zip);
    if (zipInfo && mapRef.current) {
      mapRef.current.panTo({ lat: zipInfo.latitude, lng: zipInfo.longitude });
      mapRef.current.setZoom(12);
      setHighlightedZip(zip);
      setSelectedZip(zip);
      setTimeout(() => setHighlightedZip(null), 3000);
    }
  };

  const handlePolygonClick = (zip: string) => {
    setSelectedZip(zip);
    setSelectedOffice(false);
  };

  const handleOfficeClick = () => {
    setSelectedOffice(true);
    setSelectedZip(null);
  };

  const convertGeometryToPaths = (geometry: any): google.maps.LatLngLiteral[][] => {
    if (!geometry || !geometry.coordinates) return [];

    try {
      if (geometry.type === 'Polygon') {
        return geometry.coordinates.map((ring: any) =>
          ring.map(([lng, lat]: [number, number]) => ({ lat, lng }))
        );
      } else if (geometry.type === 'MultiPolygon') {
        return geometry.coordinates.flatMap((polygon: any) =>
          polygon.map((ring: any) =>
            ring.map(([lng, lat]: [number, number]) => ({ lat, lng }))
          )
        );
      }
    } catch (error) {
      console.error('Error converting geometry:', error);
    }
    return [];
  };

  const filteredZipData = zipData.filter((zip) => {
    const territory = zip.territory as keyof typeof areaFilter;
    return areaFilter[territory];
  });

  const selectedZipData = selectedZip
    ? zipData.find((z) => z.zip === selectedZip)
    : null;

  return (
    <div className="space-y-4">
      {/* ZIP Search */}
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Enter ZIP code to locate..."
            value={searchZip}
            onChange={(e) => setSearchZip(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleZipSearch()}
            className="max-w-xs"
          />
          <Button onClick={handleZipSearch} size="sm">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>
      </Card>

      {/* Map */}
      <Card className="p-2">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={zoom}
          options={mapOptions}
          onLoad={handleMapLoad}
        >
          {/* Render ZIP boundaries */}
          {filteredZipData.map((zip) => {
            const geometry = boundaries[zip.zip];
            if (!geometry) return null;

            const paths = convertGeometryToPaths(geometry);
            if (paths.length === 0) return null;

            const isHighlighted = highlightedZip === zip.zip;
            const isSelected = selectedZip === zip.zip;
            const color = getTerritoryColor(zip.territory);

            return (
              <PolygonF
                key={zip.zip}
                paths={paths}
                options={{
                  fillColor: color,
                  fillOpacity: isHighlighted ? 0.6 : isSelected ? 0.5 : 0.25,
                  strokeColor: isHighlighted ? '#000000' : '#1e293b',
                  strokeOpacity: isHighlighted ? 1 : 0.85,
                  strokeWeight: isHighlighted ? 3 : 2,
                  clickable: true,
                }}
                onClick={() => handlePolygonClick(zip.zip)}
              />
            );
          })}

          {/* Office location marker */}
          {officeLocation && (
            <MarkerF
              position={{ lat: officeLocation.lat, lng: officeLocation.lng }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 12,
                fillColor: '#FFD700',
                fillOpacity: 1,
                strokeColor: '#FFFFFF',
                strokeWeight: 3,
              }}
              onClick={handleOfficeClick}
            />
          )}

          {/* InfoWindow for selected ZIP */}
          {selectedZip && selectedZipData && (
            <InfoWindowF
              position={{
                lat: selectedZipData.latitude,
                lng: selectedZipData.longitude,
              }}
              onCloseClick={() => setSelectedZip(null)}
            >
              <div className="p-2">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4" style={{ color: getTerritoryColor(selectedZipData.territory) }} />
                  <h3 className="font-semibold">ZIP {selectedZipData.zip}</h3>
                </div>
                <div className="space-y-1 text-sm">
                  <p><strong>City:</strong> {selectedZipData.city}</p>
                  <p><strong>Territory:</strong> {getTerritoryDisplayName(selectedZipData.territory)}</p>
                  <p><strong>Accounts:</strong> {selectedZipData.accountCount}</p>
                </div>
              </div>
            </InfoWindowF>
          )}

          {/* InfoWindow for office */}
          {selectedOffice && officeLocation && (
            <InfoWindowF
              position={{ lat: officeLocation.lat, lng: officeLocation.lng }}
              onCloseClick={() => setSelectedOffice(false)}
            >
              <div className="p-2">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  <h3 className="font-semibold">{officeLocation.fullName}</h3>
                </div>
                <div className="space-y-1 text-sm">
                  <p><strong>Central Office</strong></p>
                  <p className="text-xs text-muted-foreground">
                    11720 Biscayne Blvd, Miami, FL 33181
                  </p>
                </div>
              </div>
            </InfoWindowF>
          )}
        </GoogleMap>
      </Card>

      {/* Territory Legend */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Proposed Miami Territory Distribution (Scenario II - ZIP Codes)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['North', 'Central', 'South'] as const).map((territory) => {
            const territoryZips = zipData.filter((z) => z.territory === territory);
            const accountCount = territoryZips.reduce((sum, z) => sum + z.accountCount, 0);
            const color = getTerritoryColor(territory);

            return (
              <div key={territory} className="flex items-start gap-2">
                <div
                  className="w-4 h-4 rounded mt-0.5 flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <div className="flex-1">
                  <p className="font-medium text-sm">{getTerritoryDisplayName(territory)}</p>
                  <p className="text-xs text-muted-foreground">
                    {accountCount} accounts • {territoryZips.length} ZIP codes
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Summary */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Total:</span>
            <span>{zipData.reduce((sum, z) => sum + z.accountCount, 0)} accounts in {zipData.length} ZIP codes</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            ZIP codes assigned based on geographic location to achieve balanced account distribution (~285 per territory).
          </p>
        </div>
      </Card>
    </div>
  );
}
