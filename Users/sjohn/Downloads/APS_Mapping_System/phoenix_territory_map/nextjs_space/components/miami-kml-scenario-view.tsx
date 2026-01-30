"use client";

import { GoogleMap, PolylineF, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MiamiKMLScenarioViewProps {
  areaFilter: {
    North: boolean;
    Central: boolean;
    South: boolean;
  };
}

interface Customer {
  customerNumber: string;
  customerName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  monthlyPrice: number;
  yearlyPrice: number;
  route: string;
  dayOfService: string;
  kmlTerritory: 'North' | 'Central' | 'South';
  originalTerritory: 'North' | 'Central' | 'South';
  latitude: number;
  longitude: number;
  status: string;
}

interface BoundaryPoint {
  lng: number;
  lat: number;
}

interface Boundaries {
  north: BoundaryPoint[];
  south: BoundaryPoint[];
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

export function MiamiKMLScenarioView({ areaFilter }: MiamiKMLScenarioViewProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [boundaries, setBoundaries] = useState<Boundaries | null>(null);
  const [officeLocation, setOfficeLocation] = useState<OfficeLocation | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedOffice, setSelectedOffice] = useState<boolean>(false);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [highlightedCustomer, setHighlightedCustomer] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const center = { lat: 25.87, lng: -80.19 }; // Miami center
  const zoom = 10;

  useEffect(() => {
    // Load KML scenario customer data
    fetch('/miami-kml-scenario.json')
      .then((res) => res.json())
      .then((data) => setCustomers(data))
      .catch((err) => console.error('Error loading KML scenario data:', err));

    // Load KML boundary lines
    fetch('/miami-kml-boundaries.json')
      .then((res) => res.json())
      .then((data) => setBoundaries(data))
      .catch((err) => console.error('Error loading KML boundaries:', err));

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

  const handleCustomerSearch = () => {
    const search = searchCustomer.trim().toUpperCase();
    if (!search) return;

    const customer = customers.find(
      (c) =>
        c.customerNumber.toUpperCase().includes(search) ||
        c.customerName.toUpperCase().includes(search) ||
        c.address.toUpperCase().includes(search)
    );

    if (customer && mapRef.current) {
      mapRef.current.panTo({ lat: customer.latitude, lng: customer.longitude });
      mapRef.current.setZoom(14);
      setHighlightedCustomer(customer.customerNumber);
      setSelectedCustomer(customer);
      setTimeout(() => setHighlightedCustomer(null), 3000);
    }
  };

  const handleMarkerClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSelectedOffice(false);
  };

  const handleOfficeClick = () => {
    setSelectedOffice(true);
    setSelectedCustomer(null);
  };

  const filteredCustomers = customers.filter((customer) => {
    const territory = customer.kmlTerritory as keyof typeof areaFilter;
    return areaFilter[territory];
  });

  // Calculate statistics
  const stats = {
    North: customers.filter((c) => c.kmlTerritory === 'North').length,
    Central: customers.filter((c) => c.kmlTerritory === 'Central').length,
    South: customers.filter((c) => c.kmlTerritory === 'South').length,
  };

  return (
    <div className="space-y-4">
      {/* Customer Search */}
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search by account number, name, or address..."
            value={searchCustomer}
            onChange={(e) => setSearchCustomer(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCustomerSearch()}
            className="max-w-md"
          />
          <Button onClick={handleCustomerSearch} size="sm">
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
          {/* Render KML boundary lines */}
          {boundaries && (
            <>
              {/* North boundary line */}
              <PolylineF
                path={boundaries.north.map((p) => ({ lat: p.lat, lng: p.lng }))}
                options={{
                  strokeColor: '#3B82F6',
                  strokeOpacity: 0.8,
                  strokeWeight: 4,
                  geodesic: true,
                }}
              />

              {/* South boundary line */}
              <PolylineF
                path={boundaries.south.map((p) => ({ lat: p.lat, lng: p.lng }))}
                options={{
                  strokeColor: '#F59E0B',
                  strokeOpacity: 0.8,
                  strokeWeight: 4,
                  geodesic: true,
                }}
              />
            </>
          )}

          {/* Render individual customer markers as dots */}
          {filteredCustomers.map((customer) => {
            const isHighlighted = highlightedCustomer === customer.customerNumber;
            const color = getTerritoryColor(customer.kmlTerritory);

            return (
              <MarkerF
                key={customer.customerNumber}
                position={{ lat: customer.latitude, lng: customer.longitude }}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: isHighlighted ? 10 : 6,
                  fillColor: color,
                  fillOpacity: isHighlighted ? 1 : 0.8,
                  strokeColor: isHighlighted ? '#000000' : '#FFFFFF',
                  strokeWeight: isHighlighted ? 3 : 1,
                }}
                onClick={() => handleMarkerClick(customer)}
                zIndex={isHighlighted ? 1000 : undefined}
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

          {/* InfoWindow for selected customer */}
          {selectedCustomer && (
            <InfoWindowF
              position={{
                lat: selectedCustomer.latitude,
                lng: selectedCustomer.longitude,
              }}
              onCloseClick={() => setSelectedCustomer(null)}
            >
              <div className="p-2">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin
                    className="h-4 w-4"
                    style={{ color: getTerritoryColor(selectedCustomer.kmlTerritory) }}
                  />
                  <h3 className="font-semibold">{selectedCustomer.customerName}</h3>
                </div>
                <div className="space-y-1 text-sm">
                  <p>
                    <strong>Account:</strong> {selectedCustomer.customerNumber}
                  </p>
                  <p>
                    <strong>Address:</strong> {selectedCustomer.address}
                  </p>
                  <p>
                    <strong>City:</strong> {selectedCustomer.city}, {selectedCustomer.state}{' '}
                    {selectedCustomer.zip}
                  </p>
                  <p>
                    <strong>KML Territory:</strong>{' '}
                    {getTerritoryDisplayName(selectedCustomer.kmlTerritory)}
                  </p>
                  {selectedCustomer.kmlTerritory !== selectedCustomer.originalTerritory && (
                    <p className="text-orange-600">
                      <strong>Changed from:</strong>{' '}
                      {getTerritoryDisplayName(selectedCustomer.originalTerritory)}
                    </p>
                  )}
                  <p>
                    <strong>Monthly:</strong> ${selectedCustomer.monthlyPrice.toFixed(2)}
                  </p>
                  <p>
                    <strong>Route:</strong> {selectedCustomer.route}
                  </p>
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
                  <p>
                    <strong>Central Office</strong>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    11720 Biscayne Blvd, Miami, FL 33181
                  </p>
                </div>
              </div>
            </InfoWindowF>
          )}
        </GoogleMap>
      </Card>

      {/* Territory Legend with KML Statistics */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Miami KML Boundary Scenario</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {(['North', 'Central', 'South'] as const).map((territory) => {
            const count = stats[territory];
            const color = getTerritoryColor(territory);

            return (
              <div key={territory} className="flex items-start gap-2">
                <div
                  className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {getTerritoryDisplayName(territory)}
                  </p>
                  <p className="text-xs text-muted-foreground">{count} accounts</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="pt-3 border-t border-gray-200">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> Territory assignments based on precise KML boundary lines.
            Each dot represents one customer account, colored by assigned territory.
          </p>
        </div>
      </Card>
    </div>
  );
}
