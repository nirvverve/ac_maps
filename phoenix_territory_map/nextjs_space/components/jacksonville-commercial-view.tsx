'use client';

import { useState, useEffect, useCallback } from 'react';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { AlertCircle, Building2, MapPin, DollarSign } from 'lucide-react';

interface CommercialAccount {
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

export function JacksonvilleCommercialView() {
  const [accounts, setAccounts] = useState<CommercialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<CommercialAccount | null>(null);
  const [hoveredAccount, setHoveredAccount] = useState<string | null>(null);

  useEffect(() => {
    fetch('/jacksonville-commercial-accounts.json')
      .then(res => res.json())
      .then(data => {
        setAccounts(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading commercial accounts:', err);
        setError('Failed to load Jacksonville commercial accounts');
        setLoading(false);
      });
  }, []);

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
          <span className="ml-3">Loading Jacksonville commercial accounts...</span>
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
          center={jacksonvilleCenter}
          zoom={10}
          options={mapOptions}
        >
          {accounts.map(account => (
            <Marker
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
            <InfoWindow
              position={{
                lat: selectedAccount.latitude,
                lng: selectedAccount.longitude,
              }}
              onCloseClick={() => setSelectedAccount(null)}
            >
              <div className="p-2">
                <h4 className="font-semibold text-lg">{selectedAccount.customerName}</h4>
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
                    <span className="font-medium">Technician:</span> {selectedAccount.technician}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Service Day:</span> {selectedAccount.dayOfWeek}
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
            </InfoWindow>
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
                  <TableCell>{account.customerName}</TableCell>
                  <TableCell>{account.address}</TableCell>
                  <TableCell>{account.city}</TableCell>
                  <TableCell>{account.zip}</TableCell>
                  <TableCell>
                    <Badge variant="default" className="bg-violet-500">
                      {account.territory}
                    </Badge>
                  </TableCell>
                  <TableCell>{account.technician}</TableCell>
                  <TableCell>{account.dayOfWeek}</TableCell>
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
