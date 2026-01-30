'use client';

import { useLoadScript } from '@react-google-maps/api';
import { Card } from '@/components/ui/card';

const libraries: ('places' | 'geometry')[] = ['places', 'geometry'];

interface GoogleMapsProviderProps {
  children: React.ReactNode;
}

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  if (loadError) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          <p className="font-semibold mb-2">Error loading Google Maps</p>
          <p className="text-sm">Please check your internet connection and try refreshing the page.</p>
        </div>
      </Card>
    );
  }

  if (!isLoaded) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading maps...</p>
        </div>
      </Card>
    );
  }

  return <>{children}</>;
}
