'use client';

import { useState, useEffect } from 'react';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, User, Building } from 'lucide-react';

interface Customer {
  accountNumber: string;
  customerName: string;
  address: string;
  zipCode: string;
  city: string;
  territory: string;
  latitude: number;
  longitude: number;
  status: string;
}

const mapContainerStyle = {
  width: '100%',
  height: '400px',
};

const getAreaColor = (area: string): string => {
  const colors: Record<string, string> = {
    West: 'bg-blue-500',
    Central: 'bg-green-500',
    East: 'bg-orange-500',
    Tucson: 'bg-pink-500',
    Commercial: 'bg-purple-500',
    'JAX - Maint Ponte Vedra': 'bg-cyan-500',
    'JAX - Maint Jacksonville': 'bg-blue-600',
    'JAX - Maint St. Augustine': 'bg-teal-500',
    'JAX - Maint St. Johns': 'bg-emerald-500',
    'JAX - Maint Nocatee': 'bg-lime-500',
    'JAX - Maint Beaches': 'bg-sky-500',
    'JAX - Maint Outskirts': 'bg-indigo-500',
    'JAX - Comm Maint': 'bg-violet-500',
  };
  return colors[area] || 'bg-gray-500';
};

const getMarkerColor = (area: string): string => {
  const colors: Record<string, string> = {
    West: '#3b82f6',
    Central: '#10b981',
    East: '#f97316',
    Tucson: '#ec4899',
    Commercial: '#8b5cf6',
    'JAX - Maint Ponte Vedra': '#06b6d4',
    'JAX - Maint Jacksonville': '#2563eb',
    'JAX - Maint St. Augustine': '#14b8a6',
    'JAX - Maint St. Johns': '#10b981',
    'JAX - Maint Nocatee': '#84cc16',
    'JAX - Maint Beaches': '#0ea5e9',
    'JAX - Maint Outskirts': '#6366f1',
    'JAX - Comm Maint': '#8b5cf6',
  };
  return colors[area] || '#6b7280';
};

const getAreaDisplayName = (area: string): string => {
  const names: Record<string, string> = {
    West: 'APS of Glendale',
    Central: 'APS of Scottsdale',
    East: 'APS of Chandler',
    Tucson: 'APS of Tucson',
    Commercial: 'APS - Commercial',
  };
  return names[area] || area;
};

export function CustomerLookup() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showMapInfo, setShowMapInfo] = useState(false);

  useEffect(() => {
    // Load both Arizona and Jacksonville customer data
    Promise.all([
      fetch('/customer-lookup.json').then(res => res.json()),
      fetch('/jacksonville-route-assignments.json').then(res => res.json())
    ])
      .then(([arizonaData, jacksonvilleData]) => {
        // Transform Jacksonville data to match Customer interface
        const jacksonvilleCustomers = jacksonvilleData.map((item: any) => ({
          accountNumber: item.customerNumber,
          customerName: item.customerName || 'Unknown',
          address: item.address || 'Address not available',
          zipCode: item.zip,
          city: item.city || '',
          territory: item.territory || 'Jacksonville',
          latitude: item.latitude,
          longitude: item.longitude,
          status: item.status || 'Active'
        }));
        
        const allCustomers = [...arizonaData, ...jacksonvilleCustomers];
        setCustomers(allCustomers);
        setFilteredCustomers([]);
      })
      .catch(err => {
        console.error('Error loading customers:', err);
      });
  }, []);

  useEffect(() => {
    if (searchTerm.length < 2) {
      setFilteredCustomers([]);
      setSelectedCustomer(null);
      return;
    }

    const term = searchTerm.toLowerCase();
    const results = customers.filter(
      (customer) => {
        const name = String(customer.customerName || '').toLowerCase();
        const account = String(customer.accountNumber || '').toLowerCase();
        const addr = String(customer.address || '').toLowerCase();
        return name.includes(term) || account.includes(term) || addr.includes(term);
      }
    );

    // Limit to 50 results for performance
    setFilteredCustomers(results.slice(0, 50));
    
    // Auto-select if exact match
    if (results.length === 1) {
      setSelectedCustomer(results[0]);
    }
  }, [searchTerm, customers]);

  const handleCustomerClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowMapInfo(true);
  };

  const openInGoogleMaps = (customer: Customer) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${customer.latitude},${customer.longitude}`;
    window.open(url, '_blank');
  };

  // Check if Google Maps is loaded
  const isGoogleLoaded = typeof google !== 'undefined' && google.maps;

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">Customer Territory Lookup</h2>
            <p className="text-muted-foreground">
              Search by customer name, account number, or address to find territory assignments.
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search customer name, account number, or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-lg h-12"
            />
          </div>

          {searchTerm.length > 0 && searchTerm.length < 2 && (
            <p className="text-sm text-muted-foreground">Type at least 2 characters to search</p>
          )}

          {searchTerm.length >= 2 && filteredCustomers.length === 0 && (
            <p className="text-sm text-muted-foreground">No customers found matching &quot;{searchTerm}&quot;</p>
          )}

          {filteredCustomers.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Found {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''}
              {filteredCustomers.length === 50 && ' (showing first 50)'}
            </p>
          )}
        </div>
      </Card>

      {/* Results */}
      {filteredCustomers.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Customer List */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Search Results</h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredCustomers.map((customer) => (
                <div
                  key={customer.accountNumber}
                  onClick={() => handleCustomerClick(customer)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                    selectedCustomer?.accountNumber === customer.accountNumber
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{String(customer.customerName || 'Unknown')}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {String(customer.accountNumber || 'N/A')}
                      </div>
                    </div>
                    <Badge className={`${getAreaColor(customer.territory)} text-white shrink-0 text-xs`}>
                      {String(customer.territory || 'Unknown')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Customer Details */}
          {selectedCustomer && (
            <div className="space-y-4">
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Customer Details</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                      <User className="h-4 w-4" />
                      <span>Customer Name</span>
                    </div>
                    <div className="font-medium">{
                      selectedCustomer.customerName && 
                      selectedCustomer.customerName !== 'nan' && 
                      selectedCustomer.customerName !== 'null' 
                        ? String(selectedCustomer.customerName) 
                        : 'Unknown'
                    }</div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                      <Building className="h-4 w-4" />
                      <span>Account Number</span>
                    </div>
                    <div className="font-medium">{String(selectedCustomer.accountNumber || 'N/A')}</div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                      <MapPin className="h-4 w-4" />
                      <span>Address</span>
                    </div>
                    <div className="font-medium">{
                      selectedCustomer.address && 
                      selectedCustomer.address !== 'nan' && 
                      selectedCustomer.address !== 'null' 
                        ? String(selectedCustomer.address) 
                        : 'Address not available'
                    }</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {selectedCustomer.city && selectedCustomer.city !== 'null' ? `${selectedCustomer.city}, ` : ''}
                      AZ {selectedCustomer.zipCode || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <div className="text-muted-foreground text-sm mb-2">Assigned Territory</div>
                    <Badge className={`${getAreaColor(selectedCustomer.territory)} text-white text-sm py-2 px-3`}>
                      {getAreaDisplayName(String(selectedCustomer.territory || 'Unknown'))}
                    </Badge>
                  </div>

                  <button
                    onClick={() => openInGoogleMaps(selectedCustomer)}
                    className="w-full mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <MapPin className="h-4 w-4" />
                    Open in Google Maps (New Tab)
                  </button>
                </div>
              </Card>

              {/* Embedded Map View */}
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Location Map</h3>
                {isGoogleLoaded ? (
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={{ lat: selectedCustomer.latitude, lng: selectedCustomer.longitude }}
                    zoom={15}
                    options={{
                      mapTypeId: 'hybrid',
                      streetViewControl: true,
                      mapTypeControl: true,
                    }}
                  >
                    <Marker
                      position={{ lat: selectedCustomer.latitude, lng: selectedCustomer.longitude }}
                      onClick={() => setShowMapInfo(true)}
                      icon={{
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: getMarkerColor(selectedCustomer.territory),
                        fillOpacity: 0.9,
                        strokeColor: '#ffffff',
                        strokeWeight: 2,
                        scale: 10,
                      }}
                    />
                    
                    {showMapInfo && (
                      <InfoWindow
                        position={{ lat: selectedCustomer.latitude, lng: selectedCustomer.longitude }}
                        onCloseClick={() => setShowMapInfo(false)}
                      >
                        <div className="p-2">
                          <h4 className="font-semibold text-sm mb-1">{
                            selectedCustomer.customerName && 
                            selectedCustomer.customerName !== 'nan' && 
                            selectedCustomer.customerName !== 'null' 
                              ? String(selectedCustomer.customerName) 
                              : 'Unknown'
                          }</h4>
                          <div className="text-xs space-y-1">
                            <p><strong>Account:</strong> {String(selectedCustomer.accountNumber || 'N/A')}</p>
                            <p><strong>Address:</strong> {
                              selectedCustomer.address && 
                              selectedCustomer.address !== 'nan' && 
                              selectedCustomer.address !== 'null' 
                                ? String(selectedCustomer.address) 
                                : 'N/A'
                            }</p>
                            <p><strong>Location:</strong> {
                              selectedCustomer.city && selectedCustomer.city !== 'null' 
                                ? `${selectedCustomer.city}, AZ ${selectedCustomer.zipCode || ''}`
                                : `AZ ${selectedCustomer.zipCode || 'N/A'}`
                            }</p>
                          </div>
                        </div>
                      </InfoWindow>
                    )}
                  </GoogleMap>
                ) : (
                  <div className="flex items-center justify-center h-[400px] bg-muted rounded-lg">
                    <div className="text-center">
                      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Loading map...</p>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
